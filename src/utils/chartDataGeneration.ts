
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { isEventCreatedOnDate, isEventCreatedToday } from "./dateFiltering";

// Generate chart data based on real Calendly events with improved date filtering and timezone support
export const generateCallDataFromEvents = (calendlyEvents: any[], dateRange: { from: Date; to: Date }, userTimezone?: string) => {
  const dates = [];
  const { from: startDate, to: endDate } = dateRange;
  
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Use user's timezone or fall back to browser timezone
  const timezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  console.log('=== CHART DATA GENERATION DEBUG ===');
  console.log('Date range:', format(startDate, 'yyyy-MM-dd'), 'to', format(endDate, 'yyyy-MM-dd'));
  console.log('User timezone (used for chart generation):', timezone);
  console.log('Total days in range:', daysDiff);
  console.log('Total Calendly events available:', calendlyEvents.length);
  
  // Log today's events specifically with improved detection and timezone awareness
  const todaysEvents = calendlyEvents.filter(event => isEventCreatedToday(event.created_at, timezone));
  console.log('🎯 Events created today (with timezone support):', todaysEvents.length);
  
  if (todaysEvents.length > 0) {
    console.log('🎯 TODAY\'S EVENTS FOUND:', todaysEvents.map(e => ({
      id: e.calendly_event_id,
      created_at: e.created_at,
      created_in_timezone: formatInTimeZone(new Date(e.created_at), timezone, 'yyyy-MM-dd HH:mm:ss zzz'),
      scheduled_at: e.scheduled_at,
      status: e.status
    })));
  } else {
    console.log('⚠️ NO TODAY\'S EVENTS FOUND - Debugging timezone conversion');
    console.log('Sample events for debugging:', calendlyEvents.slice(0, 3).map(e => ({
      id: e.calendly_event_id,
      created_at: e.created_at,
      created_in_timezone: e.created_at ? formatInTimeZone(new Date(e.created_at), timezone, 'yyyy-MM-dd HH:mm:ss zzz') : 'Invalid date',
      scheduled_at: e.scheduled_at
    })));
  }
  
  const totalDays = daysDiff === 0 ? 1 : daysDiff + 1;
  
  for (let i = 0; i < totalDays; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    const currentDateStr = format(currentDate, 'yyyy-MM-dd');
    
    console.log(`\n--- Processing ${currentDateStr} with timezone ${timezone} ---`);
    
    // Use improved date filtering for this specific day with timezone support
    const eventsCreatedThisDay = calendlyEvents.filter(event => 
      isEventCreatedOnDate(event.created_at, currentDate, timezone)
    );
    
    console.log(`Events created on ${currentDateStr}: ${eventsCreatedThisDay.length}`);
    if (eventsCreatedThisDay.length > 0) {
      console.log('Sample events for this day:', eventsCreatedThisDay.slice(0, 2).map(e => ({
        created_at: e.created_at,
        created_in_timezone: formatInTimeZone(new Date(e.created_at), timezone, 'yyyy-MM-dd HH:mm:ss zzz'),
        scheduled_at: e.scheduled_at,
        status: e.status
      })));
    }
    
    const callsBooked = eventsCreatedThisDay.length;
    const cancelled = eventsCreatedThisDay.filter(event => 
      event.status === 'canceled' || event.status === 'cancelled'
    ).length;
    const noShows = eventsCreatedThisDay.filter(event => event.status === 'no_show').length;
    const scheduled = eventsCreatedThisDay.filter(event => 
      event.status === 'active' || event.status === 'scheduled'
    ).length;
    const callsTaken = Math.max(0, scheduled - noShows);
    const showUpRate = scheduled > 0 ? ((callsTaken / scheduled) * 100) : 0;
    
    const pageViews = Math.floor(Math.random() * 300) + 150;
    
    const dayData = {
      date: format(currentDate, 'MMM d'),
      totalBookings: callsBooked,
      callsBooked,
      callsTaken,
      cancelled,
      showUpRate: Math.max(showUpRate, 0),
      pageViews
    };
    
    console.log(`Day data for ${currentDateStr}:`, dayData);
    dates.push(dayData);
  }
  
  console.log('\n=== FINAL CHART DATA SUMMARY ===');
  console.log('Generated data points:', dates.length);
  console.log('Total calls booked across all days:', dates.reduce((sum, d) => sum + d.callsBooked, 0));
  console.log('Sample data point:', dates[0]);
  console.log('Timezone used for generation:', timezone);
  
  return dates;
};
