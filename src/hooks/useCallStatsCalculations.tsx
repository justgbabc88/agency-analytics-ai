
import { useMemo } from "react";
import { subDays, parseISO, isValid } from "date-fns";
import { filterEventsByDateRange } from "@/utils/dateFiltering";

export const useCallStatsCalculations = (calendlyEvents: any[], dateRange: { from: Date; to: Date }, userTimezone?: string) => {
  const filteredEvents = useMemo(() => {
    console.log('🔄 Recalculating filtered events for metrics with timezone:', userTimezone);
    return filterEventsByDateRange(calendlyEvents, dateRange);
  }, [calendlyEvents, dateRange.from.toISOString(), dateRange.to.toISOString(), userTimezone]);

  const callStats = useMemo(() => {
    console.log('\n=== METRICS CALCULATION ===');
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
    const previous30Days = calendlyEvents.filter(event => {
      if (!event.created_at) return false;
      try {
        const createdDate = parseISO(event.created_at);
        const thirtyDaysAgo = subDays(new Date(), 30);
        const sixtyDaysAgo = subDays(new Date(), 60);
        return isValid(createdDate) && createdDate >= sixtyDaysAgo && createdDate < thirtyDaysAgo;
      } catch (error) {
        return false;
      }
    });

    return previous30Days.reduce((stats, event) => {
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
  }, [calendlyEvents, userTimezone]);

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
