
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, RefreshCw, BarChart } from "lucide-react";
import { useState } from "react";
import { useGoogleSheetsData } from "@/hooks/useGoogleSheetsData";
import { generateForecast, generateScenarioForecasts, parseDateFromSheetData, ForecastResult, calculateLinearTrend } from "@/utils/timeSeriesUtils";
import { format, addDays } from "date-fns";
import { MetricCustomizer } from "./MetricCustomizer";
import { ForecastControls } from "./ForecastControls";
import { ForecastChart } from "./ForecastChart";
import { ChartLegend } from "./ChartLegend";
import { PredictionsGrid } from "./PredictionsGrid";
import { AIInsights } from "./AIInsights";

interface FunnelProductConfig {
  id: string;
  label: string;
  visible: boolean;
  color: string;
}

interface PredictiveAnalyticsProps {
  className?: string;
}

export const PredictiveAnalytics = ({ className }: PredictiveAnalyticsProps) => {
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [forecastPeriod, setForecastPeriod] = useState('30days');
  const [showScenarios, setShowScenarios] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<FunnelProductConfig[]>([]);
  const { syncedData, calculateMetricsFromSyncedData } = useGoogleSheetsData();

  const currentMetrics = calculateMetricsFromSyncedData();
  
  const forecastDays = {
    '30days': 30,
    '60days': 60,
    '90days': 90,
  }[forecastPeriod] || 30;

  const handleProductsChange = (products: FunnelProductConfig[]) => {
    setSelectedProducts(products);
  };

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
        } else if (selectedMetric.includes('Rate')) {
          value = isActual ? 15 + (i * 0.5) + (Math.random() * 3) : 
                            18 + (i * 0.3) + (Math.random() * 2);
        } else {
          value = isActual ? 8500 + (i * 200) + (Math.random() * 500) : 
                            9500 + (i * 150) + (Math.random() * 300);
        }
        
        return {
          date,
          value: Math.round(value * 100) / 100,
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
        
        if (roas > 0 && cost > 0) {
          value = roas * cost;
        } else {
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
      } else if (selectedMetric === 'mainOfferRate') {
        const pageViews = parseInt(row['Page Views']?.toString().replace(/[^\d]/g, '') || '0');
        const mainOffer = parseInt(row['Main Offer']?.toString().replace(/[^\d]/g, '') || '0');
        if (pageViews > 0) {
          value = (mainOffer / pageViews) * 100;
        }
      } else if (selectedMetric === 'bumpRate') {
        const mainOffer = parseInt(row['Main Offer']?.toString().replace(/[^\d]/g, '') || '0');
        const bump = parseInt(row['Bump']?.toString().replace(/[^\d]/g, '') || '0');
        if (mainOffer > 0) {
          value = (bump / mainOffer) * 100;
        }
      } else if (selectedMetric === 'upsell1Rate') {
        const mainOffer = parseInt(row['Main Offer']?.toString().replace(/[^\d]/g, '') || '0');
        const upsell1 = parseInt(row['Upsell 1']?.toString().replace(/[^\d]/g, '') || '0');
        if (mainOffer > 0) {
          value = (upsell1 / mainOffer) * 100;
        }
      } else if (selectedMetric === 'upsell2Rate') {
        const upsell1 = parseInt(row['Upsell 1']?.toString().replace(/[^\d]/g, '') || '0');
        const upsell2 = parseInt(row['Upsell 2']?.toString().replace(/[^\d]/g, '') || '0');
        if (upsell1 > 0) {
          value = (upsell2 / upsell1) * 100;
        }
      } else {
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

  // Generate multi-product forecast data for funnel products
  const generateFunnelForecastData = () => {
    if (selectedMetric !== 'funnelProducts' || selectedProducts.length === 0) {
      return [];
    }

    // Use the same forecast period as other metrics
    const totalDays = forecastDays + 10; // 10 historical days + forecast period
    const historicalDays = 10;

    return Array.from({ length: totalDays }, (_, i) => {
      const date = format(addDays(new Date(), i - historicalDays), 'M/d/yyyy');
      const isActual = i < historicalDays;
      
      const dataPoint: any = { date, isActual };
      
      selectedProducts.forEach(product => {
        let baseValue;
        let trendMultiplier = 1;
        
        // Add slight upward trend for forecasted data
        if (!isActual) {
          trendMultiplier = 1 + ((i - historicalDays) * 0.002); // Small positive trend
        }
        
        switch (product.id) {
          case 'mainProduct':
            baseValue = isActual ? 25 + (i * 0.3) : 28 + (i * 0.2);
            break;
          case 'bump':
            baseValue = isActual ? 15 + (i * 0.2) : 17 + (i * 0.15);
            break;
          case 'upsell1':
            baseValue = isActual ? 10 + (i * 0.15) : 12 + (i * 0.1);
            break;
          case 'downsell1':
            baseValue = isActual ? 8 + (i * 0.1) : 9 + (i * 0.08);
            break;
          case 'upsell2':
            baseValue = isActual ? 5 + (i * 0.08) : 6 + (i * 0.06);
            break;
          case 'downsell2':
            baseValue = isActual ? 4 + (i * 0.05) : 5 + (i * 0.04);
            break;
          default:
            baseValue = 10;
        }
        
        const finalValue = baseValue * trendMultiplier;
        dataPoint[product.id] = Math.round((finalValue + (Math.random() * 2 - 1)) * 100) / 100;
      });
      
      return dataPoint;
    });
  };

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
  const funnelData = generateFunnelForecastData();

  // Generate enhanced predictions with scenarios
  const generateEnhancedPredictions = () => {
    if (!currentMetrics) {
      return [
        { metric: 'Revenue', current: 0, predicted: 0, change: 0, confidence: 75, trend: 'up' as const, timeframe: `Next ${forecastDays} days` },
        { metric: 'Conversion Rate', current: 0, predicted: 0, change: 0, confidence: 75, trend: 'up' as const, timeframe: `Next ${forecastDays} days` },
        { metric: 'Ad Spend', current: 0, predicted: 0, change: 0, confidence: 75, trend: 'up' as const, timeframe: `Next ${forecastDays} days` },
        { metric: 'ROAS', current: 0, predicted: 0, change: 0, confidence: 75, trend: 'up' as const, timeframe: `Next ${forecastDays} days` },
      ];
    }

    const estimatedRevenue = currentMetrics.revenue || (currentMetrics.roas * currentMetrics.cost);
    const baseConfidence = Math.max(60, forecastResult.accuracy);
    
    // Compute trend values separately to avoid const assertion issues
    const revenueTrend: 'up' | 'down' = forecastResult.trend === 'decreasing' ? 'down' : 'up';
    const conversionTrend: 'up' | 'down' = forecastResult.trend === 'decreasing' ? 'down' : 'up';
    const roasTrend: 'up' | 'down' = forecastResult.trend === 'decreasing' ? 'down' : 'up';
    
    const predictions = [
      {
        metric: 'Revenue',
        current: estimatedRevenue,
        predicted: estimatedRevenue * (forecastResult.trend === 'increasing' ? 1.12 : forecastResult.trend === 'decreasing' ? 0.95 : 1.03),
        change: forecastResult.trend === 'increasing' ? 12.0 : forecastResult.trend === 'decreasing' ? -5.0 : 3.0,
        confidence: Math.round(baseConfidence),
        trend: revenueTrend,
        timeframe: `Next ${forecastDays} days`
      },
      {
        metric: 'Conversion Rate',
        current: currentMetrics.conversionRate,
        predicted: currentMetrics.conversionRate * (forecastResult.trend === 'increasing' ? 1.08 : 0.98),
        change: forecastResult.trend === 'increasing' ? 8.0 : -2.0,
        confidence: Math.round(baseConfidence * 0.9),
        trend: conversionTrend,
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
        trend: roasTrend,
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
    
    if (dataPoints < 7) {
      insights.push(`Limited historical data (${dataPoints} points) may reduce forecast accuracy.`);
    }
    
    if (trend === 'increasing') {
      insights.push(`Strong upward trend detected with ${accuracy.toFixed(1)}% model accuracy. Your campaigns are performing well.`);
    } else if (trend === 'decreasing') {
      insights.push(`Declining trend identified. Consider optimizing targeting and creative to reverse the downward trajectory.`);
    } else {
      insights.push(`Stable performance detected. Look for optimization opportunities to drive growth.`);
    }
    
    if (currentMetrics.roas > 3) {
      insights.push(`Excellent ROAS of ${currentMetrics.roas.toFixed(2)} suggests scaling opportunities.`);
    } else if (currentMetrics.roas < 2) {
      insights.push(`ROAS of ${currentMetrics.roas.toFixed(2)} needs improvement. Focus on conversion optimization.`);
    }
    
    if (forecastDays > 30) {
      insights.push(`Long-term forecast shows ${trend} trend, but confidence decreases over time.`);
    }
    
    return insights.join(' ');
  };

  // Create product configuration mapping for colors
  const productConfigMap = selectedProducts.reduce((acc, product) => {
    acc[product.id] = product;
    return acc;
  }, {} as Record<string, FunnelProductConfig>);

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
        <ForecastControls
          selectedMetric={selectedMetric}
          forecastPeriod={forecastPeriod}
          trend={forecastResult.trend}
          onMetricChange={setSelectedMetric}
          onPeriodChange={setForecastPeriod}
        />

        {selectedMetric === 'funnelProducts' && (
          <MetricCustomizer 
            onProductsChange={handleProductsChange}
            className="border border-purple-200 bg-purple-50/30"
          />
        )}

        <ForecastChart
          data={forecastResult.data}
          funnelData={funnelData}
          selectedMetric={selectedMetric}
          selectedProducts={selectedProducts}
          trendLineData={trendLineData}
          productConfigMap={productConfigMap}
        />

        <ChartLegend 
          selectedMetric={selectedMetric}
          selectedProducts={selectedProducts}
        />

        {selectedMetric !== 'funnelProducts' && (
          <PredictionsGrid 
            predictions={predictions}
            forecastDays={forecastDays}
          />
        )}

        <AIInsights 
          insights={generateAIInsights()}
          seasonality={forecastResult.seasonality}
        />
      </CardContent>
    </Card>
  );
};
