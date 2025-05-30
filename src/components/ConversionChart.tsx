
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
}

export const ConversionChart = ({ data, title, metrics }: ConversionChartProps) => {
  const colors = {
    conversionRate: '#3B82F6',
    roas: '#10B981', 
    pageViews: '#F59E0B',
    revenue: '#8B5CF6',
    cost: '#EF4444',
    impressions: '#06B6D4',
    clicks: '#84CC16',
    conversions: '#F97316'
  };

  const formatTooltipValue = (value: number, name: string) => {
    if (name.includes('Rate') || name.includes('CTR')) {
      return `${value.toFixed(2)}%`;
    }
    if (name.includes('Revenue') || name.includes('Cost') || name.includes('CPC')) {
      return `$${value.toLocaleString()}`;
    }
    if (name.includes('ROAS')) {
      return value.toFixed(2);
    }
    return value.toLocaleString();
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
                stroke={colors[metric as keyof typeof colors] || '#6B7280'}
                strokeWidth={2}
                dot={{ fill: colors[metric as keyof typeof colors] || '#6B7280', strokeWidth: 2, r: 4 }}
                name={metric.charAt(0).toUpperCase() + metric.slice(1).replace(/([A-Z])/g, ' $1')}
              />
            )
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
