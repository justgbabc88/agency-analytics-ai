
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { AdvancedDateRangePicker } from "@/components/AdvancedDateRangePicker";
import { ProjectSelector } from "@/components/ProjectSelector";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import { LowTicketFunnel } from "@/components/LowTicketFunnel";
import { BookCallFunnel } from "@/components/BookCallFunnel";
import { ProjectIntegrationsPanel } from "@/components/ProjectIntegrationsPanel";
import { AlertSystem } from "@/components/AlertSystem";
import { PredictiveAnalytics } from "@/components/PredictiveAnalytics";
import { AIChatPanel } from "@/components/AIChatPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Settings, MessageSquare, Target, TrendingUp } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";

interface FunnelProductConfig {
  id: string;
  label: string;
  visible: boolean;
  color: string;
}

const Index = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [dateRange, setDateRange] = useState({ from: new Date(), to: new Date() });
  const [selectedProducts, setSelectedProducts] = useState<FunnelProductConfig[]>([
    { id: 'mainProduct', label: 'Main Product Rate', visible: true, color: '#10B981' },
    { id: 'bump', label: 'Bump Rate', visible: true, color: '#3B82F6' },
    { id: 'upsell1', label: 'Upsell 1 Rate', visible: true, color: '#F59E0B' },
    { id: 'downsell1', label: 'Downsell 1 Rate', visible: false, color: '#8B5CF6' },
    { id: 'upsell2', label: 'Upsell 2 Rate', visible: false, color: '#EF4444' },
    { id: 'downsell2', label: 'Downsell 2 Rate', visible: false, color: '#06B6D4' },
  ]);

  const { projects } = useProjects();
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleDateChange = (from: Date, to: Date) => {
    setDateRange({ from, to });
    console.log("Date range changed:", { from, to });
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    console.log("Project changed to:", projectId);
  };

  const handleProductsChange = (products: FunnelProductConfig[]) => {
    setSelectedProducts(products);
    console.log("Products changed:", products);
  };

  const handleProjectCreated = (projectId: string) => {
    setSelectedProjectId(projectId);
  };

  const renderFunnelContent = () => {
    if (!selectedProject) {
      return (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Project Selected</h3>
          <p className="text-gray-600 mb-6">Create a new project or select an existing one to view analytics.</p>
          <CreateProjectModal onProjectCreated={handleProjectCreated} />
        </div>
      );
    }

    switch (selectedProject.funnel_type) {
      case "book_call":
        return <BookCallFunnel projectId={selectedProjectId} dateRange={dateRange} />;
      case "high_ticket":
      case "webinar":
        return (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {selectedProject.funnel_type === "high_ticket" ? "High Ticket" : "Webinar"} Funnel
            </h3>
            <p className="text-gray-600">This funnel type is coming soon!</p>
          </div>
        );
      default:
        return (
          <LowTicketFunnel 
            dateRange={dateRange} 
            selectedProducts={selectedProducts}
            onProductsChange={handleProductsChange}
          />
        );
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
            <ProjectSelector 
              selectedProjectId={selectedProjectId}
              onProjectChange={handleProjectChange}
              className="w-full sm:w-[200px]"
            />
            <CreateProjectModal onProjectCreated={handleProjectCreated} />
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
            <ProjectIntegrationsPanel projectId={selectedProjectId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
