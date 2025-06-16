
import { parseISO, isValid, startOfDay, endOfDay, isToday, format, isWithinInterval } from "date-fns";

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
    
    // Get today's date range in local timezone
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    
    // Check if the UTC timestamp falls within today's local timezone range
    const isCreatedToday = isWithinInterval(createdDate, {
      start: todayStart,
      end: todayEnd
    });
    
    console.log('Checking if event is from today:', {
      eventCreatedAt,
      eventDate: format(createdDate, 'yyyy-MM-dd HH:mm:ss'),
      eventDateUTC: createdDate.toISOString(),
      todayStart: format(todayStart, 'yyyy-MM-dd HH:mm:ss'),
      todayEnd: format(todayEnd, 'yyyy-MM-dd HH:mm:ss'),
      todayStartUTC: todayStart.toISOString(),
      todayEndUTC: todayEnd.toISOString(),
      isCreatedToday
    });
    
    return isCreatedToday;
  } catch (error) {
    console.warn('Error parsing event date for today check:', eventCreatedAt, error);
    return false;
  }
};

// Helper function to check if an event was created on a specific date (local timezone)
export const isEventCreatedOnDate = (eventCreatedAt: string, targetDate: Date): boolean => {
  if (!eventCreatedAt) return false;
  
  try {
    const createdDate = parseISO(eventCreatedAt);
    if (!isValid(createdDate)) return false;
    
    // Get the target date range in local timezone
    const targetStart = startOfDay(targetDate);
    const targetEnd = endOfDay(targetDate);
    
    // Check if the UTC timestamp falls within the target date's local timezone range
    const isOnDate = isWithinInterval(createdDate, {
      start: targetStart,
      end: targetEnd
    });
    
    console.log(`Checking if event created on ${format(targetDate, 'yyyy-MM-dd')}:`, {
      eventCreatedAt,
      eventDate: format(createdDate, 'yyyy-MM-dd HH:mm:ss'),
      eventDateUTC: createdDate.toISOString(),
      targetStart: format(targetStart, 'yyyy-MM-dd HH:mm:ss'),
      targetEnd: format(targetEnd, 'yyyy-MM-dd HH:mm:ss'),
      targetStartUTC: targetStart.toISOString(),
      targetEndUTC: targetEnd.toISOString(),
      isOnDate
    });
    
    return isOnDate;
  } catch (error) {
    console.warn('Error checking event date:', eventCreatedAt, error);
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
