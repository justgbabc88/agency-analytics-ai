
import React from 'react';
import { MetricCard } from "@/components/MetricCard";
import { ConversionChart } from "@/components/ConversionChart";
import { AttributionDashboard } from "@/components/AttributionDashboard";
import { PredictiveAnalytics } from "@/components/PredictiveAnalytics";
import { AIInsights } from "@/components/AIInsights";
import { ExportPanel } from "@/components/ExportPanel";

const Index = () => {
  // Mock data for the charts and components
  const mockChartData = [
    { date: '2024-01-01', conversionRate: 3.2, revenue: 15000 },
    { date: '2024-01-02', conversionRate: 3.8, revenue: 18000 },
    { date: '2024-01-03', conversionRate: 3.5, revenue: 16500 },
    { date: '2024-01-04', conversionRate: 4.1, revenue: 20000 },
    { date: '2024-01-05', conversionRate: 3.9, revenue: 19000 }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard 
            title="Total Revenue" 
            value="$24,500" 
            previousValue="$21,800"
            format="currency"
          />
          <MetricCard 
            title="Conversion Rate" 
            value="3.8" 
            previousValue="3.9"
            format="percentage"
          />
          <MetricCard 
            title="Average Order Value" 
            value="$125.50" 
            previousValue="$115.80"
            format="currency"
          />
          <MetricCard 
            title="Return on Ad Spend" 
            value="4.2" 
            previousValue="3.6"
            format="number"
          />
        </div>

        {/* Charts and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ConversionChart 
            data={mockChartData}
            title="Performance Overview"
            metrics={['conversionRate', 'revenue']}
          />
          <PredictiveAnalytics />
        </div>

        {/* Attribution Dashboard */}
        <AttributionDashboard projectId="default-project" />

        {/* AI Insights */}
        <AIInsights insights="Based on current performance data, your conversion rate is trending upward with a 12.5% increase. Consider optimizing your top-performing campaigns for better ROI." />
      </div>
    </div>
  );
};

export default Index;
