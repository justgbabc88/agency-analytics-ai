
import { parseISO, isValid, startOfDay, endOfDay, format, isWithinInterval } from "date-fns";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";

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

// Enhanced date filtering for today's events with timezone support
export const isEventCreatedToday = (eventCreatedAt: string, userTimezone?: string): boolean => {
  if (!eventCreatedAt) return false;
  
  try {
    const createdDate = parseISO(eventCreatedAt);
    if (!isValid(createdDate)) return false;
    
    // Use user's timezone or fall back to browser timezone
    const timezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Get today's date in the user's timezone
    const now = new Date();
    const todayInUserTz = toZonedTime(now, timezone);
    const todayStart = startOfDay(todayInUserTz);
    const todayEnd = endOfDay(todayInUserTz);
    
    // Convert the event date to the user's timezone for comparison
    const eventInUserTz = toZonedTime(createdDate, timezone);
    
    // Check if the event falls within today's range in the user's timezone
    const isCreatedToday = isWithinInterval(eventInUserTz, {
      start: todayStart,
      end: todayEnd
    });
    
    console.log('Checking if event is from today (with timezone):', {
      eventCreatedAt,
      timezone,
      eventDate: format(createdDate, 'yyyy-MM-dd HH:mm:ss'),
      eventDateUTC: createdDate.toISOString(),
      eventInUserTz: formatInTimeZone(createdDate, timezone, 'yyyy-MM-dd HH:mm:ss'),
      todayStart: format(todayStart, 'yyyy-MM-dd HH:mm:ss'),
      todayEnd: format(todayEnd, 'yyyy-MM-dd HH:mm:ss'),
      isCreatedToday
    });
    
    return isCreatedToday;
  } catch (error) {
    console.warn('Error parsing event date for today check:', eventCreatedAt, error);
    return false;
  }
};

// Helper function to check if an event was created on a specific date with timezone support
export const isEventCreatedOnDate = (eventCreatedAt: string, targetDate: Date, userTimezone?: string): boolean => {
  if (!eventCreatedAt) return false;
  
  try {
    const createdDate = parseISO(eventCreatedAt);
    if (!isValid(createdDate)) return false;
    
    // Use user's timezone or fall back to browser timezone
    const timezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Get the target date range in the user's timezone
    const targetInUserTz = toZonedTime(targetDate, timezone);
    const targetStart = startOfDay(targetInUserTz);
    const targetEnd = endOfDay(targetInUserTz);
    
    // Convert the event date to the user's timezone for comparison
    const eventInUserTz = toZonedTime(createdDate, timezone);
    
    // Check if the event falls within the target date's range in the user's timezone
    const isOnDate = isWithinInterval(eventInUserTz, {
      start: targetStart,
      end: targetEnd
    });
    
    console.log(`Checking if event created on ${format(targetDate, 'yyyy-MM-dd')} (with timezone):`, {
      eventCreatedAt,
      timezone,
      eventDate: format(createdDate, 'yyyy-MM-dd HH:mm:ss'),
      eventDateUTC: createdDate.toISOString(),
      eventInUserTz: formatInTimeZone(createdDate, timezone, 'yyyy-MM-dd HH:mm:ss'),
      targetStart: format(targetStart, 'yyyy-MM-dd HH:mm:ss'),
      targetEnd: format(targetEnd, 'yyyy-MM-dd HH:mm:ss'),
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
