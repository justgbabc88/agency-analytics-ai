import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface FacebookBatchSyncButtonProps {
  projectId: string;
}

export const FacebookBatchSyncButton = ({ projectId }: FacebookBatchSyncButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleManualSync = async () => {
    setIsLoading(true);
    
    try {
      console.log("🔄 Starting manual Facebook batch sync for project:", projectId);
      
      const { data, error } = await supabase.functions.invoke('facebook-batch-sync', {
        body: { source: 'manual_sync', projectId }
      });

      if (error) {
        console.error("❌ Manual sync error:", error);
        toast({
          title: "Sync Failed",
          description: "Failed to sync Facebook data. Please try again.",
          variant: "destructive",
        });
        return;
      }

      console.log("✅ Manual sync completed:", data);
      
      toast({
        title: "Sync Completed",
        description: `Successfully synced Facebook data. ${data?.success_count || 0} integrations processed.`,
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