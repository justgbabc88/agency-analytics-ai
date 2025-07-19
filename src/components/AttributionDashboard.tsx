import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Users, MousePointer, Activity, Globe, ShoppingCart, CheckCircle, Video, Calendar, FileText, ArrowUpRight, ArrowDownRight, RefreshCw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AttributionDashboardProps {
  projectId: string;
  dateRange: { from: Date; to: Date; };
}

interface PixelData {
  id: string;
  name: string;
  pixel_id: string;
  project_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  domains: string[] | null;
  conversion_events: string[];
  config?: {
    funnelPages?: any[];
  };
}

interface EventRecord {
  id: string;
  event_type: string;
  event_name: string | null;
  page_url: string;
  created_at: string;
  session_id: string;
  contact_email: string | null;
  contact_phone: string | null;
  contact_name: string | null;
}

export const AttributionDashboard = ({ projectId, dateRange }: AttributionDashboardProps) => {
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedPixelId, setSelectedPixelId] = useState<string>('');
  const [forceRefreshKey, setForceRefreshKey] = useState(0);
  const [pageFilters, setPageFilters] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  // Helper functions
  const getPageIcon = (type: string) => {
    switch (type) {
      case 'landing': return Globe;
      case 'checkout': return ShoppingCart;
      case 'thankyou': return CheckCircle;
      case 'webinar': return Video;
      case 'booking': return Calendar;
      default: return FileText;
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case 'page_view': return '#8884d8';
      case 'form_submission': return '#82ca9d';
      case 'click': return '#ffc658';
      case 'purchase': return '#ff7300';
      case 'webinar_registration': return '#00ff00';
      case 'call_booking': return '#ff0000';
      default: return '#8884d8';
    }
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Listen for global data clear events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'attribution_data_cleared') {
        console.log('Attribution Dashboard: Detected data clear event, forcing refresh...');
        setForceRefreshKey(prev => prev + 1);
        // Clear all cached data
        queryClient.clear();
        // Immediately refetch
        setTimeout(() => {
          queryClient.refetchQueries({ queryKey: ['tracking-pixels', projectId] });
          if (selectedPixelId) {
            queryClient.refetchQueries({ queryKey: ['event-stats', projectId, selectedPixelId, timeRange] });
          }
        }, 100);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [projectId, selectedPixelId, timeRange, queryClient]);

  const handleRefresh = () => {
    console.log('Attribution Dashboard: Manual refresh triggered');
    setForceRefreshKey(prev => prev + 1);
    
    // Clear all cached data
    queryClient.clear();
    
    // Force immediate refetch
    queryClient.refetchQueries({ queryKey: ['tracking-pixels', projectId] });
    if (selectedPixelId) {
      queryClient.refetchQueries({ queryKey: ['event-stats', projectId, selectedPixelId, timeRange] });
    }
  };

  // Get tracking pixels for this project
  const { data: pixels } = useQuery({
    queryKey: ['tracking-pixels', projectId, forceRefreshKey],
    queryFn: async () => {
      console.log('AttributionDashboard: Fetching pixels for project:', projectId);
      const { data, error } = await supabase
        .from('tracking_pixels')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true);

      if (error) {
        console.error('AttributionDashboard: Error fetching pixels:', error);
        throw error;
      }
      console.log('AttributionDashboard: Fetched pixels:', data);
      return (data || []) as PixelData[];
    },
    enabled: !!projectId,
  });

  // Get event stats by page and event type
  const { data: eventStats, isLoading } = useQuery({
    queryKey: ['event-stats', projectId, selectedPixelId, timeRange, forceRefreshKey],
    queryFn: async () => {
      if (!selectedPixelId) {
        console.log('AttributionDashboard: No pixel selected, returning empty array');
        return [];
      }
      
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      console.log('AttributionDashboard: Fetching event stats for:', {
        projectId,
        selectedPixelId,
        timeRange,
        startDate: startDate.toISOString(),
        forceRefreshKey
      });

      const { data, error } = await supabase
        .from('tracking_events')
        .select('*')
        .eq('project_id', projectId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('AttributionDashboard: Error fetching event stats:', error);
        throw error;
      }

      console.log('AttributionDashboard: Raw event data:', data);
      console.log('AttributionDashboard: Event count:', data?.length || 0);
      return (data || []) as EventRecord[];
    },
    enabled: !!projectId && !!selectedPixelId,
  });

  // Get configured pages for the selected pixel
  const selectedPixel = pixels?.find(p => p.id === selectedPixelId);
  const configuredPages = selectedPixel?.config?.funnelPages || [];

  // Helper function to check if an event belongs to a specific page
  const isEventForPage = (event: any, page: any): boolean => {
    if (!event || !page) return false;
    
    // Primary method: Match by page URL (most reliable)
    if (event.page_url && page.url) {
      // Extract base URL without query parameters for comparison
      const eventBaseUrl = event.page_url.split('?')[0].split('#')[0].toLowerCase();
      const pageBaseUrl = page.url.split('?')[0].split('#')[0].toLowerCase();
      
      // Exact URL match
      if (eventBaseUrl === pageBaseUrl) {
        return true;
      }
      
      // Check if the event URL contains the page URL (for subdirectories)
      if (eventBaseUrl.includes(pageBaseUrl) || pageBaseUrl.includes(eventBaseUrl)) {
        return true;
      }
      
      // Extract domain and path for more flexible matching
      try {
        const eventUrlObj = new URL(event.page_url);
        const pageUrlObj = new URL(page.url);
        
        // Match by pathname if domains are similar
        if (eventUrlObj.pathname === pageUrlObj.pathname) {
          return true;
        }
      } catch (e) {
        // URL parsing failed, continue with other methods
      }
    }
    
    // Secondary method: Check event name for page name (for events with formatted names)
    if (event.event_name && page.name) {
      const normalizedEventName = event.event_name.toLowerCase();
      const normalizedPageName = page.name.toLowerCase();
      
      // Direct match with page name prefix
      if (normalizedEventName.startsWith(`${normalizedPageName} -`)) {
        return true;
      }
      
      // Also check for exact page name match in event name
      if (normalizedEventName.includes(normalizedPageName)) {
        return true;
      }
    }
    
    // Tertiary method: For page_view events without proper names, match by URL pattern
    if (event.event_type === 'page_view' && page.url) {
      const pageUrlPattern = page.url.toLowerCase();
      const eventUrl = (event.page_url || '').toLowerCase();
      
      // Check if URL patterns match (useful for dynamic URLs)
      if (eventUrl.includes(pageUrlPattern) || pageUrlPattern.includes(eventUrl)) {
        return true;
      }
    }
    
    return false;
  };

  // Process page analytics - Remove memoization to ensure fresh calculation
  const pageAnalytics = (() => {
    if (!eventStats || !configuredPages.length) {
      console.log('AttributionDashboard: No event stats or configured pages:', { 
        hasEventStats: !!eventStats, 
        eventStatsLength: eventStats?.length,
        configuredPagesLength: configuredPages.length 
      });
      return null;
    }

    console.log('AttributionDashboard: Processing page analytics:', { 
      eventStatsCount: eventStats.length, 
      configuredPagesCount: configuredPages.length,
      configuredPages: configuredPages.map(p => ({ name: p.name, url: p.url })),
      forceRefreshKey
    });

    // Group events by page based on event names
    const pageMetrics = configuredPages.map((page: any, index: number) => {
      console.log(`\n--- Processing page: ${page.name} (${page.url}) ---`);
      
      const pageEvents = eventStats.filter(event => {
        const matches = isEventForPage(event, page);
        if (matches) {
          console.log(`✓ Event matches ${page.name}:`, { 
            eventName: event.event_name, 
            eventPageUrl: event.page_url,
            pageName: page.name,
            configuredPageUrl: page.url,
            eventType: event.event_type
          });
        }
        return matches;
      });

      console.log(`Page ${page.name} - Found ${pageEvents.length} matching events`);

      const totalEvents = pageEvents.length;
      
      // Count unique visitors based on session_id or contact_email
      const uniqueVisitorIds = new Set();
      pageEvents.forEach(event => {
        // Use session_id if available, otherwise fall back to email or create a daily identifier
        const visitorId = event.session_id || 
                         event.contact_email || 
                         `${event.page_url}-${event.created_at.split('T')[0]}`;
        uniqueVisitorIds.add(visitorId);
      });
      const uniqueVisitors = uniqueVisitorIds.size;

      // Count conversions (non-page_view events)
      const conversions = pageEvents.filter(e => 
        e.event_type !== 'page_view'
      ).length;

      const conversionRate = totalEvents > 0 ? (conversions / totalEvents) * 100 : 0;

      console.log(`Page ${page.name} final metrics:`, { 
        totalEvents, 
        uniqueVisitors, 
        conversions, 
        conversionRate: conversionRate.toFixed(1) + '%'
      });

      return {
        name: page.name,
        type: page.type,
        url: page.url,
        order: index,
        totalEvents,
        uniqueVisitors,
        conversions,
        conversionRate
      };
    });

    console.log('AttributionDashboard: Final page metrics:', pageMetrics);
    return { pageMetrics };
  })();

  // Process daily trends - Remove memoization
  const dailyTrends = (() => {
    if (!eventStats) return [];

    const dailyData = eventStats.reduce((acc: Record<string, any>, event) => {
      const date = new Date(event.created_at).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = { date, events: 0, conversions: 0, uniqueVisitors: new Set() };
      }
      acc[date].events += 1;
      if (event.event_type !== 'page_view') {
        acc[date].conversions += 1;
      }
      const visitorId = event.session_id || event.contact_email || `${event.page_url}-${date}`;
      acc[date].uniqueVisitors.add(visitorId);
      return acc;
    }, {} as Record<string, any>);

    return Object.values(dailyData).map((day: any) => ({
      ...day,
      uniqueVisitors: day.uniqueVisitors.size,
      conversionRate: day.events > 0 ? (day.conversions / day.events) * 100 : 0
    })).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  })();

  // Process event type breakdown - Remove memoization
  const eventTypeBreakdown = (() => {
    if (!eventStats) return [];

    const eventTypeData = eventStats.reduce((acc: Record<string, number>, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(eventTypeData).map(([type, count]) => ({
      eventType: type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      count,
      fill: getEventTypeColor(type)
    }));
  })();

  // Calculate key metrics - Remove memoization
  const keyMetrics = (() => {
    if (!eventStats) return null;

    const totalConversions = eventStats.filter(event => event.event_type !== 'page_view').length;
    const totalEvents = eventStats.length;
    const uniqueVisitorIds = new Set();
    eventStats.forEach(event => {
      const visitorId = event.session_id || event.contact_email || `${event.page_url}-${event.created_at.split('T')[0]}`;
      uniqueVisitorIds.add(visitorId);
    });
    const uniqueVisitors = uniqueVisitorIds.size;
    const conversionRate = totalEvents > 0 ? ((totalConversions / totalEvents) * 100) : 0;

    // Calculate trends (compare with previous period)
    const midPoint = Math.floor(eventStats.length / 2);
    const recentEvents = eventStats.slice(0, midPoint);
    const olderEvents = eventStats.slice(midPoint);

    const eventsTrend = olderEvents.length > 0 ? ((recentEvents.length - olderEvents.length) / olderEvents.length) * 100 : 0;

    return {
      totalConversions,
      totalEvents,
      uniqueVisitors,
      conversionRate,
      eventsTrend
    };
  })();

  if (isLoading) {
    return <div>Loading attribution data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Attribution Analytics</h2>
        <div className="flex gap-4">
          <Select value={selectedPixelId} onValueChange={setSelectedPixelId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a tracking pixel" />
            </SelectTrigger>
            <SelectContent>
              {pixels?.map((pixel) => (
                <SelectItem key={pixel.id} value={pixel.id}>
                  {pixel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {!selectedPixelId ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Activity className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select a Tracking Pixel</h3>
            <p className="text-gray-600">
              Choose a tracking pixel to view its attribution analytics and performance.
            </p>
          </CardContent>
        </Card>
      ) : !configuredPages.length ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Funnel Pages Configured</h3>
            <p className="text-gray-600">
              Configure funnel pages for this pixel to see detailed attribution analytics.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Key Metrics */}
          {keyMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MousePointer className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="text-sm text-gray-600">Total Events</p>
                        <p className="text-2xl font-bold">{keyMetrics.totalEvents}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {keyMetrics.eventsTrend >= 0 ? 
                        <ArrowUpRight className="h-4 w-4 text-green-600" /> : 
                        <ArrowDownRight className="h-4 w-4 text-red-600" />
                      }
                      <span className={`text-sm font-medium ${keyMetrics.eventsTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercentage(keyMetrics.eventsTrend)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="text-sm text-gray-600">Unique Visitors</p>
                      <p className="text-2xl font-bold">{keyMetrics.uniqueVisitors}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Conversions</p>
                      <p className="text-2xl font-bold">{keyMetrics.totalConversions}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-indigo-600" />
                    <div>
                      <p className="text-sm text-gray-600">Conversion Rate</p>
                      <p className="text-2xl font-bold">{keyMetrics.conversionRate.toFixed(1)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Page Performance Metrics */}
          {pageAnalytics && pageAnalytics.pageMetrics.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Page Performance Metrics (Event-Based Tracking)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pageAnalytics.pageMetrics.map((page: any, index: number) => {
                    const PageIcon = getPageIcon(page.type);
                    const pageFilterKey = `page-${page.name}`;
                    const currentFilter = pageFilters[pageFilterKey] || 'all';
                    
                    // Filter page events based on selected filter
                    const getFilteredPageEvents = () => {
                      if (!eventStats) return [];
                      
                      const pageEvents = eventStats.filter(event => isEventForPage(event, page));
                      
                      switch (currentFilter) {
                        case 'page_views':
                          return pageEvents.filter(event => event.event_type === 'page_view');
                        case 'conversions':
                          return pageEvents.filter(event => event.event_type !== 'page_view');
                        case 'form_submissions':
                          return pageEvents.filter(event => event.event_type === 'form_submission');
                        case 'clicks':
                          return pageEvents.filter(event => event.event_type === 'click');
                        default:
                          return pageEvents;
                      }
                    };
                    
                    const filteredEvents = getFilteredPageEvents();
                    const filteredTotalEvents = filteredEvents.length;
                    
                    // Calculate filtered metrics
                    const filteredUniqueVisitorIds = new Set();
                    filteredEvents.forEach(event => {
                      const visitorId = event.session_id || 
                                     event.contact_email || 
                                     `${event.page_url}-${event.created_at.split('T')[0]}`;
                      filteredUniqueVisitorIds.add(visitorId);
                    });
                    const filteredUniqueVisitors = filteredUniqueVisitorIds.size;
                    
                    const filteredConversions = filteredEvents.filter(e => 
                      e.event_type !== 'page_view'
                    ).length;
                    
                    const filteredConversionRate = filteredTotalEvents > 0 ? 
                      (filteredConversions / filteredTotalEvents) * 100 : 0;
                    
                    return (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <PageIcon className="h-5 w-5 text-primary" />
                            <div>
                              <h4 className="font-medium">{page.name}</h4>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{page.type}</Badge>
                                <span className="text-xs text-gray-500">Event-based tracking</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Select 
                              value={currentFilter} 
                              onValueChange={(value) => 
                                setPageFilters(prev => ({ ...prev, [pageFilterKey]: value }))
                              }
                            >
                              <SelectTrigger className="w-40">
                                <div className="flex items-center gap-2">
                                  <Filter className="h-4 w-4" />
                                  <SelectValue />
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Events</SelectItem>
                                <SelectItem value="page_views">Page Views</SelectItem>
                                <SelectItem value="conversions">Conversions</SelectItem>
                                <SelectItem value="form_submissions">Form Submissions</SelectItem>
                                <SelectItem value="clicks">Clicks</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="text-right">
                              <div className="text-lg font-bold">{filteredConversionRate.toFixed(1)}%</div>
                              <div className="text-sm text-gray-600">Conv. Rate</div>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="text-center">
                            <div className="font-medium">{filteredTotalEvents}</div>
                            <div className="text-gray-600">Events</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">{filteredUniqueVisitors}</div>
                            <div className="text-gray-600">Visitors</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">{filteredConversions}</div>
                            <div className="text-gray-600">Conversions</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Activity className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
                <p className="text-gray-600">
                  No tracking events found for the selected time period.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Performance Trend */}
            {dailyTrends.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Daily Performance Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailyTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="events" stroke="#8884d8" name="Events" />
                      <Line type="monotone" dataKey="conversions" stroke="#82ca9d" name="Conversions" />
                      <Line type="monotone" dataKey="uniqueVisitors" stroke="#ffc658" name="Unique Visitors" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Event Types Breakdown */}
            {eventTypeBreakdown.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Event Types Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={eventTypeBreakdown}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="count"
                        label={({ eventType, count }) => `${eventType}: ${count}`}
                      >
                        {eventTypeBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Conversion Rates by Page */}
            {pageAnalytics && pageAnalytics.pageMetrics.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Conversion Rates by Page</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={pageAnalytics.pageMetrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Conversion Rate']} />
                      <Bar dataKey="conversionRate" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Events by Page */}
            {pageAnalytics && pageAnalytics.pageMetrics.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Events by Page</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={pageAnalytics.pageMetrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="totalEvents" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
};
