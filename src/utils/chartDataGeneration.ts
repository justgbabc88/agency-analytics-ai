
import { format, isValid } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { isEventCreatedOnDate, isEventCreatedToday, isEventScheduledOnDate, isEventScheduledToday, isEventCancelledOnDate } from "./dateFiltering";

// Generate chart data based on real Calendly events with improved date filtering and timezone support
export const generateCallDataFromEvents = (
  calendlyEvents: any[], 
  dateRange: { from: Date; to: Date }, 
  userTimezone?: string,
  trackingEvents?: any[]
) => {
  // If no date range is provided, return empty array (matches Facebook behavior)
  if (!dateRange || !dateRange.from || !dateRange.to) {
    console.log('❌ No valid date range provided, returning empty array');
    return [];
  }

  const { from: startDate, to: endDate } = dateRange;
  
  // Calculate if this is a single day selection
  const isSameDay = startDate.toDateString() === endDate.toDateString();
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Use user's timezone or fall back to browser timezone
  const timezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  console.log('=== CHART DATA GENERATION DEBUG ===');
  console.log('Date range:', format(startDate, 'yyyy-MM-dd'), 'to', format(endDate, 'yyyy-MM-dd'));
  console.log('Is same day selection:', isSameDay);
  console.log('User timezone (used for chart generation):', timezone);
  console.log('Total days in range:', daysDiff);
  console.log('Total Calendly events available:', calendlyEvents.length);
  
  const dates = [];
  
  // For single day selection, only process that one day (matches Facebook behavior)
  if (isSameDay || daysDiff === 0) {
    console.log('📍 Single day mode - processing only selected day');
    const currentDateStr = formatInTimeZone(startDate, timezone, 'yyyy-MM-dd');
    
    console.log(`\n--- Processing single day: ${currentDateStr} with timezone ${timezone} ---`);
    
    // Filter events using the call stats logic for consistency
    const eventsCreatedThisDay = calendlyEvents.filter(event => {
      try {
        const eventDate = new Date(event.created_at);
        const eventDateInTz = formatInTimeZone(eventDate, timezone, 'yyyy-MM-dd');
        return eventDateInTz === currentDateStr;
      } catch (error) {
        console.warn('Error checking event created date:', event.created_at, error);
        return false;
      }
    });
    
    const eventsScheduledThisDay = calendlyEvents.filter(event => {
      try {
        const eventDate = new Date(event.scheduled_at);
        const eventDateInTz = formatInTimeZone(eventDate, timezone, 'yyyy-MM-dd');
        return eventDateInTz === currentDateStr;
      } catch (error) {
        console.warn('Error checking event scheduled date:', event.scheduled_at, error);
        return false;
      }
    });
    
    const eventsCancelledThisDay = calendlyEvents.filter(event => {
      if (event.status !== 'cancelled' && event.status !== 'canceled') return false;
      
      try {
        const cancellationDate = event.cancelled_at || event.updated_at;
        if (!cancellationDate) return false;
        
        const cancelDate = new Date(cancellationDate);
        const cancelDateInTz = formatInTimeZone(cancelDate, timezone, 'yyyy-MM-dd');
        return cancelDateInTz === currentDateStr;
      } catch (error) {
        console.warn('Error checking cancellation date:', error);
        return false;
      }
    });
    
    console.log(`Events created on ${currentDateStr}: ${eventsCreatedThisDay.length}`);
    console.log(`Events scheduled on ${currentDateStr}: ${eventsScheduledThisDay.length}`);
    console.log(`Events cancelled on ${currentDateStr}: ${eventsCancelledThisDay.length}`);
    
    // Match the logic from useCallStatsCalculations
    const callsBooked = eventsCreatedThisDay.length;
    const callsTaken = eventsScheduledThisDay.filter(event => 
      event.status !== 'canceled' && event.status !== 'cancelled'
    ).length;
    const cancelled = eventsCancelledThisDay.length;
    
    // Calculate page views for this day
    const pageViewsThisDay = trackingEvents ? trackingEvents.filter(event => {
      if (event.event_type !== 'page_view') return false;
      
      try {
        const eventDate = formatInTimeZone(new Date(event.created_at), timezone, 'yyyy-MM-dd');
        return eventDate === currentDateStr;
      } catch (error) {
        console.warn('Error checking page view date:', error);
        return false;
      }
    }).length : 0;
    
    // Show up rate calculation matching call stats
    const totalScheduledCalls = callsTaken + cancelled;
    const showUpRate = totalScheduledCalls > 0 ? Math.round((callsTaken / totalScheduledCalls) * 100) : 0;
    
    const dayData = {
      date: format(startDate, 'MMM d'),
      totalBookings: callsBooked,
      callsBooked,
      callsTaken,
      cancelled,
      showUpRate: Math.max(showUpRate, 0),
      pageViews: pageViewsThisDay
    };
    
    console.log(`Single day data for ${currentDateStr}:`, dayData);
    dates.push(dayData);
    
  } else {
    // Multiple days mode - process each day in the range
    console.log('📊 Multiple days mode - processing date range');
    const totalDays = daysDiff + 1;
    
    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + i);
      const currentDateStr = formatInTimeZone(currentDate, timezone, 'yyyy-MM-dd');
      
      console.log(`\n--- Processing ${currentDateStr} with timezone ${timezone} ---`);
      
      // Use the same filtering logic as single day mode for consistency
      const eventsCreatedThisDay = calendlyEvents.filter(event => {
        try {
          const eventDate = new Date(event.created_at);
          const eventDateInTz = formatInTimeZone(eventDate, timezone, 'yyyy-MM-dd');
          return eventDateInTz === currentDateStr;
        } catch (error) {
          console.warn('Error checking event created date:', event.created_at, error);
          return false;
        }
      });
      
      const eventsScheduledThisDay = calendlyEvents.filter(event => {
        try {
          const eventDate = new Date(event.scheduled_at);
          const eventDateInTz = formatInTimeZone(eventDate, timezone, 'yyyy-MM-dd');
          return eventDateInTz === currentDateStr;
        } catch (error) {
          console.warn('Error checking event scheduled date:', event.scheduled_at, error);
          return false;
        }
      });
      
      const eventsCancelledThisDay = calendlyEvents.filter(event => {
        if (event.status !== 'cancelled' && event.status !== 'canceled') return false;
        
        try {
          const cancellationDate = event.cancelled_at || event.updated_at;
          if (!cancellationDate) return false;
          
          const cancelDate = new Date(cancellationDate);
          const cancelDateInTz = formatInTimeZone(cancelDate, timezone, 'yyyy-MM-dd');
          return cancelDateInTz === currentDateStr;
        } catch (error) {
          console.warn('Error checking cancellation date:', error);
          return false;
        }
      });
      
      console.log(`Events created on ${currentDateStr}: ${eventsCreatedThisDay.length}`);
      console.log(`Events scheduled on ${currentDateStr}: ${eventsScheduledThisDay.length}`);
      console.log(`Events cancelled on ${currentDateStr}: ${eventsCancelledThisDay.length}`);
      
      // Match the logic from useCallStatsCalculations
      const callsBooked = eventsCreatedThisDay.length;
      const callsTaken = eventsScheduledThisDay.filter(event => 
        event.status !== 'canceled' && event.status !== 'cancelled'
      ).length;
      const cancelled = eventsCancelledThisDay.length;
      
      // Calculate page views for this day
      const pageViewsThisDay = trackingEvents ? trackingEvents.filter(event => {
        if (event.event_type !== 'page_view') return false;
        
        try {
          const eventDate = formatInTimeZone(new Date(event.created_at), timezone, 'yyyy-MM-dd');
          return eventDate === currentDateStr;
        } catch (error) {
          console.warn('Error checking page view date:', error);
          return false;
        }
      }).length : 0;
      
      // Show up rate calculation matching call stats
      const totalScheduledCalls = callsTaken + cancelled;
      const showUpRate = totalScheduledCalls > 0 ? Math.round((callsTaken / totalScheduledCalls) * 100) : 0;
      
      const dayData = {
        date: format(currentDate, 'MMM d'),
        totalBookings: callsBooked,
        callsBooked,
        callsTaken,
        cancelled,
        showUpRate: Math.max(showUpRate, 0),
        pageViews: pageViewsThisDay
      };
      
      console.log(`Day data for ${currentDateStr}:`, dayData);
      dates.push(dayData);
    }
  }
  
  console.log('\n=== FINAL CHART DATA SUMMARY ===');
  console.log('Generated data points:', dates.length);
  console.log('Total calls booked across all days:', dates.reduce((sum, d) => sum + d.callsBooked, 0));
  console.log('Total calls taken across all days:', dates.reduce((sum, d) => sum + d.callsTaken, 0));
  console.log('Total cancelled calls across all days:', dates.reduce((sum, d) => sum + d.cancelled, 0));
  console.log('Sample data point:', dates[0]);
  console.log('Timezone used for generation:', timezone);
  
  return dates;
};
