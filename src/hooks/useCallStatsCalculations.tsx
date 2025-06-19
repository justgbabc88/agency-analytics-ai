
import { useMemo } from "react";
import { subDays, parseISO, isValid } from "date-fns";
import { filterEventsByDateRange, filterEventsByScheduledDateRange, filterCancelledEventsByDateRange } from "@/utils/dateFiltering";

export const useCallStatsCalculations = (calendlyEvents: any[], dateRange: { from: Date; to: Date }, userTimezone?: string) => {
  const filteredEvents = useMemo(() => {
    console.log('🔄 Recalculating filtered events for metrics with timezone:', userTimezone);
    return filterEventsByDateRange(calendlyEvents, dateRange, userTimezone);
  }, [calendlyEvents, dateRange.from.toISOString(), dateRange.to.toISOString(), userTimezone]);

  // Also get events filtered by scheduled date for more accurate call stats
  const scheduledFilteredEvents = useMemo(() => {
    console.log('🔄 Recalculating scheduled filtered events for metrics with timezone:', userTimezone);
    return filterEventsByScheduledDateRange(calendlyEvents, dateRange, userTimezone);
  }, [calendlyEvents, dateRange.from.toISOString(), dateRange.to.toISOString(), userTimezone]);

  // NEW: Get cancelled events filtered by their cancellation date
  const cancelledFilteredEvents = useMemo(() => {
    console.log('🔄 Recalculating cancelled filtered events for metrics with timezone:', userTimezone);
    return filterCancelledEventsByDateRange(calendlyEvents, dateRange, userTimezone);
  }, [calendlyEvents, dateRange.from.toISOString(), dateRange.to.toISOString(), userTimezone]);

  const callStats = useMemo(() => {
    console.log('\n=== METRICS CALCULATION WITH TIMEZONE ===');
    console.log('Filtered events for metrics (by created_at):', filteredEvents.length);
    console.log('Filtered events for metrics (by scheduled_at):', scheduledFilteredEvents.length);
    console.log('Filtered cancelled events (by cancellation date):', cancelledFilteredEvents.length);
    console.log('Using timezone for calculations:', userTimezone);

    // Use created events for total bookings, excluding cancelled ones
    const activeBookings = filteredEvents.filter(event => 
      event.status !== 'canceled' && event.status !== 'cancelled'
    );
    
    const bookingStats = activeBookings.reduce((stats, event) => {
      stats.totalBookings++;
      switch (event.status) {
        case 'active':
        case 'scheduled':
          stats.scheduled++;
          break;
        case 'no_show':
          stats.noShows++;
          break;
        default:
          stats.other++;
      }
      return stats;
    }, { totalBookings: 0, scheduled: 0, cancelled: 0, noShows: 0, other: 0 });

    // Use cancelled events filtered by cancellation date
    bookingStats.cancelled = cancelledFilteredEvents.length;

    // Use scheduled events for actual call performance metrics
    const callPerformanceStats = scheduledFilteredEvents.reduce((stats, event) => {
      switch (event.status) {
        case 'active':
        case 'scheduled':
          stats.scheduledCalls++;
          break;
        case 'canceled':
        case 'cancelled':
          stats.cancelledCalls++;
          break;
        case 'no_show':
          stats.noShowCalls++;
          break;
      }
      return stats;
    }, { scheduledCalls: 0, cancelledCalls: 0, noShowCalls: 0 });

    console.log('Booking stats (by created_at, excluding cancelled):', bookingStats);
    console.log('Call performance stats (by scheduled_at):', callPerformanceStats);
    console.log('Cancelled events stats (by cancellation date):', cancelledFilteredEvents.length);

    // Combine the stats appropriately
    return {
      totalBookings: bookingStats.totalBookings,
      scheduled: bookingStats.scheduled,
      cancelled: bookingStats.cancelled, // Now uses cancellation date
      noShows: bookingStats.noShows,
      other: bookingStats.other,
      // Use scheduled events data for actual call performance
      actualScheduledCalls: callPerformanceStats.scheduledCalls,
      actualCancelledCalls: callPerformanceStats.cancelledCalls,
      actualNoShows: callPerformanceStats.noShowCalls
    };
  }, [filteredEvents, scheduledFilteredEvents, cancelledFilteredEvents, userTimezone]);

  const previousStats = useMemo(() => {
    // Create previous date range based on the current range length
    const rangeDays = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
    const previousFrom = subDays(dateRange.from, rangeDays);
    const previousTo = subDays(dateRange.to, rangeDays);
    
    console.log('🔄 Calculating previous period stats with timezone:', userTimezone);
    console.log('Previous date range:', {
      from: previousFrom.toISOString(),
      to: previousTo.toISOString()
    });
    
    const previousEvents = filterEventsByDateRange(calendlyEvents, { from: previousFrom, to: previousTo }, userTimezone);
    const previousScheduledEvents = filterEventsByScheduledDateRange(calendlyEvents, { from: previousFrom, to: previousTo }, userTimezone);
    const previousCancelledEvents = filterCancelledEventsByDateRange(calendlyEvents, { from: previousFrom, to: previousTo }, userTimezone);

    // Use created events for total bookings, excluding cancelled ones
    const previousActiveBookings = previousEvents.filter(event => 
      event.status !== 'canceled' && event.status !== 'cancelled'
    );

    const bookingStats = previousActiveBookings.reduce((stats, event) => {
      stats.totalBookings++;
      switch (event.status) {
        case 'active':
        case 'scheduled':
          stats.scheduled++;
          break;
        case 'no_show':
          stats.noShows++;
          break;
      }
      return stats;
    }, { totalBookings: 0, scheduled: 0, cancelled: 0, noShows: 0 });

    // Use cancelled events filtered by cancellation date
    bookingStats.cancelled = previousCancelledEvents.length;

    const callPerformanceStats = previousScheduledEvents.reduce((stats, event) => {
      switch (event.status) {
        case 'active':
        case 'scheduled':
          stats.scheduledCalls++;
          break;
        case 'canceled':
        case 'cancelled':
          stats.cancelledCalls++;
          break;
        case 'no_show':
          stats.noShowCalls++;
          break;
      }
      return stats;
    }, { scheduledCalls: 0, cancelledCalls: 0, noShowCalls: 0 });

    return {
      totalBookings: bookingStats.totalBookings,
      scheduled: bookingStats.scheduled,
      cancelled: bookingStats.cancelled, // Now uses cancellation date
      noShows: bookingStats.noShows,
      actualScheduledCalls: callPerformanceStats.scheduledCalls,
      actualCancelledCalls: callPerformanceStats.cancelledCalls,
      actualNoShows: callPerformanceStats.noShowCalls
    };
  }, [calendlyEvents, dateRange, userTimezone]);

  // Calculate calls taken using actual scheduled call data
  const callsTaken = Math.max(0, callStats.actualScheduledCalls - callStats.actualNoShows);
  const showUpRate = callStats.actualScheduledCalls > 0 ? ((callsTaken / callStats.actualScheduledCalls) * 100) : 0;
  const previousCallsTaken = Math.max(0, previousStats.actualScheduledCalls - previousStats.actualNoShows);
  const previousShowUpRate = previousStats.actualScheduledCalls > 0 ? ((previousCallsTaken / previousStats.actualScheduledCalls) * 100) : 0;

  console.log('Final calculated metrics:', {
    callsTaken,
    showUpRate,
    previousCallsTaken,
    previousShowUpRate,
    totalBookings: callStats.totalBookings,
    cancelled: callStats.cancelled,
    actualScheduledCalls: callStats.actualScheduledCalls
  });

  return {
    callStats,
    previousStats,
    callsTaken,
    showUpRate,
    previousCallsTaken,
    previousShowUpRate,
  };
};
