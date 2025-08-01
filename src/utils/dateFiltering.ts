
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
    
    // Convert everything to the user's timezone for accurate day comparison
    const eventInUserTz = toZonedTime(createdDate, timezone);
    const startInUserTz = toZonedTime(startDate, timezone);
    const endInUserTz = toZonedTime(endDate, timezone);
    
    // Get the date-only parts in user timezone
    const eventDateInUserTz = format(eventInUserTz, 'yyyy-MM-dd');
    const startDateInUserTz = format(startInUserTz, 'yyyy-MM-dd');
    const endDateInUserTz = format(endInUserTz, 'yyyy-MM-dd');
    
    // Simple string comparison of dates in user timezone
    const isInRange = eventDateInUserTz >= startDateInUserTz && eventDateInUserTz <= endDateInUserTz;
    
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
    
    return isOnDate;
  } catch (error) {
    console.warn('Error checking event scheduled date:', eventScheduledAt, error);
    return false;
  }
};

// NEW: Function to check if an event was cancelled on a specific date
export const isEventCancelledOnDate = (event: any, targetDate: Date, userTimezone?: string): boolean => {
  // Only check cancelled events
  if (event.status !== 'canceled' && event.status !== 'cancelled') return false;
  
  // Use cancelled_at if available, otherwise fall back to updated_at
  const cancellationDate = event.cancelled_at || event.updated_at;
  if (!cancellationDate) return false;
  
  try {
    const cancelledDate = parseISO(cancellationDate);
    if (!isValid(cancelledDate)) return false;
    
    // Use user's timezone or fall back to browser timezone
    const timezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Convert to user timezone and compare date strings
    const eventDateInUserTz = format(toZonedTime(cancelledDate, timezone), 'yyyy-MM-dd');
    const targetDateInUserTz = format(toZonedTime(targetDate, timezone), 'yyyy-MM-dd');
    
    const isOnDate = eventDateInUserTz === targetDateInUserTz;
    
    return isOnDate;
  } catch (error) {
    console.warn('Error checking event cancellation date:', cancellationDate, error);
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
  
  // Get today's date string for debugging
  const timezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const todayInUserTz = format(toZonedTime(new Date(), timezone), 'yyyy-MM-dd');
  console.log('🗓️ Today\'s date in user timezone:', todayInUserTz);
  
  // Check for events created today specifically
  const todaysEvents = events.filter(event => {
    if (!event.created_at) return false;
    try {
      const createdDate = parseISO(event.created_at);
      if (!isValid(createdDate)) return false;
      const eventDateInUserTz = format(toZonedTime(createdDate, timezone), 'yyyy-MM-dd');
      return eventDateInUserTz === todayInUserTz;
    } catch (error) {
      return false;
    }
  });
  
  console.log('🎯 Events created TODAY:', todaysEvents.length);
  if (todaysEvents.length > 0) {
    console.log('📋 TODAY\'S EVENTS:', todaysEvents.map(e => ({
      id: e.calendly_event_id,
      created_at: e.created_at,
      status: e.status,
      event_type_name: e.event_type_name
    })));
  }
  
  const filtered = events.filter(event => 
    isEventInDateRange(event.created_at, dateRange.from, dateRange.to, userTimezone)
  );
  
  console.log('Filtered events count:', filtered.length);
  console.log('Sample filtered events:', filtered.slice(0, 3).map(e => ({
    id: e.calendly_event_id,
    created_at: e.created_at,
    scheduled_at: e.scheduled_at,
    status: e.status
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

// NEW: Helper function to filter cancelled events by cancellation date
export const filterCancelledEventsByDateRange = (events: any[], dateRange: { from: Date; to: Date }, userTimezone?: string) => {
  console.log('\n=== FILTERING CANCELLED EVENTS BY CANCELLATION DATE ===');
  console.log('Date range:', {
    from: dateRange.from.toISOString(),
    to: dateRange.to.toISOString()
  });
  console.log('User timezone:', userTimezone);
  
  const timezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // First filter only cancelled events
  const cancelledEvents = events.filter(event => 
    event.status === 'canceled' || event.status === 'cancelled'
  );
  
  console.log('Total cancelled events:', cancelledEvents.length);
  
  // Then filter by cancellation date (cancelled_at or updated_at)
  const filtered = cancelledEvents.filter(event => {
    // Use cancelled_at if available, otherwise fall back to updated_at
    const cancellationDate = event.cancelled_at || event.updated_at;
    if (!cancellationDate) return false;
    
    try {
      const cancelledDate = parseISO(cancellationDate);
      if (!isValid(cancelledDate)) return false;
      
      // Convert to user timezone and compare date strings
      const eventDateInUserTz = format(toZonedTime(cancelledDate, timezone), 'yyyy-MM-dd');
      const startDateInUserTz = format(toZonedTime(dateRange.from, timezone), 'yyyy-MM-dd');
      const endDateInUserTz = format(toZonedTime(dateRange.to, timezone), 'yyyy-MM-dd');
      
      return eventDateInUserTz >= startDateInUserTz && eventDateInUserTz <= endDateInUserTz;
    } catch (error) {
      console.warn('Error filtering cancelled event by date:', cancellationDate, error);
      return false;
    }
  });
  
  console.log('Filtered cancelled events by cancellation date:', filtered.length);
  
  return filtered;
};
