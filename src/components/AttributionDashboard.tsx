
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, DollarSign, Users, MousePointer, Activity, Globe, ShoppingCart, CheckCircle, Video, Calendar, FileText } from "lucide-react";

interface AttributionDashboardProps {
  projectId: string;
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

interface AttributionRecord {
  id: string;
  project_id: string;
  pixel_id: string;
  session_id: string;
  contact_email: string | null;
  contact_phone: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  attributed_revenue: number;
  attribution_model: string;
  conversion_date: string;
  created_at: string;
  updated_at: string;
  event_id: string | null;
  tracking_sessions: {
    utm_source: string | null;
    utm_campaign: string | null;
    utm_medium: string | null;
    device_type: string | null;
    browser: string | null;
  };
}

interface EventRecord {
  id: string;
  event_type: string;
  event_name: string | null;
  page_url: string;
  created_at: string;
  revenue_amount: number | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_name: string | null;
}

export const AttributionDashboard = ({ projectId }: AttributionDashboardProps) => {
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedPixelId, setSelectedPixelId] = useState<string>('');

  // Get tracking pixels for this project
  const { data: pixels } = useQuery({
    queryKey: ['tracking-pixels', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracking_pixels')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true);

      if (error) throw error;
      return (data || []) as PixelData[];
    },
    enabled: !!projectId,
  });

