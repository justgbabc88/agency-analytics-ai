import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface FacebookBatchSyncButtonProps {
  projectId: string;
}

export const FacebookBatchSyncButton = ({ projectId }: FacebookBatchSyncButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleManualSync = async () => {
    setIsLoading(true);
    
    try {
      console.log("🔄 Starting manual Facebook sync for project:", projectId);
      
      // First, get the Facebook integration data to get access token and ad account
      console.log("📡 Fetching Facebook integration data...");
      const { data: integrationData, error: integrationError } = await supabase
        .from('project_integration_data')
        .select('data')
        .eq('project_id', projectId)
        .eq('platform', 'facebook')
        .maybeSingle();

      if (integrationError) {
        console.error("❌ Error fetching integration data:", integrationError);
        throw new Error(`Failed to fetch Facebook credentials: ${integrationError.message}`);
      }

      if (!integrationData?.data) {
        throw new Error('No Facebook integration data found. Please connect Facebook first.');
      }

      const fbData = integrationData.data as any;
      if (!fbData.access_token) {
        throw new Error('No Facebook access token found. Please reconnect Facebook.');
      }

      if (!fbData.selected_ad_account_id) {
        throw new Error('No ad account selected. Please select an ad account first.');
      }

      console.log("📡 Calling sync function with credentials...");
      const { data, error } = await supabase.functions.invoke('sync-project-integrations', {
        body: { 
          projectId: projectId,
          platform: 'facebook',
          apiKeys: {
            access_token: fbData.access_token,
            selected_ad_account_id: fbData.selected_ad_account_id
          }
        }
      });

      console.log("📥 Function response:", { data, error });

      if (error) {
        console.error("❌ Manual sync error:", error);
        toast({
          title: "Sync Failed",
          description: `Failed to sync Facebook data: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log("✅ Manual sync completed:", data);
      
      // Invalidate React Query cache to refresh Facebook data
      queryClient.invalidateQueries({ queryKey: ['facebook-data', projectId] });
      
      toast({
        title: "Sync Completed",
        description: `Successfully synced Facebook data. Data will refresh automatically.`,
      });
      
    } catch (error) {
      console.error("❌ Manual sync error:", error);
      toast({
        title: "Sync Failed",
        description: "An unexpected error occurred during sync.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleManualSync}
      disabled={isLoading}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
      {isLoading ? 'Syncing...' : 'Sync Facebook Data'}
    </Button>
  );
};