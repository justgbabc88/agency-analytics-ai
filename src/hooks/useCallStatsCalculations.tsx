
import { useMemo } from 'react';
import { startOfDay, endOfDay, subDays, isWithinInterval } from 'date-fns';

interface CalendlyEvent {
  id: string;
  calendly_event_id: string;
  calendly_event_type_id: string;
  event_type_name: string;
  scheduled_at: string;
  created_at: string;
  invitee_name?: string;
  invitee_email?: string;
  status: string;
}

export const useCallStatsCalculations = (
  calendlyEvents: CalendlyEvent[],
  dateRange: { from: Date; to: Date },
  userTimezone?: string
) => {
  const calculations = useMemo(() => {
    console.log('🔄 useCallStatsCalculations - Calculating stats for date range:', {
      from: dateRange.from.toISOString(),
      to: dateRange.to.toISOString(),
      totalEvents: calendlyEvents.length,
      userTimezone
    });

    // Create a Set to track unique Calendly event IDs to avoid duplicates
    const uniqueEventIds = new Set();
    const uniqueEvents = calendlyEvents.filter(event => {
      if (uniqueEventIds.has(event.calendly_event_id)) {
        console.log('🔄 Duplicate event found and filtered out:', event.calendly_event_id);
        return false;
      }
      uniqueEventIds.add(event.calendly_event_id);
      return true;
    });

    console.log('📊 After deduplication:', {
      originalCount: calendlyEvents.length,
      uniqueCount: uniqueEvents.length,
      duplicatesRemoved: calendlyEvents.length - uniqueEvents.length
    });

    // Filter events scheduled within the selected date range
    const eventsScheduledInRange = uniqueEvents.filter(event => {
      const scheduledAt = new Date(event.scheduled_at);
      const isInRange = isWithinInterval(scheduledAt, {
        start: startOfDay(dateRange.from),
        end: endOfDay(dateRange.to)
      });
      
      if (isInRange) {
        console.log('✅ Event scheduled in range:', {
          event_id: event.calendly_event_id,
          event_type: event.event_type_name,
          scheduled_at: event.scheduled_at,
          created_at: event.created_at,
          status: event.status
        });
      } else {
        console.log('❌ Event NOT scheduled in range:', {
          event_id: event.calendly_event_id,
          scheduled_at: event.scheduled_at,
          created_at: event.created_at,
          dateRangeStart: startOfDay(dateRange.from).toISOString(),
          dateRangeEnd: endOfDay(dateRange.to).toISOString()
        });
      }
      
      return isInRange;
    });

    console.log('📊 Events scheduled in date range:', eventsScheduledInRange.length);

    // Total bookings = all unique events scheduled in the date range (regardless of status)
    const totalBookings = eventsScheduledInRange.length;

    // Calls taken = events with 'active' or 'completed' status
    const callsTaken = eventsScheduledInRange.filter(event => 
      event.status === 'active' || event.status === 'completed'
    ).length;

    // Cancelled calls = events with 'cancelled' status
    const cancelled = eventsScheduledInRange.filter(event => 
      event.status === 'cancelled' || event.status === 'canceled'
    ).length;

    // Show up rate = (calls taken / total scheduled calls) * 100
    // Exclude cancelled calls from the denominator as they were never scheduled to happen
    const scheduledCalls = totalBookings - cancelled;
    const showUpRate = scheduledCalls > 0 ? Math.round((callsTaken / scheduledCalls) * 100) : 0;

    console.log('📈 Current period stats:', {
      totalBookings,
      callsTaken,
      cancelled,
      scheduledCalls,
      showUpRate
    });

    // Calculate previous period stats for comparison
    const daysDifference = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
    const previousPeriodStart = subDays(dateRange.from, daysDifference);
    const previousPeriodEnd = subDays(dateRange.to, daysDifference);

    const previousPeriodEvents = uniqueEvents.filter(event => {
      const scheduledAt = new Date(event.scheduled_at);
      return isWithinInterval(scheduledAt, {
        start: startOfDay(previousPeriodStart),
        end: endOfDay(previousPeriodEnd)
      });
    });

    const previousTotalBookings = previousPeriodEvents.length;
    const previousCallsTaken = previousPeriodEvents.filter(event => 
      event.status === 'active' || event.status === 'completed'
    ).length;
    const previousCancelled = previousPeriodEvents.filter(event => 
      event.status === 'cancelled' || event.status === 'canceled'
    ).length;

    const previousScheduledCalls = previousTotalBookings - previousCancelled;
    const previousShowUpRate = previousScheduledCalls > 0 ? 
      Math.round((previousCallsTaken / previousScheduledCalls) * 100) : 0;

    console.log('📉 Previous period stats:', {
      previousTotalBookings,
      previousCallsTaken,
      previousCancelled,
      previousShowUpRate,
      periodStart: previousPeriodStart.toISOString(),
      periodEnd: previousPeriodEnd.toISOString()
    });

    return {
      callStats: {
        totalBookings,
        cancelled
      },
      previousStats: {
        totalBookings: previousTotalBookings,
        cancelled: previousCancelled
      },
      callsTaken,
      showUpRate,
      previousCallsTaken,
      previousShowUpRate
    };
  }, [calendlyEvents, dateRange.from, dateRange.to, userTimezone]);

  return calculations;
};
