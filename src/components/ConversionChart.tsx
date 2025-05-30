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
    [key: string]: any;
  }>;
  title: string;
  metrics: string[];
  productConfig?: Record<string, FunnelProductConfig>;
}

export const ConversionChart = ({ data, title, metrics, productConfig }: ConversionChartProps) => {
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
    downsell2Rate: '#06B6D4'
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
      frequency: 'Frequency'
    };

    return nameMap[metric as keyof typeof nameMap] || metric.charAt(0).toUpperCase() + metric.slice(1).replace(/([A-Z])/g, ' $1');
  };

  // Filter data to only include rows where at least one metric has a value
  const filteredData = data.filter(row => 
    metrics.some(metric => 
      row[metric] !== undefined && 
      row[metric] !== null && 
      row[metric] !== 0
    )
  );

  if (filteredData.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <p>No data available for the selected metrics</p>
            <p className="text-sm mt-1">Try adjusting your date range or field mappings</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate trend line for primary metric (first metric)
  const primaryMetric = metrics[0];
  const calculateTrendLine = () => {
    if (!primaryMetric || filteredData.length < 2) return null;
    
    const validData = filteredData.filter(d => d[primaryMetric] !== undefined && d[primaryMetric] !== null && d[primaryMetric] !== 0);
    if (validData.length < 2) return null;

    const xValues = validData.map((_, index) => index);
    const yValues = validData.map(d => Number(d[primaryMetric]));
    
    const n = xValues.length;
    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = yValues.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
  };

  const trendLine = calculateTrendLine();

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <div className="text-sm text-gray-500">
          {filteredData.length} data point{filteredData.length !== 1 ? 's' : ''}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={filteredData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            stroke="#6b7280"
            fontSize={12}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis stroke="#6b7280" fontSize={12} />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            formatter={formatTooltipValue}
          />
          {/* Trend line for primary metric */}
          {trendLine && primaryMetric && filteredData.length > 1 && (
            <ReferenceLine 
              segment={[
                { x: filteredData[0]?.date, y: trendLine.intercept },
                { x: filteredData[filteredData.length - 1]?.date, y: trendLine.intercept + trendLine.slope * (filteredData.length - 1) }
              ]}
              stroke={getMetricColor(primaryMetric)}
              strokeDasharray="5 5"
              strokeWidth={2}
              opacity={0.7}
            />
          )}
          {metrics.map(metric => {
            const hasData = filteredData.some(d => d[metric] !== undefined && d[metric] !== null && d[metric] !== 0);
            return hasData ? (
              <Line 
                key={metric}
                type="monotone" 
                dataKey={metric} 
                stroke={getMetricColor(metric)}
                strokeWidth={2}
                dot={{ fill: getMetricColor(metric), strokeWidth: 2, r: 4 }}
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
