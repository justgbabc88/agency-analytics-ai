
import { MetricCard } from "./MetricCard";
import { ConversionChart } from "./ConversionChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CallStatsMetricsProps {
  totalBookings: number;
  previousTotalBookings: number;
  callsTaken: number;
  previousCallsTaken: number;
  cancelled: number;
  previousCancelled: number;
  showUpRate: number;
  previousShowUpRate: number;
  chartData: any[];
  chartKey: string;
}

export const CallStatsMetrics = ({
  totalBookings,
  previousTotalBookings,
  callsTaken,
  previousCallsTaken,
  cancelled,
  previousCancelled,
  showUpRate,
  previousShowUpRate,
  chartData,
  chartKey,
}: CallStatsMetricsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Call Stats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard 
            title="Total Bookings" 
            value={totalBookings} 
            previousValue={previousTotalBookings}
            description="Events created in date range"
          />
          <MetricCard 
            title="Calls Taken" 
            value={callsTaken} 
            previousValue={previousCallsTaken}
            description="Completed calls"
          />
          <MetricCard 
            title="Calls Cancelled" 
            value={cancelled} 
            previousValue={previousCancelled}
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
          key={`calls-${chartKey}`}
          data={chartData}
          title="Call Performance Trends"
          metrics={['callsBooked', 'callsTaken', 'cancelled']}
        />
      </CardContent>
    </Card>
  );
};
