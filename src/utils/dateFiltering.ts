
import { parseISO, isValid, startOfDay, endOfDay } from "date-fns";

// Standardized date filtering function to ensure consistency with timezone handling
export const isEventInDateRange = (eventCreatedAt: string, startDate: Date, endDate: Date): boolean => {
  if (!eventCreatedAt) return false;
  
  try {
    const createdDate = parseISO(eventCreatedAt);
    if (!isValid(createdDate)) return false;
    
    // Use UTC for consistent timezone handling
    const eventTime = createdDate.getTime();
    const rangeStart = startOfDay(startDate).getTime();
    const rangeEnd = endOfDay(endDate).getTime();
    
    return eventTime >= rangeStart && eventTime <= rangeEnd;
  } catch (error) {
    console.warn('Error parsing event date:', eventCreatedAt, error);
    return false;
  }
};

// Enhanced date filtering for today's events specifically
export const isEventCreatedToday = (eventCreatedAt: string): boolean => {
  if (!eventCreatedAt) return false;
  
  try {
    const createdDate = parseISO(eventCreatedAt);
    if (!isValid(createdDate)) return false;
    
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    
    const eventTime = createdDate.getTime();
    const rangeStart = todayStart.getTime();
    const rangeEnd = todayEnd.getTime();
    
    console.log('Checking if event is from today:', {
      eventCreatedAt,
      eventTime: new Date(eventTime).toISOString(),
      todayStart: todayStart.toISOString(),
      todayEnd: todayEnd.toISOString(),
      isInRange: eventTime >= rangeStart && eventTime <= rangeEnd
    });
    
    return eventTime >= rangeStart && eventTime <= rangeEnd;
  } catch (error) {
    console.warn('Error parsing event date for today check:', eventCreatedAt, error);
    return false;
  }
};

// Helper function to filter events by date range consistently
export const filterEventsByDateRange = (events: any[], dateRange: { from: Date; to: Date }) => {
  console.log('\n=== FILTERING EVENTS FOR METRICS ===');
  console.log('Date range:', {
    from: dateRange.from.toISOString(),
    to: dateRange.to.toISOString()
  });
  console.log('Total events to filter:', events.length);
  
  const filtered = events.filter(event => 
    isEventInDateRange(event.created_at, dateRange.from, dateRange.to)
  );
  
  console.log('Filtered events count:', filtered.length);
  console.log('Sample filtered events:', filtered.slice(0, 3).map(e => ({
    id: e.calendly_event_id,
    created_at: e.created_at,
    scheduled_at: e.scheduled_at
  })));
  
  return filtered;
};
