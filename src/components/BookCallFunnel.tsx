import { MetricCard } from "./MetricCard";
import { ConversionChart } from "./ConversionChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCalendlyData } from "@/hooks/useCalendlyData";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

// Generate chart data based on real Calendly events
const generateCallDataFromEvents = (calendlyEvents: any[]) => {
  const dates = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Get events for this specific day
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    const dayEvents = calendlyEvents.filter(event => {
      const eventDate = new Date(event.scheduled_at);
      return eventDate >= dayStart && eventDate <= dayEnd;
    });
    
    // Calculate daily stats
    const totalBookings = dayEvents.length;
    const cancelled = dayEvents.filter(event => 
      event.status === 'canceled' || event.status === 'cancelled'
    ).length;
    const noShows = dayEvents.filter(event => event.status === 'no_show').length;
    const scheduled = dayEvents.filter(event => 
      event.status === 'active' || event.status === 'scheduled'
    ).length;
    const callsTaken = scheduled - noShows;
    const showUpRate = scheduled > 0 ? ((callsTaken / scheduled) * 100) : 0;
    
    dates.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      totalBookings,
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
  console.log('BookCallFunnel rendering with projectId:', projectId);
  
  const { calendlyEvents, getRecentBookings, getMonthlyComparison } = useCalendlyData(projectId);
  
  console.log('Calendly events loaded:', calendlyEvents.length, calendlyEvents);
  
  // Calculate chart data based on real Calendly events
  const chartData = generateCallDataFromEvents(calendlyEvents);
  const recentBookings = getRecentBookings(7);
  const monthlyComparison = getMonthlyComparison();

  // Calculate call statistics from real data
  const callStats = calendlyEvents.reduce((stats, event) => {
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
              description="All time Calendly bookings"
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
              description="All Calendly bookings"
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
            data={chartData}
            title="Call Performance Trends (Last 30 Days)"
            metrics={['totalBookings', 'callsTaken', 'cancelled']}
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
            data={chartData}
            title="Sales Performance"
            metrics={['showUpRate']}
          />
        </CardContent>
      </Card>

      {/* Calendly Integration Summary */}
      {calendlyEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Calendly Integration Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard 
                title="Total Events Tracked" 
                value={calendlyEvents.length} 
                previousValue={previous30Days.length}
                description="All time Calendly bookings"
              />
              <MetricCard 
                title="This Month" 
                value={monthlyComparison.current} 
                previousValue={monthlyComparison.previous}
                description="Monthly bookings comparison"
              />
              <MetricCard 
                title="Last 7 Days" 
                value={recentBookings} 
                previousValue={getRecentBookings(14) - recentBookings}
                description="Recent booking activity"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
