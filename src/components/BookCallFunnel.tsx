
import { MetricCard } from "./MetricCard";
import { ConversionChart } from "./ConversionChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCalendlyData } from "@/hooks/useCalendlyData";
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { AdvancedDateRangePicker } from "./AdvancedDateRangePicker";
import { useState } from "react";

// Generate chart data based on real Calendly events with date filtering
const generateCallDataFromEvents = (calendlyEvents: any[], dateRange: { from: Date; to: Date }) => {
  const dates = [];
  const { from: startDate, to: endDate } = dateRange;
  
  // Calculate the number of days in the range
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  console.log('Generating chart data for date range:', startDate, 'to', endDate, 'Total days:', daysDiff);
  console.log('Available Calendly events:', calendlyEvents.length);
  
  // Debug: Log the structure of the first few events
  if (calendlyEvents.length > 0) {
    console.log('Sample Calendly event structure:', {
      firstEvent: calendlyEvents[0],
      keys: Object.keys(calendlyEvents[0]),
      created_at: calendlyEvents[0]?.created_at,
      scheduled_at: calendlyEvents[0]?.scheduled_at,
    });
  }
  
  for (let i = 0; i <= daysDiff; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // Get events created on this specific day (not scheduled for this day)
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    // More robust date parsing - handle both string and Date objects
    const dayEventsCreated = calendlyEvents.filter(event => {
      if (!event.created_at) return false;
      
      let eventCreatedDate;
      try {
        eventCreatedDate = new Date(event.created_at);
        // Check if the date is valid
        if (isNaN(eventCreatedDate.getTime())) {
          console.warn('Invalid created_at date:', event.created_at);
          return false;
        }
      } catch (error) {
        console.warn('Error parsing created_at date:', event.created_at, error);
        return false;
      }
      
      const isInRange = eventCreatedDate >= dayStart && eventCreatedDate <= dayEnd;
      if (isInRange) {
        console.log(`Event created on ${date.toLocaleDateString()}:`, {
          eventId: event.id,
          created_at: event.created_at,
          parsed_date: eventCreatedDate,
          dayStart,
          dayEnd
        });
      }
      return isInRange;
    });
    
    // Get events scheduled for this day (for cancelled calculations)
    const scheduledEvents = calendlyEvents.filter(event => {
      if (!event.scheduled_at) return false;
      
      let eventDate;
      try {
        eventDate = new Date(event.scheduled_at);
        if (isNaN(eventDate.getTime())) return false;
      } catch (error) {
        return false;
      }
      
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
    
    // Generate mock page views only for the selected date range
    const pageViews = Math.floor(Math.random() * 300) + 150;
    
    console.log(`Date: ${date.toLocaleDateString()}, Calls Booked: ${callsBooked}, Page Views: ${pageViews}, Events Created:`, dayEventsCreated.length);
    
    dates.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      totalBookings: callsBooked,
      callsBooked,
      callsTaken,
      cancelled,
      showUpRate: Math.max(showUpRate, 0),
      pageViews
    });
  }
  
  console.log('Generated chart data points:', dates.length);
  console.log('Chart data summary:', dates.map(d => ({ date: d.date, callsBooked: d.callsBooked })));
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
  console.log('Current Date Range:', dateRange);
  console.log('Project ID:', projectId);
  
  // Calculate chart data based on real Calendly events and date range
  const chartData = generateCallDataFromEvents(calendlyEvents, dateRange);
  const recentBookings = getRecentBookings(7);
  const monthlyComparison = getMonthlyComparison();

  // Filter events within the selected date range for statistics (by creation date)
  const filteredEvents = calendlyEvents.filter(event => {
    if (!event.created_at) return false;
    
    try {
      const eventCreatedDate = new Date(event.created_at);
      if (isNaN(eventCreatedDate.getTime())) return false;
      
      return isWithinInterval(eventCreatedDate, { start: dateRange.from, end: dateRange.to });
    } catch (error) {
      console.warn('Error filtering event by date:', event, error);
      return false;
    }
  });

  console.log('Filtered events for metrics:', filteredEvents.length);
  console.log('Filtered events details:', filteredEvents.map(e => ({ 
    id: e.id, 
    created_at: e.created_at, 
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

  // Calculate previous period data for comparison
  const last30Days = calendlyEvents.filter(event => {
    if (!event.scheduled_at) return false;
    try {
      const eventDate = new Date(event.scheduled_at);
      const thirtyDaysAgo = subDays(new Date(), 30);
      return eventDate >= thirtyDaysAgo;
    } catch (error) {
      return false;
    }
  });

  const previous30Days = calendlyEvents.filter(event => {
    if (!event.scheduled_at) return false;
    try {
      const eventDate = new Date(event.scheduled_at);
      const thirtyDaysAgo = subDays(new Date(), 30);
      const sixtyDaysAgo = subDays(new Date(), 60);
      return eventDate >= sixtyDaysAgo && eventDate < thirtyDaysAgo;
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
    console.log('Date range changed:', from, 'to', to);
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
