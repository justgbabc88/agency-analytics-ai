import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, ExternalLink, CheckCircle, AlertCircle, Link, Users, RefreshCw } from "lucide-react";
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
      if (!projectId) return;
      
      // Get project integration
      const { data: integrationData } = await supabase
        .from('project_integrations')
        .select('*')
        .eq('project_id', projectId)
        .eq('platform', 'facebook')
        .maybeSingle();
      
      setProjectIntegration(integrationData);
      
      // Get project integration data (saved keys)
      const { data: keyData } = await supabase
        .from('project_integration_data')
        .select('data')
        .eq('project_id', projectId)
        .eq('platform', 'facebook')
        .maybeSingle();
      
      setSavedKeys((keyData?.data as SavedKeys) || {});
      
      if (keyData?.data && typeof keyData.data === 'object' && 'selected_ad_account_id' in keyData.data) {
        setSelectedAccount((keyData.data as SavedKeys).selected_ad_account_id || '');
      }
    };
    
    loadProjectIntegration();
  }, [projectId]);

  const handleFacebookAuth = async () => {
    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('facebook-oauth', {
        body: { action: 'initiate', permission_level: 'ads', projectId }
      });

      if (error || !data?.authUrl) {
        throw new Error('Failed to initiate OAuth process');
      }

      window.open(data.authUrl, 'facebook-oauth', 'width=600,height=700');
      
      toast({
        title: "Opening Facebook",
        description: "Complete the authorization in the popup window.",
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Facebook. Please try again.",
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
          <p>Connect your Facebook Ads account to automatically pull advertising data and campaign metrics.</p>
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
              
              {projectIntegration?.last_sync && (
                <p className="text-sm text-gray-600">
                  Last sync: {new Date(projectIntegration.last_sync).toLocaleString()}
                </p>
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