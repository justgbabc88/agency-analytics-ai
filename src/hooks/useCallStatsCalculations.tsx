
import { useMemo } from "react";
import { subDays, parseISO, isValid } from "date-fns";
import { filterEventsByDateRange } from "@/utils/dateFiltering";

export const useCallStatsCalculations = (calendlyEvents: any[], dateRange: { from: Date; to: Date }, userTimezone?: string) => {
  const filteredEvents = useMemo(() => {
    console.log('🔄 Recalculating filtered events for metrics with timezone:', userTimezone);
    return filterEventsByDateRange(calendlyEvents, dateRange, userTimezone);
  }, [calendlyEvents, dateRange.from.toISOString(), dateRange.to.toISOString(), userTimezone]);

  const callStats = useMemo(() => {
    console.log('\n=== METRICS CALCULATION WITH TIMEZONE ===');
    console.log('Filtered events for metrics (by created_at):', filteredEvents.length);
    console.log('Using timezone for calculations:', userTimezone);

    return filteredEvents.reduce((stats, event) => {
      stats.totalBookings++;
      switch (event.status) {
        case 'active':
        case 'scheduled':
          stats.scheduled++;
          break;
        case 'canceled':
        case 'cancelled':
          stats.cancelled++;
          break;
        case 'no_show':
          stats.noShows++;
          break;
        default:
          stats.other++;
      }
      return stats;
    }, { totalBookings: 0, scheduled: 0, cancelled: 0, noShows: 0, other: 0 });
  }, [filteredEvents, userTimezone]);

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

    return previousEvents.reduce((stats, event) => {
      stats.totalBookings++;
      switch (event.status) {
        case 'active':
        case 'scheduled':
          stats.scheduled++;
          break;
        case 'canceled':
        case 'cancelled':
          stats.cancelled++;
          break;
        case 'no_show':
          stats.noShows++;
          break;
      }
      return stats;
    }, { totalBookings: 0, scheduled: 0, cancelled: 0, noShows: 0 });
  }, [calendlyEvents, dateRange, userTimezone]);

  const callsTaken = callStats.scheduled - callStats.noShows;
  const showUpRate = callStats.scheduled > 0 ? ((callsTaken / callStats.scheduled) * 100) : 0;
  const previousCallsTaken = previousStats.scheduled - previousStats.noShows;
  const previousShowUpRate = previousStats.scheduled > 0 ? ((previousCallsTaken / previousStats.scheduled) * 100) : 0;

  return {
    callStats,
    previousStats,
    callsTaken,
    showUpRate,
    previousCallsTaken,
    previousShowUpRate,
  };
};
