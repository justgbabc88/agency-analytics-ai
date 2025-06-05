
import { MetricCard } from "./MetricCard";
import { ConversionChart } from "./ConversionChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SalesConversionMetricsProps {
  chartData: any[];
  chartKey: string;
}

export const SalesConversionMetrics = ({ chartData, chartKey }: SalesConversionMetricsProps) => {
  return (
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
          key={`sales-${chartKey}`}
          data={chartData}
          title="Sales Performance"
          metrics={['showUpRate']}
        />
      </CardContent>
    </Card>
  );
};
