
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserProfile } from "@/hooks/useUserProfile";

export const ManualSyncButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { getUserTimezone } = useUserProfile();

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
      
      console.log('🔧 Now triggering comprehensive Calendly sync...');
      
      const userTimezone = getUserTimezone();
      const { data, error } = await supabase.functions.invoke('calendly-sync-gaps', {
        body: { 
          userTimezone,
          triggerReason: 'manual_comprehensive_sync',
          specificProjectId: '382c6666-c24d-4de1-b449-3858a46fbed3'
        }
      });
      
      if (error) {
        console.error('❌ Comprehensive sync error:', error);
        toast.error('Failed to trigger comprehensive sync');
        return;
      }
      
      console.log('✅ Comprehensive sync response:', data);
      
      // Show detailed results
      if (data.syncStats) {
        const stats = data.syncStats;
        toast.success(
          `Comprehensive sync complete! 
          🔍 API calls: ${stats.totalApiCalls}
          📊 Events: Active(${stats.activeEventsFetched}) + Completed(${stats.completedEventsFetched}) + Canceled(${stats.canceledEventsFetched})
          💾 DB: ${stats.eventsInserted} new, ${stats.eventsUpdated} updated`,
          { duration: 10000 }
        );
      } else {
        toast.success(`Comprehensive sync complete! ${data.events} events processed`);
      }
      
      // Refresh the page after a short delay to see updated data
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      
    } catch (error) {
      console.error('❌ Comprehensive sync error:', error);
      toast.error('Failed to trigger comprehensive sync');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiagnosticCheck = async () => {
    console.log('🔍 Running API diagnostic to see what Calendly is returning...');
    
    try {
      const userTimezone = getUserTimezone();
      const { data, error } = await supabase.functions.invoke('calendly-diagnostic', {
        body: { 
          userTimezone,
          projectId: '382c6666-c24d-4de1-b449-3858a46fbed3',
          dates: ['2025-07-16', '2025-07-17'] // Focus on the problematic dates
        }
      });
      
      if (error) {
        console.error('❌ Diagnostic error:', error);
        toast.error('Diagnostic check failed');
        return;
      }
      
      console.log('🔍 Calendly API diagnostic results:', data);
      
      // Show results
      if (data.summary) {
        toast.success(
          `API Diagnostic Results:
          July 16th - API: ${data.summary.july16?.apiCount || 0}, DB: ${data.summary.july16?.dbCount || 0}
          July 17th - API: ${data.summary.july17?.apiCount || 0}, DB: ${data.summary.july17?.dbCount || 0}
          
          Missing events identified: ${data.summary.missingEvents || 0}`,
          { duration: 20000 }
        );
      }
      
    } catch (error) {
      console.error('❌ Diagnostic error:', error);
      toast.error('Diagnostic check failed');
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
        {isLoading ? 'Comprehensive Sync...' : 'Comprehensive Sync'}
      </Button>
      <Button 
        onClick={handleDiagnosticCheck}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        🔍 Diagnostic Check
      </Button>
    </div>
  );
};
