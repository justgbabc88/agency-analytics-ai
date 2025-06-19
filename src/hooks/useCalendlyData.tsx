
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useCalendlyData = (projectId?: string) => {
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

  const { data: calendlyEvents, isLoading, refetch } = useQuery({
    queryKey: ['calendly-events', projectId, eventMappings],
    queryFn: async () => {
      if (!projectId) return [];
      
      console.log('🔄 Fetching Calendly events for project:', projectId);
      console.log('🎯 Active event mappings:', eventMappings?.length || 0);
      
      // If no event mappings are active, return empty array
      if (!eventMappings || eventMappings.length === 0) {
        console.log('⚠️ No active event mappings found, returning empty events array');
        return [];
      }

      // Get the event type IDs that should be included
      const activeEventTypeIds = eventMappings.map(mapping => mapping.calendly_event_type_id);
      console.log('🎯 Filtering for event types:', activeEventTypeIds);
      
      // CRITICAL FIX: Only use database queries, no edge function calls from hooks
      const { data, error } = await supabase
        .from('calendly_events')
        .select('*')
        .eq('project_id', projectId)
        .in('calendly_event_type_id', activeEventTypeIds)
        .order('scheduled_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching Calendly events:', error);
        throw error;
      }
      
      console.log('✅ Fetched filtered Calendly events:', data?.length || 0);
      return data || [];
    },
    enabled: !!projectId && !!eventMappings,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
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
