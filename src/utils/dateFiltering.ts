
import { parseISO, isValid, startOfDay, endOfDay } from "date-fns";

// Standardized date filtering function to ensure consistency
export const isEventInDateRange = (eventCreatedAt: string, startDate: Date, endDate: Date): boolean => {
  if (!eventCreatedAt) return false;
  
  try {
    const createdDate = parseISO(eventCreatedAt);
    if (!isValid(createdDate)) return false;
    
    const eventTime = createdDate.getTime();
    const rangeStart = startOfDay(startDate).getTime();
    const rangeEnd = endOfDay(endDate).getTime();
    
    return eventTime >= rangeStart && eventTime <= rangeEnd;
  } catch (error) {
    console.warn('Error parsing event date:', eventCreatedAt, error);
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
  
  return filtered;
};
