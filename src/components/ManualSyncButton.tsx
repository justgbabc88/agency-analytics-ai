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
      console.log('🔧 Starting smart manual sync...');
      
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
      toast.success(`Mapped ${mapData.mappingsCreated || 0} event types`);
      
      // Use incremental sync for better performance
      console.log('⚡ Triggering incremental sync...');
      
      const { data, error } = await supabase.functions.invoke('calendly-incremental-sync', {
        body: { 
          project_id: '382c6666-c24d-4de1-b449-3858a46fbed3',
          incremental: true,
          days_back: 14
        }
      });
      
      if (error) {
        console.error('❌ Incremental sync error:', error);
        toast.error('Failed to trigger sync');
        return;
      }
      
      console.log('✅ Incremental sync response:', data);
      toast.success(`Sync completed: ${data.stats?.projectsProcessed || 0} projects processed`);
      
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

  const handleDeepSync = async () => {
    setIsLoading(true);
    try {
      console.log('🗄️ Starting deep sync (90 days)...');
      toast.info('Deep sync started - this may take several minutes');
      
      const { data, error } = await supabase.functions.invoke('calendly-incremental-sync', {
        body: { 
          project_id: '382c6666-c24d-4de1-b449-3858a46fbed3',
          deep_sync: true,
          incremental: false
        }
      });
      
      if (error) {
        console.error('❌ Deep sync error:', error);
        toast.error('Failed to trigger deep sync');
        return;
      }
      
      console.log('✅ Deep sync response:', data);
      toast.success(`Deep sync completed: ${data.stats?.projectsProcessed || 0} projects processed`);
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Deep sync error:', error);
      toast.error('Failed to trigger deep sync');
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
        {isLoading ? 'Syncing...' : 'Smart Sync'}
      </Button>
      <Button 
        onClick={handleDeepSync}
        disabled={isLoading}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        {isLoading ? 'Deep Syncing...' : 'Deep Sync'}
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
    </div>
  );
};