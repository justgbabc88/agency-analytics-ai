
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, DollarSign, Users, MousePointer, Activity } from "lucide-react";

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
  event_type: string;
  event_name: string | null;
  page_url: string;
  created_at: string;
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
        .select('event_type, event_name, page_url, created_at')
        .eq('project_id', projectId)
        .gte('created_at', startDate.toISOString());

      if (error) throw error;
      return (data || []) as EventRecord[];
    },
    enabled: !!projectId && !!selectedPixelId,
  });

  // Get configured pages for the selected pixel
  const selectedPixel = pixels?.find(p => p.id === selectedPixelId);
  const configuredPages = selectedPixel?.config?.funnelPages || [];

  // Process event stats by configured pages
  const pageStats = configuredPages.map((page: any) => {
    const pageEvents = eventStats?.filter(event => 
      event.page_url?.includes(new URL(page.url).pathname) ||
      event.event_name?.includes(page.name)
    ) || [];

    const eventBreakdown = page.events.reduce((acc: Record<string, number>, eventType: string) => {
      acc[eventType] = pageEvents.filter(e => e.event_type === eventType).length;
      return acc;
    }, {} as Record<string, number>);

    return {
      ...page,
      totalEvents: pageEvents.length,
      eventBreakdown
    };
  });

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

  // Calculate key metrics
  const totalRevenue = attributionData?.reduce((sum, attr) => sum + parseFloat(attr.attributed_revenue?.toString() || '0'), 0) || 0;
  const totalConversions = attributionData?.length || 0;
  const totalEvents = eventStats?.length || 0;
  const conversionRate = totalEvents > 0 ? ((totalConversions / totalEvents) * 100).toFixed(2) : '0';

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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          </div>

          {/* Page Performance */}
          {configuredPages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Page Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pageStats.map((page: any) => (
                    <div key={page.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{page.name}</h4>
                        <Badge variant="outline">{page.totalEvents} events</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {page.events.map((eventType: string) => (
                          <div key={eventType} className="text-center">
                            <div className="font-medium text-lg">
                              {page.eventBreakdown[eventType] || 0}
                            </div>
                            <div className="text-gray-600 capitalize">
                              {eventType.replace('_', ' ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charts */}
          {sourceChartData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            </div>
          )}

          {/* Recent Attributions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Attributions</CardTitle>
            </CardHeader>
            <CardContent>
              {attributionData?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No attribution data available yet. Install the tracking pixel and start driving traffic!
                </div>
              ) : (
                <div className="space-y-3">
                  {attributionData?.slice(0, 10).map((attr) => (
                    <div key={attr.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {attr.utm_source || 'Direct'}
                          </Badge>
                          {attr.utm_campaign && (
                            <Badge variant="secondary">
                              {attr.utm_campaign}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {attr.contact_email || 'Anonymous'} • {new Date(attr.conversion_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">
                          ${parseFloat(attr.attributed_revenue?.toString() || '0').toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">{attr.attribution_model}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
