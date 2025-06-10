
import React, { useState } from 'react';
import { MetricCard } from "@/components/MetricCard";
import { ConversionChart } from "@/components/ConversionChart";
import { AttributionDashboard } from "@/components/AttributionDashboard";
import { PredictiveAnalytics } from "@/components/PredictiveAnalytics";
import { AIInsights } from "@/components/AIInsights";
import { LandingPageMetrics } from "@/components/LandingPageMetrics";
import { CallStatsMetrics } from "@/components/CallStatsMetrics";
import { SalesConversionMetrics } from "@/components/SalesConversionMetrics";
import { FacebookMetrics } from "@/components/FacebookMetrics";
import { GoogleSheetsMetrics } from "@/components/GoogleSheetsMetrics";

const Index = () => {
  const [selectedProjectId] = useState<string>("default-project");

  // Mock data for the charts and components
  const mockChartData = [
    { date: '2024-01-01', conversionRate: 3.2, revenue: 15000, pageViews: 2500, optins: 180, mainOffer: 45, callsBooked: 15, callsTaken: 12, cancelled: 3, showUpRate: 80 },
    { date: '2024-01-02', conversionRate: 3.8, revenue: 18000, pageViews: 2800, optins: 210, mainOffer: 52, callsBooked: 18, callsTaken: 15, cancelled: 3, showUpRate: 83 },
    { date: '2024-01-03', conversionRate: 3.5, revenue: 16500, pageViews: 2650, optins: 195, mainOffer: 48, callsBooked: 16, callsTaken: 13, cancelled: 3, showUpRate: 81 },
    { date: '2024-01-04', conversionRate: 4.1, revenue: 20000, pageViews: 3000, optins: 225, mainOffer: 58, callsBooked: 20, callsTaken: 17, cancelled: 3, showUpRate: 85 },
    { date: '2024-01-05', conversionRate: 3.9, revenue: 19000, pageViews: 2900, optins: 215, mainOffer: 55, callsBooked: 19, callsTaken: 16, cancelled: 3, showUpRate: 84 }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Monitor your marketing performance and conversion metrics</p>
        </div>

        {/* Top Level Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard 
            title="Total Revenue" 
            value="$88,500" 
            previousValue="$76,200"
            format="currency"
          />
          <MetricCard 
            title="Conversion Rate" 
            value="3.7" 
            previousValue="3.4"
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

        {/* Landing Page Metrics */}
        <LandingPageMetrics
          totalPageViews={14850}
          bookingRate={7.2}
          previousBookingRate={6.8}
          totalBookings={108}
          previousTotalBookings={92}
          costPerBooking={45.60}
          previousCostPerBooking={52.30}
        />

        {/* Call Stats Metrics */}
        <CallStatsMetrics
          totalBookings={108}
          previousTotalBookings={92}
          callsTaken={73}
          previousCallsTaken={62}
          cancelled={12}
          previousCancelled={15}
          showUpRate={82.6}
          previousShowUpRate={79.3}
          chartData={mockChartData}
          chartKey="dashboard"
        />

        {/* Sales Conversion Metrics */}
        <SalesConversionMetrics
          chartData={mockChartData}
          chartKey="dashboard"
        />

        {/* Facebook Metrics */}
        <FacebookMetrics />

        {/* Google Sheets Metrics */}
        <GoogleSheetsMetrics />

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
        <AttributionDashboard projectId={selectedProjectId} />

        {/* AI Insights */}
        <AIInsights insights="Based on current performance data, your conversion rate is trending upward with a 12.5% increase. Consider optimizing your top-performing campaigns for better ROI." />
      </div>
    </div>
  );
};

export default Index;
