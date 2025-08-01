import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface CalendlyCancelledEvent {
  uri: string;
  name: string;
  status: string;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
  cancellation?: {
    canceled_by: string;
    reason?: string;
    canceler_type: string;
    created_at: string;
  };
}

interface CalendlyCancelledEventsResponse {
  success: boolean;
  totalCancelled: number;
  dailyCounts: Record<string, number>;
  eventsByDate: Record<string, CalendlyCancelledEvent[]>;
  events: CalendlyCancelledEvent[];
  source: string;
}

export const useCalendlyCancelledEvents = (
  projectId: string | undefined,
  dateRange: { from: Date; to: Date },
  userTimezone?: string
) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['calendly-cancelled-events', projectId, dateRange.from, dateRange.to, userTimezone],
    queryFn: async (): Promise<CalendlyCancelledEventsResponse | null> => {
      if (!projectId) return null;

      // Format dates for Calendly API (ISO format)
      const startDate = dateRange.from.toISOString();
      const endDate = dateRange.to.toISOString();

      console.log('🔄 Fetching cancelled events directly from Calendly:', {
        projectId,
        startDate,
        endDate,
        userTimezone
      });

      try {
        const { data, error } = await supabase.functions.invoke('calendly-cancelled-events', {
          body: {
            projectId,
            startDate,
            endDate
          }
        });

        if (error) {
          console.error('Error fetching Calendly cancelled events:', error);
          throw error;
        }

        console.log('✅ Received cancelled events from Calendly:', data);
        return data;
      } catch (error) {
        console.error('Failed to fetch Calendly cancelled events:', error);
        throw error;
      }
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Helper function to get cancelled count for a specific date
  const getCancelledCountForDate = (date: Date): number => {
    if (!data?.dailyCounts) return 0;
    
    const dateKey = format(date, 'yyyy-MM-dd');
    return data.dailyCounts[dateKey] || 0;
  };

  // Helper function to get total cancelled events in the date range
  const getTotalCancelled = (): number => {
    return data?.totalCancelled || 0;
  };

  // Helper function to get cancelled events by date (for timezone conversion if needed)
  const getCancelledEventsByUserTimezone = (): Record<string, number> => {
    if (!data?.events || !userTimezone) return data?.dailyCounts || {};

    // If timezone is provided, we need to convert cancellation dates to user timezone
    const eventsByUserDate: Record<string, number> = {};
    
    for (const event of data.events) {
      if (event.cancellation?.created_at) {
        const cancellationDate = new Date(event.cancellation.created_at);
        
        // Convert to user timezone
        const userDate = new Intl.DateTimeFormat('en-CA', {
          timeZone: userTimezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(cancellationDate);
        
        eventsByUserDate[userDate] = (eventsByUserDate[userDate] || 0) + 1;
      }
    }

    console.log('📅 Cancelled events grouped by user timezone:', {
      userTimezone,
      eventsByUserDate,
      originalCounts: data.dailyCounts
    });

    return eventsByUserDate;
  };

  return {
    cancelledEventsData: data,
    isLoading,
    error,
    refetch,
    getCancelledCountForDate,
    getTotalCancelled,
    getCancelledEventsByUserTimezone
  };
};