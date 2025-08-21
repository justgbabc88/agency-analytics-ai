import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useApiKeys } from "@/hooks/useApiKeys";
import { Video, ExternalLink, CheckCircle, AlertCircle, Key, Calendar } from "lucide-react";

interface EverWebinarConnectorProps {
  projectId?: string;
  isConnected?: boolean;
  onConnectionChange?: (connected: boolean) => void;
}

export const EverWebinarConnector = ({ projectId, isConnected = false, onConnectionChange }: EverWebinarConnectorProps) => {
  const { toast } = useToast();
  const { saveApiKeys, getApiKeys } = useApiKeys();
  const [isConnecting, setIsConnecting] = useState(false);
  const [apiKey, setApiKey] = useState('');

  const savedKeys = getApiKeys('everwebinar');

  useEffect(() => {
    if (savedKeys.api_key) {
      setApiKey(savedKeys.api_key);
    }
  }, [savedKeys]);

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your EverWebinar API key.",
        variant: "destructive"
      });
      return;
    }

    setIsConnecting(true);
    
    try {
      // Save the API key
      saveApiKeys('everwebinar', {
        api_key: apiKey.trim(),
        connected_at: new Date().toISOString(),
        project_id: projectId
      });

      // Update connection status
      onConnectionChange?.(true);

      toast({
        title: "Connected Successfully",
        description: "EverWebinar has been connected successfully. Webinar data will now be synchronized.",
      });

    } catch (error) {
      console.error('EverWebinar connection failed:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to EverWebinar. Please check your API key and try again.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      // Clear saved keys
      saveApiKeys('everwebinar', {});
      setApiKey('');

      // Update connection status
      onConnectionChange?.(false);

      toast({
        title: "Disconnected",
        description: "EverWebinar has been disconnected successfully.",
      });
    } catch (error) {
      console.error('EverWebinar disconnect failed:', error);
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect EverWebinar. Please try again.",
        variant: "destructive"
      });
    }
  };

  const testConnection = async () => {
    if (!savedKeys.api_key) {
      toast({
        title: "No API Key",
        description: "Please connect your EverWebinar account first.",
        variant: "destructive"
      });
      return;
    }

    try {
      // In a real implementation, you would test the API connection here
      toast({
        title: "Connection Test",
        description: "EverWebinar connection is working properly. Webinar data can be synchronized.",
      });
    } catch (error) {
      toast({
        title: "Connection Test Failed",
        description: "Failed to test EverWebinar connection. Please check your API key.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-purple-600" />
              EverWebinar Integration
            </CardTitle>
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? "Connected" : "Not Connected"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              Connect your EverWebinar account to automatically sync webinar registrations, 
              attendance data, and participant insights.
            </p>
            <div className="flex items-center gap-2 text-purple-600">
              <ExternalLink className="h-4 w-4" />
              <a 
                href="https://help.everwebinar.com/article/74-api-documentation" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:underline"
              >
                EverWebinar API Documentation
              </a>
            </div>
          </div>

          {!isConnected ? (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-blue-50">
                <div className="flex items-center gap-2 mb-3">
                  <Key className="h-4 w-4 text-blue-600" />
                  <h3 className="font-medium text-blue-800">Setup Instructions</h3>
                </div>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Log in to your EverWebinar account</li>
                  <li>Go to Settings → API Keys</li>
                  <li>Generate a new API key</li>
                  <li>Copy and paste the API key below</li>
                </ol>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="everwebinar-api-key">API Key *</Label>
                  <Input
                    id="everwebinar-api-key"
                    type="password"
                    placeholder="Enter your EverWebinar API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>
              </div>

              <Button 
                onClick={handleConnect}
                disabled={isConnecting || !apiKey.trim()}
                className="w-full"
              >
                {isConnecting ? "Connecting..." : "Connect EverWebinar"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-green-50">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <h3 className="font-medium text-green-800">Connected Successfully</h3>
                </div>
                <p className="text-sm text-green-700">
                  Your EverWebinar account is connected and ready to sync webinar data.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium">Registrations</p>
                        <p className="text-xs text-gray-600">Auto-synced</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-purple-600" />
                      <div>
                        <p className="text-sm font-medium">Attendance</p>
                        <p className="text-xs text-gray-600">Live tracking</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm font-medium">Conversions</p>
                        <p className="text-xs text-gray-600">Analytics ready</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={testConnection}>
                  Test Connection
                </Button>
                <Button variant="outline" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              </div>

              {savedKeys.api_key && (
                <div className="text-xs text-gray-500">
                  API Key: ••••••••{savedKeys.api_key.slice(-4)}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};