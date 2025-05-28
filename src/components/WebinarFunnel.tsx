
import { MetricCard } from "./MetricCard";
import { ConversionChart } from "./ConversionChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const generateWebinarData = () => {
  const dates = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      conversionRate: Math.random() * 15 + 10,
      roas: Math.random() * 4 + 2,
      pageViews: Math.floor(Math.random() * 500) + 200
    });
  }
  return dates;
};

export const WebinarFunnel = () => {
  const chartData = generateWebinarData();

  return (
    <div className="space-y-6">
      {/* Registration Page */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Registration Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard title="Landing Page Views" value={8420} previousValue={7850} />
            <MetricCard title="Registration Rate" value={35.8} previousValue={32.1} format="percentage" />
            <MetricCard title="Total Registrations" value={3015} previousValue={2521} />
            <MetricCard title="Cost Per Registration" value={12.50} previousValue={15.20} format="currency" />
          </div>
        </CardContent>
      </Card>

      {/* Webinar Attendance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Webinar Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard title="Show Up Rate" value={42.3} previousValue={38.9} format="percentage" />
            <MetricCard title="Live Attendees" value={1275} previousValue={981} />
            <MetricCard title="Replay Views" value={890} previousValue={745} />
            <MetricCard title="Avg. Watch Time" value="38 min" previousValue="35 min" />
          </div>
          <ConversionChart 
            data={chartData}
            title="Attendance Trends"
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
            <MetricCard title="Sales Conversion" value={8.2} previousValue={7.1} format="percentage" />
            <MetricCard title="Total Sales" value={105} previousValue={70} />
            <MetricCard title="Revenue" value={125400} previousValue={84000} format="currency" />
            <MetricCard title="ROAS" value={4.2} previousValue={3.8} />
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
