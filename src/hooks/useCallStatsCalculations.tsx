
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

    // Create 3 categories for events scheduled in range
    const cancelledCalls = eventsScheduledInRange.filter(e => e.status === 'cancelled' || e.status === 'canceled');
    const completedCalls = eventsScheduledInRange.filter(e => e.status !== 'cancelled' && e.status !== 'canceled' && new Date(e.scheduled_at) < new Date());
    const upcomingCalls = eventsScheduledInRange.filter(e => e.status !== 'cancelled' && new Date(e.scheduled_at) >= new Date());

    // Log the counts for all three categories
    console.log("📞 Cancelled:", cancelledCalls.length);
    console.log("✅ Completed:", completedCalls.length);
    console.log("📅 Upcoming:", upcomingCalls.length);

    // Use the new categories for calculations (maintaining exact same functionality)
    const callsTaken = completedCalls.length; // This replaces the old active + past logic
    const cancelled = cancelledCalls.length; // This replaces the old cancelled logic

    // Show up rate = (calls taken / total scheduled calls) * 100
    // Only count past calls (taken + cancelled) for show up rate calculation
    const pastCalls = callsTaken + cancelled;
    const showUpRate = pastCalls > 0 ? Math.round((callsTaken / pastCalls) * 100) : 0;

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

    // Calculate previous period stats using the same 3-category approach
    const previousCancelledCalls = previousPeriodEventsScheduled.filter(e => e.status === 'cancelled' || e.status === 'canceled');
    const previousCompletedCalls = previousPeriodEventsScheduled.filter(e => e.status !== 'cancelled' && e.status !== 'canceled' && new Date(e.scheduled_at) < new Date());
    const previousUpcomingCalls = previousPeriodEventsScheduled.filter(e => e.status !== 'cancelled' && new Date(e.scheduled_at) >= new Date());

    const previousTotalBookings = previousPeriodEventsCreated.length;
    const previousCallsTaken = previousCompletedCalls.length; // Using new category logic
    const previousCancelled = previousCancelledCalls.length; // Using new category logic

    const previousPastCalls = previousCallsTaken + previousCancelled;
    const previousShowUpRate = previousPastCalls > 0 ? 
      Math.round((previousCallsTaken / previousPastCalls) * 100) : 0;

    console.log('📉 Previous period stats:', {
      previousTotalBookings,
      previousCallsTaken,
      previousCancelled,
      previousShowUpRate,
      previousCategoryBreakdown: {
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
      // Expose the new categories for UI components that need them
      categories: {
        cancelled: cancelledCalls,
        completed: completedCalls,
        upcoming: upcomingCalls
      },
      categoryCounts: {
        cancelled: cancelledCalls.length,
        completed: completedCalls.length,
        upcoming: upcomingCalls.length
      },
      previousCategories: {
        cancelled: previousCancelledCalls,
        completed: previousCompletedCalls,
        upcoming: previousUpcomingCalls
      },
      previousCategoryCounts: {
        cancelled: previousCancelledCalls.length,
        completed: previousCompletedCalls.length,
        upcoming: previousUpcomingCalls.length
      }
    };
  }, [calendlyEvents, dateRange.from, dateRange.to, userTimezone]);

  return calculations;
};
