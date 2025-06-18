
import { parseISO, isValid, startOfDay, endOfDay, format, isWithinInterval } from "date-fns";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";

// Enhanced date filtering function with proper timezone handling
export const isEventInDateRange = (eventCreatedAt: string, startDate: Date, endDate: Date, userTimezone?: string): boolean => {
  if (!eventCreatedAt) return false;
  
  try {
    const createdDate = parseISO(eventCreatedAt);
    if (!isValid(createdDate)) return false;
    
    // Use user's timezone or fall back to browser timezone
    const timezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    console.log('🔍 Date filtering debug:', {
      eventCreatedAt,
      timezone,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      eventUTC: createdDate.toISOString()
    });
    
    // Convert the event creation date to the user's timezone for day comparison
    const eventInUserTz = toZonedTime(createdDate, timezone);
    const eventDayInUserTz = startOfDay(eventInUserTz);
    
    // Convert the date range boundaries to user timezone for day comparison
    const startInUserTz = toZonedTime(startDate, timezone);
    const endInUserTz = toZonedTime(endDate, timezone);
    
    // Get day boundaries in the user's timezone
    const rangeStartDay = startOfDay(startInUserTz);
    const rangeEndDay = endOfDay(endInUserTz);
    
    console.log('🔍 Timezone conversion details:', {
      eventUTC: createdDate.toISOString(),
      eventInUserTz: formatInTimeZone(createdDate, timezone, 'yyyy-MM-dd HH:mm:ss zzz'),
      eventDayInUserTz: formatInTimeZone(eventDayInUserTz, timezone, 'yyyy-MM-dd HH:mm:ss zzz'),
      rangeStartDay: formatInTimeZone(rangeStartDay, timezone, 'yyyy-MM-dd HH:mm:ss zzz'),
      rangeEndDay: formatInTimeZone(rangeEndDay, timezone, 'yyyy-MM-dd HH:mm:ss zzz')
    });
    
    // Check if the event day falls within the date range in the user's timezone
    const isInRange = isWithinInterval(eventDayInUserTz, {
      start: rangeStartDay,
      end: rangeEndDay
    });
    
    console.log('🎯 Date range check result:', {
      eventCreatedAt,
      isInRange,
      timezone
    });
    
    return isInRange;
  } catch (error) {
    console.warn('Error parsing event date:', eventCreatedAt, error);
    return false;
  }
};

// Enhanced function to check if an event was scheduled on a specific date in user's timezone
export const isEventScheduledOnDate = (eventScheduledAt: string, targetDate: Date, userTimezone?: string): boolean => {
  if (!eventScheduledAt) return false;
  
  try {
    const scheduledDate = parseISO(eventScheduledAt);
    if (!isValid(scheduledDate)) return false;
    
    // Use user's timezone or fall back to browser timezone
    const timezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Convert scheduled date to user timezone for day comparison
    const eventInUserTz = toZonedTime(scheduledDate, timezone);
    const eventDayInUserTz = startOfDay(eventInUserTz);
    
    // Convert target date to user's timezone and get day boundaries
    const targetInUserTz = toZonedTime(targetDate, timezone);
    const targetDayInUserTz = startOfDay(targetInUserTz);
    
    // Check if both dates are on the same day in user's timezone
    const isOnDate = eventDayInUserTz.getTime() === targetDayInUserTz.getTime();
    
    console.log(`🔍 Checking if event scheduled on ${format(targetDate, 'yyyy-MM-dd')} (with timezone):`, {
      eventScheduledAt,
      timezone,
      eventUTC: scheduledDate.toISOString(),
      eventDayInUserTz: formatInTimeZone(eventDayInUserTz, timezone, 'yyyy-MM-dd HH:mm:ss zzz'),
      targetDayInUserTz: formatInTimeZone(targetDayInUserTz, timezone, 'yyyy-MM-dd HH:mm:ss zzz'),
      isOnDate
    });
    
    return isOnDate;
  } catch (error) {
    console.warn('Error checking event scheduled date:', eventScheduledAt, error);
    return false;
  }
};

// Enhanced date filtering for today's events with timezone support (using scheduled_at)
export const isEventScheduledToday = (eventScheduledAt: string, userTimezone?: string): boolean => {
  if (!eventScheduledAt) return false;
  
  try {
    const scheduledDate = parseISO(eventScheduledAt);
    if (!isValid(scheduledDate)) return false;
    
    // Use user's timezone or fall back to browser timezone
    const timezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Get current time and today's boundaries in user's timezone
    const now = new Date();
    const nowInUserTz = toZonedTime(now, timezone);
    const todayInUserTz = startOfDay(nowInUserTz);
    
    // Convert the event scheduled date to the user's timezone for day comparison
    const eventInUserTz = toZonedTime(scheduledDate, timezone);
    const eventDayInUserTz = startOfDay(eventInUserTz);
    
    // Check if both dates are on the same day in user's timezone
    const isScheduledToday = eventDayInUserTz.getTime() === todayInUserTz.getTime();
    
    console.log('🔍 Checking if event is scheduled for today (with timezone):', {
      eventScheduledAt,
      timezone,
      eventUTC: scheduledDate.toISOString(),
      eventDayInUserTz: formatInTimeZone(eventDayInUserTz, timezone, 'yyyy-MM-dd HH:mm:ss zzz'),
      todayInUserTz: formatInTimeZone(todayInUserTz, timezone, 'yyyy-MM-dd HH:mm:ss zzz'),
      isScheduledToday
    });
    
    return isScheduledToday;
  } catch (error) {
    console.warn('Error parsing event date for today check:', eventScheduledAt, error);
    return false;
  }
};

