
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, BarChart3, Target } from "lucide-react";
import { useState } from "react";

interface PredictionData {
  name: string;
  description: string;
  multiplier: number;
  color: string;
  confidence: number;
}

interface ScenarioForecastProps {
  baseMetric: number;
  metricName: string;
  forecastDays: number;
  currentTrend: 'increasing' | 'decreasing' | 'stable';
}

const predictions: PredictionData[] = [
  {
    name: 'Conservative',
    description: 'Assumes market challenges and reduced performance',
    multiplier: 0.85,
    color: '#ef4444',
    confidence: 85
  },
  {
    name: 'Realistic',
    description: 'Based on current trends and normal market conditions',
    multiplier: 1.0,
    color: '#3b82f6',
    confidence: 78
  },
  {
    name: 'Optimistic',
    description: 'Assumes successful optimizations and favorable conditions',
    multiplier: 1.25,
    color: '#10b981',
    confidence: 65
  },
  {
    name: 'Aggressive',
    description: 'Maximum growth with perfect execution',
    multiplier: 1.5,
    color: '#f59e0b',
    confidence: 45
  }
];

export const ScenarioForecast = ({ baseMetric, metricName, forecastDays, currentTrend }: ScenarioForecastProps) => {
  const [selectedPrediction, setSelectedPrediction] = useState('Realistic');

  const calculatePredictionValue = (prediction: PredictionData) => {
    let trendMultiplier = 1;
    if (currentTrend === 'increasing') {
      trendMultiplier = 1.08;
    } else if (currentTrend === 'decreasing') {
      trendMultiplier = 0.92;
    }

    return baseMetric * prediction.multiplier * trendMultiplier;
  };

  const formatValue = (value: number) => {
    if (metricName.toLowerCase().includes('revenue')) {
      return `$${value.toLocaleString()}`;
    }
    if (metricName.toLowerCase().includes('rate') || metricName.toLowerCase().includes('roas')) {
      return `${value.toFixed(1)}${metricName.toLowerCase().includes('rate') ? '%' : ''}`;
    }
    return value.toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          Prediction Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Select value={selectedPrediction} onValueChange={setSelectedPrediction}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {predictions.map(prediction => (
                <SelectItem key={prediction.name} value={prediction.name}>
                  {prediction.name} Prediction
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs">
            {forecastDays} days ahead
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {predictions.map(prediction => {
            const isSelected = prediction.name === selectedPrediction;
            const projectedValue = calculatePredictionValue(prediction);
            const changePercent = ((projectedValue - baseMetric) / baseMetric) * 100;

            return (
              <div 
                key={prediction.name}
                className={`p-4 border rounded-lg transition-all ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: prediction.color }}
                    />
                    {prediction.name}
                  </h4>
                  <Badge 
                    variant={changePercent > 0 ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {changePercent > 0 ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%
                  </Badge>
                </div>
                
                <p className="text-xs text-gray-600 mb-3">{prediction.description}</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Current:</span>
                    <span className="font-medium">{formatValue(baseMetric)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Projected:</span>
                    <span className="font-medium" style={{ color: prediction.color }}>
                      {formatValue(projectedValue)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Confidence:</span>
                    <span className={`${
                      prediction.confidence > 75 ? 'text-green-600' : 
                      prediction.confidence > 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {prediction.confidence}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Target className="h-4 w-4 text-amber-600 mt-0.5" />
            <div>
              <h5 className="text-sm font-medium text-amber-900">Prediction Insights</h5>
              <p className="text-xs text-amber-800 mt-1">
                {selectedPrediction === 'Conservative' && 
                  'Focus on risk mitigation and maintaining current performance levels.'}
                {selectedPrediction === 'Realistic' && 
                  'Continue current optimization strategies with measured improvements.'}
                {selectedPrediction === 'Optimistic' && 
                  'Invest in growth initiatives and scale successful campaigns.'}
                {selectedPrediction === 'Aggressive' && 
                  'Requires significant investment and perfect execution across all channels.'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
