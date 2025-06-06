
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Trash2, BarChart3, Copy, Globe, ShoppingCart, CheckCircle, Video, Calendar, FileText } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

interface TrackingPixelManagerProps {
  projectId: string;
}

export const TrackingPixelManager = ({ projectId }: TrackingPixelManagerProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: pixels, isLoading } = useQuery({
    queryKey: ['tracking-pixels', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracking_pixels')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const { data: pixelStats } = useQuery({
    queryKey: ['pixel-stats', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracking_events')
        .select('event_type, created_at')
        .eq('project_id', projectId);

      if (error) throw error;

      const stats = data?.reduce((acc, event) => {
        acc.totalEvents = (acc.totalEvents || 0) + 1;
        acc.eventTypes = acc.eventTypes || {};
        acc.eventTypes[event.event_type] = (acc.eventTypes[event.event_type] || 0) + 1;
        return acc;
      }, {} as any);

      return stats || { totalEvents: 0, eventTypes: {} };
    },
    enabled: !!projectId,
  });

  const deletePixel = useMutation({
    mutationFn: async (pixelId: string) => {
      const { error } = await supabase
        .from('tracking_pixels')
        .delete()
        .eq('id', pixelId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracking-pixels', projectId] });
      toast({
        title: "Success",
        description: "Tracking pixel deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete tracking pixel",
        variant: "destructive",
      });
    },
  });

  const togglePixelStatus = useMutation({
    mutationFn: async ({ pixelId, isActive }: { pixelId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('tracking_pixels')
        .update({ is_active: isActive })
        .eq('id', pixelId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracking-pixels', projectId] });
      toast({
        title: "Success",
        description: "Pixel status updated successfully",
      });
    },
  });

  const generatePageScript = (page: any, pixelId: string) => {
    const supabaseUrl = "https://iqxvtfupjjxjkbajgcve.supabase.co";
    
    const getTrackingEvents = (events: string[]) => {
      let trackingCode = '';
      
      if (events.includes('form_submission')) {
        trackingCode += `
    // Track form submissions
    document.addEventListener('submit', function(e) {
      const form = e.target;
      const formData = new FormData(form);
      const data = {};
      for (let [key, value] of formData.entries()) {
        if (!key.toLowerCase().includes('password')) {
          data[key] = value;
        }
      }
      track('form_submission', {
        eventName: '${page.name} - Form Submission',
        formData: data
      });
    });`;
      }

      if (events.includes('purchase')) {
        trackingCode += `
    // Track confirmed purchases (call this after successful payment)
    window.trackPurchase = function(amount, currency = 'USD', customerInfo = {}) {
      track('purchase', {
        eventName: 'Purchase Completed',
        revenue: { amount: parseFloat(amount), currency: currency },
        contactInfo: customerInfo
      });
    };`;
      }

      return trackingCode;
    };

    return `<!-- ${page.name} -->
<script>
(function() {
  const PIXEL_ID = '${pixelId}';
  const API_URL = '${supabaseUrl}/functions/v1/track-event';
  
  function getSessionId() {
    let sessionId = localStorage.getItem('tracking_session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('tracking_session_id', sessionId);
    }
    return sessionId;
  }

  function track(eventType, data = {}) {
    const trackingData = {
      pixelId: PIXEL_ID,
      sessionId: getSessionId(),
      eventType: eventType,
      pageUrl: window.location.href,
      referrerUrl: document.referrer,
      ...data
    };

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trackingData)
    }).catch(err => console.warn('Tracking failed:', err));
  }

  function init() {${page.events.includes('page_view') ? `
    track('page_view', { eventName: '${page.name} - Page View' });` : ''}
    ${getTrackingEvents(page.events)}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.trackEvent = track;
})();
</script>`;
  };

  const copyToClipboard = (text: string, pageName: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${pageName} tracking code copied to clipboard`,
    });
  };

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

  if (isLoading) {
    return <div>Loading tracking pixels...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Tracking Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {pixels?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Active Pixels</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {pixelStats?.totalEvents || 0}
              </div>
              <div className="text-sm text-gray-600">Total Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Object.keys(pixelStats?.eventTypes || {}).length}
              </div>
              <div className="text-sm text-gray-600">Event Types</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tracking Pixels</CardTitle>
        </CardHeader>
        <CardContent>
          {pixels?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No tracking pixels created yet. Generate your first pixel above.
            </div>
          ) : (
            <div className="space-y-6">
              {pixels?.map((pixel) => {
                const funnelPages = pixel.config?.funnelPages || [];
                
                return (
                  <div key={pixel.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{pixel.name}</h3>
                          <Badge variant={pixel.is_active ? "default" : "secondary"}>
                            {pixel.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Pixel ID: {pixel.pixel_id}
                        </p>
                        {pixel.domains && pixel.domains.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Domains: {pixel.domains.join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => togglePixelStatus.mutate({
                            pixelId: pixel.id,
                            isActive: !pixel.is_active
                          })}
                        >
                          <Eye className="h-4 w-4" />
                          {pixel.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deletePixel.mutate(pixel.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {funnelPages.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">Page Tracking Codes</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {funnelPages.map((page: any) => {
                            const PageIcon = getPageIcon(page.type);
                            const script = generatePageScript(page, pixel.pixel_id);
                            
                            return (
                              <Card key={page.id} className="relative">
                                <CardHeader className="pb-2">
                                  <div className="flex items-center gap-2">
                                    <PageIcon className="h-4 w-4 text-primary" />
                                    <CardTitle className="text-sm">{page.name}</CardTitle>
                                  </div>
                                </CardHeader>
                                <CardContent className="pt-0 space-y-2">
                                  <div className="flex flex-wrap gap-1">
                                    {page.events.slice(0, 2).map((event: string) => (
                                      <Badge key={event} variant="secondary" className="text-xs">
                                        {event.replace(/_/g, ' ')}
                                      </Badge>
                                    ))}
                                    {page.events.length > 2 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{page.events.length - 2} more
                                      </Badge>
                                    )}
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => copyToClipboard(script, page.name)}
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy Code
                                  </Button>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
