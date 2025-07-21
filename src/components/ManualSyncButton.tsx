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
            
            // Test direct API call with PAGINATION to get ALL events
            const broadStart = '2025-07-15T00:00:00.000Z';
            const broadEnd = '2025-07-25T23:59:59.999Z';
            
            console.log('📊 Fetching ALL events with pagination...');
            let allEvents = [];
            let pageCount = 0;
            let nextPageToken = null;
            
            do {
              pageCount++;
              console.log(`📄 Fetching page ${pageCount}...`);
              
              let url = `https://api.calendly.com/scheduled_events?organization=${encodeURIComponent(tokenData.organization_uri)}&min_start_time=${broadStart}&max_start_time=${broadEnd}&count=100`;
              if (nextPageToken) url += `&page_token=${nextPageToken}`;
              
              const response = await fetch(url, {
                headers: {
                  'Authorization': `Bearer ${tokenData.access_token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ Calendly API error on page ${pageCount}:`, response.status, errorText);
                break;
              }
              
              const data = await response.json();
              const events = data.collection || [];
              allEvents.push(...events);
              
              console.log(`   Page ${pageCount}: ${events.length} events (total so far: ${allEvents.length})`);
              
              nextPageToken = data.pagination?.next_page_token;
              
              // Small delay to avoid rate limits
              if (nextPageToken) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
              
            } while (nextPageToken && pageCount < 10); // Limit to prevent infinite loops
            
            console.log(`📊 TOTAL events collected across ${pageCount} pages: ${allEvents.length}`);
            
            // Get all Property Advantage Call events and show their creation dates
            const propertyAdvantageEvents = allEvents.filter(event => {
              return event.event_type === 'https://api.calendly.com/event_types/c6fa8f5f-9cdd-40b7-98ae-90c6caed9b6f';
            });
            
            console.log(`🎯 Total Property Advantage Call events in range: ${propertyAdvantageEvents.length}`);
            
            // Group by creation date and show details
            const creationDateGroups = {};
            propertyAdvantageEvents.forEach(event => {
              const createdDate = event.created_at ? event.created_at.split('T')[0] : 'no-date';
              if (!creationDateGroups[createdDate]) {
                creationDateGroups[createdDate] = [];
              }
              creationDateGroups[createdDate].push({
                uri: event.uri,
                created_at: event.created_at,
                start_time: event.start_time,
                status: event.status
              });
            });
            
            console.log('📅 Property Advantage Call events grouped by CREATION DATE:');
            Object.keys(creationDateGroups).sort().forEach(date => {
              const events = creationDateGroups[date];
              console.log(`   ${date}: ${events.length} events`);
              
              // Show first few events for each date
              events.slice(0, 3).forEach((event, index) => {
                console.log(`     ${index + 1}. Created: ${event.created_at}, Scheduled: ${event.start_time}, Status: ${event.status}`);
              });
              
              if (events.length > 3) {
                console.log(`     ... and ${events.length - 3} more events`);
              }
            });
            
            // Specifically look for July 20th in different formats/timezones
            const july20Variants = propertyAdvantageEvents.filter(event => {
              const createdAt = event.created_at || '';
              return createdAt.includes('2025-07-20') || 
                     createdAt.includes('07-20') ||
                     createdAt.includes('20-07');
            });
            
            console.log(`🔍 Events with July 20th in created_at (any timezone): ${july20Variants.length}`);
            july20Variants.forEach((event, index) => {
              console.log(`   ${index + 1}. Full created_at: ${event.created_at}`);
            });
            
            const summary = `Found ${propertyAdvantageEvents.length} Property Advantage Call events. Creation dates: ${Object.keys(creationDateGroups).sort().join(', ')}`;
            toast.success(summary);
            
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