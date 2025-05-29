
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Brain, Target, AlertCircle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface PredictiveAnalyticsProps {
  className?: string;
}

const forecastData = [
  { period: 'Week 1', actual: 85000, predicted: 87000, confidence: 92 },
  { period: 'Week 2', actual: 92000, predicted: 94000, confidence: 89 },
  { period: 'Week 3', actual: 88000, predicted: 91000, confidence: 87 },
  { period: 'Week 4', actual: null, predicted: 95000, confidence: 85 },
  { period: 'Week 5', actual: null, predicted: 98000, confidence: 82 },
  { period: 'Week 6', actual: null, predicted: 101000, confidence: 78 },
];

const predictions = [
  {
    metric: 'Revenue',
    current: 425680,
    predicted: 465000,
    change: 9.3,
    confidence: 87,
    trend: 'up',
    timeframe: 'Next 30 days'
  },
  {
    metric: 'Conversion Rate',
    current: 6.8,
    predicted: 7.4,
    change: 8.8,
    confidence: 82,
    trend: 'up',
    timeframe: 'Next 30 days'
  },
  {
    metric: 'Ad Spend',
    current: 112000,
    predicted: 118000,
    change: 5.4,
    confidence: 91,
    trend: 'up',
    timeframe: 'Next 30 days'
  },
  {
    metric: 'ROAS',
    current: 3.8,
    predicted: 3.6,
    change: -5.3,
    confidence: 79,
    trend: 'down',
    timeframe: 'Next 30 days'
  },
];

export const PredictiveAnalytics = ({ className }: PredictiveAnalyticsProps) => {
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [forecastPeriod, setForecastPeriod] = useState('30days');

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Predictive Analytics
          </CardTitle>
          <Button variant="ghost" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Forecast Chart */}
        <div>
          <div className="flex items-center gap-4 mb-4">
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Revenue Forecast</SelectItem>
                <SelectItem value="conversions">Conversion Forecast</SelectItem>
                <SelectItem value="traffic">Traffic Forecast</SelectItem>
              </SelectContent>
            </Select>
            <Select value={forecastPeriod} onValueChange={setForecastPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30days">30 Days</SelectItem>
                <SelectItem value="60days">60 Days</SelectItem>
                <SelectItem value="90days">90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="actual" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="Actual"
                />
                <Line 
                  type="monotone" 
                  dataKey="predicted" 
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Predicted"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Predictions Grid */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Key Predictions
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
                    {prediction.change > 0 ? '+' : ''}{prediction.change}%
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Current:</span>
                    <span className="font-medium">
                      {prediction.metric.includes('Rate') || prediction.metric === 'ROAS' 
                        ? prediction.current.toFixed(1) 
                        : prediction.current.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Predicted:</span>
                    <span className="font-medium">
                      {prediction.metric.includes('Rate') || prediction.metric === 'ROAS'
                        ? prediction.predicted.toFixed(1)
                        : prediction.predicted.toLocaleString()}
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

        {/* AI Insights */}
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-purple-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-purple-900 mb-1">AI Forecast Insights</h4>
              <p className="text-sm text-purple-800">
                Based on current trends, your revenue is expected to grow by 9.3% over the next 30 days. 
                However, ROAS may decline due to increased competition. Consider optimizing ad targeting 
                or adjusting budget allocation to maintain profitability.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
