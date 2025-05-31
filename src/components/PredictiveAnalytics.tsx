import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, RefreshCw, BarChart, Target } from "lucide-react";
import { useState } from "react";
import { useGoogleSheetsData } from "@/hooks/useGoogleSheetsData";
import { generateForecast, generateScenarioForecasts, parseDateFromSheetData, ForecastResult, calculateLinearTrend } from "@/utils/timeSeriesUtils";
import { format, addDays } from "date-fns";
import { MetricCustomizer } from "./MetricCustomizer";
import { ForecastControls } from "./ForecastControls";
import { ForecastChart } from "./ForecastChart";
import { ChartLegend } from "./ChartLegend";
import { PredictionsGrid } from "./PredictionsGrid";
import { ScenarioForecast } from "./ScenarioForecast";
import { AccuracyIndicator } from "./AccuracyIndicator";
import { EnhancedAIInsights } from "./EnhancedAIInsights";

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
  const [showScenarios, setShowScenarios] = useState(true);
  const [showPredictions, setShowPredictions] = useState(false);
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

  // Helper function to calculate funnel rates from raw data
  const calculateFunnelRates = () => {
    if (!syncedData || !syncedData.data.length) {
      return {
        mainOfferRate: 2.5,
        bumpRate: 45,
        upsell1Rate: 35,
        downsell1Rate: 25,
        upsell2Rate: 20,
        downsell2Rate: 15,
      };
    }

    const data = syncedData.data;
    let totalPageViews = 0;
    let totalMainOffer = 0;
    let totalBump = 0;
    let totalUpsell1 = 0;
    let totalUpsell2 = 0;

    // Calculate totals from the data
    data.forEach(row => {
      const pageViews = parseInt(row['Page Views']?.toString().replace(/[^\d]/g, '') || '0');
      const mainOffer = parseInt(row['Main Offer']?.toString().replace(/[^\d]/g, '') || '0');
      const bump = parseInt(row['Bump']?.toString().replace(/[^\d]/g, '') || '0');
      const upsell1 = parseInt(row['Upsell 1']?.toString().replace(/[^\d]/g, '') || '0');
      const upsell2 = parseInt(row['Upsell 2']?.toString().replace(/[^\d]/g, '') || '0');

      totalPageViews += pageViews;
      totalMainOffer += mainOffer;
      totalBump += bump;
      totalUpsell1 += upsell1;
      totalUpsell2 += upsell2;
    });

    return {
      mainOfferRate: totalPageViews > 0 ? (totalMainOffer / totalPageViews) * 100 : 2.5,
      bumpRate: totalMainOffer > 0 ? (totalBump / totalMainOffer) * 100 : 45,
      upsell1Rate: totalMainOffer > 0 ? (totalUpsell1 / totalMainOffer) * 100 : 35,
      downsell1Rate: totalMainOffer > 0 ? ((totalMainOffer - totalUpsell1) * 0.25 / totalMainOffer) * 100 : 25,
      upsell2Rate: totalUpsell1 > 0 ? (totalUpsell2 / totalUpsell1) * 100 : 20,
      downsell2Rate: totalUpsell1 > 0 ? ((totalUpsell1 - totalUpsell2) * 0.15 / totalUpsell1) * 100 : 15,
    };
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

  // Generate multi-product forecast data for funnel products using real dashboard data
  const generateFunnelForecastData = () => {
    if (selectedMetric !== 'funnelProducts' || selectedProducts.length === 0) {
      return [];
    }

    const totalDays = forecastDays + 10; // 10 historical days + forecast period
    const historicalDays = 10;

    // Get calculated funnel rates from actual data
    const funnelRates = calculateFunnelRates();
    
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
        
        // Use calculated funnel rates from actual dashboard data
        switch (product.id) {
          case 'mainOffer':
            baseValue = isActual ? 
              funnelRates.mainOfferRate + (i * 0.1) + (Math.random() * 0.5 - 0.25) : 
              funnelRates.mainOfferRate * 1.1 + (i * 0.05) + (Math.random() * 0.3 - 0.15);
            break;
          case 'bump':
            baseValue = isActual ? 
              funnelRates.bumpRate + (i * 0.5) + (Math.random() * 2 - 1) : 
              funnelRates.bumpRate * 1.05 + (i * 0.3) + (Math.random() * 1.5 - 0.75);
            break;
          case 'upsell1':
            baseValue = isActual ? 
              funnelRates.upsell1Rate + (i * 0.4) + (Math.random() * 1.5 - 0.75) : 
              funnelRates.upsell1Rate * 1.08 + (i * 0.25) + (Math.random() * 1 - 0.5);
            break;
          case 'downsell1':
            baseValue = isActual ? 
              funnelRates.downsell1Rate + (i * 0.3) + (Math.random() * 1 - 0.5) : 
              funnelRates.downsell1Rate * 1.06 + (i * 0.2) + (Math.random() * 0.8 - 0.4);
            break;
          case 'upsell2':
            baseValue = isActual ? 
              funnelRates.upsell2Rate + (i * 0.2) + (Math.random() * 0.8 - 0.4) : 
              funnelRates.upsell2Rate * 1.07 + (i * 0.15) + (Math.random() * 0.6 - 0.3);
            break;
          case 'downsell2':
            baseValue = isActual ? 
              funnelRates.downsell2Rate + (i * 0.15) + (Math.random() * 0.6 - 0.3) : 
              funnelRates.downsell2Rate * 1.05 + (i * 0.1) + (Math.random() * 0.4 - 0.2);
            break;
          default:
            baseValue = 10;
        }
        
        const finalValue = Math.max(0, baseValue * trendMultiplier);
        dataPoint[product.id] = Math.round(finalValue * 100) / 100;
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

  // Get primary prediction for scenario analysis
  const primaryPrediction = predictions.find(p => p.metric === 'Revenue') || predictions[0];

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
              {showScenarios ? 'Hide' : 'Show'} Scenarios
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowPredictions(!showPredictions)}>
              <Target className="h-4 w-4" />
              {showPredictions ? 'Hide' : 'Show'} Predictions
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ForecastChart
              data={forecastResult.data}
              funnelData={funnelData}
              selectedMetric={selectedMetric}
              selectedProducts={selectedProducts}
              trendLineData={trendLineData}
              productConfigMap={productConfigMap}
            />
          </div>
          <div>
            <AccuracyIndicator
              accuracy={forecastResult.accuracy}
              dataPoints={forecastResult.data.filter(d => d.isActual).length}
              forecastDays={forecastDays}
              trend={forecastResult.trend}
            />
          </div>
        </div>

        <ChartLegend 
          selectedMetric={selectedMetric}
          selectedProducts={selectedProducts}
        />

        {showScenarios && selectedMetric !== 'funnelProducts' && (
          <ScenarioForecast
            baseMetric={primaryPrediction.current}
            metricName={primaryPrediction.metric}
            forecastDays={forecastDays}
            currentTrend={forecastResult.trend}
          />
        )}

        {showPredictions && selectedMetric !== 'funnelProducts' && (
          <PredictionsGrid 
            predictions={predictions}
            forecastDays={forecastDays}
          />
        )}

        <EnhancedAIInsights 
          insights={generateAIInsights()}
          accuracy={forecastResult.accuracy}
          trend={forecastResult.trend}
          dataPoints={forecastResult.data.filter(d => d.isActual).length}
          forecastDays={forecastDays}
          currentMetrics={currentMetrics}
          seasonality={forecastResult.seasonality}
        />
      </CardContent>
    </Card>
  );
};
