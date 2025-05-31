
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertTriangle, TrendingUp, Database } from "lucide-react";

interface AccuracyIndicatorProps {
  accuracy: number;
  dataPoints: number;
  forecastDays: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export const AccuracyIndicator = ({ accuracy, dataPoints, forecastDays, trend }: AccuracyIndicatorProps) => {
  const getAccuracyLevel = (acc: number) => {
    if (acc >= 85) return { level: 'Excellent', color: 'text-green-600', bg: 'bg-green-100' };
    if (acc >= 75) return { level: 'Good', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (acc >= 65) return { level: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { level: 'Limited', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const getDataQuality = (points: number) => {
    if (points >= 30) return { quality: 'High', color: 'text-green-600' };
    if (points >= 14) return { quality: 'Good', color: 'text-blue-600' };
    if (points >= 7) return { quality: 'Fair', color: 'text-yellow-600' };
    return { quality: 'Low', color: 'text-red-600' };
  };

  const accuracyLevel = getAccuracyLevel(accuracy);
  const dataQuality = getDataQuality(dataPoints);

  // Adjust accuracy based on forecast period
  const adjustedAccuracy = Math.max(30, accuracy - (forecastDays > 30 ? (forecastDays - 30) * 0.5 : 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <CheckCircle className="h-4 w-4 text-green-600" />
          Forecast Accuracy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Model Accuracy</span>
          <Badge className={`${accuracyLevel.bg} ${accuracyLevel.color}`} variant="secondary">
            {adjustedAccuracy.toFixed(1)}% - {accuracyLevel.level}
          </Badge>
        </div>
        
        <Progress value={adjustedAccuracy} className="h-2" />

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Database className="h-3 w-3 text-gray-500" />
              <span className="text-gray-600">Data Quality</span>
            </div>
            <div className="flex justify-between">
              <span>Points:</span>
              <span className={`font-medium ${dataQuality.color}`}>
                {dataPoints} ({dataQuality.quality})
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-gray-500" />
              <span className="text-gray-600">Trend Strength</span>
            </div>
            <div className="flex justify-between">
              <span>Pattern:</span>
              <span className={`font-medium ${
                trend === 'increasing' ? 'text-green-600' :
                trend === 'decreasing' ? 'text-red-600' : 'text-yellow-600'
              }`}>
                {trend.charAt(0).toUpperCase() + trend.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {(dataPoints < 14 || adjustedAccuracy < 75) && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-amber-800">
                {dataPoints < 14 
                  ? `Limited data (${dataPoints} points). Collect more historical data for improved accuracy.`
                  : `Accuracy reduced for ${forecastDays}-day forecast. Shorter periods provide better predictions.`
                }
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
