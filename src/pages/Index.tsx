
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

            {/* Key Metrics Overview */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-analytics-primary" />
                    Key Performance Metrics
                  </CardTitle>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    Live Data
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-analytics-secondary" />
                      <span className="text-sm font-medium text-gray-600">Revenue Metrics</span>
                    </div>
                    <div className="space-y-3">
                      <MetricCard title="Total Revenue" value={425680} previousValue={389420} format="currency" />
                      <MetricCard title="ROAS" value={3.8} previousValue={3.2} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-analytics-accent" />
                      <span className="text-sm font-medium text-gray-600">Traffic Metrics</span>
                    </div>
                    <div className="space-y-3">
                      <MetricCard title="Total Visitors" value={28540} previousValue={26180} />
                      <MetricCard title="Ad Spend" value={112000} previousValue={121800} format="currency" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <MousePointer className="h-4 w-4 text-analytics-info" />
                      <span className="text-sm font-medium text-gray-600">Conversion Metrics</span>
                    </div>
                    <div className="space-y-3">
                      <MetricCard title="Overall Conversion Rate" value={6.8} previousValue={5.9} format="percentage" />
                      <MetricCard title="Email Open Rate" value={24.5} previousValue={22.1} format="percentage" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-analytics-danger" />
                      <span className="text-sm font-medium text-gray-600">Performance Metrics</span>
                    </div>
                    <div className="space-y-3">
                      <MetricCard title="CPC" value={4.85} previousValue={5.20} format="currency" />
                      <MetricCard title="Email CTR" value={3.2} previousValue={2.8} format="percentage" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Overview Chart */}
            <ConversionChart 
              data={overviewData}
              title="Overall Performance Trends"
              metrics={['conversionRate', 'roas', 'pageViews']}
            />

            {/* Funnel-Specific Content */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold capitalize">
                  {selectedFunnel.replace('-', ' ')} Funnel Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderFunnelContent()}
              </CardContent>
            </Card>
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
