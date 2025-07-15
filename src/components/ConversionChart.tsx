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
    cpc: '#06B6D4',
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
    
    return defaultColors[metric as keyof typeof defaultColors] || '#6B7280';
  };

  // Improved Y-axis domain calculation for better proportionality
  const calculateYAxisDomain = () => {
    if (!Array.isArray(data) || !Array.isArray(metrics) || data.length === 0) {
      return [0, 100];
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

    if (allValues.length === 0) return [0, 100];

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    
    // If all values are the same, create a range around that value
    if (min === max) {
      if (min === 0) {
        return [0, 10];
      }
      const padding = Math.abs(min) * 0.2;
      return [Math.max(0, min - padding), max + padding];
    }
    
    const range = max - min;
    
    // For percentage metrics, ensure proper bounds
    const isPercentageMetric = metrics.some(m => 
      m.includes('Rate') || m.includes('CTR') || m.includes('showUp') || m.includes('ctr')
    );
    
    if (isPercentageMetric && max <= 100) {
      return [0, Math.min(100, max * 1.1)];
    }
    
    // For currency/spend metrics, start from 0
    const isCurrencyMetric = metrics.some(m => 
      m.includes('spend') || m.includes('revenue') || m.includes('cost') || m.includes('cpm') || m.includes('cpc')
    );
    
    if (isCurrencyMetric) {
      return [0, max * 1.1];
    }
    
    // For other metrics, use smart padding
    const padding = range * 0.1;
    const domainMin = Math.max(0, min - padding);
    const domainMax = max + padding;
    
    return [domainMin, domainMax];
  };

  const formatTooltipValue = (value: number, name: string) => {
    if (name.includes('Rate') || name.includes('CTR') || name.includes('showUp') || name.includes('ctr')) {
      return `${value.toFixed(2)}%`;
    }
    if (name.includes('Revenue') || name.includes('Cost') || name.includes('CPC') || name.includes('Spend') || name.includes('CPM') || name.includes('spend') || name.includes('cpm') || name.includes('cpc')) {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (name.includes('ROAS') || name.includes('frequency')) {
      return value.toFixed(2);
    }
    return Math.round(value).toLocaleString();
  };

  // Improved Y-axis tick formatting with consistent alignment
  const formatYAxisTick = (value: number) => {
    const isPercentageMetric = metrics.some(m => 
      m.includes('Rate') || m.includes('CTR') || m.includes('showUp') || m.includes('ctr')
    );
    
    if (isPercentageMetric) {
      return `${value.toFixed(1)}%`;
    }
    
    const isCurrencyMetric = metrics.some(m => 
      m.includes('Revenue') || m.includes('Cost') || m.includes('Spend') || m.includes('spend') || m.includes('cpm') || m.includes('cpc')
    );
    
    if (isCurrencyMetric) {
      // Special handling for small currency values like CPC
      if (value < 1) {
        return `$${value.toFixed(2)}`;
      }
      if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
      return `$${value.toFixed(2)}`;
    }
    
    if (metrics.some(m => m.includes('frequency') || m.includes('ROAS'))) {
      return value.toFixed(1);
    }
    
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
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
      cpc: 'CPC',
      frequency: 'Frequency',
      totalBookings: 'Total Bookings',
      callsTaken: 'Calls Taken',
      callsBooked: 'Calls Booked',
      cancelled: 'Cancelled',
      showUpRate: 'Show Up Rate'
    };

    return nameMap[metric as keyof typeof nameMap] || metric.charAt(0).toUpperCase() + metric.slice(1).replace(/([A-Z])/g, ' $1');
  };

  // Calculate optimal tick count for better alignment
  const calculateTickCount = () => {
    const yAxisDomain = calculateYAxisDomain();
    const [min, max] = yAxisDomain;
    const range = max - min;
    
    // Use fewer ticks for better readability and alignment
    if (range <= 10) return 4;
    if (range <= 50) return 5;
    if (range <= 100) return 5;
    return 6;
  };

  // Calculate optimal X-axis label display based on data points
  const calculateXAxisProps = () => {
    const dataLength = filteredData.length;
    
    if (dataLength <= 7) {
      // Show all labels for small datasets
      return {
        interval: 0,
        angle: 0,
        textAnchor: "middle" as const,
        height: 40
      };
    } else if (dataLength <= 14) {
      // Show every other label and angle them slightly
      return {
        interval: 1,
        angle: -30,
        textAnchor: "end" as const,
        height: 50
      };
    } else if (dataLength <= 30) {
      // Show every third label with more angle
      return {
        interval: 2,
        angle: -45,
        textAnchor: "end" as const,
        height: 60
      };
    } else {
      // For large datasets, show even fewer labels
      const interval = Math.ceil(dataLength / 8); // Show approximately 8 labels max
      return {
        interval: interval - 1,
        angle: -45,
        textAnchor: "end" as const,
        height: 60
      };
    }
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

  // Clean and validate data points with better error handling
  const filteredData = data
    .filter(row => row && row.date)
    .map((row, index) => {
      const cleanedRow = { ...row };
      
      // Ensure date is properly formatted for consistent X-axis labels
      if (cleanedRow.date) {
        // Try to parse and reformat the date for consistency
        try {
          const dateObj = new Date(cleanedRow.date);
          if (!isNaN(dateObj.getTime())) {
            cleanedRow.date = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }
        } catch (e) {
          // Keep original date if parsing fails
        }
      }
      
      // Ensure all numeric values are properly converted and valid
      metrics.forEach(metric => {
        if (cleanedRow[metric] !== undefined && cleanedRow[metric] !== null) {
          const numValue = Number(cleanedRow[metric]);
          cleanedRow[metric] = isNaN(numValue) ? 0 : numValue;
        } else {
          cleanedRow[metric] = 0;
        }
      });
      return cleanedRow;
    })
    .filter(row => 
      row.date && metrics.some(metric => 
        row[metric] !== undefined && 
        row[metric] !== null &&
        !isNaN(Number(row[metric]))
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

  const yAxisDomain = calculateYAxisDomain();
  const tickCount = calculateTickCount();
  const xAxisProps = calculateXAxisProps();

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
      <ResponsiveContainer width="100%" height={240}>
        <LineChart 
          data={filteredData}
          margin={{ top: 5, right: 20, left: 20, bottom: xAxisProps.height }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            stroke="#6b7280"
            fontSize={11}
            angle={xAxisProps.angle}
            textAnchor={xAxisProps.textAnchor}
            height={xAxisProps.height}
            interval={xAxisProps.interval}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={{ stroke: '#d1d5db' }}
            tickLine={{ stroke: '#d1d5db' }}
          />
          <YAxis 
            stroke="#6b7280" 
            fontSize={11} 
            domain={yAxisDomain}
            tickFormatter={formatYAxisTick}
            width={80}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickCount={tickCount}
            allowDecimals={true}
            type="number"
            axisLine={{ stroke: '#d1d5db' }}
            tickLine={{ stroke: '#d1d5db' }}
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
            const hasData = filteredData.some(d => 
              d[metric] !== undefined && 
              d[metric] !== null && 
              !isNaN(Number(d[metric])) &&
              Number(d[metric]) !== 0
            );
            return hasData ? (
              <Line 
                key={metric}
                type="monotone" 
                dataKey={metric} 
                stroke={getMetricColor(metric)}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ 
                  r: 6, 
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
