
interface FunnelProductConfig {
  id: string;
  label: string;
  visible: boolean;
  color: string;
}

interface ChartLegendProps {
  selectedMetric: string;
  selectedProducts: FunnelProductConfig[];
}

export const ChartLegend = ({ selectedMetric, selectedProducts }: ChartLegendProps) => {
  return (
    <div className="flex items-center justify-center gap-6 text-xs text-gray-600">
      {selectedMetric === 'funnelProducts' ? (
        <div className="flex items-center gap-4">
          {selectedProducts.map(product => (
            <div key={product.id} className="flex items-center gap-2">
              <div 
                className="w-4 h-0.5" 
                style={{ backgroundColor: product.color }}
              ></div>
              <span>{product.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-gray-800"></div>
            <span>Historical Data</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-purple-500 opacity-70" style={{ borderTop: '2px dashed' }}></div>
            <span>Prediction</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-slate-400" style={{ borderTop: '1px dashed' }}></div>
            <span>Trend Line</span>
          </div>
        </>
      )}
    </div>
  );
};
