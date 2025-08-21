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
      
      // Convert date range to Facebook API format if provided
      let syncDateRange = undefined;
      if (dateRange) {
        const since = Math.ceil((Date.now() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)).toString();
        const until = Math.ceil((Date.now() - dateRange.to.getTime()) / (1000 * 60 * 60 * 24)).toString();
        syncDateRange = { since, until };
      }
      
      const { data, error } = await supabase.functions.invoke('facebook-batch-sync', {
        body: { 
          projectId,
          dateRange: syncDateRange
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