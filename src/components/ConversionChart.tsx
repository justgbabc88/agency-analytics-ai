
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
    callsBooked?: number;
    cancelled?: number;
    showUpRate?: number;
    [key: string]: any;
  }>;
  title: string;
  metrics: string[];
  productConfig?: Record<string, FunnelProductConfig>;
}

export const ConversionChart = ({ data, title, metrics = [], productConfig }: ConversionChartProps) => {
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
    callsBooked: '#10B981',
    cancelled: '#EF4444',
    showUpRate: '#8B5CF6'
  };

  const getMetricColor = (metric: string) => {
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
    
    return defaultColors[metric as keyof typeof defaultColors] || '#6B7280';
  };

  // Clean and validate data
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

  // Filter and clean data
  const validData = data
    .filter(row => row && row.date)
    .map(row => {
      const cleanedRow = { ...row };
      metrics.forEach(metric => {
        if (cleanedRow[metric] !== undefined && cleanedRow[metric] !== null) {
          const numValue = Number(cleanedRow[metric]);
          cleanedRow[metric] = isNaN(numValue) ? 0 : numValue;
        }
      });
      return cleanedRow;
    })
    .filter(row => 
      metrics.some(metric => 
        row[metric] !== undefined && 
        row[metric] !== null &&
        !isNaN(Number(row[metric]))
      )
    );

  if (validData.length === 0) {
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

  // Calculate proper Y-axis domain
  const calculateYAxisDomain = () => {
    const allValues: number[] = [];
    
    validData.forEach(row => {
      metrics.forEach(metric => {
        const value = row[metric];
        if (typeof value === 'number' && !isNaN(value)) {
          allValues.push(value);
        }
      });
    });

    if (allValues.length === 0) return [0, 100];

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    
    // If all values are the same
    if (min === max) {
      if (min === 0) return [0, 10];
      const padding = Math.abs(min) * 0.2;
      return [Math.max(0, min - padding), max + padding];
    }
    
    // For percentage metrics (0-100)
    const isPercentage = metrics.some(m => 
      m.includes('Rate') || m.includes('CTR') || m.includes('showUp')
    );
    
    if (isPercentage && max <= 100) {
      return [0, Math.min(100, max * 1.1)];
    }
    
    // For other metrics, add 10% padding
    const padding = (max - min) * 0.1;
    return [Math.max(0, min - padding), max + padding];
  };

  const formatTooltipValue = (value: number, name: string) => {
    if (name.includes('Rate') || name.includes('CTR') || name.includes('showUp')) {
      return `${value.toFixed(1)}%`;
    }
    if (name.includes('Revenue') || name.includes('Cost') || name.includes('Spend')) {
      return `$${value.toLocaleString()}`;
    }
    if (name.includes('ROAS')) {
      return value.toFixed(2);
    }
    return Math.round(value).toLocaleString();
  };

  const formatYAxisTick = (value: number) => {
    const isPercentage = metrics.some(m => 
      m.includes('Rate') || m.includes('CTR') || m.includes('showUp')
    );
    
    if (isPercentage) {
      return `${value.toFixed(0)}%`;
    }
    if (metrics.some(m => m.includes('Revenue') || m.includes('Cost') || m.includes('Spend'))) {
      if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
      return `$${value.toFixed(0)}`;
    }
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return Math.round(value).toString();
  };

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
      callsBooked: 'Calls Booked',
      cancelled: 'Cancelled',
      showUpRate: 'Show Up Rate'
    };

    return nameMap[metric as keyof typeof nameMap] || metric.charAt(0).toUpperCase() + metric.slice(1).replace(/([A-Z])/g, ' $1');
  };

  const yAxisDomain = calculateYAxisDomain();

  return (
    <div className="bg-white">
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          <div className="text-xs text-gray-500">
            {validData.length} data point{validData.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart 
          data={validData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            stroke="#6b7280"
            fontSize={12}
            angle={-45}
            textAnchor="end"
            height={60}
            interval={validData.length > 10 ? Math.floor(validData.length / 8) : 0}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            stroke="#6b7280" 
            fontSize={12} 
            domain={yAxisDomain}
            tickFormatter={formatYAxisTick}
            width={80}
            tick={{ fontSize: 12 }}
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
            labelFormatter={(label) => `Date: ${label}`}
          />
          {metrics.map(metric => {
            const hasData = validData.some(d => 
              d[metric] !== undefined && 
              d[metric] !== null && 
              !isNaN(Number(d[metric]))
            );
            return hasData ? (
              <Line 
                key={metric}
                type="monotone" 
                dataKey={metric} 
                stroke={getMetricColor(metric)}
                strokeWidth={2}
                dot={{ 
                  fill: getMetricColor(metric), 
                  strokeWidth: 2, 
                  r: 3,
                  stroke: getMetricColor(metric)
                }}
                activeDot={{ 
                  r: 5, 
                  strokeWidth: 2,
                  stroke: getMetricColor(metric),
                  fill: getMetricColor(metric)
                }}
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
