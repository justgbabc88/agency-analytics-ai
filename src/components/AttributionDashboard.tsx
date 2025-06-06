
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, DollarSign, Users, MousePointer, Activity, Globe, ShoppingCart, CheckCircle, Video, Calendar, FileText, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";

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

  // Helper functions defined first to avoid hoisting issues
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

  const getPageTypeColor = (type: string) => {
    switch (type) {
      case 'landing': return '#8884d8';
      case 'checkout': return '#82ca9d';
      case 'thankyou': return '#ffc658';
      case 'webinar': return '#ff7300';
      case 'booking': return '#00ff00';
      default: return '#8884d8';
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

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

  // Get event stats by page and event type
  const { data: eventStats, isLoading } = useQuery({
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
  const tracksPurchases = selectedPixel?.conversion_events?.includes('purchase') || false;

  // Helper function to get page name and details from URL
  const getPageDetails = (pageUrl: string): { name: string; type: string; order: number } => {
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
      return {
        name: matchedPage.name,
        type: matchedPage.type,
        order: configuredPages.findIndex((p: any) => p.id === matchedPage.id)
      };
    }

    // Fallback: Extract page name from URL
    try {
      const url = new URL(pageUrl);
      const pathname = url.pathname;
      if (pathname === '/' || pathname === '') return { name: 'Home Page', type: 'landing', order: 0 };
      
      const pageName = pathname.substring(1)
        .split('/')
        .map(segment => segment.replace(/-/g, ' ').replace(/_/g, ' '))
        .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' / ');
      
      // Infer type from URL patterns
      let type = 'landing';
      if (pathname.includes('checkout') || pathname.includes('payment')) type = 'checkout';
      else if (pathname.includes('thank') || pathname.includes('success')) type = 'thankyou';
      else if (pathname.includes('webinar') || pathname.includes('training')) type = 'webinar';
      else if (pathname.includes('book') || pathname.includes('schedule')) type = 'booking';
      
      return { name: pageName || 'Unknown Page', type, order: 999 };
    } catch {
      return { name: pageUrl || 'Unknown Page', type: 'landing', order: 999 };
    }
  };

  // Process page analytics
  const pageAnalytics = React.useMemo(() => {
    if (!eventStats || !configuredPages.length) return null;

    // Group events by page and calculate metrics
    const pageMetrics = configuredPages.map((page: any, index: number) => {
      const pageEvents = eventStats.filter(event => {
        const { name } = getPageDetails(event.page_url);
        return name === page.name;
      });

      const totalEvents = pageEvents.length;
      const uniqueVisitors = new Set(pageEvents.map(e => e.contact_email || e.page_url)).size;
      const conversions = pageEvents.filter(e => e.revenue_amount && e.revenue_amount > 0).length;
      const revenue = pageEvents.reduce((sum, e) => sum + (parseFloat(e.revenue_amount?.toString() || '0')), 0);

      return {
        name: page.name,
        type: page.type,
        order: index,
        totalEvents,
        uniqueVisitors,
        conversions,
        revenue: tracksPurchases ? revenue : 0,
        conversionRate: totalEvents > 0 ? (conversions / totalEvents) * 100 : 0,
        revenuePerVisitor: tracksPurchases && uniqueVisitors > 0 ? revenue / uniqueVisitors : 0
      };
    });

    return { pageMetrics };
  }, [eventStats, configuredPages, tracksPurchases]);

  // Process daily trends
  const dailyTrends = React.useMemo(() => {
    if (!eventStats) return [];

    const dailyData = eventStats.reduce((acc: Record<string, any>, event) => {
      const date = new Date(event.created_at).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = { date, events: 0, revenue: 0, conversions: 0, uniqueVisitors: new Set() };
      }
      acc[date].events += 1;
      if (tracksPurchases && event.revenue_amount && event.revenue_amount > 0) {
        acc[date].revenue += parseFloat(event.revenue_amount.toString());
        acc[date].conversions += 1;
      }
      if (event.contact_email) {
        acc[date].uniqueVisitors.add(event.contact_email);
      }
      return acc;
    }, {} as Record<string, any>);

    return Object.values(dailyData).map((day: any) => ({
      ...day,
      uniqueVisitors: day.uniqueVisitors.size,
      conversionRate: day.events > 0 ? (day.conversions / day.events) * 100 : 0
    })).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [eventStats, tracksPurchases]);

  // Process event type breakdown
  const eventTypeBreakdown = React.useMemo(() => {
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
  }, [eventStats]);

  // Calculate key metrics
  const keyMetrics = React.useMemo(() => {
    if (!eventStats) return null;

    const totalRevenue = tracksPurchases ? eventStats.reduce((sum, event) => sum + parseFloat(event.revenue_amount?.toString() || '0'), 0) : 0;
    const totalConversions = tracksPurchases ? eventStats.filter(event => event.revenue_amount && event.revenue_amount > 0).length : 0;
    const totalEvents = eventStats.length;
    const uniqueVisitors = new Set(eventStats.map(e => e.contact_email || e.page_url)).size;
    const conversionRate = totalEvents > 0 ? ((totalConversions / totalEvents) * 100) : 0;
    const avgOrderValue = totalConversions > 0 ? (totalRevenue / totalConversions) : 0;

    // Calculate trends (compare with previous period)
    const midPoint = Math.floor(eventStats.length / 2);
    const recentEvents = eventStats.slice(0, midPoint);
    const olderEvents = eventStats.slice(midPoint);

    const recentRevenue = tracksPurchases ? recentEvents.reduce((sum, event) => sum + parseFloat(event.revenue_amount?.toString() || '0'), 0) : 0;
    const olderRevenue = tracksPurchases ? olderEvents.reduce((sum, event) => sum + parseFloat(event.revenue_amount?.toString() || '0'), 0) : 0;
    
    const revenueTrend = tracksPurchases && olderRevenue > 0 ? ((recentRevenue - olderRevenue) / olderRevenue) * 100 : 0;
    const eventsTrend = olderEvents.length > 0 ? ((recentEvents.length - olderEvents.length) / olderEvents.length) * 100 : 0;

    return {
      totalRevenue,
      totalConversions,
      totalEvents,
      uniqueVisitors,
      conversionRate,
      avgOrderValue,
      revenueTrend,
      eventsTrend
    };
  }, [eventStats, tracksPurchases]);

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
          {/* Key Metrics with Trends */}
          {keyMetrics && (
            <div className={`grid grid-cols-1 md:grid-cols-${tracksPurchases ? '6' : '4'} gap-4`}>
              {tracksPurchases && (
                <>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="text-sm text-gray-600">Total Revenue</p>
                            <p className="text-2xl font-bold">{formatCurrency(keyMetrics.totalRevenue)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {keyMetrics.revenueTrend >= 0 ? 
                            <ArrowUpRight className="h-4 w-4 text-green-600" /> : 
                            <ArrowDownRight className="h-4 w-4 text-red-600" />
                          }
                          <span className={`text-sm font-medium ${keyMetrics.revenueTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercentage(keyMetrics.revenueTrend)}
                          </span>
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
                </>
              )}

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

              {tracksPurchases && (
                <>
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

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-emerald-600" />
                        <div>
                          <p className="text-sm text-gray-600">Avg Order Value</p>
                          <p className="text-2xl font-bold">{formatCurrency(keyMetrics.avgOrderValue)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* Page Performance Metrics */}
          {pageAnalytics && (
            <Card>
              <CardHeader>
                <CardTitle>Page Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pageAnalytics.pageMetrics.map((page: any, index: number) => {
                    const PageIcon = getPageIcon(page.type);
                    return (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <PageIcon className="h-5 w-5 text-primary" />
                            <div>
                              <h4 className="font-medium">{page.name}</h4>
                              <Badge variant="outline">{page.type}</Badge>
                            </div>
                          </div>
                          {tracksPurchases && (
                            <div className="text-right">
                              <div className="text-lg font-bold">{page.conversionRate.toFixed(1)}%</div>
                              <div className="text-sm text-gray-600">Conv. Rate</div>
                            </div>
                          )}
                        </div>
                        <div className={`grid grid-cols-${tracksPurchases ? '4' : '2'} gap-4 text-sm`}>
                          <div className="text-center">
                            <div className="font-medium">{page.totalEvents}</div>
                            <div className="text-gray-600">Events</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">{page.uniqueVisitors}</div>
                            <div className="text-gray-600">Visitors</div>
                          </div>
                          {tracksPurchases && (
                            <>
                              <div className="text-center">
                                <div className="font-medium">{page.conversions}</div>
                                <div className="text-gray-600">Conversions</div>
                              </div>
                              <div className="text-center">
                                <div className="font-medium">{formatCurrency(page.revenue)}</div>
                                <div className="text-gray-600">Revenue</div>
                              </div>
                            </>
                          )}
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
                      {tracksPurchases && <Line type="monotone" dataKey="conversions" stroke="#82ca9d" name="Conversions" />}
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

            {/* Revenue by Page - Only show if tracking purchases */}
            {tracksPurchases && pageAnalytics && (
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Page</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={pageAnalytics.pageMetrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Revenue']} />
                      <Bar dataKey="revenue" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Conversion Rates by Page - Only show if tracking purchases */}
            {tracksPurchases && pageAnalytics && (
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
          </div>
        </>
      )}
    </div>
  );
};
