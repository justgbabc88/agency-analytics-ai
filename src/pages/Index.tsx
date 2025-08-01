import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { LowTicketFunnel } from "@/components/LowTicketFunnel";
import { BookCallFunnel } from "@/components/BookCallFunnel";
import { ProjectIntegrationsPanel } from "@/components/ProjectIntegrationsPanel";
import { FacebookAIInsights } from "@/components/FacebookAIInsights";
import { BookCallAIAssistant } from "@/components/BookCallAIAssistant";
import { FacebookMetrics } from "@/components/FacebookMetrics";
import { PixelSetupWizard } from '@/components/PixelSetupWizard';
import { TrackingPixelManager } from '@/components/TrackingPixelManager';
import { AttributionDashboard } from '@/components/AttributionDashboard';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FacebookSyncDebug } from "@/components/FacebookSyncDebug";
import { Button } from "@/components/ui/button";
import { BarChart3, Settings, MessageSquare, Target, TrendingUp, Facebook, Activity, Zap, RefreshCw } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfDay, endOfDay } from "date-fns";
import { useGHLFormSubmissions } from "@/hooks/useGHLFormSubmissions";
import { useZohoLeadSourceFilter } from "@/hooks/useZohoLeadSourceFilter";


interface FunnelProductConfig {
  id: string;
  label: string;
  visible: boolean;
  color: string;
}

