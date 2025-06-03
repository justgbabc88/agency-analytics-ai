
import { MetricCard } from "./MetricCard";
import { ConversionChart } from "./ConversionChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCalendlyData } from "@/hooks/useCalendlyData";
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { DateRangePicker } from "./DateRangePicker";
import { useState } from "react";

// Generate chart data based on real Calendly events with date filtering
const generateCallDataFromEvents = (calendlyEvents: any[], dateRange: { from: Date; to: Date }) => {
  const dates = [];
  const { from: startDate, to: endDate } = dateRange;
  
  // Calculate the number of days in the range
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  for (let i = 0; i <= daysDiff; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // Get events created on this specific day (not scheduled for this day)
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    const dayEventsCreated = calendlyEvents.filter(event => {
      const eventCreatedDate = new Date(event.created_at);
      return eventCreatedDate >= dayStart && eventCreatedDate <= dayEnd;
    });
    
    // Get events scheduled for this day (for cancelled calculations)
    const scheduledEvents = calendlyEvents.filter(event => {
      const eventDate = new Date(event.scheduled_at);
      return eventDate >= dayStart && eventDate <= dayEnd;
    });
    
    // Calculate daily stats - calls booked based on creation date
    const callsBooked = dayEventsCreated.length; // Based on creation date
    const cancelled = scheduledEvents.filter(event => 
      event.status === 'canceled' || event.status === 'cancelled'
    ).length;
    const noShows = scheduledEvents.filter(event => event.status === 'no_show').length;
    const scheduled = scheduledEvents.filter(event => 
      event.status === 'active' || event.status === 'scheduled'
    ).length;
    const callsTaken = scheduled - noShows;
    const showUpRate = scheduled > 0 ? ((callsTaken / scheduled) * 100) : 0;
    
    console.log(`Date: ${date.toLocaleDateString()}, Calls Booked: ${callsBooked}, Events Created:`, dayEventsCreated.map(e => e.created_at));
    
    dates.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      totalBookings: callsBooked, // Keep for other metrics
      callsBooked, // New metric based on creation date
      callsTaken,
      cancelled,
      showUpRate: Math.max(showUpRate, 0),
      pageViews: Math.floor(Math.random() * 300) + 150 // Mock page views
    });
  }
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
  
  console.log('All Calendly Events:', calendlyEvents);
  
  // Calculate chart data based on real Calendly events and date range
  const chartData = generateCallDataFromEvents(calendlyEvents, dateRange);
  const recentBookings = getRecentBookings(7);
  const monthlyComparison = getMonthlyComparison();

  console.log('Generated Chart Data:', chartData);
  console.log('Date Range:', dateRange);

  // Filter events within the selected date range for statistics
  const filteredEvents = calendlyEvents.filter(event => {
    const eventDate = new Date(event.created_at);
    return isWithinInterval(eventDate, { start: dateRange.from, end: dateRange.to });
  });

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

  // Calculate previous period data for comparison
  const last30Days = calendlyEvents.filter(event => {
    const eventDate = new Date(event.scheduled_at);
    const thirtyDaysAgo = subDays(new Date(), 30);
    return eventDate >= thirtyDaysAgo;
  });

  const previous30Days = calendlyEvents.filter(event => {
    const eventDate = new Date(event.scheduled_at);
    const thirtyDaysAgo = subDays(new Date(), 30);
    const sixtyDaysAgo = subDays(new Date(), 60);
    return eventDate >= sixtyDaysAgo && eventDate < thirtyDaysAgo;
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
        <DateRangePicker onDateChange={handleDateChange} />
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
            key={`${dateRange.from.getTime()}-${dateRange.to.getTime()}-${chartData.length}`}
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