  // Get attribution data for selected pixel
  const { data: attributionData, isLoading } = useQuery({
    queryKey: ['attribution-data', projectId, selectedPixelId, timeRange],
    queryFn: async () => {
      if (!selectedPixelId) return [];
      
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data, error } = await supabase
        .from('attribution_data')
        .select(`
          *,
          tracking_sessions!inner(
            utm_source,
            utm_campaign,
            utm_medium,
            device_type,
            browser
          )
        `)
        .eq('project_id', projectId)
        .gte('created_at', startDate.toISOString());

      if (error) throw error;
      return (data || []) as AttributionRecord[];
    },
    enabled: !!projectId && !!selectedPixelId,
  });

  // Get event stats by page and event type
  const { data: eventStats } = useQuery({
    queryKey: ['event-stats', projectId, selectedPixelId, timeRange],
    queryFn: async () => {
      if (!selectedPixelId) return [];
      
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data, error } = await supabase
        .from('tracking_events')
        .select('*')
        .eq('project_id', projectId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as EventRecord[];
    },
    enabled: !!projectId && !!selectedPixelId,
  });

  // Get configured pages for the selected pixel
  const selectedPixel = pixels?.find(p => p.id === selectedPixelId);
  const configuredPages = selectedPixel?.config?.funnelPages || [];

  // Helper function to get page name from URL
  const getPageNameFromUrl = (pageUrl: string): string => {
    // First try to match with configured pages
    const matchedPage = configuredPages.find((page: any) => {
      try {
        const configuredUrl = new URL(page.url.startsWith('http') ? page.url : `https://${page.url}`);
        const eventUrl = new URL(pageUrl);
        return configuredUrl.pathname === eventUrl.pathname || pageUrl.includes(configuredUrl.pathname);
      } catch {
        return pageUrl.includes(page.url) || page.url.includes(pageUrl);
      }
    });

    if (matchedPage) {
      return matchedPage.name;
    }

    // Extract page name from URL path
    try {
      const url = new URL(pageUrl);
      const pathname = url.pathname;
      if (pathname === '/' || pathname === '') return 'Home Page';
      
      // Remove leading slash and convert to readable name
      const pageName = pathname.substring(1)
        .split('/')
        .map(segment => segment.replace(/-/g, ' ').replace(/_/g, ' '))
        .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' / ');
      
      return pageName || 'Unknown Page';
    } catch {
      return pageUrl || 'Unknown Page';
    }
  };

  // Helper function to get page type from URL or event
  const getPageType = (pageUrl: string, eventType: string): string => {
    const matchedPage = configuredPages.find((page: any) => {
      try {
        const configuredUrl = new URL(page.url.startsWith('http') ? page.url : `https://${page.url}`);
        const eventUrl = new URL(pageUrl);
        return configuredUrl.pathname === eventUrl.pathname || pageUrl.includes(configuredUrl.pathname);
      } catch {
        return pageUrl.includes(page.url) || page.url.includes(pageUrl);
      }
    });

    if (matchedPage) {
      return matchedPage.type;
    }

    // Infer type from URL patterns
    const url = pageUrl.toLowerCase();
    if (url.includes('checkout') || url.includes('payment')) return 'checkout';
    if (url.includes('thank') || url.includes('success') || url.includes('confirmation')) return 'thankyou';
    if (url.includes('webinar') || url.includes('training')) return 'webinar';
    if (url.includes('book') || url.includes('schedule') || url.includes('calendar')) return 'booking';
    if (eventType === 'purchase') return 'checkout';
    if (eventType === 'webinar_registration') return 'webinar';
    if (eventType === 'call_booking') return 'booking';
    
    return 'landing';
  };

  // Process event stats by pages with enhanced data
  const pageStats = eventStats?.reduce((acc: any[], event) => {
    const pageName = getPageNameFromUrl(event.page_url);
    const pageType = getPageType(event.page_url, event.event_type);
    
    let existingPage = acc.find(p => p.pageName === pageName);
    
    if (!existingPage) {
      existingPage = {
        pageName,
        pageType,
        pageUrl: event.page_url,
        totalEvents: 0,
        totalRevenue: 0,
        eventBreakdown: {},
        uniqueVisitors: new Set(),
        conversions: 0
      };
      acc.push(existingPage);
    }
    
    existingPage.totalEvents += 1;
    existingPage.eventBreakdown[event.event_type] = (existingPage.eventBreakdown[event.event_type] || 0) + 1;
    
    if (event.revenue_amount && event.revenue_amount > 0) {
      existingPage.totalRevenue += parseFloat(event.revenue_amount.toString());
      existingPage.conversions += 1;
    }
    
    if (event.contact_email) {
      existingPage.uniqueVisitors.add(event.contact_email);
    }
    
    return acc;
  }, []) || [];

  // Convert Sets to counts for display
  const processedPageStats = pageStats.map(page => ({
    ...page,
    uniqueVisitors: page.uniqueVisitors.size
  }));

  // Process attribution data for charts
  const sourceData = attributionData?.reduce((acc: Record<string, any>, attr) => {
    const source = attr.utm_source || 'Direct';
    if (!acc[source]) {
      acc[source] = { source, revenue: 0, conversions: 0 };
    }
    acc[source].revenue += parseFloat(attr.attributed_revenue?.toString() || '0');
    acc[source].conversions += 1;
    return acc;
  }, {} as Record<string, any>);

  const sourceChartData = Object.values(sourceData || {});

  // Event type breakdown data
  const eventTypeData = eventStats?.reduce((acc: Record<string, number>, event) => {
    acc[event.event_type] = (acc[event.event_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const eventTypeChartData = Object.entries(eventTypeData || {}).map(([type, count]) => ({
    eventType: type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
    count
  }));

  // Daily performance data
  const dailyData = eventStats?.reduce((acc: Record<string, any>, event) => {
    const date = new Date(event.created_at).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = { date, events: 0, revenue: 0, conversions: 0 };
    }
    acc[date].events += 1;
    if (event.revenue_amount && event.revenue_amount > 0) {
      acc[date].revenue += parseFloat(event.revenue_amount.toString());
      acc[date].conversions += 1;
    }
    return acc;
  }, {} as Record<string, any>);

  const dailyChartData = Object.values(dailyData || {}).sort((a: any, b: any) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculate key metrics
  const totalRevenue = eventStats?.reduce((sum, event) => sum + parseFloat(event.revenue_amount?.toString() || '0'), 0) || 0;
  const totalConversions = eventStats?.filter(event => event.revenue_amount && event.revenue_amount > 0).length || 0;
  const totalEvents = eventStats?.length || 0;
  const conversionRate = totalEvents > 0 ? ((totalConversions / totalEvents) * 100).toFixed(2) : '0';
  const avgOrderValue = totalConversions > 0 ? (totalRevenue / totalConversions).toFixed(2) : '0';

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
    switch (eventType.toLowerCase().replace(' ', '_')) {
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

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff0000', '#0000ff'];

  if (isLoading) {
    return <div>Loading attribution data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Attribution Dashboard</h2>
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
        </div>
      </div>

      {!selectedPixelId ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Activity className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select a Tracking Pixel</h3>
            <p className="text-gray-600">
              Choose a tracking pixel to view its attribution data and performance metrics.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
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
                    <p className="text-2xl font-bold">{totalConversions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <MousePointer className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Events</p>
                    <p className="text-2xl font-bold">{totalEvents}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-600">Conversion Rate</p>
                    <p className="text-2xl font-bold">{conversionRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-indigo-600" />
                  <div>
                    <p className="text-sm text-gray-600">Avg Order Value</p>
                    <p className="text-2xl font-bold">${avgOrderValue}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Page Performance */}
          {processedPageStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Page Performance by Name & Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {processedPageStats.map((page: any, index: number) => {
                    const PageIcon = getPageIcon(page.pageType);
                    return (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <PageIcon className="h-5 w-5 text-primary" />
                            <div>
                              <h4 className="font-medium">{page.pageName}</h4>
                              <p className="text-sm text-gray-600">{page.pageUrl}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{page.pageType}</Badge>
                            <Badge variant="secondary">{page.totalEvents} events</Badge>
                            {page.totalRevenue > 0 && (
                              <Badge className="bg-green-100 text-green-800">
                                ${page.totalRevenue.toFixed(2)}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="text-center">
                            <div className="font-medium text-lg">{page.totalEvents}</div>
                            <div className="text-gray-600">Total Events</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-lg">{page.uniqueVisitors}</div>
                            <div className="text-gray-600">Unique Visitors</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-lg">{page.conversions}</div>
                            <div className="text-gray-600">Conversions</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-lg">
                              {page.totalEvents > 0 ? ((page.conversions / page.totalEvents) * 100).toFixed(1) : '0'}%
                            </div>
                            <div className="text-gray-600">Conversion Rate</div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {Object.entries(page.eventBreakdown).map(([eventType, count]: [string, any]) => (
                            <Badge key={eventType} className={getEventTypeColor(eventType)}>
                              {eventType.replace(/_/g, ' ')}: {count}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Performance */}
            {dailyChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Daily Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailyChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="events" stroke="#8884d8" name="Events" />
                      <Line type="monotone" dataKey="conversions" stroke="#82ca9d" name="Conversions" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Event Types Breakdown */}
            {eventTypeChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Event Types Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={eventTypeChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        label={({ eventType, count }) => `${eventType}: ${count}`}
                      >
                        {eventTypeChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Revenue by Source */}
            {sourceChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Source</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={sourceChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="source" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                      <Bar dataKey="revenue" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Conversions by Source */}
            {sourceChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Conversions by Source</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={sourceChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="conversions"
                        label={({ source, conversions }) => `${source}: ${conversions}`}
                      >
                        {sourceChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Recent Events with Page Names */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Events with Page Details</CardTitle>
            </CardHeader>
            <CardContent>
              {eventStats?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No events available yet. Install the tracking pixel and start driving traffic!
                </div>
              ) : (
                <div className="space-y-3">
                  {eventStats?.slice(0, 20).map((event) => {
                    const pageName = getPageNameFromUrl(event.page_url);
                    const pageType = getPageType(event.page_url, event.event_type);
                    const PageIcon = getPageIcon(pageType);
                    
                    return (
                      <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <PageIcon className="h-5 w-5 text-primary" />
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge className={getEventTypeColor(event.event_type)}>
                                {event.event_type.replace(/_/g, ' ')}
                              </Badge>
                              <Badge variant="outline">{pageType}</Badge>
                            </div>
                            <p className="font-medium">{pageName}</p>
                            <p className="text-sm text-gray-600">{event.event_name}</p>
                            {event.contact_email && (
                              <p className="text-xs text-gray-500">{event.contact_email}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {new Date(event.created_at).toLocaleString()}
                          </p>
                          {event.revenue_amount && event.revenue_amount > 0 && (
                            <p className="text-sm font-medium text-green-600">
                              ${parseFloat(event.revenue_amount.toString()).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
