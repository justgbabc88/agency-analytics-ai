
import { MetricCard } from "./MetricCard";
import { ConversionChart } from "./ConversionChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCalendlyData } from "@/hooks/useCalendlyData";
import { format, subDays, startOfDay, endOfDay, isWithinInterval, parseISO, isValid } from "date-fns";
import { AdvancedDateRangePicker } from "./AdvancedDateRangePicker";
import { useState } from "react";

// Generate chart data based on real Calendly events with date filtering
const generateCallDataFromEvents = (calendlyEvents: any[], dateRange: { from: Date; to: Date }) => {
  const dates = [];
  const { from: startDate, to: endDate } = dateRange;
  
  // Calculate the number of days in the range
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  console.log('=== CHART DATA GENERATION DEBUG ===');
  console.log('Date range:', format(startDate, 'yyyy-MM-dd'), 'to', format(endDate, 'yyyy-MM-dd'));
  console.log('Total days in range:', daysDiff);
  console.log('Total Calendly events available:', calendlyEvents.length);
  
  // Debug: Log all event dates to understand the data
  console.log('All event scheduled dates in dataset:');
  calendlyEvents.forEach((event, index) => {
    if (index < 10) { // Log first 10 events
      console.log(`Event ${index + 1}:`, {
        id: event.id,
        scheduled_at: event.scheduled_at,
        parsed_scheduled: event.scheduled_at ? parseISO(event.scheduled_at) : null,
        status: event.status
      });
    }
  });
  
  for (let i = 0; i <= daysDiff; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // Use local date boundaries to avoid timezone issues
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    console.log(`\n--- Processing ${format(date, 'yyyy-MM-dd')} ---`);
    console.log('Day boundaries:', {
      start: format(dayStart, 'yyyy-MM-dd HH:mm:ss'),
      end: format(dayEnd, 'yyyy-MM-dd HH:mm:ss')
    });
    
    // Filter events scheduled for this day
    const eventsScheduledThisDay = calendlyEvents.filter(event => {
      if (!event.scheduled_at) return false;
      
      try {
        const scheduledDate = parseISO(event.scheduled_at);
        if (!isValid(scheduledDate)) {
          console.warn('Invalid scheduled date:', event.scheduled_at);
          return false;
        }
        
        const isInDay = scheduledDate >= dayStart && scheduledDate <= dayEnd;
        
        if (isInDay) {
          console.log('✓ Event found for this day:', {
            id: event.id,
            scheduled_at: event.scheduled_at,
            parsed_date: format(scheduledDate, 'yyyy-MM-dd HH:mm:ss'),
            status: event.status
          });
        }
        
        return isInDay;
      } catch (error) {
        console.warn('Error parsing scheduled date:', event.scheduled_at, error);
        return false;
      }
    });
    
    console.log(`Events scheduled this day: ${eventsScheduledThisDay.length}`);
    
    // Calculate daily stats based on events scheduled this day
    const callsBooked = eventsScheduledThisDay.length;
    const cancelled = eventsScheduledThisDay.filter(event => 
      event.status === 'canceled' || event.status === 'cancelled'
    ).length;
    const noShows = eventsScheduledThisDay.filter(event => event.status === 'no_show').length;
    const scheduled = eventsScheduledThisDay.filter(event => 
      event.status === 'active' || event.status === 'scheduled'
    ).length;
    const callsTaken = Math.max(0, scheduled - noShows);
    const showUpRate = scheduled > 0 ? ((callsTaken / scheduled) * 100) : 0;
    
    // Generate mock page views for the selected date range
    const pageViews = Math.floor(Math.random() * 300) + 150;
    
    dates.push({
      date: format(date, 'MMM d'),
      totalBookings: callsBooked,
      callsBooked,
      callsTaken,
      cancelled,
      showUpRate: Math.max(showUpRate, 0),
      pageViews
    });
  }
  
  console.log('\n=== FINAL CHART DATA SUMMARY ===');
  console.log('Generated data points:', dates.length);
  console.log('Calls booked by day:', dates.map(d => ({ date: d.date, callsBooked: d.callsBooked })));
  console.log('Total calls booked across all days:', dates.reduce((sum, d) => sum + d.callsBooked, 0));
  
  return dates;
};

interface BookCallFunnelProps {
  projectId: string;
}

export const BookCallFunnel = ({ projectId }: BookCallFunnelProps) => {
  const { calendlyEvents, getRecentBookings, getMonthlyComparison } = useCalendlyData(projectId);
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  
  console.log('BookCallFunnel render - Project ID:', projectId);
  console.log('Current date range:', {
    from: format(dateRange.from, 'yyyy-MM-dd'),
    to: format(dateRange.to, 'yyyy-MM-dd')
  });
  console.log('All Calendly events:', calendlyEvents.length);
  
  // Calculate chart data based on real Calendly events and date range
  const chartData = generateCallDataFromEvents(calendlyEvents, dateRange);
  const recentBookings = getRecentBookings(7);
  const monthlyComparison = getMonthlyComparison();

  // Filter events within the selected date range for statistics (using scheduled_at)
  const filteredEvents = calendlyEvents.filter(event => {
    if (!event.scheduled_at) return false;
    
    try {
      const scheduledDate = parseISO(event.scheduled_at);
      if (!isValid(scheduledDate)) return false;
      
      return isWithinInterval(scheduledDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
    } catch (error) {
      console.warn('Error filtering event by date:', event, error);
      return false;
    }
  });

  console.log('Filtered events for metrics:', filteredEvents.length);
  console.log('Filtered events sample:', filteredEvents.slice(0, 5).map(e => ({ 
    id: e.id, 
    scheduled_at: e.scheduled_at, 
    status: e.status 
  })));

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

  // Calculate calls taken (assuming scheduled calls that aren't no-shows are taken)
  const callsTaken = callStats.scheduled - callStats.noShows;
  
  // Calculate show up rate
  const showUpRate = callStats.scheduled > 0 ? ((callsTaken / callStats.scheduled) * 100) : 0;

  // Calculate previous period data for comparison (using scheduled_at)
  const last30Days = calendlyEvents.filter(event => {
    if (!event.scheduled_at) return false;
    try {
      const scheduledDate = parseISO(event.scheduled_at);
      const thirtyDaysAgo = subDays(new Date(), 30);
      return isValid(scheduledDate) && scheduledDate >= thirtyDaysAgo;
    } catch (error) {
      return false;
    }
  });

  const previous30Days = calendlyEvents.filter(event => {
    if (!event.scheduled_at) return false;
    try {
      const scheduledDate = parseISO(event.scheduled_at);
      const thirtyDaysAgo = subDays(new Date(), 30);
      const sixtyDaysAgo = subDays(new Date(), 60);
      return isValid(scheduledDate) && scheduledDate >= sixtyDaysAgo && scheduledDate < thirtyDaysAgo;
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
    console.log('Date range changed:', format(from, 'yyyy-MM-dd'), 'to', format(to, 'yyyy-MM-dd'));
    setDateRange({ from, to });
  };

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
              description="Filtered by date range"
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
              description="Filtered by date range"
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
            key={`calls-${dateRange.from.getTime()}-${dateRange.to.getTime()}`}
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
            key={`sales-${dateRange.from.getTime()}-${dateRange.to.getTime()}`}
            data={chartData}
            title="Sales Performance"
            metrics={['showUpRate']}
          />
        </CardContent>
      </Card>
    </div>
  );
};
