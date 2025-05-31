import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useIntegrations } from "@/hooks/useIntegrations";
import { useApiKeys } from "@/hooks/useApiKeys";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, ExternalLink, CheckCircle, AlertCircle, Link, Users, RefreshCw } from "lucide-react";

interface AdAccount {
  id: string;
  name: string;
  account_status: number;
  currency: string;
}

export const FacebookConnector = () => {
  const { integrations, updateIntegration, syncIntegration } = useIntegrations();
  const { saveApiKeys, getApiKeys } = useApiKeys();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');

  const isConnected = integrations?.find(i => i.platform === 'facebook')?.is_connected || false;
  const savedKeys = getApiKeys('facebook');

  useEffect(() => {
    if (isConnected && savedKeys.access_token) {
      loadAdAccounts();
    }
  }, [isConnected, savedKeys.access_token]);

  const handleFacebookAuth = async () => {
    setIsConnecting(true);
    console.log('Starting Facebook OAuth process...');
    
    try {
      const { data, error } = await supabase.functions.invoke('facebook-oauth', {
        body: { action: 'initiate' }
      });

      if (error) {
        console.error('Failed to initiate Facebook OAuth:', error);
        throw error;
      }

      console.log('Opening Facebook OAuth popup with URL:', data.authUrl);

      // Open Facebook OAuth in a popup
      const popup = window.open(
        data.authUrl,
        'facebook-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Failed to open popup window. Please allow popups for this site.');
      }

      let messageListenerActive = true;

      // Listen for the OAuth callback
      const messageListener = async (event: MessageEvent) => {
        console.log('Received message from popup:', event.data);
        
        if (event.origin !== window.location.origin) {
          console.log('Ignoring message from different origin:', event.origin);
          return;
        }

        if (!messageListenerActive) {
          console.log('Message listener no longer active, ignoring message');
          return;
        }

        if (event.data.type === 'FACEBOOK_OAUTH_SUCCESS') {
          console.log('Facebook OAuth success, processing...');
          messageListenerActive = false;
          popup?.close();
          window.removeEventListener('message', messageListener);

          try {
            // Exchange code for access token
            console.log('Exchanging authorization code for access token...');
            const { data: tokenData, error: tokenError } = await supabase.functions.invoke('facebook-oauth', {
              body: { 
                action: 'exchange', 
                code: event.data.code 
              }
            });

            if (tokenError) {
              console.error('Token exchange failed:', tokenError);
              throw tokenError;
            }

            console.log('Successfully received access token, saving keys...');

            // Save access token
            saveApiKeys('facebook', {
              access_token: tokenData.access_token,
              user_id: tokenData.user_id,
              user_name: tokenData.user_name,
              user_email: tokenData.user_email
            });

            console.log('Updating integration status...');
            await updateIntegration.mutateAsync({ 
              platform: 'facebook', 
              isConnected: true 
            });

            toast({
              title: "Connected Successfully",
              description: "Your Facebook account has been connected. Loading ad accounts...",
            });

            console.log('Facebook connection completed successfully');

          } catch (error) {
            console.error('Error during token exchange or saving:', error);
            toast({
              title: "Connection Failed",
              description: "Failed to complete Facebook connection. Please try again.",
              variant: "destructive"
            });
          }
        } else if (event.data.type === 'FACEBOOK_OAUTH_ERROR') {
          console.error('Facebook OAuth error:', event.data.error);
          messageListenerActive = false;
          popup?.close();
          window.removeEventListener('message', messageListener);
          throw new Error(event.data.error);
        }
      };

      window.addEventListener('message', messageListener);

      // Check if popup was closed without completing auth
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          console.log('Popup was closed by user');
          clearInterval(checkClosed);
          if (messageListenerActive) {
            messageListenerActive = false;
            window.removeEventListener('message', messageListener);
            setIsConnecting(false);
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
    }
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
      
      // Auto-select first account if none selected
      if (data.adAccounts?.length > 0 && !selectedAccount) {
        setSelectedAccount(data.adAccounts[0].id);
      }

    } catch (error) {
      console.error('Failed to load ad accounts:', error);
      toast({
        title: "Failed to Load Ad Accounts",
        description: "Could not load your Facebook ad accounts. Please try reconnecting.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await updateIntegration.mutateAsync({ 
        platform: 'facebook', 
        isConnected: false 
      });

      // Clear saved tokens
      saveApiKeys('facebook', {});
      setAdAccounts([]);
      setSelectedAccount('');

      toast({
        title: "Disconnected",
        description: "Your Facebook account has been disconnected.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect Facebook account.",
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
    try {
      await syncIntegration.mutateAsync('facebook');
      toast({
        title: "Sync Complete",
        description: "Facebook Ads data has been synchronized successfully.",
      });
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to sync Facebook Ads data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const saveAdAccountSelection = () => {
    if (selectedAccount) {
      saveApiKeys('facebook', {
        ...savedKeys,
        selected_ad_account_id: selectedAccount
      });

      toast({
        title: "Ad Account Selected",
        description: "Your ad account selection has been saved.",
      });
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
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? "Connected" : "Not Connected"}
            </Badge>
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
            {!isConnected ? (
              <Button 
                onClick={handleFacebookAuth}
                disabled={isConnecting}
                className="w-full"
              >
                <Link className="h-4 w-4 mr-2" />
                {isConnecting ? "Connecting..." : "Connect to Facebook"}
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
                
                {integration?.last_sync && (
                  <p className="text-sm text-gray-600">
                    Last sync: {new Date(integration.last_sync).toLocaleString()}
                  </p>
                )}

                {/* Ad Account Selection */}
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
                        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
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
                        <Button onClick={saveAdAccountSelection} variant="outline" className="w-full">
                          Save Ad Account Selection
                        </Button>
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

                {/* Sync Actions */}
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSync}
                    disabled={isSyncing || !selectedAccount}
                    variant="outline"
                    className="flex-1"
                  >
                    {isSyncing ? "Syncing..." : "Sync Data"}
                  </Button>
                  
                  <Button 
                    onClick={handleDisconnect}
                    variant="destructive"
                    className="flex-1"
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Status Information */}
          <div className="p-4 border rounded-lg bg-blue-50">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">How it works:</p>
                <ul className="mt-1 text-blue-800 space-y-1">
                  <li>• Click "Connect to Facebook" to authenticate via OAuth</li>
                  <li>• Select which ad account you want to sync data from</li>
                  <li>• Your advertising data will be automatically imported</li>
                  <li>• Data appears in Dashboard, Predictions, Alerts, and AI Assistant</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
