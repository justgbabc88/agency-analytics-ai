import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface FunnelProductConfig {
  id: string;
  label: string;
  visible: boolean;
  color: string;
}

interface ConversionChartProps {
  data: Array<{
    date: string;
    conversionRate?: number;
    roas?: number;
    pageViews?: number;
    revenue?: number;
    cost?: number;
    impressions?: number;
    clicks?: number;
    conversions?: number;
    optins?: number;
    mainOffer?: number;
    bump?: number;
    upsell1?: number;
    downsell1?: number;
    upsell2?: number;
    downsell2?: number;
    totalBookings?: number;
    callsTaken?: number;
    cancelled?: number;
    [key: string]: any;
  }>;
  title: string;
  metrics: string[];
  productConfig?: Record<string, FunnelProductConfig>;
}

export const ConversionChart = ({ data, title, metrics = [], productConfig }: ConversionChartProps) => {
  // ... keep existing code (defaultColors object)
  const defaultColors = {
    pageViews: '#6B7280',
    optins: '#8B5CF6',
    mainOffer: '#10B981',
    mainOfferBuyers: '#10B981',
    bump: '#3B82F6',
    bumpProductBuyers: '#3B82F6',
    upsell1: '#F59E0B',
    upsell1Buyers: '#F59E0B',
    downsell1: '#8B5CF6',
    downsell1Buyers: '#8B5CF6',
    upsell2: '#EF4444',
    upsell2Buyers: '#EF4444',
    downsell2: '#06B6D4',
    downsell2Buyers: '#06B6D4',
    roas: '#F59E0B',
    conversionRate: '#3B82F6',
    revenue: '#8B5CF6',
    cost: '#EF4444',
    impressions: '#06B6D4',
    clicks: '#84CC16',
    conversions: '#F97316',
    spend: '#EF4444',
    ctrAll: '#3B82F6',
    ctrLink: '#10B981',
    cpm: '#F59E0B',
    frequency: '#8B5CF6',
    optinRate: '#8B5CF6',
    mainOfferRate: '#10B981',
    bumpRate: '#3B82F6',
    upsell1Rate: '#F59E0B',
    downsell1Rate: '#8B5CF6',
    upsell2Rate: '#EF4444',
    downsell2Rate: '#06B6D4',
    totalBookings: '#10B981',
    callsTaken: '#3B82F6', 
    cancelled: '#EF4444'
  };

  // ... keep existing code (getMetricColor function)
  const getMetricColor = (metric: string) => {
    // Check if it's a product-specific metric and we have product config
    if (productConfig) {
      if (metric === 'bumpProductBuyers' || metric === 'bumpRate' || metric === 'bump') {
        return productConfig.bump?.color || defaultColors.bumpProductBuyers || '#3B82F6';
      }
      if (metric === 'upsell1Buyers' || metric === 'upsell1Rate' || metric === 'upsell1') {
        return productConfig.upsell1?.color || defaultColors.upsell1Buyers || '#F59E0B';
      }
      if (metric === 'downsell1Buyers' || metric === 'downsell1Rate' || metric === 'downsell1') {
        return productConfig.downsell1?.color || defaultColors.downsell1Buyers || '#8B5CF6';
      }
      if (metric === 'upsell2Buyers' || metric === 'upsell2Rate' || metric === 'upsell2') {
        return productConfig.upsell2?.color || defaultColors.upsell2Buyers || '#EF4444';
      }
      if (metric === 'downsell2Buyers' || metric === 'downsell2Rate' || metric === 'downsell2') {
        return productConfig.downsell2?.color || defaultColors.downsell2Buyers || '#06B6D4';
      }
    }
    
    // Default colors for other metrics
    return defaultColors[metric as keyof typeof defaultColors] || '#6B7280';
  };

  // Enhanced Y-axis domain calculation for better proportionality
  const calculateYAxisDomain = () => {
    if (!Array.isArray(data) || !Array.isArray(metrics) || data.length === 0) {
      return undefined;
    }

    const allValues: number[] = [];
    
    data.forEach(row => {
      metrics.forEach(metric => {
        const value = row[metric];
        if (value !== undefined && value !== null && !isNaN(Number(value))) {
          allValues.push(Number(value));
        }
      });
    });

    if (allValues.length === 0) return undefined;

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const range = max - min;
    
    // For conversion rates (percentages), use tighter bounds
    const isPercentageMetric = metrics.some(m => m.includes('Rate') || m.includes('CTR'));
    
    if (isPercentageMetric && range < 10) {
      // For small percentage ranges, add minimal padding
      const padding = Math.max(0.5, range * 0.1);
      return [Math.max(0, min - padding), max + padding];
    }
    
    if (range > 0) {
      // Add 10% padding for better visualization
      const padding = range * 0.1;
      const domainMin = Math.max(0, min - padding);
      const domainMax = max + padding;
      return [domainMin, domainMax];
    }
    
    return undefined;
  };

  // ... keep existing code (formatTooltipValue function)
  const formatTooltipValue = (value: number, name: string) => {
    if (name.includes('Rate') || name.includes('CTR')) {
      return `${value.toFixed(2)}%`;
    }
    if (name.includes('Revenue') || name.includes('Cost') || name.includes('CPC') || name.includes('Spend') || name.includes('CPM')) {
      return `$${value.toLocaleString()}`;
    }
    if (name.includes('ROAS')) {
      return value.toFixed(2);
    }
    return value.toLocaleString();
  };

  // Enhanced Y-axis tick formatting
  const formatYAxisTick = (value: number) => {
    const isPercentageMetric = metrics.some(m => m.includes('Rate') || m.includes('CTR'));
    
    if (isPercentageMetric) {
      return `${value.toFixed(1)}%`;
    }
    if (metrics.some(m => m.includes('Revenue') || m.includes('Cost') || m.includes('Spend'))) {
      if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
      return `$${value.toFixed(0)}`;
    }
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value.toFixed(0);
  };

  // ... keep existing code (formatMetricName function)
  const formatMetricName = (metric: string) => {
    const nameMap = {
      pageViews: 'Page Views',
      optins: 'Opt-ins',
      mainOffer: 'Main Offer',
      mainOfferBuyers: 'Main Offer Buyers',
      bump: 'Bump Product',
      bumpProductBuyers: 'Bump Product Buyers',
      upsell1: 'Upsell 1',
      upsell1Buyers: 'Upsell 1 Buyers',
      downsell1: 'Downsell 1',
      downsell1Buyers: 'Downsell 1 Buyers',
      upsell2: 'Upsell 2',
      upsell2Buyers: 'Upsell 2 Buyers',
      downsell2: 'Downsell 2',
      downsell2Buyers: 'Downsell 2 Buyers',
      roas: 'ROAS',
      optinRate: 'Opt-in Rate',
      mainOfferRate: 'Main Offer Rate',
      bumpRate: 'Bump Rate',
      upsell1Rate: 'Upsell 1 Rate',
      downsell1Rate: 'Downsell 1 Rate',
      upsell2Rate: 'Upsell 2 Rate',
      downsell2Rate: 'Downsell 2 Rate',
      spend: 'Spend',
      ctrAll: 'CTR (All)',
      ctrLink: 'CTR (Link)',
      cpm: 'CPM',
      frequency: 'Frequency',
      totalBookings: 'Total Bookings',
      callsTaken: 'Calls Taken',
      cancelled: 'Cancelled'
    };

    return nameMap[metric as keyof typeof nameMap] || metric.charAt(0).toUpperCase() + metric.slice(1).replace(/([A-Z])/g, ' $1');
  };

  // Ensure data and metrics are arrays before filtering
  if (!Array.isArray(data) || !Array.isArray(metrics)) {
    return (
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-base font-semibold text-gray-800 mb-3">{title}</h3>
        <div className="flex items-center justify-center h-48 text-gray-500">
          <div className="text-center">
            <p>Invalid data format</p>
            <p className="text-sm mt-1">Please check your data structure</p>
          </div>
        </div>
      </div>
    );
  }

  // Filter data to only include rows where at least one metric has a value
  const filteredData = data.filter(row => 
    metrics.length > 0 && metrics.some(metric => 
      row[metric] !== undefined && 
      row[metric] !== null && 
      row[metric] !== 0
    )
  );

  if (filteredData.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-base font-semibold text-gray-800 mb-3">{title}</h3>
        <div className="flex items-center justify-center h-48 text-gray-500">
          <div className="text-center">
            <p>No data available for the selected metrics</p>
            <p className="text-sm mt-1">Try adjusting your date range or field mappings</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate trend line for each metric
  const calculateTrendLine = (metric: string) => {
    const validData = filteredData.filter(d => d[metric] !== undefined && d[metric] !== null && d[metric] !== 0);
    if (validData.length < 2) return null;

    const xValues = validData.map((_, index) => index);
    const yValues = validData.map(d => Number(d[metric]));
    
    const n = xValues.length;
    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = yValues.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
  };

  const yAxisDomain = calculateYAxisDomain();

  return (
    <div className="bg-white">
      {title && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          <div className="text-xs text-gray-500">
            {filteredData.length} data point{filteredData.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={filteredData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            stroke="#6b7280"
            fontSize={10}
            angle={-45}
            textAnchor="end"
            height={60}
            interval="preserveStartEnd"
          />
          <YAxis 
            stroke="#6b7280" 
            fontSize={10} 
            domain={yAxisDomain}
            tickFormatter={formatYAxisTick}
            width={60}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              fontSize: '12px'
            }}
            formatter={formatTooltipValue}
            labelStyle={{ color: '#374151', fontWeight: '500' }}
          />
          {/* Enhanced trend lines with better visibility */}
          {metrics.map(metric => {
            const trendLine = calculateTrendLine(metric);
            return trendLine && filteredData.length > 1 ? (
              <ReferenceLine 
                key={`trend-${metric}`}
                segment={[
                  { x: filteredData[0]?.date, y: trendLine.intercept },
                  { x: filteredData[filteredData.length - 1]?.date, y: trendLine.intercept + trendLine.slope * (filteredData.length - 1) }
                ]}
                stroke={getMetricColor(metric)}
                strokeDasharray="4 4"
                strokeWidth={1.5}
                opacity={0.7}
              />
            ) : null;
          })}
          {metrics.map(metric => {
            const hasData = filteredData.some(d => d[metric] !== undefined && d[metric] !== null && d[metric] !== 0);
            return hasData ? (
              <Line 
                key={metric}
                type="monotone" 
                dataKey={metric} 
                stroke={getMetricColor(metric)}
                strokeWidth={2.5}
                dot={{ fill: getMetricColor(metric), strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
                connectNulls={false}
                name={formatMetricName(metric)}
              />
            ) : null;
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
