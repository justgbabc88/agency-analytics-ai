
import React from 'react';
import { MetricCard } from "@/components/MetricCard";
import { ConversionChart } from "@/components/ConversionChart";
import { AttributionDashboard } from "@/components/AttributionDashboard";
import { PredictiveAnalytics } from "@/components/PredictiveAnalytics";
import { AIInsights } from "@/components/AIInsights";
import { ExportPanel } from "@/components/ExportPanel";

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome to your analytics dashboard</p>
          </div>
          <ExportPanel />
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard 
            title="Total Revenue" 
            value="$24,500" 
            change={12.5} 
            trend="up" 
          />
          <MetricCard 
            title="Conversion Rate" 
            value="3.8%" 
            change={-2.1} 
            trend="down" 
          />
          <MetricCard 
            title="Average Order Value" 
            value="$125.50" 
            change={8.2} 
            trend="up" 
          />
          <MetricCard 
            title="Return on Ad Spend" 
            value="4.2x" 
            change={15.7} 
            trend="up" 
          />
        </div>

        {/* Charts and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ConversionChart />
          <PredictiveAnalytics />
        </div>

        {/* Attribution Dashboard */}
        <AttributionDashboard />

        {/* AI Insights */}
        <AIInsights />
      </div>
    </div>
  );
};

export default Index;
