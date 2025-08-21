import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, ExternalLink, CheckCircle, AlertCircle, Link, Users, RefreshCw, Shield } from "lucide-react";
import { FacebookBatchSyncButton } from "./FacebookBatchSyncButton";

interface AdAccount {
  id: string;
  name: string;
  account_status: number;
  currency: string;
}

interface FacebookConnectorProps {
  projectId: string;
}

interface ProjectIntegration {
  is_connected: boolean;
  last_sync?: string;
}

interface SavedKeys {
  access_token?: string;
  permissions?: string[];
  selected_ad_account_id?: string;
  selected_ad_account_name?: string;
  user_name?: string;
  user_id?: string;
  user_email?: string;
  [key: string]: any; // Allow additional properties for Json compatibility
}

export const FacebookConnector = ({ projectId }: FacebookConnectorProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  
  // Project integration state
  const [projectIntegration, setProjectIntegration] = useState<ProjectIntegration | null>(null);
  const [savedKeys, setSavedKeys] = useState<SavedKeys>({});
  
  const isConnected = projectIntegration?.is_connected || false;
  const hasAdsPermissions = savedKeys.access_token && savedKeys.permissions?.includes('ads_read');
  
  // Load project integration and data on mount
  useEffect(() => {
    const loadProjectIntegration = async () => {
      if (!projectId) {
        console.error('❌ FacebookConnector: No projectId provided');
        return;
      }
      
      console.log('🔍 Loading Facebook integration for project:', projectId);
      
      // Get project integration
      const { data: integrationData, error: integrationError } = await supabase
        .from('project_integrations')
        .select('*')
        .eq('project_id', projectId)
        .eq('platform', 'facebook')
        .maybeSingle();
      
      if (integrationError) {
        console.error('❌ Error loading project integration:', integrationError);
      } else {
        console.log('✅ Project integration loaded:', integrationData);
        setProjectIntegration(integrationData);
      }
      
      // Get project integration data (saved keys)
      const { data: keyData, error: keyError } = await supabase
        .from('project_integration_data')
        .select('data')
        .eq('project_id', projectId)
        .eq('platform', 'facebook')
        .maybeSingle();
      
      if (keyError) {
        console.error('❌ Error loading project integration data:', keyError);
      } else {
        console.log('✅ Project integration data loaded:', keyData);
        setSavedKeys((keyData?.data as SavedKeys) || {});
        
        if (keyData?.data && typeof keyData.data === 'object' && 'selected_ad_account_id' in keyData.data) {
          setSelectedAccount((keyData.data as SavedKeys).selected_ad_account_id || '');
        }
      }
    };
    
    loadProjectIntegration();
  }, [projectId]);

  // Add OAuth callback message listener
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      console.log('📩 Received message:', event.data);
      
      if (event.data.type === 'FACEBOOK_OAUTH_SUCCESS') {
        console.log('🎉 Facebook OAuth success, exchanging code for token');
        await handleOAuthCallback(event.data.code);
      } else if (event.data.type === 'FACEBOOK_OAUTH_ERROR') {
        console.error('❌ Facebook OAuth error:', event.data);
        toast({
          title: "Connection Failed",
          description: event.data.errorDescription || "Failed to connect to Facebook",
          variant: "destructive"
        });
        setIsConnecting(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [projectId]);

  const handleOAuthCallback = async (code: string) => {
    try {
      console.log('🔄 Exchanging authorization code for access token');
      
      // Exchange code for access token
      const { data, error } = await supabase.functions.invoke('facebook-oauth', {
        body: { action: 'exchange', code, projectId }
      });

      if (error || !data?.access_token) {
        throw new Error('Failed to exchange code for access token');
      }

      console.log('✅ Access token received, fetching ad accounts');

      // Get ad accounts
      await fetchAdAccounts(data.access_token);

      // Save the integration data
      const keysToSave: SavedKeys = {
        access_token: data.access_token,
        user_id: data.user_id,
        user_name: data.user_name,
        user_email: data.user_email,
        permissions: data.permissions || []
      };

      await saveIntegrationData(keysToSave);

      toast({
        title: "Connected Successfully",
        description: "Facebook account connected. Please select an ad account.",
      });
    } catch (error) {
      console.error('❌ OAuth callback failed:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to complete Facebook connection",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchAdAccounts = async (accessToken: string) => {
    try {
      setIsLoadingAccounts(true);
      console.log('📡 Fetching Facebook ad accounts');

      const { data, error } = await supabase.functions.invoke('facebook-oauth', {
        body: { action: 'get_ad_accounts', access_token: accessToken }
      });

      if (error || !data?.adAccounts) {
        throw new Error('Failed to fetch ad accounts');
      }

      console.log('✅ Ad accounts fetched:', data.adAccounts);
      setAdAccounts(data.adAccounts);
    } catch (error) {
      console.error('❌ Failed to fetch ad accounts:', error);
      toast({
        title: "Warning",
        description: "Connected but failed to load ad accounts. You may need ads permissions.",
        variant: "destructive"
      });
      setAdAccounts([]);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const saveIntegrationData = async (keys: SavedKeys) => {
    try {
      // Update or create project integration
      await supabase
        .from('project_integrations')
        .upsert({
          project_id: projectId,
          platform: 'facebook',
          is_connected: true,
          last_sync: new Date().toISOString()
        });

      // Save integration data
      await supabase
        .from('project_integration_data')
        .upsert({
          project_id: projectId,
          platform: 'facebook',
          data: keys as any
        });

      setSavedKeys(keys);
      setProjectIntegration({ is_connected: true });
      
      queryClient.invalidateQueries({ queryKey: ['facebook-integrations', projectId] });
    } catch (error) {
      console.error('❌ Failed to save integration data:', error);
      throw error;
    }
  };

  const handleAccountSelect = async (accountId: string) => {
    try {
      const selectedAdAccount = adAccounts.find(acc => acc.id === accountId);
      
      const updatedKeys: SavedKeys = {
        ...savedKeys,
        selected_ad_account_id: accountId,
        selected_ad_account_name: selectedAdAccount?.name || ''
      };

      await supabase
        .from('project_integration_data')
        .update({ data: updatedKeys as any })
        .eq('project_id', projectId)
        .eq('platform', 'facebook');

      setSavedKeys(updatedKeys);
      setSelectedAccount(accountId);

      toast({
        title: "Ad Account Selected",
        description: `Selected: ${selectedAdAccount?.name}`,
      });
    } catch (error) {
      console.error('❌ Failed to save ad account selection:', error);
      toast({
        title: "Selection Failed",
        description: "Failed to save ad account selection",
        variant: "destructive"
      });
    }
  };

  const handleFacebookAuth = async (permissionLevel: 'basic' | 'ads' = 'ads') => {
    console.log(`🔄 Starting Facebook authentication for project: ${projectId}, permission level: ${permissionLevel}`);
    setIsConnecting(true);
    
    try {
      console.log('📤 Calling facebook-oauth edge function...');
      const { data, error } = await supabase.functions.invoke('facebook-oauth', {
        body: { action: 'initiate', permission_level: permissionLevel, projectId }
      });

      console.log('📥 Facebook OAuth response:', { data, error });

      if (error) {
        console.error('❌ Facebook OAuth error:', error);
        throw new Error(`OAuth error: ${error.message || 'Unknown error'}`);
      }

      if (!data?.authUrl) {
        console.error('❌ No authUrl in response:', data);
        throw new Error('No authorization URL received from Facebook');
      }

      console.log('🌐 Opening Facebook OAuth URL:', data.authUrl);
      const popup = window.open(data.authUrl, 'facebook-oauth', 'width=600,height=700');
      
      if (!popup) {
        throw new Error('Popup was blocked. Please allow popups for this site.');
      }
      
      const upgradeMessage = permissionLevel === 'ads' ? 
        "Complete the authorization to upgrade permissions for ads access." :
        "Complete the authorization in the popup window.";
        
      toast({
        title: "Opening Facebook",
        description: upgradeMessage,
      });
    } catch (error) {
      console.error('❌ Facebook auth failed:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Facebook. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await supabase
        .from('project_integrations')
        .update({ is_connected: false, last_sync: null })
        .eq('project_id', projectId)
        .eq('platform', 'facebook');
      
      await supabase
        .from('project_integration_data')
        .delete()
        .eq('project_id', projectId)
        .eq('platform', 'facebook');
      
      setSavedKeys({});
      setProjectIntegration({ is_connected: false });
      setAdAccounts([]);
      setSelectedAccount('');
      
      queryClient.invalidateQueries({ queryKey: ['facebook-integrations', projectId] });
      
      toast({
        title: "Disconnected",
        description: "Facebook account has been disconnected.",
      });
    } catch (error) {
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect Facebook account.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Facebook Ads Integration
          </CardTitle>
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? "Connected" : "Not Connected"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-sm text-gray-600">
          <p>Connect your Facebook Ads account to automatically pull advertising data, campaign metrics, and insights.</p>
          <p className="text-xs text-blue-600 mt-1">This will request permissions to access your ad accounts and campaign data.</p>
          <div className="flex items-center gap-2 text-blue-600 mt-2">
            <ExternalLink className="h-4 w-4" />
            <a 
              href="https://developers.facebook.com/docs/marketing-api/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Learn more about Facebook Marketing API
            </a>
          </div>
        </div>

        <div className="space-y-4">
          {!isConnected ? (
            <Button 
              onClick={() => handleFacebookAuth('ads')}
              disabled={isConnecting}
              className="w-full"
            >
              <Link className="h-4 w-4 mr-2" />
              {isConnecting ? "Connecting..." : "Connect Facebook Ads"}
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Connected to Facebook</span>
                {savedKeys.user_name && (
                  <span className="text-xs text-gray-500">({savedKeys.user_name})</span>
                )}
              </div>
              
              {projectIntegration?.last_sync && (
                <p className="text-sm text-gray-600">
                  Last sync: {new Date(projectIntegration.last_sync).toLocaleString()}
                </p>
              )}

              {/* Ad Account Selection */}
              {hasAdsPermissions && adAccounts.length > 0 && (
                <div className="space-y-3">
                  <Label htmlFor="ad-account-select">Select Ad Account</Label>
                  <Select value={selectedAccount} onValueChange={handleAccountSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingAccounts ? "Loading accounts..." : "Select an ad account"} />
                    </SelectTrigger>
                    <SelectContent>
                      {adAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{account.name}</span>
                            <Badge variant="outline" className="ml-2">
                              {account.currency}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedAccount && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      <span className="text-xs">Ad account selected</span>
                    </div>
                  )}
                </div>
              )}

              {/* No ads permissions warning with upgrade option */}
              {isConnected && !hasAdsPermissions && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-yellow-700">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Limited Permissions</span>
                  </div>
                  <p className="text-xs text-yellow-600 mt-1 mb-3">
                    This connection doesn't have ads management permissions. You need elevated permissions to access ad accounts and sync advertising data.
                  </p>
                  <Button
                    onClick={() => handleFacebookAuth('ads')}
                    disabled={isConnecting}
                    size="sm"
                    variant="outline"
                    className="bg-yellow-100 border-yellow-300 text-yellow-700 hover:bg-yellow-200"
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    {isConnecting ? "Upgrading..." : "Upgrade Permissions"}
                  </Button>
                </div>
              )}

              {/* Loading ad accounts */}
              {isLoadingAccounts && (
                <div className="flex items-center gap-2 text-blue-600">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading ad accounts...</span>
                </div>
              )}

              <div className="flex gap-2">
                <FacebookBatchSyncButton projectId={projectId} />
                <Button 
                  onClick={handleDisconnect}
                  variant="destructive"
                >
                  Disconnect
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};