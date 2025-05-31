
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Area, ComposedChart } from "recharts";

interface ForecastDataPoint {
  date: string;
  value: number;
  isActual: boolean;
  confidence?: number;
  trendValue?: number;
}

interface FunnelProductConfig {
  id: string;
  label: string;
  visible: boolean;
  color: string;
}

interface ForecastChartProps {
  data: ForecastDataPoint[];
  funnelData: any[];
  selectedMetric: string;
  selectedProducts: FunnelProductConfig[];
  trendLineData: ForecastDataPoint[] | null;
  productConfigMap: Record<string, FunnelProductConfig>;
}

export const ForecastChart = ({
  data,
  funnelData,
  selectedMetric,
  selectedProducts,
  trendLineData,
  productConfigMap
}: ForecastChartProps) => {
  const formatTooltipValue = (value: number, name: string | number | any) => {
    const nameStr = String(name || '');
    
    if (nameStr.includes('confidence')) return `${value}%`;
    if (selectedMetric === 'revenue') return `$${value.toLocaleString()}`;
    if (selectedMetric.includes('Rate') || selectedMetric === 'funnelProducts') return `${value.toFixed(2)}%`;
    return value.toLocaleString();
  };

  const formatYAxisValue = (value: number) => {
    if (selectedMetric === 'revenue') return `$${(value / 1000).toFixed(0)}k`;
    if (selectedMetric.includes('Rate') || selectedMetric === 'funnelProducts') return `${value.toFixed(1)}%`;
    return value.toString();
  };

  // Filter to only show visible products
  const visibleProducts = selectedProducts.filter(product => product.visible);

  // Find the reference line position for funnel data
  const funnelReferenceDate = funnelData.length > 0 ? funnelData.find(d => d.isActual && funnelData[funnelData.indexOf(d) + 1]?.isActual === false)?.date : null;

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        {selectedMetric === 'funnelProducts' && funnelData.length > 0 ? (
          <LineChart data={funnelData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              stroke="#6b7280" 
              fontSize={12}
              tickFormatter={formatYAxisValue}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: number, name: string) => [
                `${Number(value).toFixed(2)}%`,
                productConfigMap[name]?.label || name
              ]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            
            {/* Reference line to separate actual from predicted data */}
            {funnelReferenceDate && (
              <ReferenceLine 
                x={funnelReferenceDate}
                stroke="#e5e7eb"
                strokeDasharray="2 2"
                strokeWidth={1}
                label={{ 
                  value: "Forecast", 
                  position: "top",
                  style: { fontSize: '11px', fill: '#6b7280' }
                }}
              />
            )}
            
            {/* Historical (actual) lines for visible products - solid lines */}
            {visibleProducts.map(product => (
              <Line 
                key={`${product.id}_actual`}
                type="monotone" 
                dataKey={(entry) => entry.isActual ? entry[product.id] : null}
                stroke={product.color}
                strokeWidth={3}
                strokeDasharray="0"
                dot={(props) => {
                  const { payload } = props;
                  return payload?.isActual ? (
                    <circle {...props} fill={product.color} strokeWidth={2} r={4} />
                  ) : null;
                }}
                connectNulls={false}
                name={`${product.id}_actual`}
              />
            ))}
            
            {/* Predicted lines for visible products - dashed lines like conversion forecast */}
            {visibleProducts.map(product => (
              <Line 
                key={`${product.id}_predicted`}
                type="monotone" 
                dataKey={(entry) => !entry.isActual ? entry[product.id] : null}
                stroke={product.color}
                strokeWidth={2}
                strokeDasharray="6 6"
                strokeOpacity={0.7}
                dot={(props) => {
                  const { payload } = props;
                  return !payload?.isActual ? (
                    <circle {...props} fill={product.color} stroke={product.color} strokeWidth={1} r={2} fillOpacity={0.7} />
                  ) : null;
                }}
                connectNulls={false}
                name={`${product.id}_predicted`}
              />
            ))}
          </LineChart>
        ) : (
          <ComposedChart data={trendLineData || data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              stroke="#6b7280" 
              fontSize={12}
              tickFormatter={formatYAxisValue}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: number, name: string | number | any) => [
                formatTooltipValue(value, name),
                String(name) === 'value' ? (selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)) : 
                String(name) === 'trendValue' ? 'Trend Line' : String(name)
              ]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            
            <Area
              dataKey={(entry) => entry.isActual ? null : entry.confidence}
              stroke="none"
              fill="rgba(147, 51, 234, 0.08)"
              fillOpacity={0.5}
              stackId="confidence"
            />
            
            {trendLineData && (
              <Line 
                type="monotone" 
                dataKey="trendValue"
                stroke="#94a3b8" 
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                connectNulls={true}
                name="Trend"
              />
            )}
            
            <Line 
              type="monotone" 
              dataKey={(entry) => entry.isActual ? entry.value : null}
              stroke="#1f2937" 
              strokeWidth={3}
              dot={(props) => {
                const { payload } = props;
                return payload?.isActual ? (
                  <circle {...props} fill="#1f2937" strokeWidth={2} r={4} />
                ) : null;
              }}
              connectNulls={false}
              name="Historical Data"
            />
            
            <Line 
              type="monotone" 
              dataKey={(entry) => !entry.isActual ? entry.value : null}
              stroke="#a855f7" 
              strokeWidth={2}
              strokeDasharray="6 6"
              strokeOpacity={0.7}
              dot={(props) => {
                const { payload } = props;
                return !payload?.isActual ? (
                  <circle {...props} fill="#a855f7" stroke="#a855f7" strokeWidth={1} r={2} fillOpacity={0.7} />
                ) : null;
              }}
              connectNulls={false}
              name="Prediction"
            />
            
            {data.some(d => d.isActual) && data.some(d => !d.isActual) && (
              <ReferenceLine 
                x={data.find(d => d.isActual && data[data.indexOf(d) + 1]?.isActual === false)?.date}
                stroke="#e5e7eb"
                strokeDasharray="2 2"
                strokeWidth={1}
                label={{ 
                  value: "Forecast", 
                  position: "top",
                  style: { fontSize: '11px', fill: '#6b7280' }
                }}
              />
            )}
          </ComposedChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};
