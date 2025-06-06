
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle, AlertCircle, Activity, TrendingUp } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PixelData {
  id?: string;
  name: string;
  pixelId: string;
  domains: string;
  config: any;
}

interface TestVerifyStepProps {
  projectId: string;
  pixelData: PixelData;
}

export const TestVerifyStep = ({ projectId, pixelData }: TestVerifyStepProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: recentEvents, isLoading, refetch } = useQuery({
    queryKey: ['recent-events', pixelData.pixelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracking_events')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: eventStats } = useQuery({
    queryKey: ['event-stats', pixelData.pixelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracking_events')
        .select('event_type, created_at')
        .eq('project_id', projectId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const stats = data?.reduce((acc, event) => {
        acc.total = (acc.total || 0) + 1;
        acc.types = acc.types || {};
        acc.types[event.event_type] = (acc.types[event.event_type] || 0) + 1;
        return acc;
      }, {} as any);

      return stats || { total: 0, types: {} };
    },
    refetchInterval: 10000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'page_view': return 'bg-blue-100 text-blue-800';
      case 'form_submission': return 'bg-green-100 text-green-800';
      case 'click': return 'bg-purple-100 text-purple-800';
      case 'purchase': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatEventType = (eventType: string) => {
    return eventType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const isPixelWorking = recentEvents && recentEvents.length > 0;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Test & Verify Your Pixel</h3>
        <p className="text-muted-foreground">
          Monitor incoming events to ensure your pixel is tracking correctly.
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              {isPixelWorking ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <AlertCircle className="h-8 w-8 text-yellow-600" />
              )}
              <div>
                <p className="font-semibold">
                  {isPixelWorking ? 'Pixel Active' : 'Waiting for Data'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isPixelWorking ? 'Events are being tracked' : 'No events detected yet'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-8 w-8 text-blue-600" />
              <div>
                <p className="font-semibold">{eventStats?.total || 0} Events</p>
                <p className="text-sm text-muted-foreground">Last 24 hours</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div>
                <p className="font-semibold">
                  {Object.keys(eventStats?.types || {}).length} Types
                </p>
                <p className="text-sm text-muted-foreground">Event varieties</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Event Feed */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live Event Feed
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading events...
            </div>
          ) : recentEvents && recentEvents.length > 0 ? (
            <div className="space-y-3">
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
                        {new URL(event.page_url).pathname}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {new Date(event.created_at).toLocaleTimeString()}
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
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Events Yet</h3>
              <p className="text-muted-foreground mb-4">
                Visit a page with your pixel installed to see events appear here.
              </p>
              <p className="text-sm text-muted-foreground">
                Events will automatically refresh every 5 seconds.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      {!isPixelWorking && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">Troubleshooting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-yellow-800">
              <h4 className="font-semibold">If you're not seeing events:</h4>
              <ul className="space-y-1 ml-4">
                <li>• Make sure the pixel code is installed in the &lt;head&gt; section</li>
                <li>• Check that your website domain is correctly configured</li>
                <li>• Verify there are no JavaScript errors in the browser console</li>
                <li>• Try visiting your website and performing trackable actions</li>
                <li>• Wait a few minutes as events may take time to appear</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {isPixelWorking && (
        <div className="text-center">
          <div className="bg-green-50 p-6 rounded-lg">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              Pixel Setup Complete!
            </h3>
            <p className="text-green-800">
              Your tracking pixel is successfully collecting data. You can now monitor your campaigns and conversions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
