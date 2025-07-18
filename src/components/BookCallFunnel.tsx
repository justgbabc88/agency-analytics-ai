
import { MetricCard } from "./MetricCard";
import { ConversionChart } from "./ConversionChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const generateBookCallData = () => {
  const dates = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      conversionRate: Math.random() * 12 + 8,
      roas: Math.random() * 3 + 2.5,
      pageViews: Math.floor(Math.random() * 300) + 150
    });
  }
  return dates;
};

export const BookCallFunnel = () => {
  const chartData = generateBookCallData();

  return (
    <div className="space-y-6">
      {/* Landing Page */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Landing Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard title="Unique Visitors" value={3420} previousValue={3150} />
            <MetricCard title="Page View Rate" value={89.2} previousValue={86.5} format="percentage" />
            <MetricCard title="Time on Page" value="3:42" previousValue="3:21" />
            <MetricCard title="Bounce Rate" value={28.1} previousValue={31.5} format="percentage" isNegativeGood />
          </div>
        </CardContent>
      </Card>

      {/* Call Booking */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Call Booking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard title="Booking Rate" value={18.7} previousValue={15.9} format="percentage" />
            <MetricCard title="Calls Booked" value={640} previousValue={501} />
            <MetricCard title="Show Up Rate" value={72.3} previousValue={68.8} format="percentage" />
            <MetricCard title="Cost Per Booking" value={45.20} previousValue={52.10} format="currency" />
          </div>
          <ConversionChart 
            data={chartData}
            title="Booking Trends"
            metrics={['conversionRate', 'pageViews']}
          />
        </CardContent>
      </Card>

      {/* Call Conversion */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Call Conversion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard title="Close Rate" value={32.5} previousValue={29.8} format="percentage" />
            <MetricCard title="Appointments Closed" value={208} previousValue={151} />
            <MetricCard title="Revenue" value={187600} previousValue={136300} format="currency" />
            <MetricCard title="ROAS" value={6.2} previousValue={5.4} />
          </div>
          <ConversionChart 
            data={chartData}
            title="Conversion Performance"
            metrics={['conversionRate', 'roas']}
          />
        </CardContent>
      </Card>
    </div>
  );
};
