
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';
import { 
  filterEventsByDateRange, 
  filterEventsByScheduledDateRange,
  filterCancelledEventsByDateRange,
  isEventCreatedToday,
  isEventScheduledToday
} from '@/utils/dateFiltering';

export const useCalendlyData = (projectId?: string) => {
  const { getUserTimezone } = useUserProfile();
  const userTimezone = getUserTimezone();

  const { data: calendlyEvents, isLoading, refetch } = useQuery({
    queryKey: ['calendly-events', projectId, userTimezone],
    queryFn: async () => {
      if (!projectId) return [];

      console.log('🔍 [useCalendlyData] Fetching events for project:', projectId);
      console.log('🌍 [useCalendlyData] Using user timezone:', userTimezone);

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
        console.log('📋 [useCalendlyData] Sample raw events with timezone context:', 
          allEvents.slice(0, 3).map(e => ({
            id: e.calendly_event_id,
            event_type_name: e.event_type_name,
            status: e.status,
            created_at_utc: e.created_at,
            created_at_user_tz: new Date(e.created_at).toLocaleString('en-US', { timeZone: userTimezone }),
            scheduled_at_utc: e.scheduled_at,
            scheduled_at_user_tz: new Date(e.scheduled_at).toLocaleString('en-US', { timeZone: userTimezone })
          }))
        );
      }

      // Get active mappings for filtering
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

      // If no active mappings, return all events
      if (!mappings || mappings.length === 0) {
        console.log('⚠️ [useCalendlyData] No active mappings found, returning all events');
        return allEvents || [];
      }

      const activeIds = new Set(mappings.map(m => m.calendly_event_type_id));
      console.log('🔍 [useCalendlyData] Active event type IDs to filter by:', Array.from(activeIds));

      // Filter events based on active mappings
      const filteredEvents = (allEvents || []).filter(e => {
        const isIncluded = activeIds.has(e.calendly_event_type_id);
        if (!isIncluded) {
          console.log(`🔍 [useCalendlyData] Filtering out event: ${e.event_type_name} (${e.calendly_event_type_id})`);
        }
        return isIncluded;
      });

      console.log('✅ [useCalendlyData] Final filtered events:', filteredEvents.length);
      
      if (filteredEvents.length > 0) {
        console.log('📋 [useCalendlyData] Sample filtered events with timezone:', 
          filteredEvents.slice(0, 3).map(e => ({
            id: e.calendly_event_id,
            event_type_name: e.event_type_name,
            status: e.status,
            created_date_user_tz: new Date(e.created_at).toLocaleDateString('en-US', { timeZone: userTimezone }),
            scheduled_date_user_tz: new Date(e.scheduled_at).toLocaleDateString('en-US', { timeZone: userTimezone })
          }))
        );
      }

      return filteredEvents;
    },
    enabled: !!projectId && !!userTimezone,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
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

  // Timezone-aware helper functions
  const getRecentBookings = (days: number = 7) => {
    if (!calendlyEvents || !userTimezone) return 0;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const dateRange = { from: cutoffDate, to: new Date() };
    const recentEvents = filterEventsByDateRange(calendlyEvents, dateRange, userTimezone);
    
    console.log(`📊 [getRecentBookings] Events in last ${days} days (${userTimezone}):`, recentEvents.length);
    return recentEvents.length;
  };

  // Get bookings for current month vs previous month (timezone-aware)
  const getMonthlyComparison = () => {
    if (!calendlyEvents || !userTimezone) return { current: 0, previous: 0 };
    
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const currentEvents = filterEventsByDateRange(calendlyEvents, 
      { from: currentMonthStart, to: now }, userTimezone);
    const previousEvents = filterEventsByDateRange(calendlyEvents, 
      { from: previousMonthStart, to: previousMonthEnd }, userTimezone);
    
    console.log(`📊 [getMonthlyComparison] Current month: ${currentEvents.length}, Previous: ${previousEvents.length} (${userTimezone})`);
    return { current: currentEvents.length, previous: previousEvents.length };
  };

  // Get events by creation date (timezone-aware)
  const getEventsByCreationDate = (targetDate: Date) => {
    if (!calendlyEvents || !userTimezone) return [];
    
    const events = calendlyEvents.filter(event => 
      isEventCreatedOnDate(event.created_at, targetDate, userTimezone)
    );
    
    console.log(`📊 [getEventsByCreationDate] Events created on ${targetDate.toDateString()} (${userTimezone}):`, events.length);
    return events;
  };

  // Get events by scheduled date (timezone-aware)
  const getEventsByScheduledDate = (targetDate: Date) => {
    if (!calendlyEvents || !userTimezone) return [];
    
    const events = calendlyEvents.filter(event => 
      isEventScheduledOnDate(event.scheduled_at, targetDate, userTimezone)
    );
    
    console.log(`📊 [getEventsByScheduledDate] Events scheduled on ${targetDate.toDateString()} (${userTimezone}):`, events.length);
    return events;
  };

  // Helper function for date filtering with timezone awareness
  const filterEventsByDateRangeWithTimezone = (dateRange: { from: Date; to: Date }) => {
    if (!calendlyEvents || !userTimezone) return [];
    return filterEventsByDateRange(calendlyEvents, dateRange, userTimezone);
  };

  const filterEventsByScheduledDateRangeWithTimezone = (dateRange: { from: Date; to: Date }) => {
    if (!calendlyEvents || !userTimezone) return [];
    return filterEventsByScheduledDateRange(calendlyEvents, dateRange, userTimezone);
  };

  const filterCancelledEventsByDateRangeWithTimezone = (dateRange: { from: Date; to: Date }) => {
    if (!calendlyEvents || !userTimezone) return [];
    return filterCancelledEventsByDateRange(calendlyEvents, dateRange, userTimezone);
  };

  return {
    calendlyEvents: calendlyEvents || [],
    eventMappings: eventMappings || [],
    isLoading,
    refetch,
    userTimezone,
    // Original functions (deprecated but kept for backwards compatibility)
    getRecentBookings,
    getMonthlyComparison,
    getEventsByCreationDate,
    getEventsByScheduledDate,
    // New timezone-aware functions
    filterEventsByDateRangeWithTimezone,
    filterEventsByScheduledDateRangeWithTimezone,
    filterCancelledEventsByDateRangeWithTimezone,
  };
};

// Helper function to check if an event was created on a specific date (moved here for clarity)
const isEventCreatedOnDate = (eventCreatedAt: string, targetDate: Date, userTimezone: string): boolean => {
  if (!eventCreatedAt) return false;
  
  try {
    const createdDate = new Date(eventCreatedAt);
    const eventDateInUserTz = createdDate.toLocaleDateString('en-US', { timeZone: userTimezone });
    const targetDateInUserTz = targetDate.toLocaleDateString('en-US', { timeZone: userTimezone });
    
    return eventDateInUserTz === targetDateInUserTz;
  } catch (error) {
    console.warn('Error checking event date:', eventCreatedAt, error);
    return false;
  }
};

// Helper function to check if an event was scheduled on a specific date
const isEventScheduledOnDate = (eventScheduledAt: string, targetDate: Date, userTimezone: string): boolean => {
  if (!eventScheduledAt) return false;
  
  try {
    const scheduledDate = new Date(eventScheduledAt);
    const eventDateInUserTz = scheduledDate.toLocaleDateString('en-US', { timeZone: userTimezone });
    const targetDateInUserTz = targetDate.toLocaleDateString('en-US', { timeZone: userTimezone });
    
    return eventDateInUserTz === targetDateInUserTz;
  } catch (error) {
    console.warn('Error checking event scheduled date:', eventScheduledAt, error);
    return false;
  }
};
