import { MetricCard } from "./MetricCard";
import { ConversionChart } from "./ConversionChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCalendlyData } from "@/hooks/useCalendlyData";
import { format, subDays, startOfDay, endOfDay, parseISO, isValid } from "date-fns";
import { AdvancedDateRangePicker } from "./AdvancedDateRangePicker";
import { useState, useEffect, useMemo } from "react";

// Standardized date filtering function to ensure consistency
const isEventInDateRange = (eventCreatedAt: string, startDate: Date, endDate: Date): boolean => {
  if (!eventCreatedAt) return false;
  
  try {
    const createdDate = parseISO(eventCreatedAt);
    if (!isValid(createdDate)) return false;
    
    // Use consistent date comparison - convert all to timestamp for precision
    const eventTime = createdDate.getTime();
    const rangeStart = startOfDay(startDate).getTime();
    const rangeEnd = endOfDay(endDate).getTime();
    
    return eventTime >= rangeStart && eventTime <= rangeEnd;
  } catch (error) {
    console.warn('Error parsing event date:', eventCreatedAt, error);
    return false;
  }
};

// Generate chart data based on real Calendly events with date filtering using created_at
const generateCallDataFromEvents = (calendlyEvents: any[], dateRange: { from: Date; to: Date }) => {
  const dates = [];
  const { from: startDate, to: endDate } = dateRange;
  
  // Calculate the number of days in the range
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  console.log('=== CHART DATA GENERATION DEBUG ===');
  console.log('Date range:', format(startDate, 'yyyy-MM-dd'), 'to', format(endDate, 'yyyy-MM-dd'));
  console.log('Total days in range:', daysDiff);
  console.log('Total Calendly events available:', calendlyEvents.length);
  
  // Fix: Ensure we include all days in the range, including single day ranges
  const totalDays = daysDiff === 0 ? 1 : daysDiff + 1;
  
  for (let i = 0; i < totalDays; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    const currentDateStr = format(currentDate, 'yyyy-MM-dd');
    
    console.log(`\n--- Processing ${currentDateStr} ---`);
    
    // Use the standardized filtering function
    const eventsCreatedThisDay = calendlyEvents.filter(event => 
      isEventInDateRange(event.created_at, currentDate, currentDate)
    );
    
    console.log(`Events created on ${currentDateStr}: ${eventsCreatedThisDay.length}`);
    
    // Calculate daily stats based on events created this day
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
    
    // Generate mock page views for the selected date range
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
  
  return dates;
};

// Helper function to filter events by date range consistently
const filterEventsByDateRange = (events: any[], dateRange: { from: Date; to: Date }) => {
  console.log('\n=== FILTERING EVENTS FOR METRICS ===');
  console.log('Date range:', {
    from: format(dateRange.from, 'yyyy-MM-dd HH:mm:ss'),
    to: format(dateRange.to, 'yyyy-MM-dd HH:mm:ss')
  });
  console.log('Total events to filter:', events.length);
  
  const filtered = events.filter(event => 
    isEventInDateRange(event.created_at, dateRange.from, dateRange.to)
  );
  
  console.log('Filtered events count:', filtered.length);
  console.log('Filtered event IDs:', filtered.map(e => ({ id: e.id, created_at: e.created_at, status: e.status })));
  
  return filtered;
};

interface BookCallFunnelProps {
  projectId: string;
}

export const BookCallFunnel = ({ projectId }: BookCallFunnelProps) => {
  const { calendlyEvents, getRecentBookings, getMonthlyComparison } = useCalendlyData(projectId);
  
  // Initialize with normalized dates to ensure consistency
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    return {
      from: startOfDay(subDays(today, 29)), // 30 days total including today
      to: endOfDay(today)
    };
  });
  
  console.log('BookCallFunnel render - Project ID:', projectId);
  console.log('Current date range:', {
    from: format(dateRange.from, 'yyyy-MM-dd HH:mm:ss'),
    to: format(dateRange.to, 'yyyy-MM-dd HH:mm:ss')
  });
  console.log('All Calendly events:', calendlyEvents.length);
  
  // Create a stable date range key using ISO strings for consistency
  const dateRangeKey = useMemo(() => {
    const fromISO = dateRange.from.toISOString();
    const toISO = dateRange.to.toISOString();
    return `${fromISO}-${toISO}`;
  }, [dateRange.from, dateRange.to]);
  
  // Use useMemo to recalculate chart data when dependencies change
  const chartData = useMemo(() => {
    console.log('🔄 Recalculating chart data due to dependency change');
    console.log('Date range key:', dateRangeKey);
    console.log('Events available:', calendlyEvents.length);
    
    const data = generateCallDataFromEvents(calendlyEvents, dateRange);
    console.log('Generated chart data:', data);
    return data;
  }, [calendlyEvents, dateRangeKey]);
  
  // Filter events for metrics using the same logic
  const filteredEvents = useMemo(() => {
    console.log('🔄 Recalculating filtered events for metrics');
    console.log('Using date range:', dateRangeKey);
    return filterEventsByDateRange(calendlyEvents, dateRange);
  }, [calendlyEvents, dateRangeKey]);
  
  // Add useEffect to log when dateRange changes
  useEffect(() => {
    console.log('🔄 BookCallFunnel dateRange changed:', {
      from: format(dateRange.from, 'yyyy-MM-dd HH:mm:ss'),
      to: format(dateRange.to, 'yyyy-MM-dd HH:mm:ss'),
      totalEvents: calendlyEvents.length,
      filteredEvents: filteredEvents.length
    });
  }, [dateRange, calendlyEvents.length, filteredEvents.length]);

  // ... keep existing code (recentBookings and monthlyComparison)
  const recentBookings = getRecentBookings(7);
  const monthlyComparison = getMonthlyComparison();

  console.log('\n=== METRICS CALCULATION ===');
  console.log('Filtered events for metrics (by created_at):', filteredEvents.length);

  // Calculate call statistics from filtered data
  const callStats = filteredEvents.reduce((stats, event) => {
    stats.totalBookings++;
    switch (event.status) {
      case 'active':
      case 'scheduled':
        stats.scheduled++;
        break;
      case 'canceled':
      case 'cancelled':
        stats.cancelled++;
        break;
      case 'no_show':
        stats.noShows++;
        break;
      default:
        stats.other++;
    }
    return stats;
  }, { totalBookings: 0, scheduled: 0, cancelled: 0, noShows: 0, other: 0 });

  console.log('Calculated call stats:', callStats);

  // Calculate calls taken (assuming scheduled calls that aren't no-shows are taken)
  const callsTaken = callStats.scheduled - callStats.noShows;
  
  // Calculate show up rate
  const showUpRate = callStats.scheduled > 0 ? ((callsTaken / callStats.scheduled) * 100) : 0;

  // Calculate previous period data for comparison (using created_at)
  const last30Days = calendlyEvents.filter(event => {
    if (!event.created_at) return false;
    try {
      const createdDate = parseISO(event.created_at);
      const thirtyDaysAgo = subDays(new Date(), 30);
      return isValid(createdDate) && createdDate >= thirtyDaysAgo;
    } catch (error) {
      return false;
    }
  });

  const previous30Days = calendlyEvents.filter(event => {
    if (!event.created_at) return false;
    try {
      const createdDate = parseISO(event.created_at);
      const thirtyDaysAgo = subDays(new Date(), 30);
      const sixtyDaysAgo = subDays(new Date(), 60);
      return isValid(createdDate) && createdDate >= sixtyDaysAgo && createdDate < thirtyDaysAgo;
    } catch (error) {
      return false;
    }
  });

  // Calculate previous period stats for comparison
  const previousStats = previous30Days.reduce((stats, event) => {
    stats.totalBookings++;
    switch (event.status) {
      case 'active':
      case 'scheduled':
        stats.scheduled++;
        break;
      case 'canceled':
      case 'cancelled':
        stats.cancelled++;
        break;
      case 'no_show':
        stats.noShows++;
        break;
    }
    return stats;
  }, { totalBookings: 0, scheduled: 0, cancelled: 0, noShows: 0 });

  const previousCallsTaken = previousStats.scheduled - previousStats.noShows;
  const previousShowUpRate = previousStats.scheduled > 0 ? ((previousCallsTaken / previousStats.scheduled) * 100) : 0;

  // Calculate booking metrics
  const totalPageViews = chartData.reduce((sum, day) => sum + day.pageViews, 0);
  const bookingRate = totalPageViews > 0 ? ((callStats.totalBookings / totalPageViews) * 100) : 0;
  const previousBookingRate = previous30Days.length > 0 ? bookingRate * 0.85 : 0; // Mock previous rate
  
  const costPerBooking = callStats.totalBookings > 0 ? (1500 / callStats.totalBookings) : 0; // Mock cost calculation
  const previousCostPerBooking = previous30Days.length > 0 ? costPerBooking * 1.15 : 0;

  const handleDateChange = (from: Date, to: Date) => {
    console.log('🚀 Date range changed FROM PICKER:', format(from, 'yyyy-MM-dd HH:mm:ss'), 'to', format(to, 'yyyy-MM-dd HH:mm:ss'));
    
    // Normalize dates to ensure consistency
    const normalizedFrom = startOfDay(from);
    const normalizedTo = endOfDay(to);
    
    console.log('🚀 Normalized dates:', format(normalizedFrom, 'yyyy-MM-dd HH:mm:ss'), 'to', format(normalizedTo, 'yyyy-MM-dd HH:mm:ss'));
    
    // Set the normalized date range
    setDateRange({ 
      from: normalizedFrom, 
      to: normalizedTo 
    });
  };

  console.log('\n=== FINAL COMPONENT STATE ===');
  console.log('Chart data length:', chartData.length);
  console.log('Total bookings for metrics:', filteredEvents.length);
  console.log('Date range key:', dateRangeKey);

  // Create unique key for chart components to force re-render
  const chartKey = `${dateRangeKey}-${filteredEvents.length}`;

  // Show a message if no project is selected
  if (!projectId) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Project Selected</h3>
        <p className="text-gray-600">Please select a project to view Calendly booking data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Picker */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Book Call Funnel</h2>
        <AdvancedDateRangePicker onDateChange={handleDateChange} />
      </div>

      {/* Landing Page */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Landing Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard title="Page Views" value={totalPageViews} previousValue={Math.floor(totalPageViews * 0.9)} />
            <MetricCard 
              title="Booking Rate" 
              value={bookingRate} 
              previousValue={previousBookingRate} 
              format="percentage" 
            />
            <MetricCard 
              title="Total Bookings" 
              value={callStats.totalBookings} 
              previousValue={previousStats.totalBookings}
              description="Events created in date range"
            />
            <MetricCard 
              title="Cost Per Booking" 
              value={costPerBooking} 
              previousValue={previousCostPerBooking} 
              format="currency" 
            />
          </div>
        </CardContent>
      </Card>

      {/* Call Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Call Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard 
              title="Total Bookings" 
              value={callStats.totalBookings} 
              previousValue={previousStats.totalBookings}
              description="Events created in date range"
            />
            <MetricCard 
              title="Calls Taken" 
              value={callsTaken} 
              previousValue={previousCallsTaken}
              description="Completed calls"
            />
            <MetricCard 
              title="Calls Cancelled" 
              value={callStats.cancelled} 
              previousValue={previousStats.cancelled}
              description="Cancelled bookings"
            />
            <MetricCard 
              title="Show Up Rate" 
              value={showUpRate} 
              previousValue={previousShowUpRate} 
              format="percentage"
              description="% of scheduled calls attended"
            />
          </div>
          <ConversionChart 
            key={`calls-${chartKey}`}
            data={chartData}
            title="Call Performance Trends"
            metrics={['callsBooked', 'cancelled']}
          />
        </CardContent>
      </Card>

      {/* Sales Conversion */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Sales Conversion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard title="Close Rate" value={28.4} previousValue={25.1} format="percentage" />
            <MetricCard title="Total Closes" value={135} previousValue={91} />
            <MetricCard title="Revenue" value={405000} previousValue={273000} format="currency" />
            <MetricCard title="ROAS" value={8.2} previousValue={6.8} />
          </div>
          <ConversionChart 
            key={`sales-${chartKey}`}
            data={chartData}
            title="Sales Performance"
            metrics={['showUpRate']}
          />
        </CardContent>
      </Card>
    </div>
  );
};
