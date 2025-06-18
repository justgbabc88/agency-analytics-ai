
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
    
    // Convert everything to the user's timezone for accurate day comparison
    const eventInUserTz = toZonedTime(createdDate, timezone);
    const startInUserTz = toZonedTime(startDate, timezone);
    const endInUserTz = toZonedTime(endDate, timezone);
    
    // Get the date-only parts in user timezone
    const eventDateInUserTz = format(eventInUserTz, 'yyyy-MM-dd');
    const startDateInUserTz = format(startInUserTz, 'yyyy-MM-dd');
    const endDateInUserTz = format(endInUserTz, 'yyyy-MM-dd');
    
    console.log('🔍 Timezone conversion details:', {
      eventUTC: createdDate.toISOString(),
      eventInUserTz: formatInTimeZone(createdDate, timezone, 'yyyy-MM-dd HH:mm:ss zzz'),
      eventDateInUserTz,
      startDateInUserTz,
      endDateInUserTz,
      rangeCheck: `${eventDateInUserTz} >= ${startDateInUserTz} && ${eventDateInUserTz} <= ${endDateInUserTz}`
    });
    
    // Simple string comparison of dates in user timezone
    const isInRange = eventDateInUserTz >= startDateInUserTz && eventDateInUserTz <= endDateInUserTz;
    
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
    
    // Convert to user timezone and compare date strings
    const eventDateInUserTz = format(toZonedTime(scheduledDate, timezone), 'yyyy-MM-dd');
    const targetDateInUserTz = format(toZonedTime(targetDate, timezone), 'yyyy-MM-dd');
    
    const isOnDate = eventDateInUserTz === targetDateInUserTz;
    
    console.log(`🔍 Checking if event scheduled on ${format(targetDate, 'yyyy-MM-dd')} (with timezone):`, {
      eventScheduledAt,
      timezone,
      eventUTC: scheduledDate.toISOString(),
      eventDateInUserTz,
      targetDateInUserTz,
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
    
    // Get today's date in user timezone
    const todayInUserTz = format(toZonedTime(new Date(), timezone), 'yyyy-MM-dd');
    const eventDateInUserTz = format(toZonedTime(scheduledDate, timezone), 'yyyy-MM-dd');
    
    const isScheduledToday = eventDateInUserTz === todayInUserTz;
    
    console.log('🔍 Checking if event is scheduled for today (with timezone):', {
      eventScheduledAt,
      timezone,
      eventUTC: scheduledDate.toISOString(),
      eventDateInUserTz,
      todayInUserTz,
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
    
    // Get today's date in user timezone
    const todayInUserTz = format(toZonedTime(new Date(), timezone), 'yyyy-MM-dd');
    const eventDateInUserTz = format(toZonedTime(createdDate, timezone), 'yyyy-MM-dd');
    
    const isCreatedToday = eventDateInUserTz === todayInUserTz;
    
    console.log('🔍 Checking if event is created today (with timezone):', {
      eventCreatedAt,
      timezone,
      eventUTC: createdDate.toISOString(),
      eventDateInUserTz,
      todayInUserTz,
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
    
    // Convert to user timezone and compare date strings
    const eventDateInUserTz = format(toZonedTime(createdDate, timezone), 'yyyy-MM-dd');
    const targetDateInUserTz = format(toZonedTime(targetDate, timezone), 'yyyy-MM-dd');
    
    const isOnDate = eventDateInUserTz === targetDateInUserTz;
    
    console.log(`🔍 Checking if event created on ${format(targetDate, 'yyyy-MM-dd')} (with timezone):`, {
      eventCreatedAt,
      timezone,
      eventUTC: createdDate.toISOString(),
      eventDateInUserTz,
      targetDateInUserTz,
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
      
      // Convert to user timezone and compare date strings
      const eventDateInUserTz = format(toZonedTime(scheduledDate, timezone), 'yyyy-MM-dd');
      const startDateInUserTz = format(toZonedTime(dateRange.from, timezone), 'yyyy-MM-dd');
      const endDateInUserTz = format(toZonedTime(dateRange.to, timezone), 'yyyy-MM-dd');
      
      return eventDateInUserTz >= startDateInUserTz && eventDateInUserTz <= endDateInUserTz;
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
