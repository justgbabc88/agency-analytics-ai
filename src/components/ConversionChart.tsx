
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
    [key: string]: any;
  }>;
  title: string;
  metrics: string[];
  productConfig?: Record<string, FunnelProductConfig>;
}

export const ConversionChart = ({ data, title, metrics, productConfig }: ConversionChartProps) => {
  const defaultColors = {
    pageViews: '#6B7280',
    optins: '#8B5CF6',
    mainOfferBuyers: '#10B981',
    bumpProductBuyers: '#3B82F6',
    upsell1Buyers: '#F59E0B',
    downsell1Buyers: '#8B5CF6',
    upsell2Buyers: '#EF4444',
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

  const getMetricColor = (metric: string) => {
    // Check if it's a product-specific metric and we have product config
    if (productConfig) {
      if (metric === 'bumpProductBuyers' || metric === 'bumpRate') {
        return productConfig.bump?.color || defaultColors.bumpProductBuyers || '#3B82F6';
      }
      if (metric === 'upsell1Buyers' || metric === 'upsell1Rate') {
        return productConfig.upsell1?.color || defaultColors.upsell1Buyers || '#F59E0B';
      }
      if (metric === 'downsell1Buyers' || metric === 'downsell1Rate') {
        return productConfig.downsell1?.color || defaultColors.downsell1Buyers || '#8B5CF6';
      }
      if (metric === 'upsell2Buyers' || metric === 'upsell2Rate') {
        return productConfig.upsell2?.color || defaultColors.upsell2Buyers || '#EF4444';
      }
      if (metric === 'downsell2Buyers' || metric === 'downsell2Rate') {
        return productConfig.downsell2?.color || defaultColors.downsell2Buyers || '#06B6D4';
      }
    }
    
    // Default colors for other metrics
    return defaultColors[metric as keyof typeof defaultColors] || '#6B7280';
  };

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

  const formatMetricName = (metric: string) => {
    const nameMap = {
      pageViews: 'Page Views',
      optins: 'Opt-ins',
      mainOfferBuyers: 'Main Offer Buyers',
      bumpProductBuyers: 'Bump Product Buyers',
      upsell1Buyers: 'Upsell 1 Buyers',
      downsell1Buyers: 'Downsell 1 Buyers',
      upsell2Buyers: 'Upsell 2 Buyers',
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

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            stroke="#6b7280"
            fontSize={12}
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
          {metrics.map(metric => (
            data[0] && data[0][metric] !== undefined && (
              <Line 
                key={metric}
                type="monotone" 
                dataKey={metric} 
                stroke={getMetricColor(metric)}
                strokeWidth={2}
                dot={{ fill: getMetricColor(metric), strokeWidth: 2, r: 4 }}
                name={formatMetricName(metric)}
              />
            )
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
