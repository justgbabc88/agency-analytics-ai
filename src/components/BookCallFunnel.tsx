
import { MetricCard } from "./MetricCard";
import { ConversionChart } from "./ConversionChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useCalendlyData } from "@/hooks/useCalendlyData";
import { format } from "date-fns";

const generateCallData = () => {
  const dates = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      conversionRate: Math.random() * 8 + 3,
      roas: Math.random() * 6 + 3,
      pageViews: Math.floor(Math.random() * 300) + 150
    });
  }
  return dates;
};

interface BookCallFunnelProps {
  projectId?: string;
}

export const BookCallFunnel = ({ projectId }: BookCallFunnelProps) => {
  const chartData = generateCallData();
  const { calendlyEvents, getRecentBookings, getMonthlyComparison } = useCalendlyData(projectId);
  
  const recentBookings = getRecentBookings(7);
  const monthlyComparison = getMonthlyComparison();

  // Calculate call status statistics
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

  return (
    <div className="space-y-6">
      {/* Landing Page */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Landing Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard title="Page Views" value={5420} previousValue={4950} />
            <MetricCard 
              title="Booking Rate" 
              value={12.8} 
              previousValue={11.2} 
              format="percentage" 
            />
            <MetricCard 
              title="Total Bookings" 
              value={callStats.scheduled} 
              previousValue={monthlyComparison.previous}
              description="Active/Scheduled calls"
            />
            <MetricCard title="Cost Per Booking" value={28.50} previousValue={32.80} format="currency" />
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
              previousValue={Math.floor(callStats.scheduled * 0.8)}
              description="Active bookings"
            />
            <MetricCard 
              title="Cancelled Calls" 
              value={callStats.cancelled} 
              previousValue={Math.floor(callStats.cancelled * 1.2)}
              description="Cancelled bookings"
            />
            <MetricCard 
              title="Rescheduled Calls" 
              value={callStats.rescheduled} 
              previousValue={Math.floor(callStats.rescheduled * 0.9)}
              description="Rescheduled bookings"
            />
            <MetricCard 
              title="Cancellation Rate" 
              value={callStats.total > 0 ? ((callStats.cancelled / callStats.total) * 100) : 0} 
              previousValue={callStats.total > 0 ? ((callStats.cancelled / callStats.total) * 100 * 1.1) : 0}
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
            <MetricCard title="Calls Completed" value={475} previousValue={362} />
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
            title="Call Attendance Trends"
            metrics={['conversionRate', 'pageViews']}
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
                previousValue={0}
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
