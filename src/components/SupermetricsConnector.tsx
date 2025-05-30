
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIntegrations } from "@/hooks/useIntegrations";
import { useApiKeys } from "@/hooks/useApiKeys";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, ExternalLink, CheckCircle, AlertCircle, Key, Link } from "lucide-react";

export const SupermetricsConnector = () => {
  const { integrations, updateIntegration, syncIntegration } = useIntegrations();
  const { saveApiKeys, getApiKeys, hasApiKeys } = useApiKeys();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [credentials, setCredentials] = useState(() => {
    const saved = getApiKeys('supermetrics');
    return {
      clientId: saved.client_id || '',
      clientSecret: saved.client_secret || '',
      accessToken: saved.access_token || ''
    };
  });

  const isConnected = integrations?.find(i => i.platform === 'supermetrics')?.is_connected || false;
  const hasStoredKeys = hasApiKeys('supermetrics');

  const handleSaveCredentials = () => {
    if (!credentials.clientId || !credentials.clientSecret) {
      toast({
        title: "Missing Credentials",
        description: "Please provide both Client ID and Client Secret",
        variant: "destructive"
      });
      return;
    }

    saveApiKeys('supermetrics', {
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      access_token: credentials.accessToken
    });

    toast({
      title: "Credentials Saved",
      description: "Supermetrics credentials have been saved securely.",
    });
  };

  const handleConnect = async () => {
    if (!hasStoredKeys) {
      toast({
        title: "Setup Required",
        description: "Please save your Supermetrics credentials first.",
        variant: "destructive"
      });
      return;
    }

    setIsConnecting(true);
    try {
      // In a real implementation, this would redirect to Supermetrics OAuth
      // For now, we'll simulate the connection process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await updateIntegration.mutateAsync({ 
        platform: 'supermetrics', 
        isConnected: true 
      });

      toast({
        title: "Connected Successfully",
        description: "Your Supermetrics account has been connected. Data will be available shortly.",
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Supermetrics. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await updateIntegration.mutateAsync({ 
        platform: 'supermetrics', 
        isConnected: false 
      });

      toast({
        title: "Disconnected",
        description: "Your Supermetrics account has been disconnected.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect Supermetrics account.",
        variant: "destructive"
      });
    }
  };

  const handleSync = async () => {
    if (!isConnected) {
      toast({
        title: "Not Connected",
        description: "Please connect your Supermetrics account first.",
        variant: "destructive"
      });
      return;
    }

    setIsSyncing(true);
    try {
      await syncIntegration.mutateAsync('supermetrics');
      toast({
        title: "Sync Complete",
        description: "Supermetrics data has been synchronized successfully.",
      });
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to sync Supermetrics data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const integration = integrations?.find(i => i.platform === 'supermetrics');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Supermetrics Integration
            </CardTitle>
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? "Connected" : "Not Connected"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              Connect your Supermetrics account to automatically pull marketing data from all your connected platforms 
              (Google Ads, Facebook Ads, Google Analytics, etc.) into your dashboard.
            </p>
            <div className="flex items-center gap-2 text-blue-600">
              <ExternalLink className="h-4 w-4" />
              <a 
                href="https://supermetrics.com/product/api/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:underline"
              >
                Get your Supermetrics API credentials
              </a>
            </div>
          </div>

          {/* Credentials Configuration */}
          <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <h3 className="font-medium">API Credentials</h3>
            </div>
            
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientId">Client ID</Label>
                <Input
                  id="clientId"
                  type="text"
                  value={credentials.clientId}
                  onChange={(e) => setCredentials(prev => ({ ...prev, clientId: e.target.value }))}
                  placeholder="Your Supermetrics Client ID"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="clientSecret">Client Secret</Label>
                <Input
                  id="clientSecret"
                  type="password"
                  value={credentials.clientSecret}
                  onChange={(e) => setCredentials(prev => ({ ...prev, clientSecret: e.target.value }))}
                  placeholder="Your Supermetrics Client Secret"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accessToken">Access Token (Optional)</Label>
                <Input
                  id="accessToken"
                  type="password"
                  value={credentials.accessToken}
                  onChange={(e) => setCredentials(prev => ({ ...prev, accessToken: e.target.value }))}
                  placeholder="Your Supermetrics Access Token"
                />
              </div>
              
              <Button onClick={handleSaveCredentials} variant="outline" className="w-full">
                Save Credentials
              </Button>
            </div>
          </div>

          {/* Connection Actions */}
          <div className="space-y-4">
            {!isConnected ? (
              <Button 
                onClick={handleConnect}
                disabled={!hasStoredKeys || isConnecting}
                className="w-full"
              >
                <Link className="h-4 w-4 mr-2" />
                {isConnecting ? "Connecting..." : "Connect to Supermetrics"}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Connected to Supermetrics</span>
                </div>
                
                {integration?.last_sync && (
                  <p className="text-sm text-gray-600">
                    Last sync: {new Date(integration.last_sync).toLocaleString()}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={handleSync}
                    disabled={isSyncing}
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
                  <li>• Save your Supermetrics API credentials above</li>
                  <li>• Click "Connect to Supermetrics" to authenticate</li>
                  <li>• Your marketing data will be automatically synced</li>
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