const Index = () => {
  // Initialize dateRange to last 7 days including today
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    return {
      from: startOfDay(subDays(today, 6)), // 6 days ago + today = 7 days total
      to: endOfDay(today)
    };
  });
  
  // State hooks first
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<FunnelProductConfig[]>([
    { id: 'mainProduct', label: 'Main Product Rate', visible: true, color: '#10B981' },
    { id: 'bump', label: 'Bump Rate', visible: true, color: '#3B82F6' },
    { id: 'upsell1', label: 'Upsell 1 Rate', visible: true, color: '#F59E0B' },
    { id: 'downsell1', label: 'Downsell 1 Rate', visible: false, color: '#8B5CF6' },
    { id: 'upsell2', label: 'Upsell 2 Rate', visible: false, color: '#EF4444' },
    { id: 'downsell2', label: 'Downsell 2 Rate', visible: false, color: '#06B6D4' },
  ]);

  // Project data hook
  const { projects, selectedProjectId, isLoading: projectsLoading } = useProjects();
  
  // Zoho lead source filter hook
  const zohoLeadSourceFilter = useZohoLeadSourceFilter(selectedProjectId || undefined);
  
  
  // React Query hooks
  const { data: recentEvents, isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ['recent-events', selectedProjectId, dateRange],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      
      const { data, error } = await supabase
        .from('tracking_events')
        .select('*')
        .eq('project_id', selectedProjectId)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProjectId,
    refetchInterval: 5000,
  });

  const { data: eventStats } = useQuery({
    queryKey: ['event-stats', selectedProjectId, dateRange],
    queryFn: async () => {
      if (!selectedProjectId) return { total: 0, types: {} };
      
      const { data, error } = await supabase
        .from('tracking_events')
        .select('event_type, created_at')
        .eq('project_id', selectedProjectId)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      if (error) throw error;

      const stats = data?.reduce((acc, event) => {
        acc.total = (acc.total || 0) + 1;
        acc.types = acc.types || {};
        acc.types[event.event_type] = (acc.types[event.event_type] || 0) + 1;
        return acc;
      }, {} as any);

      return stats || { total: 0, types: {} };
    },
    enabled: !!selectedProjectId,
    refetchInterval: 10000,
  });

  // GHL form submissions data for refresh functionality
  const { refetch: refetchGHLData } = useGHLFormSubmissions(selectedProjectId || '', dateRange, selectedFormIds);

  // Derived state
  const selectedProject = projects?.find(p => p.id === selectedProjectId);

  // Effect hooks
  useEffect(() => {
    console.log('🔍 Form selection changed:', {
      selectedFormIds,
      count: selectedFormIds.length
    });
  }, [selectedFormIds]);

  // Event handlers
  const handleDateChange = (from: Date, to: Date) => {
    setDateRange({ from, to });
  };

  const handleProductsChange = (products: FunnelProductConfig[]) => {
    setSelectedProducts(products);
  };

  const handleRefreshEvents = () => {
    refetchEvents();
  };

  // Utility functions
  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'page_view': return 'bg-blue-100 text-blue-800';
      case 'form_submission': return 'bg-green-100 text-green-800';
      case 'click': return 'bg-purple-100 text-purple-800';
      case 'purchase': return 'bg-yellow-100 text-yellow-800';
      case 'webinar_registration': return 'bg-orange-100 text-orange-800';
      case 'call_booking': return 'bg-indigo-100 text-indigo-800';
      case 'custom_event': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatEventType = (eventType: string) => {
    return eventType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getPagePath = (pageUrl: string) => {
    try {
      if (!pageUrl || typeof pageUrl !== 'string') {
        return 'Unknown page';
      }
      
      if (!pageUrl.startsWith('http')) {
        return pageUrl;
      }
      
      const url = new URL(pageUrl);
      return url.pathname;
    } catch (error) {
      return pageUrl || 'Unknown page';
    }
  };

  // Loading state
  if (projectsLoading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="mb-4">Loading projects...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render functions
  const renderFunnelContent = () => {
    if (!selectedProject) {
      return (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Project Selected</h3>
          <p className="text-gray-600 mb-6">Select a project from the navbar to view analytics.</p>
        </div>
      );
    }

    switch (selectedProject.funnel_type) {
      case "book_call":
        return (
          <BookCallFunnel 
            projectId={selectedProjectId} 
            dateRange={dateRange} 
            selectedCampaignIds={selectedCampaignIds}
            selectedFormIds={selectedFormIds}
            zohoLeadSourceFilter={zohoLeadSourceFilter}
          />
        );
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
            selectedCampaignIds={selectedCampaignIds}
          />
        );
    }
  };

  // Main render
  return (
    <div className="bg-gray-50">
      <Navbar onDateChange={handleDateChange} />
      
      <div className="p-6">
        <Tabs defaultValue="funnel" className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <TabsList className="grid w-full grid-cols-4 h-12">
              <TabsTrigger value="funnel" className="flex items-center justify-center gap-2 h-10">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Stats</span>
              </TabsTrigger>
              <TabsTrigger value="facebook" className="flex items-center justify-center gap-2 h-10">
                <Facebook className="h-4 w-4" />
                <span className="hidden sm:inline">Facebook</span>
              </TabsTrigger>
              <TabsTrigger value="tracking" className="flex items-center justify-center gap-2 h-10">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Tracking</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center justify-center gap-2 h-10">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Integrations</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="funnel" className="space-y-6">
            {renderFunnelContent()}
          </TabsContent>

          <TabsContent value="facebook" className="space-y-6">
            <FacebookMetrics 
              dateRange={dateRange} 
              projectId={selectedProjectId} 
              selectedCampaignIds={selectedCampaignIds}
              onCampaignChange={setSelectedCampaignIds}
              selectedFormIds={selectedFormIds}
              zohoLeadSourceFilter={zohoLeadSourceFilter}
            />
          </TabsContent>

          <TabsContent value="tracking" className="space-y-6">
            {!selectedProjectId ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Target className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Select a Project</h2>
                  <p className="text-gray-600">
                    Choose a project from the navbar to start tracking your marketing campaigns and conversions.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="setup" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="setup" className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Quick Setup
                  </TabsTrigger>
                  <TabsTrigger value="manage" className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Manage Pixels
                  </TabsTrigger>
                  <TabsTrigger value="attribution" className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Attribution
                  </TabsTrigger>
                  <TabsTrigger value="events" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Recent Events
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="setup">
                  <PixelSetupWizard projectId={selectedProjectId} />
                </TabsContent>

                <TabsContent value="manage">
                  <TrackingPixelManager projectId={selectedProjectId} />
                </TabsContent>

                <TabsContent value="attribution">
                  <AttributionDashboard projectId={selectedProjectId} dateRange={dateRange} />
                </TabsContent>

                <TabsContent value="events">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <BarChart3 className="h-5 w-5" />
                          Event Statistics ({dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()})
                        </h3>
                        <Button onClick={handleRefreshEvents} variant="outline" size="sm">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Refresh
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {eventStats?.total || 0}
                          </div>
                          <div className="text-sm text-gray-600">Total Events</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {Object.keys(eventStats?.types || {}).length}
                          </div>
                          <div className="text-sm text-gray-600">Event Types</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {recentEvents?.length || 0}
                          </div>
                          <div className="text-sm text-gray-600">Recent Events</div>
                        </div>
                      </div>

                      {eventStats?.types && Object.keys(eventStats.types).length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-medium">Event Types Breakdown:</h4>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(eventStats.types).map(([eventType, count]: [string, any]) => (
                              <Badge key={eventType} className={getEventTypeColor(eventType)}>
                                {formatEventType(eventType)}: {count}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                        <Activity className="h-5 w-5" />
                        Live Event Feed
                      </h3>
                      
                      {eventsLoading ? (
                        <div className="text-center py-8 text-muted-foreground">
                          Loading events...
                        </div>
                      ) : recentEvents && recentEvents.length > 0 ? (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {recentEvents.map((event) => (
                            <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center space-x-3">
                                <Badge className={getEventTypeColor(event.event_type)}>
                                  {formatEventType(event.event_type)}
                                </Badge>
                                <div>
                                  <p className="font-medium">
                                    {event.event_name || formatEventType(event.event_type)}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {getPagePath(event.page_url)}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">
                                  {new Date(event.created_at).toLocaleString()}
                                </p>
                                {event.revenue_amount && (
                                  <p className="text-sm font-medium text-green-600">
                                    ${event.revenue_amount}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="font-semibold mb-2">No Events Yet</h3>
                          <p className="text-muted-foreground mb-4">
                            Set up your tracking pixel and start collecting events to see them here.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </TabsContent>


          <TabsContent value="settings" className="space-y-6">
            <ProjectIntegrationsPanel 
              projectId={selectedProjectId} 
              selectedFormIds={selectedFormIds}
              onFormSelectionChange={setSelectedFormIds}
              onGHLDataRefresh={refetchGHLData}
              zohoLeadSourceFilter={zohoLeadSourceFilter}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default Index;