import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  previousValue?: string | number;
  format?: 'currency' | 'percentage' | 'number';
  className?: string;
  description?: string;
}

export const MetricCard = ({ 
  title, 
  value, 
  previousValue, 
  format = 'number',
  className = "",
  description
}: MetricCardProps) => {
  const formatValue = (val: string | number) => {
    const numVal = typeof val === 'string' ? parseFloat(val) : val;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(numVal);
      case 'percentage':
        return `${numVal.toFixed(1)}%`;
      default:
        return numVal.toLocaleString();
    }
  };

  const getPercentageChange = () => {
    if (!previousValue) return null;
    
    const current = typeof value === 'string' ? parseFloat(value) : value;
    const previous = typeof previousValue === 'string' ? parseFloat(previousValue) : previousValue;
    
    if (previous === 0) return null;
    
    const percentChange = ((current - previous) / previous) * 100;
    return percentChange;
  };

  const getTrend = () => {
    if (!previousValue) return null;
    
    const current = typeof value === 'string' ? parseFloat(value) : value;
    const previous = typeof previousValue === 'string' ? parseFloat(previousValue) : previousValue;
    
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'neutral';
  };

  const getTrendIcon = () => {
    const trend = getTrend();
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-analytics-secondary" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-analytics-danger" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getTrendColor = () => {
    const trend = getTrend();
    if (trend === 'up') return 'text-analytics-secondary';
    if (trend === 'down') return 'text-analytics-danger';
    return 'text-gray-400';
  };

  const percentChange = getPercentageChange();

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-gray-900">
            {formatValue(value)}
          </div>
          {previousValue && (
            <div className={`flex items-center space-x-1 ${getTrendColor()}`}>
              {getTrendIcon()}
              {percentChange !== null && (
                <span className="text-sm font-medium">
                  {percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%
                </span>
              )}
            </div>
          )}
        </div>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};
