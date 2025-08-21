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
      console.log("🔄 Starting manual Facebook batch sync for project:", projectId);
      console.log("📡 Calling supabase function: facebook-batch-sync");
      
      const { data, error } = await supabase.functions.invoke('sync-project-integrations', {
        body: { 
          project_id: projectId,
          platform: 'facebook',
          source: 'manual_sync'
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