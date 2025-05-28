
import { MetricCard } from "./MetricCard";
import { ConversionChart } from "./ConversionChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export const BookCallFunnel = () => {
  const chartData = generateCallData();

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
            <MetricCard title="Booking Rate" value={12.8} previousValue={11.2} format="percentage" />
            <MetricCard title="Total Bookings" value={694} previousValue={555} />
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
            <MetricCard title="No Shows" value={219} previousValue={193} />
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
    </div>
  );
};
