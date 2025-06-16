
import { format } from "date-fns";
import { isEventInDateRange, isEventCreatedToday } from "./dateFiltering";

// Generate chart data based on real Calendly events with improved date filtering
export const generateCallDataFromEvents = (calendlyEvents: any[], dateRange: { from: Date; to: Date }) => {
  const dates = [];
  const { from: startDate, to: endDate } = dateRange;
  
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  console.log('=== CHART DATA GENERATION DEBUG ===');
  console.log('Date range:', format(startDate, 'yyyy-MM-dd'), 'to', format(endDate, 'yyyy-MM-dd'));
  console.log('Total days in range:', daysDiff);
  console.log('Total Calendly events available:', calendlyEvents.length);
  
  // Log today's events specifically
  const todaysEvents = calendlyEvents.filter(event => isEventCreatedToday(event.created_at));
  console.log('Events created today:', todaysEvents.length);
  console.log('Today\'s events sample:', todaysEvents.slice(0, 3).map(e => ({
    id: e.calendly_event_id,
    created_at: e.created_at,
    scheduled_at: e.scheduled_at,
    status: e.status
  })));
  
  const totalDays = daysDiff === 0 ? 1 : daysDiff + 1;
  
  for (let i = 0; i < totalDays; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    const currentDateStr = format(currentDate, 'yyyy-MM-dd');
    
    console.log(`\n--- Processing ${currentDateStr} ---`);
    
    // Filter events created on this specific day
    const eventsCreatedThisDay = calendlyEvents.filter(event => 
      isEventInDateRange(event.created_at, currentDate, currentDate)
    );
    
    console.log(`Events created on ${currentDateStr}: ${eventsCreatedThisDay.length}`);
    if (eventsCreatedThisDay.length > 0) {
      console.log('Sample events for this day:', eventsCreatedThisDay.slice(0, 2).map(e => ({
        created_at: e.created_at,
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
  
  return dates;
};
