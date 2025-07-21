
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, RefreshCw, Target, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ClickFunnelsOAuthConnectorProps {
  projectId?: string;
  isConnected: boolean;
  onConnectionChange: (connected: boolean) => void;
}

interface Funnel {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

export const ClickFunnelsOAuthConnector = ({ 
  projectId, 
  isConnected, 
  onConnectionChange 
}: ClickFunnelsOAuthConnectorProps) => {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [selectedFunnel, setSelectedFunnel] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    if (!projectId) {
      toast({
        title: "Error",
        description: "Please select a project first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('clickfunnels-oauth', {
        body: { action: 'get_auth_url', projectId }
      });

      if (error) throw error;

      // Open OAuth popup
      const popup = window.open(
        data.auth_url,
        'clickfunnels-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      // Listen for popup close or message
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          // Check if connection was successful
          checkConnectionStatus();
        }
      }, 1000);

    } catch (error) {
      console.error('OAuth error:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to ClickFunnels",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkConnectionStatus = async () => {
    if (!projectId) return;

    try {
      const { data, error } = await supabase.functions.invoke('clickfunnels-oauth', {
        body: { action: 'get_funnels', projectId }
      });

      if (error) throw error;

      setFunnels(data.funnels || []);
      onConnectionChange(true);
      
      toast({
        title: "Connected Successfully",
        description: "ClickFunnels account connected!",
      });
    } catch (error) {
      console.error('Failed to fetch funnels:', error);
    }
  };

  const loadFunnels = async () => {
    if (!projectId || !isConnected) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('clickfunnels-oauth', {
        body: { action: 'get_funnels', projectId }
      });

      if (error) throw error;
      setFunnels(data.funnels || []);
    } catch (error) {
      console.error('Failed to load funnels:', error);
      toast({
        title: "Error",
        description: "Failed to load funnels",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const syncFunnelData = async () => {
    if (!projectId || !selectedFunnel) return;

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('clickfunnels-oauth', {
        body: { 
          action: 'sync_funnel_data', 
          projectId, 
          funnelId: selectedFunnel 
        }
      });

      if (error) throw error;

      toast({
        title: "Sync Complete",
        description: "Funnel data synced successfully!",
      });
    } catch (error) {
      console.error('Sync failed:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync funnel data",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (isConnected && projectId) {
      loadFunnels();
    }
  }, [isConnected, projectId]);

  if (!projectId) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-500">Please select a project to configure ClickFunnels.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          ClickFunnels OAuth Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              Connect your ClickFunnels account to automatically sync funnel data and analytics.
            </p>
            <Button 
              onClick={handleConnect} 
              disabled={loading}
              className="w-full"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {loading ? "Connecting..." : "Connect ClickFunnels"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-600 border-green-600">
                Connected
              </Badge>
              <Button variant="ghost" size="sm" onClick={loadFunnels} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {funnels.length > 0 && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Select Funnel to Track
                  </label>
                  <Select value={selectedFunnel} onValueChange={setSelectedFunnel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a funnel..." />
                    </SelectTrigger>
                    <SelectContent>
                      {funnels.map((funnel) => (
                        <SelectItem key={funnel.id} value={funnel.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{funnel.name}</span>
                            <Badge 
                              variant={funnel.status === 'active' ? 'default' : 'secondary'}
                              className="ml-2"
                            >
                              {funnel.status}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedFunnel && (
                  <Button 
                    onClick={syncFunnelData} 
                    disabled={syncing}
                    className="w-full"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    {syncing ? "Syncing..." : "Sync Funnel Data"}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
