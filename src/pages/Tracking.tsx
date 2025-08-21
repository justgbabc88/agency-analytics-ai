import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PixelSetupWizard } from '@/components/PixelSetupWizard';
import { TrackingPixelManager } from '@/components/TrackingPixelManager';
import { AttributionDashboard } from '@/components/AttributionDashboard';
import { AdvancedDateRangePicker } from '@/components/AdvancedDateRangePicker';
import { ProjectSelector } from '@/components/ProjectSelector';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Target, Zap, BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfDay, endOfDay } from 'date-fns';

const Tracking = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    from: startOfDay(subDays(new Date(), 30)),
    to: endOfDay(new Date())
  });

  const handleDateChange = (from: Date, to: Date) => {
    console.log('📅 Tracking page - Date range changed:', { from, to });
    setDateRange({ from, to });
  };

  const { data: recentEvents, isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ['recent-events', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      
      console.log('Fetching recent events for project:', selectedProjectId);
      const { data, error } = await supabase
        .from('tracking_events')
        .select('*')
        .eq('project_id', selectedProjectId)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        console.error('Error fetching recent events:', error);
        throw error;
      }

      console.log('Fetched recent events:', data);
      return data || [];
    },
    enabled: !!selectedProjectId,
    refetchInterval: 5000,
  });

  const { data: eventStats } = useQuery({
    queryKey: ['event-stats', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return { total: 0, types: {} };
      
      console.log('Fetching event stats for project:', selectedProjectId);
      const { data, error } = await supabase
        .from('tracking_events')
        .select('event_type, created_at')
        .eq('project_id', selectedProjectId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        console.error('Error fetching event stats:', error);
        throw error;
      }

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
      
      // If it doesn't start with http, assume it's a relative path
      if (!pageUrl.startsWith('http')) {
        return pageUrl;
      }
      
      const url = new URL(pageUrl);
      return url.pathname;
    } catch (error) {
      console.warn('Invalid URL:', pageUrl, error);
      return pageUrl || 'Unknown page';
    }
  };

  const handleRefreshEvents = () => {
    refetchEvents();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced Tracking & Attribution</h1>
          <p className="text-gray-600 mt-2">
            Track, attribute, and optimize your marketing campaigns with precision.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <AdvancedDateRangePicker onDateChange={handleDateChange} />
          <div className="w-80">
            <ProjectSelector
              selectedProjectId={selectedProjectId}
              onProjectChange={setSelectedProjectId}
            />
          </div>
        </div>
      </div>

      {!selectedProjectId ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Target className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Select a Project</h2>
            <p className="text-gray-600">
              Choose a project to start tracking your marketing campaigns and conversions.
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
            <div className="space-y-6">
              {/* Event Stats Overview */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Event Statistics (Last 24h)
                    </CardTitle>
                    <Button onClick={handleRefreshEvents} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
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

                  {/* Event Types Breakdown */}
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

              {/* Recent Events Feed */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Live Event Feed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {eventsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading events...
                    </div>
                  ) : recentEvents && recentEvents.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {recentEvents.map((event, index) => (
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
                      <p className="text-sm text-muted-foreground">
                        Events will automatically refresh every 5 seconds.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Tracking;
