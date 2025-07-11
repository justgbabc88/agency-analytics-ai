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
      console.log('🔧 First mapping all event types...');
      
      // First, create mappings for all event types
      const { data: mapData, error: mapError } = await supabase.functions.invoke('manual-map-event-types', {
        body: { projectId: '382c6666-c24d-4de1-b449-3858a46fbed3' }
      });
      
      if (mapError) {
        console.error('❌ Manual mapping error:', mapError);
        toast.error('Failed to map event types');
        return;
      }
      
      console.log('✅ Event types mapped:', mapData);
      toast.success(`Mapped ${mapData.mappingsCreated} event types`);
      
      console.log('🔧 Now triggering Calendly sync...');
      
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
      }, 3000);
      
    } catch (error) {
      console.error('❌ Manual sync error:', error);
      toast.error('Failed to trigger sync');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
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
      <Button 
        onClick={async () => {
          console.log('🔍 Checking current database status...');
          const { count: dbCount } = await supabase
            .from('calendly_events')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', '382c6666-c24d-4de1-b449-3858a46fbed3')
            .eq('event_type_name', 'Property Advantage Call')
            .gte('scheduled_at', '2025-07-01T00:00:00.000Z')
            .lte('scheduled_at', '2025-07-11T23:59:59.999Z');
          
          console.log(`📊 Current DB count for July 1-11: ${dbCount}`);
          console.log(`🎯 Target: 254 events (131 created + 123 completed)`);
          console.log(`📉 Missing: ${254 - (dbCount || 0)} events`);
          
          toast.success(`DB: ${dbCount || 0}/254 events. Check console for details.`);
        }}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        Check Count
      </Button>
    </div>
  );
};