import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface FacebookBatchSyncButtonProps {
  projectId: string;
  dateRange?: { from: Date; to: Date };
}

export const FacebookBatchSyncButton = ({ projectId, dateRange }: FacebookBatchSyncButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleManualSync = async () => {
    setIsLoading(true);
    
    try {
      console.log('Starting Facebook batch sync for project:', projectId);
      
      // Don't pass date range - always sync last 30 days
      const { data, error } = await supabase.functions.invoke('facebook-batch-sync', {
        body: { 
          projectId
        }
      });

      console.log("📥 Function response:", { data, error });

      if (error) {
        console.error("❌ Manual sync error:", error);
        toast({
          title: "Sync Failed",
          description: error.message || "Failed to sync Facebook data",
          variant: "destructive",
        });
        return;
      }

      // Check if the response indicates an error (even if no error object)
      if (data && !data.success && data.error) {
        console.error("❌ Sync response error:", data);
        toast({
          title: "Sync Failed", 
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      console.log("✅ Manual sync completed:", data);
      
      // Invalidate React Query cache to refresh Facebook data
      queryClient.invalidateQueries({ queryKey: ['facebook-integrations', projectId] });
      
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