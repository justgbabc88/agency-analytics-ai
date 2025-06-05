
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, DollarSign, Users, MousePointer } from "lucide-react";

interface AttributionDashboardProps {
  projectId: string;
}

export const AttributionDashboard = ({ projectId }: AttributionDashboardProps) => {
  const [timeRange, setTimeRange] = useState('7d');

  const { data: attributionData, isLoading } = useQuery({
    queryKey: ['attribution-data', projectId, timeRange],
    queryFn: async () => {
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
      return data || [];
    },
    enabled: !!projectId,
  });

  const { data: eventStats } = useQuery({
    queryKey: ['event-stats', projectId, timeRange],
    queryFn: async () => {
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data, error } = await supabase
        .from('tracking_events')
        .select('event_type, created_at')
        .eq('project_id', projectId)
        .gte('created_at', startDate.toISOString());

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Process attribution data for charts
  const sourceData = attributionData?.reduce((acc, attr) => {
    const source = attr.utm_source || 'Direct';
    if (!acc[source]) {
      acc[source] = { source, revenue: 0, conversions: 0 };
    }
    acc[source].revenue += parseFloat(attr.attributed_revenue || 0);
    acc[source].conversions += 1;
    return acc;
  }, {} as any);

  const sourceChartData = Object.values(sourceData || {});

  const campaignData = attributionData?.reduce((acc, attr) => {
    const campaign = attr.utm_campaign || 'No Campaign';
    if (!acc[campaign]) {
      acc[campaign] = { campaign, revenue: 0, conversions: 0 };
    }
    acc[campaign].revenue += parseFloat(attr.attributed_revenue || 0);
    acc[campaign].conversions += 1;
    return acc;
  }, {} as any);

  const campaignChartData = Object.values(campaignData || {});

  // Calculate key metrics
  const totalRevenue = attributionData?.reduce((sum, attr) => sum + parseFloat(attr.attributed_revenue || 0), 0) || 0;
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

      {/* Charts */}
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
            <CardTitle>Revenue by Campaign</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={campaignChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                  label={({ campaign, revenue }) => `${campaign}: $${revenue.toFixed(0)}`}
                >
                  {campaignChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

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
                      ${parseFloat(attr.attributed_revenue || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">{attr.attribution_model}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
