import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';

interface ZohoCRMConnectorProps {
  projectId?: string;
  isConnected?: boolean;
  onConnectionChange?: (connected: boolean) => void;
}

export const ZohoCRMConnector = ({ 
  projectId, 
  isConnected = false, 
  onConnectionChange 
}: ZohoCRMConnectorProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionData, setConnectionData] = useState<any>(null);
  const { toast } = useToast();

  // Check for OAuth callback parameters on mount
  useEffect(() => {
    const checkOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('zoho_code');
      const state = urlParams.get('zoho_state');
      const error = urlParams.get('zoho_error');

      if (error) {
        toast({
          title: "Connection Failed",
          description: `OAuth error: ${error}`,
          variant: "destructive",
        });
        // Clear URL parameters
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      if (code && state && projectId) {
        setIsConnecting(true);
        try {
          // Exchange code for tokens
          const { data: tokenData, error: tokenError } = await supabase.functions.invoke('zoho-oauth', {
            body: {
              action: 'exchange_code',
              code,
              projectId
            }
          });

          if (tokenError) throw tokenError;

          setConnectionData(tokenData);
          onConnectionChange?.(true);
          
          toast({
            title: "Success",
            description: "Successfully connected to Zoho CRM",
          });

          // Clear URL parameters
          window.history.replaceState({}, '', window.location.pathname);
        } catch (error) {
          console.error('Token exchange error:', error);
          toast({
            title: "Connection Failed",
            description: error instanceof Error ? error.message : "Failed to complete OAuth flow",
            variant: "destructive",
          });
        } finally {
          setIsConnecting(false);
        }
      }
    };

    checkOAuthCallback();
  }, [projectId, onConnectionChange, toast]);

  const handleConnect = async () => {
    if (!projectId) {
      toast({
        title: "Error",
        description: "Please select a project first",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('zoho-oauth', {
        body: { 
          action: 'get_auth_url',
          projectId 
        }
      });

      if (error) throw error;

      // Open OAuth popup
      const popup = window.open(
        data.authUrl,
        'zoho-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      // Listen for OAuth callback
      const messageHandler = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'ZOHO_OAUTH_SUCCESS') {
          popup?.close();
          
          // Exchange code for tokens
          const { data: tokenData, error: tokenError } = await supabase.functions.invoke('zoho-oauth', {
            body: {
              action: 'exchange_code',
              code: event.data.code,
              projectId
            }
          });

          if (tokenError) throw tokenError;

          setConnectionData(tokenData);
          onConnectionChange?.(true);
          
          toast({
            title: "Success",
            description: "Successfully connected to Zoho CRM",
          });
          
          window.removeEventListener('message', messageHandler);
        } else if (event.data.type === 'ZOHO_OAUTH_ERROR') {
          popup?.close();
          throw new Error(event.data.error || 'OAuth authentication failed');
        }
      };

      window.addEventListener('message', messageHandler);
      
      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          setIsConnecting(false);
        }
      }, 1000);

    } catch (error) {
      console.error('Zoho CRM connection error:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to Zoho CRM",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!projectId) return;

    try {
      const { error } = await supabase.functions.invoke('zoho-oauth', {
        body: {
          action: 'disconnect',
          projectId
        }
      });

      if (error) throw error;

      setConnectionData(null);
      onConnectionChange?.(false);
      
      toast({
        title: "Disconnected",
        description: "Successfully disconnected from Zoho CRM",
      });
    } catch (error) {
      console.error('Disconnect error:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect from Zoho CRM",
        variant: "destructive",
      });
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Connect Zoho CRM
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Connect your Zoho CRM to sync contacts, leads, deals, and other CRM data with your project.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-3">
            <h4 className="font-medium">What will be synced:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Contacts and leads</li>
              <li>• Deals and opportunities</li>
              <li>• Account information</li>
              <li>• Custom fields and modules</li>
            </ul>
          </div>

          <Button 
            onClick={handleConnect} 
            disabled={isConnecting || !projectId}
            className="w-full"
          >
            {isConnecting ? 'Connecting...' : 'Connect to Zoho CRM'}
          </Button>

          <div className="text-xs text-gray-500">
            You'll be redirected to Zoho to authorize this connection.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Zoho CRM Connected
          <Badge variant="default" className="bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Your Zoho CRM is successfully connected and syncing data.
          </AlertDescription>
        </Alert>

        {connectionData && (
          <div className="space-y-2">
            <h4 className="font-medium">Connection Details:</h4>
            <div className="text-sm text-gray-600">
              <p>Organization: {connectionData.organization_name || 'Connected'}</p>
              <p>User: {connectionData.user_email || 'Authorized'}</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h4 className="font-medium">Available Actions:</h4>
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Zoho CRM
            </Button>
            <Button variant="outline" size="sm" className="w-full">
              Sync Now
            </Button>
          </div>
        </div>

        <Button 
          variant="destructive" 
          onClick={handleDisconnect}
          className="w-full"
        >
          Disconnect Zoho CRM
        </Button>
      </CardContent>
    </Card>
  );
};