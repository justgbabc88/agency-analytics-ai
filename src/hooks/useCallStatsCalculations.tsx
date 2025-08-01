
import { useMemo } from 'react';
import { startOfDay, endOfDay, subDays, isWithinInterval, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { filterCancelledEventsByDateRange } from '../utils/dateFiltering';

interface CalendlyEvent {
  id: string;
  calendly_event_id: string;
  calendly_event_type_id: string;
  event_type_name: string;
  scheduled_at: string;
  created_at: string;
  updated_at?: string;
  cancelled_at?: string | null;
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

    console.log('📅 Date range being used for filtering:', {
      from: dateRange.from,
      to: dateRange.to,
      startOfDay_from: startOfDay(dateRange.from),
      endOfDay_to: endOfDay(dateRange.to),
      timezone: userTimezone || 'UTC'
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
    
    // Debug: Log all events with their statuses
    console.log('🔍 All events scheduled in range with statuses:', eventsScheduledInRange.map(e => ({
      id: e.calendly_event_id,
      status: e.status,
      scheduled_at: e.scheduled_at,
      event_type: e.event_type_name
    })));

    // UPDATED METRICS TO MATCH CALENDLY LOGIC:
    
    // 1. Total Bookings = Events created in the date range (when people actually booked)
    // This is already correct above
    
    // 2. Calls Taken = Events scheduled for today/date range MINUS canceled ones
    // This matches how Calendly shows "calls taken" - it's scheduled minus cancellations
    const callsTakenEvents = eventsScheduledInRange.filter(event => {
      return event.status !== 'canceled' && event.status !== 'cancelled';
    });

    // 3. Calls Canceled = Events that were canceled within the date range (by cancellation date)
    // Use the optimized filtering function that handles timezone conversion properly
    const cancelledCalls = filterCancelledEventsByDateRange(uniqueEvents, dateRange, userTimezone);

    console.log('🚫 Total cancelled calls found:', cancelledCalls.length);
    console.log('🚫 Cancelled calls details:', cancelledCalls.map(e => ({
      id: e.calendly_event_id,
      status: e.status,
      scheduled_at: e.scheduled_at
    })));

    // For show-up rate calculation, we need completed vs total scheduled
    const completedCalls = eventsScheduledInRange.filter(event => {
      const isNotCanceled = (event.status !== 'canceled' && event.status !== 'cancelled');
      const isPastScheduled = new Date(event.scheduled_at) < new Date();
      const shouldInclude = isNotCanceled && isPastScheduled;
      
      console.log('✅ Checking completed call:', {
        id: event.calendly_event_id,
        status: event.status,
        scheduled_at: event.scheduled_at,
        isNotCanceled,
        isPastScheduled,
        shouldInclude
      });
      
      return shouldInclude;
    });

    const upcomingCalls = eventsScheduledInRange.filter(event => {
      const isNotCanceled = (event.status !== 'canceled' && event.status !== 'cancelled');
      const isFutureScheduled = new Date(event.scheduled_at) >= new Date();
      return isNotCanceled && isFutureScheduled;
    });

    console.log('❌ Cancelled calls:', cancelledCalls.length);
    console.log('✅ Completed calls:', completedCalls.length);
    console.log('📅 Upcoming calls:', upcomingCalls.length);

    // Total bookings = all unique events created in the date range (when people actually booked)
    const totalBookings = eventsCreatedInRange.length;

    // UPDATED CALCULATIONS TO MATCH CALENDLY'S NUMBERS:
    
    // Calls Taken = All non-canceled events scheduled in the date range
    // This matches Calendly's logic: scheduled events minus cancellations
    const callsTaken = callsTakenEvents.length;
    
    // Canceled = Events canceled that were scheduled for this period  
    const cancelled = cancelledCalls.length;

    // Show up rate = (completed calls / total past scheduled calls) * 100
    // Only count past calls (completed + cancelled) for show up rate calculation
    const pastCalls = completedCalls.length + cancelledCalls.length;
    const showUpRate = pastCalls > 0 ? Math.round((completedCalls.length / pastCalls) * 100) : 0;

    console.log('📈 Current period stats:', {
      totalBookings,
      callsTaken,
      cancelled,
      showUpRate,
      categoryBreakdown: {
        cancelled: cancelledCalls.length,
        completed: completedCalls.length,
        upcoming: upcomingCalls.length
      },
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

    // Calculate previous period stats using the same filtering approach
    const previousCancelledCalls = previousPeriodEventsScheduled.filter(event =>
      event.status === 'cancelled' || event.status === 'canceled'
    );

    const previousCallsTakenEvents = previousPeriodEventsScheduled.filter(event =>
      event.status !== 'cancelled' && event.status !== 'canceled'
    );

    const previousCompletedCalls = previousPeriodEventsScheduled.filter(event =>
      (event.status !== 'cancelled' && event.status !== 'canceled') &&
      new Date(event.scheduled_at) < new Date()
    );

    const previousUpcomingCalls = previousPeriodEventsScheduled.filter(event =>
      (event.status !== 'cancelled' && event.status !== 'canceled') &&
      new Date(event.scheduled_at) >= new Date()
    );

    const previousTotalBookings = previousPeriodEventsCreated.length;
    const previousCallsTaken = previousCallsTakenEvents.length; // Using callsTakenEvents logic
    const previousCancelled = previousCancelledCalls.length; // Using cancelledCalls logic

    const previousPastCalls = previousCompletedCalls.length + previousCancelledCalls.length;
    const previousShowUpRate = previousPastCalls > 0 ? 
      Math.round((previousCompletedCalls.length / previousPastCalls) * 100) : 0;

    console.log('📉 Previous period stats:', {
      previousTotalBookings,
      previousCallsTaken,
      previousCancelled,
      previousShowUpRate,
      previousCallBreakdown: {
        cancelled: previousCancelledCalls.length,
        completed: previousCompletedCalls.length,
        upcoming: previousUpcomingCalls.length
      },
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
      previousShowUpRate,
      // Expose the filtered arrays for UI components
      cancelledCalls,
      completedCalls,
      upcomingCalls,
      // Expose counts for easier access
      callCounts: {
        cancelled: cancelledCalls.length,
        completed: completedCalls.length,
        upcoming: upcomingCalls.length
      },
      // Previous period arrays and counts
      previousCancelledCalls,
      previousCompletedCalls,
      previousUpcomingCalls,
      previousCallCounts: {
        cancelled: previousCancelledCalls.length,
        completed: previousCompletedCalls.length,
        upcoming: previousUpcomingCalls.length
      }
    };
  }, [calendlyEvents, dateRange.from, dateRange.to, userTimezone]);

  return calculations;
};
