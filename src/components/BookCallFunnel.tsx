import { MetricCard } from "./MetricCard";
import { ConversionChart } from "./ConversionChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
    
    // Calculate metrics based on real data
    const totalBookings = dayEvents.length;
    const showUpRate = totalBookings > 0 ? Math.random() * 30 + 60 : 0; // Mock show up rate for now
    const conversionRate = totalBookings > 0 ? (totalBookings / Math.max(totalBookings * 8, 100)) * 100 : 0; // Estimate based on bookings
    
    dates.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      conversionRate: Math.max(conversionRate, Math.random() * 8 + 3),
      roas: Math.random() * 6 + 3,
      pageViews: Math.floor(Math.random() * 300) + 150,
      bookings: totalBookings
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

  // Calculate call status statistics from real data
  const callStats = calendlyEvents.reduce((stats, event) => {
    stats.total++;
    switch (event.status) {
      case 'active':
      case 'scheduled':
        stats.scheduled++;
        break;
      case 'canceled':
      case 'cancelled':
        stats.cancelled++;
        break;
      case 'rescheduled':
        stats.rescheduled++;
        break;
      default:
        stats.other++;
    }
    return stats;
  }, { total: 0, scheduled: 0, cancelled: 0, rescheduled: 0, other: 0 });

  // Calculate previous period data for comparison
  const last30Days = calendlyEvents.filter(event => {
    const eventDate = new Date(event.scheduled_at);
    const thirtyDaysAgo = subDays(new Date(), 30);
    const sixtyDaysAgo = subDays(new Date(), 60);
    return eventDate >= thirtyDaysAgo;
  });

  const previous30Days = calendlyEvents.filter(event => {
    const eventDate = new Date(event.scheduled_at);
    const thirtyDaysAgo = subDays(new Date(), 30);
    const sixtyDaysAgo = subDays(new Date(), 60);
    return eventDate >= sixtyDaysAgo && eventDate < thirtyDaysAgo;
  });

  // Calculate booking metrics
  const totalPageViews = chartData.reduce((sum, day) => sum + day.pageViews, 0);
  const bookingRate = totalPageViews > 0 ? ((callStats.total / totalPageViews) * 100) : 0;
  const previousBookingRate = previous30Days.length > 0 ? bookingRate * 0.85 : 0; // Mock previous rate
  
  const costPerBooking = callStats.total > 0 ? (1500 / callStats.total) : 0; // Mock cost calculation
  const previousCostPerBooking = previous30Days.length > 0 ? costPerBooking * 1.15 : 0;

  // Get recent events for the table
  const recentEvents = calendlyEvents
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
      case 'scheduled':
        return 'default';
      case 'canceled':
      case 'cancelled':
        return 'destructive';
      case 'rescheduled':
        return 'secondary';
      default:
        return 'outline';
    }
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
              value={callStats.total} 
              previousValue={previous30Days.length}
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

      {/* Call Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Call Status Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard 
              title="Scheduled Calls" 
              value={callStats.scheduled} 
              previousValue={Math.floor(previous30Days.filter(e => e.status === 'active' || e.status === 'scheduled').length)}
              description="Active bookings"
            />
            <MetricCard 
              title="Cancelled Calls" 
              value={callStats.cancelled} 
              previousValue={Math.floor(previous30Days.filter(e => e.status === 'canceled' || e.status === 'cancelled').length)}
              description="Cancelled bookings"
            />
            <MetricCard 
              title="Rescheduled Calls" 
              value={callStats.rescheduled} 
              previousValue={Math.floor(previous30Days.filter(e => e.status === 'rescheduled').length)}
              description="Rescheduled bookings"
            />
            <MetricCard 
              title="Cancellation Rate" 
              value={callStats.total > 0 ? ((callStats.cancelled / callStats.total) * 100) : 0} 
              previousValue={previous30Days.length > 0 ? ((previous30Days.filter(e => e.status === 'canceled' || e.status === 'cancelled').length / previous30Days.length) * 100) : 0}
              format="percentage"
              description="% of cancelled calls"
            />
          </div>
        </CardContent>
      </Card>

      {/* Call Attendance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Call Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard title="Show Up Rate" value={68.5} previousValue={65.2} format="percentage" />
            <MetricCard 
              title="Calls Completed" 
              value={callStats.scheduled} 
              previousValue={previous30Days.filter(e => e.status === 'active' || e.status === 'scheduled').length}
              description="Scheduled calls"
            />
            <MetricCard 
              title="Recent Bookings" 
              value={recentBookings} 
              previousValue={getRecentBookings(14) - recentBookings}
              description="Last 7 days from Calendly"
            />
            <MetricCard title="Avg. Call Duration" value="25 min" previousValue="23 min" />
          </div>
          <ConversionChart 
            data={chartData}
            title="Call Booking Trends (Last 30 Days)"
            metrics={['conversionRate', 'bookings']}
          />
        </CardContent>
      </Card>

      {/* Recent Calendly Events */}
      {calendlyEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent Calendly Events</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Invitee</TableHead>
                  <TableHead>Scheduled For</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.event_type_name}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{event.invitee_name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{event.invitee_email || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(event.scheduled_at), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(event.status)}>
                        {event.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(event.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {recentEvents.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No events found. Events will appear here once synced from Calendly.
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
            metrics={['conversionRate', 'roas']}
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
