import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const ManualSyncButton = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleManualSync = async () => {
    setIsLoading(true);
    try {
      console.log('🔧 Triggering manual Calendly sync...');
      
      const { data, error } = await supabase.functions.invoke('manual-calendly-sync');
      
      if (error) {
        console.error('❌ Manual sync error:', error);
        toast.error('Failed to trigger sync');
        return;
      }
      
      console.log('✅ Manual sync response:', data);
      toast.success('Calendly sync triggered successfully');
      
      // Refresh the page after a short delay to see updated data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Manual sync error:', error);
      toast.error('Failed to trigger sync');
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
      {isLoading ? 'Syncing...' : 'Manual Sync'}
    </Button>
  );
};