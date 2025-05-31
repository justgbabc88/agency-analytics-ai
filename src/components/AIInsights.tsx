
import { AlertCircle } from "lucide-react";

interface AIInsightsProps {
  insights: string;
  seasonality?: {
    period: number;
    strength: number;
  };
}

export const AIInsights = ({ insights, seasonality }: AIInsightsProps) => {
  return (
    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-purple-600 mt-0.5" />
        <div>
          <h4 className="font-medium text-purple-900 mb-1">Advanced AI Forecast Analysis</h4>
          <p className="text-sm text-purple-800">
            {insights}
          </p>
          {seasonality && (
            <p className="text-xs text-purple-600 mt-2">
              📊 Detected {seasonality.period}-day seasonality pattern with {(seasonality.strength * 100).toFixed(1)}% strength.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
