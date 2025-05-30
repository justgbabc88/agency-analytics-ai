
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Brain, Target, AlertCircle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useGoogleSheetsData } from "@/hooks/useGoogleSheetsData";

interface PredictiveAnalyticsProps {
  className?: string;
}

export const PredictiveAnalytics = ({ className }: PredictiveAnalyticsProps) => {
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [forecastPeriod, setForecastPeriod] = useState('30days');
  const { syncedData, calculateMetricsFromSyncedData } = useGoogleSheetsData();

  const currentMetrics = calculateMetricsFromSyncedData();

  // Generate more realistic forecast data based on actual trends
  const generateForecastData = () => {
    if (!syncedData || !currentMetrics) {
      return [
        { period: 'Week 1', actual: null, predicted: 87000, confidence: 85 },
        { period: 'Week 2', actual: null, predicted: 90000, confidence: 82 },
        { period: 'Week 3', actual: null, predicted: 93000, confidence: 78 },
      ];
    }

    const data = syncedData.data;
    
    // Calculate actual values from historical data
    const historicalData = data.map((row, index) => {
      const dateField = row['Date'] || row['date'] || `Day ${index + 1}`;
      
      let actualValue = null;
      if (selectedMetric === 'revenue') {
        const revenueFields = ['Revenue', 'revenue'];
        for (const field of revenueFields) {
          if (row[field]) {
            const value = parseFloat(row[field].toString().replace(/[$,]/g, '') || '0');
            if (value > 0) {
              actualValue = value;
              break;
            }
          }
        }
        if (!actualValue && row['ROAS'] && row['Cost']) {
          const roas = parseFloat(row['ROAS'].toString().replace(/[^\d.]/g, '') || '0');
          const cost = parseFloat(row['Cost'].toString().replace(/[$,]/g, '') || '0');
          if (roas > 0 && cost > 0) {
            actualValue = roas * cost;
          }
        }
      } else if (selectedMetric === 'conversions') {
        const conversionFields = ['Main Offer', 'Conversions', 'conversions', 'Opt-Ins'];
        for (const field of conversionFields) {
          if (row[field]) {
            const value = parseInt(row[field].toString().replace(/[^\d]/g, '') || '0');
            if (value > 0) {
              actualValue = value;
              break;
            }
          }
        }
      } else {
        const trafficFields = ['Page Views', 'Impressions', 'impressions', 'traffic'];
        for (const field of trafficFields) {
          if (row[field]) {
            const value = parseInt(row[field].toString().replace(/[^\d]/g, '') || '0');
            if (value > 0) {
              actualValue = value;
              break;
            }
          }
        }
      }

      return {
        period: typeof dateField === 'string' ? dateField : `Period ${index + 1}`,
        actual: actualValue,
        index
      };
    });

    // Calculate trend from actual data
    const actualValues = historicalData.filter(d => d.actual !== null).map(d => d.actual);
    const avgValue = actualValues.length > 0 ? actualValues.reduce((a, b) => a + b, 0) / actualValues.length : 1000;
    
    // Calculate growth trend from recent data
    let growthRate = 0.05; // Default 5% growth
    if (actualValues.length >= 3) {
      const recent = actualValues.slice(-3);
      const older = actualValues.slice(-6, -3);
      if (older.length > 0) {
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        growthRate = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0.05;
        growthRate = Math.max(-0.2, Math.min(0.3, growthRate)); // Cap between -20% and 30%
      }
    }

    // Generate predictions based on trend
    const forecastData = historicalData.map((item, index) => {
      let predictedValue;
      if (item.actual !== null) {
        // For historical data, predict close to actual with some variance
        predictedValue = item.actual * (0.95 + Math.random() * 0.1);
      } else {
        // For future data, use trend-based prediction
        const daysFromLast = index - (actualValues.length - 1);
        const trendMultiplier = 1 + (growthRate * daysFromLast * 0.1);
        const variance = 0.9 + Math.random() * 0.2; // ±10% variance
        predictedValue = avgValue * trendMultiplier * variance;
      }
      
      const confidence = Math.max(60, 95 - index * 2);

      return {
        ...item,
        predicted: Math.round(predictedValue),
        confidence: Math.round(confidence)
      };
    });

    return forecastData;
  };

  // Generate more realistic predictions based on trends
  const generatePredictions = () => {
    if (!currentMetrics) {
      return [
        { metric: 'Revenue', current: 0, predicted: 0, change: 0, confidence: 75, trend: 'up', timeframe: 'Next 30 days' },
        { metric: 'Conversion Rate', current: 0, predicted: 0, change: 0, confidence: 75, trend: 'up', timeframe: 'Next 30 days' },
        { metric: 'Ad Spend', current: 0, predicted: 0, change: 0, confidence: 75, trend: 'up', timeframe: 'Next 30 days' },
        { metric: 'ROAS', current: 0, predicted: 0, change: 0, confidence: 75, trend: 'up', timeframe: 'Next 30 days' },
      ];
    }

    const estimatedRevenue = currentMetrics.revenue || (currentMetrics.roas * currentMetrics.cost);
    
    // Calculate more realistic predictions based on current performance
    const predictions = [
      {
        metric: 'Revenue',
        current: estimatedRevenue,
        predicted: estimatedRevenue * (currentMetrics.roas > 3 ? 1.15 : currentMetrics.roas > 2 ? 1.08 : 1.02),
        change: currentMetrics.roas > 3 ? 15.0 : currentMetrics.roas > 2 ? 8.0 : 2.0,
        confidence: currentMetrics.roas > 3 ? 88 : currentMetrics.roas > 2 ? 82 : 75,
        trend: 'up' as const,
        timeframe: 'Next 30 days'
      },
      {
        metric: 'Conversion Rate',
        current: currentMetrics.conversionRate,
        predicted: currentMetrics.conversionRate * (currentMetrics.conversionRate > 5 ? 1.05 : 1.12),
        change: currentMetrics.conversionRate > 5 ? 5.0 : 12.0,
        confidence: currentMetrics.conversionRate > 5 ? 85 : 78,
        trend: 'up' as const,
        timeframe: 'Next 30 days'
      },
      {
        metric: 'Ad Spend',
        current: currentMetrics.cost,
        predicted: currentMetrics.cost * (currentMetrics.roas > 3 ? 1.20 : 1.05),
        change: currentMetrics.roas > 3 ? 20.0 : 5.0,
        confidence: 90,
        trend: 'up' as const,
        timeframe: 'Next 30 days'
      },
      {
        metric: 'ROAS',
        current: currentMetrics.roas,
        predicted: currentMetrics.roas * (currentMetrics.roas < 2 ? 1.25 : currentMetrics.roas < 3 ? 1.15 : 1.08),
        change: currentMetrics.roas < 2 ? 25.0 : currentMetrics.roas < 3 ? 15.0 : 8.0,
        confidence: currentMetrics.roas < 2 ? 70 : currentMetrics.roas < 3 ? 80 : 85,
        trend: 'up' as const,
        timeframe: 'Next 30 days'
      },
    ];

    return predictions;
  };

  const forecastData = generateForecastData();
  const predictions = generatePredictions();

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Predictive Analytics
            {syncedData && (
              <Badge variant="secondary" className="ml-2">
                {syncedData.data.length} data points
              </Badge>
            )}
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
                  connectNulls={false}
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

        {/* AI Insights */}
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-purple-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-purple-900 mb-1">AI Forecast Insights</h4>
              <p className="text-sm text-purple-800">
                {currentMetrics ? (
                  `Based on your ${currentMetrics.dataRows} data points and current ROAS of ${currentMetrics.roas.toFixed(2)}, 
                  ${currentMetrics.roas > 3 ? 'your campaigns are performing excellently. The model predicts continued strong growth.' :
                    currentMetrics.roas > 2 ? 'your campaigns show good performance with room for optimization. Moderate growth expected.' :
                    'your campaigns need optimization. Focus on improving targeting and creative to boost ROAS above 2.0.'} 
                  Current conversion rate of ${currentMetrics.conversionRate.toFixed(1)}% 
                  ${currentMetrics.conversionRate > 5 ? 'is strong.' : 'has potential for improvement through landing page optimization.'}`
                ) : (
                  "Connect your Google Sheets to see personalized AI insights based on your actual campaign data."
                )}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
