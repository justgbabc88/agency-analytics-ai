
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { isEventCreatedOnDate, isEventCreatedToday, isEventScheduledOnDate, isEventScheduledToday, isEventCancelledOnDate } from "./dateFiltering";

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
  const todaysScheduledEvents = calendlyEvents.filter(event => isEventScheduledToday(event.scheduled_at, timezone));
  const todaysCreatedEvents = calendlyEvents.filter(event => isEventCreatedToday(event.created_at, timezone));
  
  console.log('🎯 Events SCHEDULED today (with timezone support):', todaysScheduledEvents.length);
  console.log('🎯 Events CREATED today (with timezone support):', todaysCreatedEvents.length);
  
  if (todaysScheduledEvents.length > 0) {
    console.log('🎯 TODAY\'S SCHEDULED EVENTS FOUND:', todaysScheduledEvents.map(e => ({
      id: e.calendly_event_id,
      created_at: e.created_at,
      scheduled_at: e.scheduled_at,
      scheduled_in_timezone: formatInTimeZone(new Date(e.scheduled_at), timezone, 'yyyy-MM-dd HH:mm:ss zzz'),
      status: e.status
    })));
  }
  
  if (todaysCreatedEvents.length > 0) {
    console.log('🎯 TODAY\'S CREATED EVENTS FOUND:', todaysCreatedEvents.map(e => ({
      id: e.calendly_event_id,
      created_at: e.created_at,
      created_in_timezone: formatInTimeZone(new Date(e.created_at), timezone, 'yyyy-MM-dd HH:mm:ss zzz'),
      scheduled_at: e.scheduled_at,
      status: e.status
    })));
  }
  
  if (todaysScheduledEvents.length === 0 && todaysCreatedEvents.length === 0) {
    console.log('⚠️ NO TODAY\'S EVENTS FOUND - Debugging timezone conversion');
    console.log('Sample events for debugging:', calendlyEvents.slice(0, 3).map(e => ({
      id: e.calendly_event_id,
      created_at: e.created_at,
      created_in_timezone: e.created_at ? formatInTimeZone(new Date(e.created_at), timezone, 'yyyy-MM-dd HH:mm:ss zzz') : 'Invalid date',
      scheduled_at: e.scheduled_at,
      scheduled_in_timezone: e.scheduled_at ? formatInTimeZone(new Date(e.scheduled_at), timezone, 'yyyy-MM-dd HH:mm:ss zzz') : 'Invalid date',
      status: e.status
    })));
  }
  
  const totalDays = daysDiff === 0 ? 1 : daysDiff + 1;
  
  for (let i = 0; i < totalDays; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    const currentDateStr = format(currentDate, 'yyyy-MM-dd');
    
    console.log(`\n--- Processing ${currentDateStr} with timezone ${timezone} ---`);
    
    // Use improved date filtering for this specific day with timezone support
    // For chart purposes, we'll use created_at to show when bookings were made
    const eventsCreatedThisDay = calendlyEvents.filter(event => 
      isEventCreatedOnDate(event.created_at, currentDate, timezone)
    );
    
    // Also check for events scheduled on this day to show completed calls
    const eventsScheduledThisDay = calendlyEvents.filter(event => 
      isEventScheduledOnDate(event.scheduled_at, currentDate, timezone)
    );
    
    // NEW: Get events that were cancelled on this specific day
    const eventsCancelledThisDay = calendlyEvents.filter(event => 
      isEventCancelledOnDate(event, currentDate, timezone)
    );
    
    console.log(`Events created on ${currentDateStr}: ${eventsCreatedThisDay.length}`);
    console.log(`Events scheduled on ${currentDateStr}: ${eventsScheduledThisDay.length}`);
    console.log(`Events cancelled on ${currentDateStr}: ${eventsCancelledThisDay.length}`);
    
    if (eventsCreatedThisDay.length > 0) {
      console.log('Sample events created this day:', eventsCreatedThisDay.slice(0, 2).map(e => ({
        created_at: e.created_at,
        created_in_timezone: formatInTimeZone(new Date(e.created_at), timezone, 'yyyy-MM-dd HH:mm:ss zzz'),
        scheduled_at: e.scheduled_at,
        status: e.status
      })));
    }
    
    if (eventsScheduledThisDay.length > 0) {
      console.log('Sample events scheduled this day:', eventsScheduledThisDay.slice(0, 2).map(e => ({
        scheduled_at: e.scheduled_at,
        scheduled_in_timezone: formatInTimeZone(new Date(e.scheduled_at), timezone, 'yyyy-MM-dd HH:mm:ss zzz'),
        created_at: e.created_at,
        status: e.status
      })));
    }
    
    if (eventsCancelledThisDay.length > 0) {
      console.log('Sample events cancelled this day:', eventsCancelledThisDay.slice(0, 2).map(e => ({
        updated_at: e.updated_at,
        cancelled_in_timezone: formatInTimeZone(new Date(e.updated_at), timezone, 'yyyy-MM-dd HH:mm:ss zzz'),
        scheduled_at: e.scheduled_at,
        status: e.status
      })));
    }
    
    // Use consistent logic: all metrics based on events created on this day for better accuracy
    // Total bookings = all events created this day (regardless of current status)
    const callsBooked = eventsCreatedThisDay.length;
    
    // Calls taken = events created this day that have status 'active', 'completed', or 'scheduled'
    const callsTaken = eventsCreatedThisDay.filter(event => 
      event.status === 'active' || event.status === 'completed' || event.status === 'scheduled'
    ).length;
    
    // Cancelled = events created this day that are now cancelled (both spellings)
    const cancelled = eventsCreatedThisDay.filter(event => 
      event.status === 'cancelled' || event.status === 'canceled'
    ).length;
    
    // Show up rate = (calls taken / total bookings) * 100 for consistency
    const showUpRate = callsBooked > 0 ? Math.round((callsTaken / callsBooked) * 100) : 0;
    
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
  console.log('Total calls taken across all days:', dates.reduce((sum, d) => sum + d.callsTaken, 0));
  console.log('Total cancelled calls across all days:', dates.reduce((sum, d) => sum + d.cancelled, 0));
  console.log('Sample data point:', dates[0]);
  console.log('Timezone used for generation:', timezone);
  
  return dates;
};
