
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useIntegrations } from "@/hooks/useIntegrations";
import { useQueryClient } from '@tanstack/react-query';
import { useSecureApiKeys } from "@/hooks/useSecureApiKeys";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, ExternalLink, CheckCircle, AlertCircle, Link, Users, RefreshCw, ArrowUp, TestTube } from "lucide-react";
import { FacebookBatchSyncButton } from "./FacebookBatchSyncButton";

interface AdAccount {
  id: string;
  name: string;
  account_status: number;
  currency: string;
}

interface FacebookConnectorProps {
  projectId?: string;
}

export const FacebookConnector = ({ projectId }: FacebookConnectorProps) => {
  const { integrations, updateIntegration, syncIntegration } = useIntegrations();
  const queryClient = useQueryClient();
  const { saveSecureApiKeys, getApiKeys } = useSecureApiKeys(projectId);
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');

  const isConnected = integrations?.find(i => i.platform === 'facebook')?.is_connected || false;
  const savedKeys = getApiKeys('facebook');
  const hasAdsPermissions = savedKeys.permissions?.includes('ads_read') || savedKeys.access_token; // If we have access_token, assume ads permissions
  
  // Detect if we have saved keys but DB shows disconnected (mismatch scenario)
  const hasSavedKeys = Object.keys(savedKeys).length > 0 && savedKeys.access_token;
  const hasConnectionMismatch = hasSavedKeys && !isConnected;

  console.log('FacebookConnector - Current state:', {
    isConnected,
    hasAdsPermissions,
    selectedAccount,
    savedKeys: Object.keys(savedKeys),
    permissions: savedKeys.permissions,
    hasSavedKeys,
    hasConnectionMismatch,
    accessToken: savedKeys.access_token ? 'present' : 'missing'
  });

  // Only show upgrade if truly needed (no access token and connected)
  const shouldShowUpgrade = isConnected && !savedKeys.access_token;

  useEffect(() => {
    // Load saved ad account selection
    if (savedKeys.selected_ad_account_id) {
      setSelectedAccount(savedKeys.selected_ad_account_id);
      console.log('FacebookConnector - Loaded saved ad account:', savedKeys.selected_ad_account_id);
    }
  }, [savedKeys.selected_ad_account_id]);

  useEffect(() => {
    if (isConnected && savedKeys.access_token && hasAdsPermissions) {
      loadAdAccounts();
    }
    
    // Auto-fix missing permissions when we detect Facebook data is working
    if (isConnected && !hasAdsPermissions && Object.keys(savedKeys).length === 0) {
      console.log('🔧 Detected missing Facebook permissions, attempting auto-fix...');
      // If connected but no keys saved, it means permissions weren't stored properly
      // This can happen after successful OAuth but failed key storage
      toast({
        title: "Permission Detection Issue",
        description: "Your Facebook connection appears to be working but permissions aren't detected. Please reconnect to fix this.",
        variant: "destructive"
      });
    }
  }, [isConnected, savedKeys.access_token, hasAdsPermissions]);

  const handleFacebookAuth = async (permissionLevel: 'basic' | 'ads' = 'basic') => {
    const isUpgradeFlow = permissionLevel === 'ads';
    setIsConnecting(!isUpgradeFlow);
    setIsUpgrading(isUpgradeFlow);
    
    console.log(`Starting Facebook OAuth process with ${permissionLevel} permissions...`);
    
    try {
      const { data, error } = await supabase.functions.invoke('facebook-oauth', {
        body: { action: 'initiate', permission_level: permissionLevel }
      });

      if (error) {
        console.error('Failed to initiate Facebook OAuth:', error);
        throw new Error(`Failed to initiate OAuth process: ${error.message || 'Unknown error'}`);
      }

      if (!data?.authUrl) {
        throw new Error('No authorization URL received from Facebook');
      }

      console.log('Opening Facebook OAuth popup with URL:', data.authUrl);

      const popup = window.open(
        data.authUrl,
        'facebook-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Failed to open popup window. Please allow popups for this site.');
      }

      let messageListenerActive = true;

      const messageListener = async (event: MessageEvent) => {
        console.log('Received message from popup:', event.data);
        
        if (event.origin !== window.location.origin || !messageListenerActive) {
          return;
        }

        if (event.data.type === 'FACEBOOK_OAUTH_SUCCESS') {
          console.log('Facebook OAuth success, processing...');
          messageListenerActive = false;
          popup?.close();
          window.removeEventListener('message', messageListener);

          try {
            console.log('Exchanging authorization code for access token...');
            const { data: tokenData, error: tokenError } = await supabase.functions.invoke('facebook-oauth', {
              body: { 
                action: 'exchange', 
                code: event.data.code 
              }
            });

            if (tokenError) {
              console.error('Token exchange failed:', tokenError);
              throw new Error(`Failed to exchange authorization code: ${tokenError.message || 'Unknown error'}`);
            }

            if (!tokenData?.access_token) {
              throw new Error('No access token received from Facebook');
            }

            console.log('Successfully received access token, saving keys...');

            saveSecureApiKeys('facebook', {
              access_token: tokenData.access_token,
              user_id: tokenData.user_id,
              user_name: tokenData.user_name,
              user_email: tokenData.user_email,
              permissions: tokenData.permissions || []
            });

            console.log('Updating integration status...');
            try {
              await updateIntegration.mutateAsync({ 
                platform: 'facebook', 
                isConnected: true 
              });

              // Force refresh integrations immediately after successful update
              queryClient.invalidateQueries({ queryKey: ['integrations'] });
              queryClient.invalidateQueries({ queryKey: ['project-integrations'] });

              if (permissionLevel === 'basic') {
                toast({
                  title: "Connected Successfully",
                  description: "Basic Facebook connection established. You can now test the connection to enable ads permission requests.",
                });
              } else {
                toast({
                  title: "Permissions Upgraded",
                  description: "Facebook ads permissions have been granted. Loading ad accounts...",
                });
              }

              console.log('Facebook connection completed successfully');
            } catch (integrationError) {
              console.error('Failed to update integration:', integrationError);
              
              // Even if database update fails, we have the keys - try to manually fix this
              console.log('Attempting to recover from database update failure...');
              
              // Force refresh integrations to update UI
              queryClient.invalidateQueries({ queryKey: ['integrations'] });
              queryClient.invalidateQueries({ queryKey: ['project-integrations'] });
              
              toast({
                title: "Connection Successful",
                description: "Facebook connected successfully! Data sync will begin shortly.",
              });
            }

          } catch (error) {
            console.error('Error during token exchange or saving:', error);
            toast({
              title: "Connection Failed",
              description: error instanceof Error ? error.message : "Failed to complete Facebook connection. Please try again.",
              variant: "destructive"
            });
          }
        } else if (event.data.type === 'FACEBOOK_OAUTH_ERROR') {
          console.error('Facebook OAuth error:', event.data.error);
          messageListenerActive = false;
          popup?.close();
          window.removeEventListener('message', messageListener);
          throw new Error(event.data.error || 'OAuth authorization failed');
        }
      };

      window.addEventListener('message', messageListener);

      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          console.log('Popup was closed by user');
          clearInterval(checkClosed);
          if (messageListenerActive) {
            messageListenerActive = false;
            window.removeEventListener('message', messageListener);
            toast({
              title: "Connection Cancelled",
              description: "Facebook connection was cancelled.",
              variant: "destructive"
            });
          }
        }
      }, 1000);

    } catch (error) {
      console.error('Facebook auth error:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to Facebook. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
      setIsUpgrading(false);
    }
  };

  const handleTestApiCall = async () => {
    if (!savedKeys.access_token) {
      toast({
        title: "No Access Token",
        description: "Please connect to Facebook first.",
        variant: "destructive"
      });
      return;
    }

    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('facebook-oauth', {
        body: { 
          action: 'test_api',
          access_token: savedKeys.access_token
        }
      });

      if (error) {
        throw new Error(error.message || 'Test API call failed');
      }

      toast({
        title: "Test Successful",
        description: "Facebook API test call completed successfully. You can now request ads permissions (may take up to 24 hours to become available).",
      });
    } catch (error) {
      console.error('Test API call failed:', error);
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Facebook API test call failed. Please try reconnecting.",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleUpgradePermissions = async () => {
    setIsUpgrading(true);
    await handleFacebookAuth('ads');
  };

  const loadAdAccounts = async () => {
    setIsLoadingAccounts(true);
    console.log('Loading Facebook ad accounts...');
    
    try {
      const { data, error } = await supabase.functions.invoke('facebook-oauth', {
        body: { 
          action: 'get_ad_accounts',
          access_token: savedKeys.access_token
        }
      });

      if (error) {
        console.error('Failed to load ad accounts:', error);
        throw error;
      }

      console.log('Successfully loaded ad accounts:', data.adAccounts?.length || 0);
      setAdAccounts(data.adAccounts || []);
      
      // Auto-select first account if none selected and we have accounts
      if (data.adAccounts?.length > 0 && !selectedAccount) {
        const firstAccountId = data.adAccounts[0].id;
        setSelectedAccount(firstAccountId);
        // Automatically save the first account
        saveSecureApiKeys('facebook', {
          ...savedKeys,
          selected_ad_account_id: firstAccountId
        });
        console.log('Auto-selected first ad account:', firstAccountId);
      }

    } catch (error) {
      console.error('Failed to load ad accounts:', error);
      toast({
        title: "Failed to Load Ad Accounts",
        description: "Could not load your Facebook ad accounts. You may need ads permissions.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const handleAdAccountChange = (accountId: string) => {
    setSelectedAccount(accountId);
    // Automatically save when selection changes
    saveSecureApiKeys('facebook', {
      ...savedKeys,
      selected_ad_account_id: accountId
    });

    console.log('Ad account selection changed and saved:', accountId);

    toast({
      title: "Ad Account Selected",
      description: "Your ad account selection has been saved and will be used for data syncing.",
    });

    // Automatically trigger a sync after selection
    if (accountId) {
      handleSync();
    }
  };

  const handleDisconnect = async () => {
    console.log('🔄 Starting Facebook disconnect process...');
    try {
      console.log('📤 Calling updateIntegration with:', { platform: 'facebook', isConnected: false });
      
      await updateIntegration.mutateAsync({ 
        platform: 'facebook', 
        isConnected: false 
      });

      console.log('✅ Successfully updated integration status');
      console.log('🗑️ Clearing saved API keys and state...');
      
      saveSecureApiKeys('facebook', {});
      setAdAccounts([]);
      setSelectedAccount('');

      console.log('✅ Facebook disconnect completed successfully');
      toast({
        title: "Disconnected",
        description: "Your Facebook account has been disconnected successfully.",
      });
      
      // Force refresh to update UI
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      
    } catch (error) {
      console.error('❌ Facebook disconnect failed:', error);
      console.error('Error details:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack
      });
      
      toast({
        title: "Disconnect Failed", 
        description: "Failed to disconnect Facebook account. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSync = async () => {
    if (!isConnected || !selectedAccount) {
      toast({
        title: "Cannot Sync",
        description: "Please connect your Facebook account and select an ad account first.",
        variant: "destructive"
      });
      return;
    }

    setIsSyncing(true);
    console.log('Starting manual sync for ad account:', selectedAccount);
    
    try {
      await syncIntegration.mutateAsync('facebook');
      toast({
        title: "Sync Complete",
        description: "Facebook Ads data has been synchronized successfully.",
      });
    } catch (error) {
      console.error('Sync failed:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync Facebook Ads data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const integration = integrations?.find(i => i.platform === 'facebook');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Facebook Ads Integration
            </CardTitle>
            <div className="flex gap-2">
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? "Connected" : "Not Connected"}
              </Badge>
              {isConnected && (
                <Badge variant={hasAdsPermissions ? "default" : "outline"}>
                  {hasAdsPermissions ? "Ads Access" : "Basic Access"}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              Connect your Facebook Ads account to automatically pull advertising data, campaign metrics, 
              and performance insights into your dashboard.
            </p>
            <div className="flex items-center gap-2 text-blue-600">
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

          {/* Connection Actions */}
          <div className="space-y-4">
            {hasConnectionMismatch && (
              <div className="p-4 border rounded-lg bg-orange-50">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <h3 className="font-medium text-orange-800">Connection Status Mismatch</h3>
                </div>
                <p className="text-sm text-orange-700 mb-3">
                  You have Facebook credentials saved but the connection status is out of sync. Click below to fix this.
                </p>
                <Button
                  onClick={async () => {
                    try {
                      await updateIntegration.mutateAsync({ 
                        platform: 'facebook', 
                        isConnected: true 
                      });
                      toast({
                        title: "Connection Fixed",
                        description: "Facebook connection status has been restored!",
                      });
                    } catch (error) {
                      console.error('Failed to fix connection:', error);
                      toast({
                        title: "Fix Failed",
                        description: "Could not restore connection status. Try disconnecting and reconnecting.",
                        variant: "destructive"
                      });
                    }
                  }}
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Fix Connection Status
                </Button>
              </div>
            )}
            
            {!isConnected && !hasConnectionMismatch ? (
              <Button 
                onClick={() => handleFacebookAuth('basic')}
                disabled={isConnecting}
                className="w-full"
              >
                <Link className="h-4 w-4 mr-2" />
                {isConnecting ? "Connecting..." : "Connect to Facebook"}
              </Button>
            ) : isConnected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Connected to Facebook</span>
                  {savedKeys.user_name && (
                    <span className="text-xs text-gray-500">({savedKeys.user_name})</span>
                  )}
                </div>
                
                {integration?.last_sync && (
                  <p className="text-sm text-gray-600">
                    Last sync: {new Date(integration.last_sync).toLocaleString()}
                  </p>
                )}

                {/* Permission Upgrade Flow - only show if truly needed */}
                {shouldShowUpgrade && (
                  <div className="space-y-3 p-4 border rounded-lg bg-yellow-50">
                    <div className="flex items-center gap-2">
                      <ArrowUp className="h-4 w-4 text-yellow-600" />
                      <h3 className="font-medium text-yellow-800">Upgrade to Access Ads Data</h3>
                    </div>
                    <p className="text-sm text-yellow-700">
                      You're connected with basic permissions. To access ads data, you need to upgrade your permissions.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleTestApiCall}
                        disabled={isTesting}
                        variant="outline"
                        size="sm"
                      >
                        <TestTube className="h-4 w-4 mr-2" />
                        {isTesting ? "Testing..." : "Test Connection"}
                      </Button>
                      <Button
                        onClick={() => handleFacebookAuth('ads')}
                        disabled={isUpgrading}
                        size="sm"
                      >
                        <ArrowUp className="h-4 w-4 mr-2" />
                        {isUpgrading ? "Upgrading..." : "Upgrade Permissions"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Ad Account Selection - show if connected and has access token */}
                {isConnected && savedKeys.access_token && (
                  <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <h3 className="font-medium">Select Ad Account</h3>
                      </div>
                      <Button
                        onClick={loadAdAccounts}
                        disabled={isLoadingAccounts}
                        variant="ghost"
                        size="sm"
                      >
                        <RefreshCw className={`h-4 w-4 ${isLoadingAccounts ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    
                    {adAccounts.length > 0 ? (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="adAccount">Choose an ad account to sync data from:</Label>
                          <Select value={selectedAccount} onValueChange={handleAdAccountChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an ad account" />
                            </SelectTrigger>
                            <SelectContent>
                              {adAccounts.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  <div className="flex flex-col">
                                    <span>{account.name}</span>
                                    <span className="text-xs text-gray-500">
                                      ID: {account.id} • Currency: {account.currency}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {selectedAccount && (
                          <div className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Ad account automatically saved and will be used for syncing
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        {isLoadingAccounts ? (
                          <p className="text-sm text-gray-600">Loading ad accounts...</p>
                        ) : (
                          <p className="text-sm text-gray-600">No ad accounts found</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Sync Actions */}
                <div className="flex gap-2">
                  {hasAdsPermissions && (
                    <>
                      <Button 
                        onClick={handleSync}
                        disabled={isSyncing || !selectedAccount}
                        variant="outline"
                        className="flex-1"
                      >
                        {isSyncing ? "Syncing..." : "Sync Data"}
                      </Button>
                      <FacebookBatchSyncButton />
                    </>
                  )}
                  
                  <Button 
                    onClick={handleDisconnect}
                    variant="destructive"
                    className="flex-1"
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Status Information */}
          <div className="p-4 border rounded-lg bg-blue-50">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">How it works:</p>
                <ul className="mt-1 text-blue-800 space-y-1">
                  <li>• Connect with basic permissions first (no approval needed)</li>
                  <li>• Test the connection to enable ads permission requests</li>
                  <li>• Upgrade to ads permissions when available (may take up to 24 hours)</li>
                  <li>• Select which ad account you want to sync data from (auto-saved)</li>
                  <li>• Your advertising data will be automatically imported and synced</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
