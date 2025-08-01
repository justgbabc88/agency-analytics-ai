import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useCalendlyData = (projectId?: string) => {
  const queryClient = useQueryClient();
  const { data: calendlyEvents, isLoading, refetch } = useQuery({
    queryKey: ['calendly-events', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      console.log('🔍 [useCalendlyData] Fetching events for project:', projectId);

      const { data: allEvents, error: eventsError } = await supabase
        .from('calendly_events')
        .select('*')
        .eq('project_id', projectId);

      if (eventsError) {
        console.error('❌ Error fetching Calendly events:', eventsError);
        throw eventsError;
      }

      console.log('📊 [useCalendlyData] Raw Calendly events found:', allEvents?.length || 0);
      if (allEvents && allEvents.length > 0) {
        console.log('📋 [useCalendlyData] Sample raw events:', allEvents.slice(0, 3).map(e => ({
          id: e.calendly_event_id,
          event_type_id: e.calendly_event_type_id,
          event_type_name: e.event_type_name,
          status: e.status,
          created_at: e.created_at,
          scheduled_at: e.scheduled_at
        })));
      }

      const { data: mappings, error: mappingsError } = await supabase
        .from('calendly_event_mappings')
        .select('calendly_event_type_id, is_active, event_type_name')
        .eq('project_id', projectId)
        .eq('is_active', true);

      if (mappingsError) {
        console.error('❌ Error fetching Calendly event mappings:', mappingsError);
        throw mappingsError;
      }

      console.log('🎯 [useCalendlyData] Active mappings found:', mappings?.length || 0);
      if (mappings && mappings.length > 0) {
        console.log('📋 [useCalendlyData] Active mappings:', mappings.map(m => ({
          event_type_id: m.calendly_event_type_id,
          event_type_name: m.event_type_name,
          is_active: m.is_active
        })));
      }

      // Filter events based on active mappings (display-level filtering)
      if (!mappings || mappings.length === 0) {
        console.log('⚠️ [useCalendlyData] No active mappings found, showing all stored events');
        console.log('📊 [useCalendlyData] Total events available:', allEvents?.length || 0);
        return allEvents || [];
      }

      const activeIds = new Set(mappings.map(m => m.calendly_event_type_id));
      console.log('🎯 [useCalendlyData] Active mappings for display:', Array.from(activeIds));

      // Filter events for display based on active mappings
      const filteredEvents = (allEvents || []).filter(e => 
        activeIds.has(e.calendly_event_type_id)
      );

      console.log('✅ [useCalendlyData] Events after display filtering:', filteredEvents.length);
      console.log('📝 [useCalendlyData] Hidden events (inactive mappings):', (allEvents?.length || 0) - filteredEvents.length);
      
      // Count events by status for debugging
      if (filteredEvents.length > 0) {
        const statusCounts = filteredEvents.reduce((acc, event) => {
          acc[event.status] = (acc[event.status] || 0) + 1;
          return acc;
        }, {});
        console.log('📊 [useCalendlyData] Visible events by status:', statusCounts);
      }
      
      // Log hidden events by type for visibility
      if (allEvents && allEvents.length > filteredEvents.length) {
        const hiddenEvents = (allEvents || []).filter(e => !activeIds.has(e.calendly_event_type_id));
        const hiddenByType = hiddenEvents.reduce((acc, event) => {
          acc[event.event_type_name] = (acc[event.event_type_name] || 0) + 1;
          return acc;
        }, {});
        console.log('👁️ [useCalendlyData] Hidden events by type:', hiddenByType);
      }

      return filteredEvents;
    },
    enabled: !!projectId,
    staleTime: 3 * 60 * 1000, // Events are fresh for 3 minutes
    gcTime: 20 * 60 * 1000, // Keep in cache for 20 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes
  });

  const { data: eventMappings } = useQuery({
    queryKey: ['calendly-mappings', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      console.log('🔄 Fetching Calendly event mappings for project:', projectId);
      
      const { data, error } = await supabase
        .from('calendly_event_mappings')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true);

      if (error) {
        console.error('❌ Error fetching Calendly event mappings:', error);
        throw error;
      }
      
      console.log('✅ Fetched Calendly event mappings:', data?.length || 0);
      return data || [];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate metrics for the last 7 days
  const getRecentBookings = (days: number = 7) => {
    if (!calendlyEvents) return 0;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return calendlyEvents.filter(event => 
      new Date(event.scheduled_at) >= cutoffDate
    ).length;
  };

  // Get bookings for current month vs previous month
  const getMonthlyComparison = () => {
    if (!calendlyEvents) return { current: 0, previous: 0 };
    
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const currentMonth = calendlyEvents.filter(event => 
      new Date(event.scheduled_at) >= currentMonthStart
    ).length;
    
    const previousMonth = calendlyEvents.filter(event => {
      const eventDate = new Date(event.scheduled_at);
      return eventDate >= previousMonthStart && eventDate <= previousMonthEnd;
    }).length;
    
    return { current: currentMonth, previous: previousMonth };
  };

  // Get events by creation date (for events created on specific days)
  const getEventsByCreationDate = (targetDate: Date) => {
    if (!calendlyEvents) return [];
    
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    return calendlyEvents.filter(event => {
      const createdAt = new Date(event.created_at);
      return createdAt >= startOfDay && createdAt <= endOfDay;
    });
  };

  // Get events by scheduled date
  const getEventsByScheduledDate = (targetDate: Date) => {
    if (!calendlyEvents) return [];
    
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    return calendlyEvents.filter(event => {
      const scheduledAt = new Date(event.scheduled_at);
      return scheduledAt >= startOfDay && scheduledAt <= endOfDay;
    });
  };

  return {
    calendlyEvents: calendlyEvents || [],
    eventMappings: eventMappings || [],
    isLoading,
    refetch,
    getRecentBookings,
    getMonthlyComparison,
    getEventsByCreationDate,
    getEventsByScheduledDate,
  };
};
