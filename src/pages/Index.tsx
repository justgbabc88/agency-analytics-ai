import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { MetricCard } from "@/components/MetricCard";
import { AdvancedDateRangePicker } from "@/components/AdvancedDateRangePicker";
import { FunnelSelector } from "@/components/FunnelSelector";
import { LowTicketFunnel } from "@/components/LowTicketFunnel";
import { WebinarFunnel } from "@/components/WebinarFunnel";
import { BookCallFunnel } from "@/components/BookCallFunnel";
import { ConversionChart } from "@/components/ConversionChart";
import { IntegrationsPanel } from "@/components/IntegrationsPanel";
import { AIInsightsPanel } from "@/components/AIInsightsPanel";
import { MetricCustomizer } from "@/components/MetricCustomizer";
import { AlertSystem } from "@/components/AlertSystem";
import { ExportPanel } from "@/components/ExportPanel";
import { PredictiveAnalytics } from "@/components/PredictiveAnalytics";
import { AIChatPanel } from "@/components/AIChatPanel";
import { GoogleSheetsMetrics } from "@/components/GoogleSheetsMetrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, DollarSign, Users, MousePointer, Plus, BarChart3, Settings, Brain, MessageSquare, Download, Target } from "lucide-react";

const generateOverviewData = () => {
  const dates = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      conversionRate: Math.random() * 8 + 4,
      roas: Math.random() * 3 + 2,
      pageViews: Math.floor(Math.random() * 2000) + 1000
    });
  }
  return dates;
};

const Index = () => {
  const [selectedFunnel, setSelectedFunnel] = useState("low-ticket");
  const [dateRange, setDateRange] = useState({ from: new Date(), to: new Date() });
  const [customMetrics, setCustomMetrics] = useState([]);

  const overviewData = generateOverviewData();

  const handleDateChange = (from: Date, to: Date) => {
    setDateRange({ from, to });
    console.log("Date range changed:", { from, to });
  };

  const handleFunnelChange = (funnelType: string) => {
    setSelectedFunnel(funnelType);
    console.log("Funnel changed to:", funnelType);
  };

  const handleMetricsChange = (metrics: any[]) => {
    setCustomMetrics(metrics);
    console.log("Metrics customized:", metrics);
  };

  const renderFunnelContent = () => {
    switch (selectedFunnel) {
      case "webinar":
        return <WebinarFunnel />;
      case "book-call":
        return <BookCallFunnel />;
      default:
        return <LowTicketFunnel />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">AI Marketing Dashboard</h2>
            <p className="text-gray-600">Monitor and optimize your marketing funnels with AI insights</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <AdvancedDateRangePicker 
              onDateChange={handleDateChange}
              className="w-full sm:w-auto"
            />
            <FunnelSelector 
              onFunnelChange={handleFunnelChange}
              className="w-full sm:w-[200px]"
            />
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Campaign
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Insights
            </TabsTrigger>
            <TabsTrigger value="predictions" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Predictions
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              AI Chat
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Integrations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Metric Customizer */}
            <MetricCustomizer onMetricsChange={handleMetricsChange} />

            {/* Google Sheets Synced Data */}
            <GoogleSheetsMetrics dateRange={dateRange} />

            {/* Funnel-Specific Content */}
            {renderFunnelContent()}
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <AIInsightsPanel />
          </TabsContent>

          <TabsContent value="predictions" className="space-y-6">
            <PredictiveAnalytics />
          </TabsContent>

          <TabsContent value="chat" className="space-y-6">
            <AIChatPanel />
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <AlertSystem />
          </TabsContent>

          <TabsContent value="export" className="space-y-6">
            <ExportPanel />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <IntegrationsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