// Enhanced date filtering for today's events with timezone support (using created_at)
export const isEventCreatedToday = (eventCreatedAt: string, userTimezone?: string): boolean => {
  if (!eventCreatedAt) return false;
  
  try {
    const createdDate = parseISO(eventCreatedAt);
    if (!isValid(createdDate)) return false;
    
    // Use user's timezone or fall back to browser timezone
    const timezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Get current time and today's boundaries in user's timezone
    const now = new Date();
    const nowInUserTz = toZonedTime(now, timezone);
    const todayInUserTz = startOfDay(nowInUserTz);
    
    // Convert the event creation date to the user's timezone for day comparison
    const eventInUserTz = toZonedTime(createdDate, timezone);
    const eventDayInUserTz = startOfDay(eventInUserTz);
    
    // Check if both dates are on the same day in user's timezone
    const isCreatedToday = eventDayInUserTz.getTime() === todayInUserTz.getTime();
    
    console.log('🔍 Checking if event is created today (with timezone):', {
      eventCreatedAt,
      timezone,
      eventUTC: createdDate.toISOString(),
      eventDayInUserTz: formatInTimeZone(eventDayInUserTz, timezone, 'yyyy-MM-dd HH:mm:ss zzz'),
      todayInUserTz: formatInTimeZone(todayInUserTz, timezone, 'yyyy-MM-dd HH:mm:ss zzz'),
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
    
    // Convert created date to user timezone for day comparison
    const eventInUserTz = toZonedTime(createdDate, timezone);
    const eventDayInUserTz = startOfDay(eventInUserTz);
    
    // Convert target date to user's timezone for day comparison
    const targetInUserTz = toZonedTime(targetDate, timezone);
    const targetDayInUserTz = startOfDay(targetInUserTz);
    
    // Check if both dates are on the same day in user's timezone
    const isOnDate = eventDayInUserTz.getTime() === targetDayInUserTz.getTime();
    
    console.log(`🔍 Checking if event created on ${format(targetDate, 'yyyy-MM-dd')} (with timezone):`, {
      eventCreatedAt,
      timezone,
      eventUTC: createdDate.toISOString(),
      eventDayInUserTz: formatInTimeZone(eventDayInUserTz, timezone, 'yyyy-MM-dd HH:mm:ss zzz'),
      targetDayInUserTz: formatInTimeZone(targetDayInUserTz, timezone, 'yyyy-MM-dd HH:mm:ss zzz'),
      isOnDate
    });
    
    return isOnDate;
  } catch (error) {
    console.warn('Error checking event date:', eventCreatedAt, error);
    return false;
  }
};

// Helper function to filter events by date range consistently with timezone support
export const filterEventsByDateRange = (events: any[], dateRange: { from: Date; to: Date }, userTimezone?: string) => {
  console.log('\n=== FILTERING EVENTS FOR METRICS WITH TIMEZONE ===');
  console.log('Date range:', {
    from: dateRange.from.toISOString(),
    to: dateRange.to.toISOString()
  });
  console.log('User timezone:', userTimezone);
  console.log('Total events to filter:', events.length);
  
  const filtered = events.filter(event => 
    isEventInDateRange(event.created_at, dateRange.from, dateRange.to, userTimezone)
  );
  
  console.log('Filtered events count:', filtered.length);
  console.log('Sample filtered events:', filtered.slice(0, 3).map(e => ({
    id: e.calendly_event_id,
    created_at: e.created_at,
    scheduled_at: e.scheduled_at
  })));
  
  return filtered;
};

// Helper function to filter events by scheduled date range for calls that happened in a period
export const filterEventsByScheduledDateRange = (events: any[], dateRange: { from: Date; to: Date }, userTimezone?: string) => {
  console.log('\n=== FILTERING EVENTS BY SCHEDULED DATE WITH TIMEZONE ===');
  console.log('Date range:', {
    from: dateRange.from.toISOString(),
    to: dateRange.to.toISOString()
  });
  console.log('User timezone:', userTimezone);
  console.log('Total events to filter:', events.length);
  
  const timezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const filtered = events.filter(event => {
    if (!event.scheduled_at) return false;
    
    try {
      const scheduledDate = parseISO(event.scheduled_at);
      if (!isValid(scheduledDate)) return false;
      
      // Convert scheduled date to user timezone for day comparison
      const eventInUserTz = toZonedTime(scheduledDate, timezone);
      const eventDayInUserTz = startOfDay(eventInUserTz);
      
      // Convert the date range to user's timezone for day comparison
      const startInUserTz = toZonedTime(dateRange.from, timezone);
      const endInUserTz = toZonedTime(dateRange.to, timezone);
      
      // Get day boundaries in the user's timezone
      const rangeStartDay = startOfDay(startInUserTz);
      const rangeEndDay = endOfDay(endInUserTz);
      
      // Check if the event day falls within the date range
      return isWithinInterval(eventDayInUserTz, {
        start: rangeStartDay,
        end: rangeEndDay
      });
    } catch (error) {
      console.warn('Error filtering event by scheduled date:', event.scheduled_at, error);
      return false;
    }
  });
  
  console.log('Filtered events by scheduled date count:', filtered.length);
  console.log('Sample filtered events by scheduled date:', filtered.slice(0, 3).map(e => ({
    id: e.calendly_event_id,
    created_at: e.created_at,
    scheduled_at: e.scheduled_at,
    status: e.status
  })));
  
  return filtered;
};
