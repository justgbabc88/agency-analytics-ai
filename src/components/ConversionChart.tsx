
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ConversionChartProps {
  data: Array<{
    date: string;
    conversionRate: number;
    roas: number;
    pageViews: number;
  }>;
  title: string;
  metrics: string[];
}

export const ConversionChart = ({ data, title, metrics }: ConversionChartProps) => {
  const colors = {
    conversionRate: '#3B82F6',
    roas: '#10B981', 
    pageViews: '#F59E0B'
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
          />
          {metrics.includes('conversionRate') && (
            <Line 
              type="monotone" 
              dataKey="conversionRate" 
              stroke={colors.conversionRate}
              strokeWidth={2}
              dot={{ fill: colors.conversionRate, strokeWidth: 2, r: 4 }}
              name="Conversion Rate (%)"
            />
          )}
          {metrics.includes('roas') && (
            <Line 
              type="monotone" 
              dataKey="roas" 
              stroke={colors.roas}
              strokeWidth={2}
              dot={{ fill: colors.roas, strokeWidth: 2, r: 4 }}
              name="ROAS"
            />
          )}
          {metrics.includes('pageViews') && (
            <Line 
              type="monotone" 
              dataKey="pageViews" 
              stroke={colors.pageViews}
              strokeWidth={2}
              dot={{ fill: colors.pageViews, strokeWidth: 2, r: 4 }}
              name="Page Views"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
