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
          console.log('🔍 Testing Calendly API directly for July 20th events...');
          
          try {
            // Call the OAuth function to get access token
            const { data: tokenData, error: tokenError } = await supabase.functions.invoke('calendly-oauth', {
              body: {
                action: 'get_access_token',
                projectId: '382c6666-c24d-4de1-b449-3858a46fbed3'
              }
            });
            
            if (tokenError || !tokenData?.access_token) {
              console.error('❌ Could not get access token:', tokenError);
              toast.error('Could not get Calendly access token');
              return;
            }
            
            console.log('✅ Got access token');
            
            // Test direct API call for broad date range to catch events created on July 20th
            const broadStart = '2025-07-15T00:00:00.000Z';
            const broadEnd = '2025-07-25T23:59:59.999Z';
            
            const response = await fetch(`https://api.calendly.com/scheduled_events?organization=${encodeURIComponent(tokenData.organization_uri)}&min_start_time=${broadStart}&max_start_time=${broadEnd}&count=100`, {
              headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error('❌ Calendly API error:', response.status, errorText);
              toast.error(`Calendly API error: ${response.status}`);
              return;
            }
            
            const data = await response.json();
            console.log('📊 Total events in broad range:', data.collection?.length || 0);
            
            // Filter for events created on July 20th and Property Advantage Call type
            const july20CreatedEvents = data.collection?.filter(event => {
              const createdOnJuly20 = event.created_at && event.created_at.startsWith('2025-07-20');
              const isPropertyAdvantage = event.event_type === 'https://api.calendly.com/event_types/c6fa8f5f-9cdd-40b7-98ae-90c6caed9b6f';
              return createdOnJuly20 && isPropertyAdvantage;
            }) || [];
            
            console.log(`🎯 Property Advantage Call events CREATED on July 20th: ${july20CreatedEvents.length}`);
            
            if (july20CreatedEvents.length > 0) {
              console.log('📋 Events created on July 20th:');
              july20CreatedEvents.forEach((event, index) => {
                console.log(`   ${index + 1}. Created: ${event.created_at}, Scheduled: ${event.start_time}, Status: ${event.status}`);
                console.log(`      URI: ${event.uri}`);
              });
              
              toast.success(`🎯 Found ${july20CreatedEvents.length} Property Advantage Call events created on July 20th in Calendly API!`);
            } else {
              toast.error('❌ No Property Advantage Call events created on July 20th found in Calendly API');
            }
            
          } catch (error) {
            console.error('❌ API test error:', error);
            toast.error('API test failed');
          }
        }}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        Test July 20th API
      </Button>
    </div>
  );
};