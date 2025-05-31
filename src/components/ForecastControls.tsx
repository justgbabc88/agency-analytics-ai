
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Calendar } from "lucide-react";

interface ForecastControlsProps {
  selectedMetric: string;
  forecastPeriod: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  onMetricChange: (value: string) => void;
  onPeriodChange: (value: string) => void;
}

export const ForecastControls = ({
  selectedMetric,
  forecastPeriod,
  trend,
  onMetricChange,
  onPeriodChange
}: ForecastControlsProps) => {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <Select value={selectedMetric} onValueChange={onMetricChange}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="revenue">Revenue Forecast</SelectItem>
          <SelectItem value="conversions">Conversion Forecast</SelectItem>
          <SelectItem value="traffic">Traffic Forecast</SelectItem>
          <SelectItem value="funnelProducts">Funnel Products</SelectItem>
        </SelectContent>
      </Select>
      
      <Select value={forecastPeriod} onValueChange={onPeriodChange}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="30days">30 Days</SelectItem>
          <SelectItem value="60days">60 Days</SelectItem>
          <SelectItem value="90days">90 Days</SelectItem>
        </SelectContent>
      </Select>
      
      <Badge variant={trend === 'increasing' ? 'default' : trend === 'decreasing' ? 'destructive' : 'secondary'}>
        {trend === 'increasing' ? (
          <TrendingUp className="h-3 w-3 mr-1" />
        ) : trend === 'decreasing' ? (
          <TrendingDown className="h-3 w-3 mr-1" />
        ) : (
          <Calendar className="h-3 w-3 mr-1" />
        )}
        {trend.charAt(0).toUpperCase() + trend.slice(1)} Trend
      </Badge>
    </div>
  );
};
