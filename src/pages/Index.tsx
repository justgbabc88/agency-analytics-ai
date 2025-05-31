
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { AdvancedDateRangePicker } from "@/components/AdvancedDateRangePicker";
import { FunnelSelector } from "@/components/FunnelSelector";
import { LowTicketFunnel } from "@/components/LowTicketFunnel";
import { WebinarFunnel } from "@/components/WebinarFunnel";
import { BookCallFunnel } from "@/components/BookCallFunnel";
import { IntegrationsPanel } from "@/components/IntegrationsPanel";
import { MetricCustomizer } from "@/components/MetricCustomizer";
import { AlertSystem } from "@/components/AlertSystem";
import { PredictiveAnalytics } from "@/components/PredictiveAnalytics";
import { AIChatPanel } from "@/components/AIChatPanel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, BarChart3, Settings, MessageSquare, Target, TrendingUp } from "lucide-react";

interface FunnelProductConfig {
  id: string;
  label: string;
  visible: boolean;
  color: string;
}

const Index = () => {
  const [selectedFunnel, setSelectedFunnel] = useState("low-ticket");
  const [dateRange, setDateRange] = useState({ from: new Date(), to: new Date() });
  const [selectedProducts, setSelectedProducts] = useState<FunnelProductConfig[]>([
    { id: 'mainProduct', label: 'Main Product', visible: true, color: '#10B981' },
    { id: 'bump', label: 'Bump Product', visible: true, color: '#3B82F6' },
    { id: 'upsell1', label: 'Upsell 1', visible: true, color: '#F59E0B' },
    { id: 'downsell1', label: 'Downsell 1', visible: true, color: '#8B5CF6' },
    { id: 'upsell2', label: 'Upsell 2', visible: false, color: '#EF4444' },
    { id: 'downsell2', label: 'Downsell 2', visible: false, color: '#06B6D4' },
  ]);

  const handleDateChange = (from: Date, to: Date) => {
    setDateRange({ from, to });
    console.log("Date range changed:", { from, to });
  };

  const handleFunnelChange = (funnelType: string) => {
    setSelectedFunnel(funnelType);
    console.log("Funnel changed to:", funnelType);
  };

  const handleProductsChange = (products: FunnelProductConfig[]) => {
    setSelectedProducts(products);
    console.log("Products changed:", products);
  };

  const renderFunnelContent = () => {
    switch (selectedFunnel) {
      case "webinar":
        return <WebinarFunnel />;
      case "book-call":
        return <BookCallFunnel />;
      default:
        return <LowTicketFunnel dateRange={dateRange} selectedProducts={selectedProducts} />;
    }
  };

  return (
    <div className="bg-gray-50">
      <Navbar />
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">AI Marketing Dashboard</h2>
            <p className="text-gray-600">Monitor and optimize your marketing funnels with real-time data</p>
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="predictions" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Predictions
            </TabsTrigger>
            <TabsTrigger value="assistant" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              AI Assistant
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Integrations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Funnel Products Customizer - only show for low ticket funnel */}
            {selectedFunnel === "low-ticket" && (
              <MetricCustomizer onProductsChange={handleProductsChange} />
            )}

            {/* Funnel-Specific Content */}
            {renderFunnelContent()}
          </TabsContent>

          <TabsContent value="predictions" className="space-y-6">
            <PredictiveAnalytics />
          </TabsContent>

          <TabsContent value="assistant" className="space-y-6">
            <AIChatPanel />
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <AlertSystem />
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
