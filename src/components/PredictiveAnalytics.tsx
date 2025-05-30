import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Brain, Target, AlertCircle, RefreshCw, Calendar, BarChart } from "lucide-react";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from "recharts";
import { useGoogleSheetsData } from "@/hooks/useGoogleSheetsData";
import { generateForecast, generateScenarioForecasts, parseDateFromSheetData, ForecastResult, calculateLinearTrend } from "@/utils/timeSeriesUtils";
import { format, addDays } from "date-fns";

interface PredictiveAnalyticsProps {
  className?: string;
}

export const PredictiveAnalytics = ({ className }: PredictiveAnalyticsProps) => {
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [forecastPeriod, setForecastPeriod] = useState('30days');
  const [showScenarios, setShowScenarios] = useState(false);
  const { syncedData, calculateMetricsFromSyncedData } = useGoogleSheetsData();

  const currentMetrics = calculateMetricsFromSyncedData();
  
  const forecastDays = {
    '30days': 30,
    '60days': 60,
    '90days': 90,
  }[forecastPeriod] || 30;

  // Generate forecast data based on actual historical data
  const generateEnhancedForecastData = (): ForecastResult => {
    if (!syncedData || !syncedData.data.length) {
      // Generate sample forecast if no data
      const sampleData = Array.from({ length: 15 }, (_, i) => {
        const date = format(addDays(new Date(), i - 10), 'M/d/yyyy');
        const isActual = i < 10;
        let value;
        
        if (selectedMetric === 'revenue') {
          value = isActual ? 85000 + (i * 2000) + (Math.random() * 5000) : 
                            95000 + (i * 1500) + (Math.random() * 3000);
        } else if (selectedMetric === 'conversions') {
          value = isActual ? 180 + (i * 5) + (Math.random() * 15) : 
                            220 + (i * 4) + (Math.random() * 10);
        } else {
          value = isActual ? 8500 + (i * 200) + (Math.random() * 500) : 
                            9500 + (i * 150) + (Math.random() * 300);
        }
        
        return {
          date,
          value: Math.round(value),
          isActual,
          confidence: isActual ? 100 : Math.max(60, 90 - (i - 9) * 3),
        };
      });
      
      return {
        data: sampleData,
        trend: 'increasing' as const,
        accuracy: 78,
      };
    }

    const data = syncedData.data;
    
    // Extract historical values for the selected metric
    const historicalData = data.map(row => {
      const dateField = row['Date'] || row['date'] || 'Unknown';
      let value = 0;
      
      if (selectedMetric === 'revenue') {
        // Try to calculate revenue from ROAS and cost, or direct revenue fields
        const roasFields = ['ROAS', 'roas'];
        const costFields = ['Cost', 'cost', 'Spend', 'spend'];
        
        let roas = 0;
        let cost = 0;
        
        for (const field of roasFields) {
          if (row[field]) {
            roas = parseFloat(row[field].toString().replace(/[^\d.]/g, '') || '0');
            if (roas > 0) break;
          }
        }
        
        for (const field of costFields) {
          if (row[field]) {
            cost = parseFloat(row[field].toString().replace(/[$,]/g, '') || '0');
            if (cost > 0) break;
          }
        }
        
        // If we have ROAS and cost, calculate revenue
        if (roas > 0 && cost > 0) {
          value = roas * cost;
        } else {
          // Try direct revenue fields
          const revenueFields = ['Revenue', 'revenue'];
          for (const field of revenueFields) {
            if (row[field]) {
              value = parseFloat(row[field].toString().replace(/[$,]/g, '') || '0');
              if (value > 0) break;
            }
          }
        }
      } else if (selectedMetric === 'conversions') {
        const conversionFields = ['Main Offer', 'Conversions', 'conversions', 'Opt-Ins'];
        for (const field of conversionFields) {
          if (row[field]) {
            value = parseInt(row[field].toString().replace(/[^\d]/g, '') || '0');
            if (value > 0) break;
          }
        }
      } else { // traffic
        const trafficFields = ['Page Views', 'Impressions', 'impressions', 'pageViews'];
        for (const field of trafficFields) {
          if (row[field]) {
            value = parseInt(row[field].toString().replace(/[^\d]/g, '') || '0');
            if (value > 0) break;
          }
        }
      }

      return {
        date: dateField.toString(),
        value: value || 0
      };
    }).filter(d => d.value > 0);

    return generateForecast(historicalData, forecastDays);
  };

  const forecastResult = generateEnhancedForecastData();

  // Calculate trend line data for visualization
  const generateTrendLineData = () => {
    const actualData = forecastResult.data.filter(d => d.isActual);
    if (actualData.length < 2) return null;

    const values = actualData.map(d => d.value);
    const trend = calculateLinearTrend(values);

    return forecastResult.data.map((point, index) => ({
      ...point,
      trendValue: trend.slope * index + trend.intercept
    }));
  };

  const trendLineData = generateTrendLineData();

  // Generate enhanced predictions with scenarios
  const generateEnhancedPredictions = () => {
    if (!currentMetrics) {
      return [
        { metric: 'Revenue', current: 0, predicted: 0, change: 0, confidence: 75, trend: 'up', timeframe: `Next ${forecastDays} days` },
        { metric: 'Conversion Rate', current: 0, predicted: 0, change: 0, confidence: 75, trend: 'up', timeframe: `Next ${forecastDays} days` },
        { metric: 'Ad Spend', current: 0, predicted: 0, change: 0, confidence: 75, trend: 'up', timeframe: `Next ${forecastDays} days` },
        { metric: 'ROAS', current: 0, predicted: 0, change: 0, confidence: 75, trend: 'up', timeframe: `Next ${forecastDays} days` },
      ];
    }

    const estimatedRevenue = currentMetrics.revenue || (currentMetrics.roas * currentMetrics.cost);
    
    // Use forecast accuracy to determine confidence levels
    const baseConfidence = Math.max(60, forecastResult.accuracy);
    
    const predictions = [
      {
        metric: 'Revenue',
        current: estimatedRevenue,
        predicted: estimatedRevenue * (forecastResult.trend === 'increasing' ? 1.12 : forecastResult.trend === 'decreasing' ? 0.95 : 1.03),
        change: forecastResult.trend === 'increasing' ? 12.0 : forecastResult.trend === 'decreasing' ? -5.0 : 3.0,
        confidence: Math.round(baseConfidence),
        trend: forecastResult.trend === 'decreasing' ? 'down' as const : 'up' as const,
        timeframe: `Next ${forecastDays} days`
      },
      {
        metric: 'Conversion Rate',
        current: currentMetrics.conversionRate,
        predicted: currentMetrics.conversionRate * (forecastResult.trend === 'increasing' ? 1.08 : 0.98),
        change: forecastResult.trend === 'increasing' ? 8.0 : -2.0,
        confidence: Math.round(baseConfidence * 0.9),
        trend: forecastResult.trend === 'decreasing' ? 'down' as const : 'up' as const,
        timeframe: `Next ${forecastDays} days`
      },
      {
        metric: 'Ad Spend',
        current: currentMetrics.cost,
        predicted: currentMetrics.cost * (forecastResult.trend === 'increasing' ? 1.15 : 1.02),
        change: forecastResult.trend === 'increasing' ? 15.0 : 2.0,
        confidence: Math.round(baseConfidence * 0.95),
        trend: 'up' as const,
        timeframe: `Next ${forecastDays} days`
      },
      {
        metric: 'ROAS',
        current: currentMetrics.roas,
        predicted: currentMetrics.roas * (forecastResult.trend === 'increasing' ? 1.05 : 0.97),
        change: forecastResult.trend === 'increasing' ? 5.0 : -3.0,
        confidence: Math.round(baseConfidence * 0.85),
        trend: forecastResult.trend === 'decreasing' ? 'down' as const : 'up' as const,
        timeframe: `Next ${forecastDays} days`
      },
    ];

    return predictions;
  };

  const predictions = generateEnhancedPredictions();

  // Generate AI insights based on forecast results
  const generateAIInsights = () => {
    const accuracy = forecastResult.accuracy;
    const trend = forecastResult.trend;
    const dataPoints = forecastResult.data.filter(d => d.isActual).length;
    
    if (!currentMetrics) {
      return "Connect your Google Sheets to see AI-powered insights based on your actual campaign data and advanced forecasting algorithms.";
    }

    const insights = [];
    
    // Data quality insights
    if (dataPoints < 7) {
      insights.push(`Limited historical data (${dataPoints} points) may reduce forecast accuracy.`);
    }
    
    // Trend insights
    if (trend === 'increasing') {
      insights.push(`Strong upward trend detected with ${accuracy.toFixed(1)}% model accuracy. Your campaigns are performing well.`);
    } else if (trend === 'decreasing') {
      insights.push(`Declining trend identified. Consider optimizing targeting and creative to reverse the downward trajectory.`);
    } else {
      insights.push(`Stable performance detected. Look for optimization opportunities to drive growth.`);
    }
    
    // Performance insights
    if (currentMetrics.roas > 3) {
      insights.push(`Excellent ROAS of ${currentMetrics.roas.toFixed(2)} suggests scaling opportunities.`);
    } else if (currentMetrics.roas < 2) {
      insights.push(`ROAS of ${currentMetrics.roas.toFixed(2)} needs improvement. Focus on conversion optimization.`);
    }
    
    // Forecast period insights
    if (forecastDays > 30) {
      insights.push(`Long-term forecast shows ${trend} trend, but confidence decreases over time.`);
    }
    
    return insights.join(' ');
  };

  const formatTooltipValue = (value: number, name: string) => {
    if (name.includes('confidence')) return `${value}%`;
    if (selectedMetric === 'revenue') return `$${value.toLocaleString()}`;
    return value.toLocaleString();
  };

  const formatYAxisValue = (value: number) => {
    if (selectedMetric === 'revenue') return `$${(value / 1000).toFixed(0)}k`;
    return value.toString();
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Advanced Predictive Analytics
            {syncedData && (
              <Badge variant="secondary" className="ml-2">
                {syncedData.data.length} data points • {forecastResult.accuracy.toFixed(1)}% accuracy
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowScenarios(!showScenarios)}>
              <BarChart className="h-4 w-4" />
              Scenarios
            </Button>
            <Button variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Forecast Controls */}
        <div className="flex items-center gap-4">
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
          <Badge variant={forecastResult.trend === 'increasing' ? 'default' : forecastResult.trend === 'decreasing' ? 'destructive' : 'secondary'}>
            {forecastResult.trend === 'increasing' ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : forecastResult.trend === 'decreasing' ? (
              <TrendingDown className="h-3 w-3 mr-1" />
            ) : (
              <Calendar className="h-3 w-3 mr-1" />
            )}
            {forecastResult.trend.charAt(0).toUpperCase() + forecastResult.trend.slice(1)} Trend
          </Badge>
        </div>

        {/* Enhanced Forecast Chart with Trend Lines */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendLineData || forecastResult.data}>
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
                  formatTooltipValue(value, name),
                  name === 'value' ? (selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)) : 
                  name === 'trendValue' ? 'Trend Line' : name
                ]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              
              {/* Subtle confidence band for predictions only */}
              <Area
                dataKey={(entry) => entry.isActual ? null : entry.confidence}
                stroke="none"
                fill="rgba(147, 51, 234, 0.08)"
                fillOpacity={0.5}
                stackId="confidence"
              />
              
              {/* Trend line - subtle and continuous */}
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
              
              {/* Historical data line - bold and solid */}
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
              
              {/* Predicted data line - lighter and dashed */}
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
              
              {/* Vertical line separating actual vs predicted */}
              {forecastResult.data.some(d => d.isActual) && forecastResult.data.some(d => !d.isActual) && (
                <ReferenceLine 
                  x={forecastResult.data.find(d => d.isActual && forecastResult.data[forecastResult.data.indexOf(d) + 1]?.isActual === false)?.date}
                  stroke="#e5e7eb"
                  strokeDasharray="2 2"
                  strokeWidth={1}
                  label={{ 
                    value: "Forecast", 
                    position: "topLeft",
                    style: { fontSize: '11px', fill: '#6b7280' }
                  }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend for chart clarity */}
        <div className="flex items-center justify-center gap-6 text-xs text-gray-600">
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
        </div>

        {/* Enhanced Predictions Grid */}
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

        {/* Enhanced AI Insights */}
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-purple-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-purple-900 mb-1">Advanced AI Forecast Analysis</h4>
              <p className="text-sm text-purple-800">
                {generateAIInsights()}
              </p>
              {forecastResult.seasonality && (
                <p className="text-xs text-purple-600 mt-2">
                  📊 Detected {forecastResult.seasonality.period}-day seasonality pattern with {(forecastResult.seasonality.strength * 100).toFixed(1)}% strength.
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
