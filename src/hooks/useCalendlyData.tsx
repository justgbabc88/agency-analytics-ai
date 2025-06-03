
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useCalendlyData = (projectId?: string) => {
  const { data: calendlyEvents, isLoading, refetch } = useQuery({
    queryKey: ['calendly-events', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('calendly_events')
        .select('*')
        .eq('project_id', projectId)
        .order('scheduled_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const { data: eventMappings } = useQuery({
    queryKey: ['calendly-mappings', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('calendly_event_mappings')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
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
