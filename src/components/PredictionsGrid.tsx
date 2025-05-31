
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, TrendingDown } from "lucide-react";

interface Prediction {
  metric: string;
  current: number;
  predicted: number;
  change: number;
  confidence: number;
  trend: 'up' | 'down';
  timeframe: string;
}

interface PredictionsGridProps {
  predictions: Prediction[];
  forecastDays: number;
}

export const PredictionsGrid = ({ predictions, forecastDays }: PredictionsGridProps) => {
  return (
    <div>
      <h4 className="font-medium mb-3 flex items-center gap-2">
        <Target className="h-4 w-4" />
        {forecastDays}-Day Predictions
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {predictions.map((prediction) => (
          <div key={prediction.metric} className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-medium">{prediction.metric}</h5>
              <Badge 
                variant={prediction.trend === 'up' ? 'default' : 'destructive'}
                className="text-xs"
              >
                {prediction.trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {prediction.change > 0 ? '+' : ''}{prediction.change.toFixed(1)}%
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Current:</span>
                <span className="font-medium">
                  {prediction.metric.includes('Rate') || prediction.metric === 'ROAS' 
                    ? `${prediction.current.toFixed(1)}${prediction.metric.includes('Rate') ? '%' : ''}` 
                    : `$${prediction.current.toLocaleString()}`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Predicted:</span>
                <span className="font-medium">
                  {prediction.metric.includes('Rate') || prediction.metric === 'ROAS'
                    ? `${prediction.predicted.toFixed(1)}${prediction.metric.includes('Rate') ? '%' : ''}`
                    : `$${prediction.predicted.toLocaleString()}`}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Confidence:</span>
                <span className={`${prediction.confidence > 85 ? 'text-green-600' : prediction.confidence > 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {prediction.confidence}%
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{prediction.timeframe}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
