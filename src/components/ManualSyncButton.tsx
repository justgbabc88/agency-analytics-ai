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
          console.log('🔍 Running comprehensive diagnostics...');
          
          // Check current DB count
          const { count: dbCount } = await supabase
            .from('calendly_events')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', '382c6666-c24d-4de1-b449-3858a46fbed3')
            .eq('event_type_name', 'Property Advantage Call')
            .gte('scheduled_at', '2025-07-01T00:00:00.000Z')
            .lte('scheduled_at', '2025-07-11T23:59:59.999Z');
          
          // Check by status
          const { data: byStatus } = await supabase
            .from('calendly_events')
            .select('status')
            .eq('project_id', '382c6666-c24d-4de1-b449-3858a46fbed3')
            .eq('event_type_name', 'Property Advantage Call')
            .gte('scheduled_at', '2025-07-01T00:00:00.000Z')
            .lte('scheduled_at', '2025-07-11T23:59:59.999Z');
          
          // Get status breakdown
          const statusCounts = byStatus?.reduce((acc, event) => {
            acc[event.status] = (acc[event.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>) || {};
          
          console.log(`📊 Current DB count for July 1-11: ${dbCount}`);
          console.log(`📈 Status breakdown:`, statusCounts);
          console.log(`🎯 Target: 254 events (131 created + 123 completed)`);
          console.log(`📉 Missing: ${254 - (dbCount || 0)} events`);
          
          const statusText = Object.entries(statusCounts).map(([status, count]) => `${status}: ${count}`).join(', ');
          toast.success(`DB: ${dbCount || 0}/254 events. Status: ${statusText || 'none'}`);
        }}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        Check Count
      </Button>
      <Button 
        onClick={async () => {
          console.log('🔍 Running July 20th Calendly diagnostic...');
          
          try {
            const { data, error } = await supabase.functions.invoke('calendly-diagnostic');
            
            if (error) {
              console.error('❌ Diagnostic error:', error);
              toast.error('Diagnostic failed');
              return;
            }
            
            console.log('📊 Diagnostic results:', data);
            
            if (data.july20Focus) {
              const focus = data.july20Focus;
              console.log(`🎯 API shows ${focus.eventsCreatedOnJuly20thFromAPI} events CREATED on July 20th`);
              console.log(`🎯 DB has ${focus.eventsCreatedOnJuly20thInDB} events CREATED on July 20th`);
              console.log(`📋 Missing events: ${focus.missingCreatedEvents}`);
              
              if (focus.createdEventDetails.length > 0) {
                console.log('📋 Events created on July 20th from API:', focus.createdEventDetails);
              }
              
              toast.success(`API: ${focus.eventsCreatedOnJuly20thFromAPI} created, DB: ${focus.eventsCreatedOnJuly20thInDB} created. Missing: ${focus.missingCreatedEvents}`);
            }
          } catch (error) {
            console.error('❌ Diagnostic error:', error);
            toast.error('Diagnostic failed');
          }
        }}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        July 20th Diagnostic
      </Button>
    </div>
  );
};