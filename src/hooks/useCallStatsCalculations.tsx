
import { useMemo } from 'react';
import { startOfDay, endOfDay, subDays, isWithinInterval } from 'date-fns';

interface CalendlyEvent {
  id: string;
  calendly_event_id: string;
  calendly_event_type_id: string;
  event_type_name: string;
  scheduled_at: string;
  created_at: string;
  updated_at?: string;
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

    // Filter events created within the selected date range
    const eventsCreatedInRange = uniqueEvents.filter(event => {
      const createdAt = new Date(event.created_at);
      const isInRange = isWithinInterval(createdAt, {
        start: startOfDay(dateRange.from),
        end: endOfDay(dateRange.to)
      });
      
      if (isInRange) {
        console.log('✅ Event created in range:', {
          event_id: event.calendly_event_id,
          event_type: event.event_type_name,
          scheduled_at: event.scheduled_at,
          created_at: event.created_at,
          status: event.status
        });
      }
      
      return isInRange;
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
      }
      
      return isInRange;
    });

    console.log('📊 Events created in date range:', eventsCreatedInRange.length);
    console.log('📊 Events scheduled in date range:', eventsScheduledInRange.length);

    // Total bookings = all unique events created in the date range (when people actually booked)
    const totalBookings = eventsCreatedInRange.length;

    // Calls taken = active events scheduled for the date range that are in the past (calls that actually happened)
    const now = new Date();
    const callsTaken = eventsScheduledInRange.filter(event => {
      const scheduledTime = new Date(event.scheduled_at);
      return event.status === 'active' && scheduledTime < now;
    }).length;

    // Cancelled calls = events that are cancelled/canceled
    const cancelled = eventsScheduledInRange.filter(event => 
      event.status === 'cancelled' || event.status === 'canceled'
    ).length;

    // Show up rate = (calls taken / total scheduled calls) * 100
    // Only count past calls (taken + cancelled) for show up rate calculation
    const pastCalls = callsTaken + cancelled;
    const showUpRate = pastCalls > 0 ? Math.round((callsTaken / pastCalls) * 100) : 0;

    console.log('📈 Current period stats:', {
      totalBookings,
      callsTaken,
      cancelled,
      showUpRate,
      eventsCreatedInRange: eventsCreatedInRange.map(e => ({
        name: e.event_type_name,
        status: e.status,
        created_at: e.created_at
      })),
      eventsScheduledInRange: eventsScheduledInRange.map(e => ({
        name: e.event_type_name,
        status: e.status,
        scheduled_at: e.scheduled_at
      }))
    });

    // Calculate previous period stats for comparison
    const daysDifference = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
    const previousPeriodStart = subDays(dateRange.from, daysDifference);
    const previousPeriodEnd = subDays(dateRange.to, daysDifference);

    const previousPeriodEventsCreated = uniqueEvents.filter(event => {
      const createdAt = new Date(event.created_at);
      return isWithinInterval(createdAt, {
        start: startOfDay(previousPeriodStart),
        end: endOfDay(previousPeriodEnd)
      });
    });

    const previousPeriodEventsScheduled = uniqueEvents.filter(event => {
      const scheduledAt = new Date(event.scheduled_at);
      return isWithinInterval(scheduledAt, {
        start: startOfDay(previousPeriodStart),
        end: endOfDay(previousPeriodEnd)
      });
    });

    const previousTotalBookings = previousPeriodEventsCreated.length;
    const previousCallsTaken = previousPeriodEventsScheduled.filter(event => {
      const scheduledTime = new Date(event.scheduled_at);
      return event.status === 'active' && scheduledTime < now;
    }).length;
    const previousCancelled = previousPeriodEventsScheduled.filter(event => 
      event.status === 'cancelled' || event.status === 'canceled'
    ).length;

    const previousPastCalls = previousCallsTaken + previousCancelled;
    const previousShowUpRate = previousPastCalls > 0 ? 
      Math.round((previousCallsTaken / previousPastCalls) * 100) : 0;

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
