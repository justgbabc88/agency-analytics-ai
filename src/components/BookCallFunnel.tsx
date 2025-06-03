
import { MetricCard } from "./MetricCard";
import { ConversionChart } from "./ConversionChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCalendlyData } from "@/hooks/useCalendlyData";

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
              value={monthlyComparison.current} 
              previousValue={monthlyComparison.previous}
              description="Calendly bookings this month"
            />
            <MetricCard title="Cost Per Booking" value={28.50} previousValue={32.80} format="currency" />
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

      {/* Calendly Integration Status */}
      {calendlyEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Calendly Integration</CardTitle>
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
