import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Trash2, BarChart3, Copy, Globe, ShoppingCart, CheckCircle, Video, Calendar, FileText, Settings, ChevronDown, ChevronUp, RefreshCw, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { FunnelPageMapper } from './wizard/FunnelPageMapper';

interface TrackingPixelManagerProps {
  projectId: string;
}

interface PixelWithConfig {
  id: string;
  name: string;
  pixel_id: string;
  project_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  domains: string[] | null;
  conversion_events: string[];
  config: any; // Database Json type - we'll safely access this
}

// Component for website preview screenshot
const WebsitePreview = ({ url, pageName }: { url: string; pageName: string }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  // Generate screenshot URL using a service like microlink.io or similar
  const screenshotUrl = `https://api.microlink.io/screenshot?url=${encodeURIComponent(url)}&viewport.width=1200&viewport.height=800&type=png&overlay.browser=dark`;
  
  if (imageError) {
    return (
      <div className="w-full h-32 bg-gray-100 rounded border flex items-center justify-center">
        <div className="text-center">
          <Globe className="h-8 w-8 mx-auto text-gray-400 mb-2" />
          <p className="text-xs text-gray-500">Preview unavailable</p>
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline flex items-center justify-center mt-1"
          >
            Visit page <ExternalLink className="h-3 w-3 ml-1" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-32 bg-gray-100 rounded border overflow-hidden">
      {imageLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-pulse flex items-center">
            <Globe className="h-6 w-6 text-gray-400 mr-2" />
            <span className="text-xs text-gray-500">Loading preview...</span>
          </div>
        </div>
      )}
      <img
        src={screenshotUrl}
        alt={`Preview of ${pageName}`}
        className="w-full h-full object-cover"
        onLoad={() => setImageLoading(false)}
        onError={() => {
          setImageError(true);
          setImageLoading(false);
        }}
      />
      <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 flex items-end">
        <div className="w-full bg-gradient-to-t from-black/50 to-transparent p-2">
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-white text-xs hover:underline flex items-center"
          >
            {url.length > 40 ? `${url.substring(0, 40)}...` : url}
            <ExternalLink className="h-3 w-3 ml-1" />
          </a>
        </div>
      </div>
    </div>
  );
};

export const TrackingPixelManager = ({ projectId }: TrackingPixelManagerProps) => {
  const [expandedPixels, setExpandedPixels] = useState<Set<string>>(new Set());
  const [editingPixels, setEditingPixels] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Helper function to safely get funnel pages from config
  const getFunnelPages = (config: any): any[] => {
    if (!config || typeof config !== 'object') {
      return [];
    }
    return config.funnelPages || [];
  };

  const { data: pixels, isLoading, refetch: refetchPixels } = useQuery({
    queryKey: ['tracking-pixels', projectId],
    queryFn: async () => {
      console.log('TrackingPixelManager: Fetching pixels for project:', projectId);
      const { data, error } = await supabase
        .from('tracking_pixels')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('TrackingPixelManager: Error fetching pixels:', error);
        throw error;
      }
      console.log('TrackingPixelManager: Fetched pixels:', data);
      
      // Log each pixel's config to debug
      data?.forEach(pixel => {
        const funnelPages = getFunnelPages(pixel.config);
        console.log(`Pixel ${pixel.name} config:`, pixel.config);
        console.log(`Pixel ${pixel.name} funnel pages:`, funnelPages.length);
        if (funnelPages.length > 0) {
          console.log(`Pixel ${pixel.name} page details:`, funnelPages);
        }
      });
      
      return (data || []) as PixelWithConfig[];
    },
    enabled: !!projectId,
    refetchInterval: 5000, // Refetch every 5 seconds to catch updates
  });

  const { data: pixelStats, refetch: refetchStats } = useQuery({
    queryKey: ['pixel-stats', projectId],
    queryFn: async () => {
      console.log('Fetching pixel stats for project:', projectId);
      const { data, error } = await supabase
        .from('tracking_events')
        .select('event_type, created_at, event_name')
        .eq('project_id', projectId);

      if (error) {
        console.error('Error fetching pixel stats:', error);
        throw error;
      }

      console.log('Fetched tracking events:', data);

      const stats = data?.reduce((acc, event) => {
        acc.totalEvents = (acc.totalEvents || 0) + 1;
        acc.eventTypes = acc.eventTypes || {};
        acc.eventTypes[event.event_type] = (acc.eventTypes[event.event_type] || 0) + 1;
        return acc;
      }, {} as any);

      console.log('Computed stats:', stats);
      return stats || { totalEvents: 0, eventTypes: {} };
    },
    enabled: !!projectId,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const { data: recentEvents, refetch: refetchEvents } = useQuery({
    queryKey: ['recent-events', projectId],
    queryFn: async () => {
      console.log('Fetching recent events for project:', projectId);
      const { data, error } = await supabase
        .from('tracking_events')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching recent events:', error);
        throw error;
      }

      console.log('Fetched recent events:', data);
      return data || [];
    },
    enabled: !!projectId,
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  const updatePixelConfig = useMutation({
    mutationFn: async ({ pixelId, config }: { pixelId: string; config: any }) => {
      console.log('TrackingPixelManager: Updating pixel config for:', pixelId, 'with config:', config);
      const { error } = await supabase
        .from('tracking_pixels')
        .update({ config })
        .eq('id', pixelId);

      if (error) {
        console.error('TrackingPixelManager: Error updating pixel config:', error);
        throw error;
      }
      console.log('TrackingPixelManager: Successfully updated pixel config');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracking-pixels', projectId] });
      // Also refetch immediately to ensure fresh data
      refetchPixels();
      toast({
        title: "Success",
        description: "Pixel configuration updated successfully",
      });
    },
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

  const handlePagesUpdate = async (pixelId: string, pages: any[]) => {
    console.log('TrackingPixelManager: Handling pages update for pixel:', pixelId, 'pages:', pages);
    const pixel = pixels?.find(p => p.id === pixelId);
    if (!pixel) {
      console.error('TrackingPixelManager: Pixel not found:', pixelId);
      return;
    }

    const updatedConfig = {
      ...(pixel.config && typeof pixel.config === 'object' ? pixel.config : {}),
      funnelPages: pages
    };

    console.log('TrackingPixelManager: Updated config:', updatedConfig);

    await updatePixelConfig.mutateAsync({
      pixelId: pixelId,
      config: updatedConfig
    });

    setEditingPixels(prev => {
      const newSet = new Set(prev);
      newSet.delete(pixelId);
      return newSet;
    });
  };

  const generatePageScript = (page: any, pixelId: string) => {
    const supabaseUrl = "https://iqxvtfupjjxjkbajgcve.supabase.co";
    
    const getPageLoadEvents = (events: string[]) => {
      let trackingCode = '';
      
      // Fire all events immediately on page load
      events.forEach(eventType => {
        switch (eventType) {
          case 'page_view':
            trackingCode += `
    // Track page view immediately
    track('page_view', { eventName: '${page.name} - Page View' });`;
            break;
            
          case 'form_submission':
            trackingCode += `
    // Track form submission event immediately
    track('form_submission', { 
      eventName: '${page.name} - Form Submission',
      formData: { page: '${page.name}', type: 'auto_fire' }
    });`;
            break;
            
          case 'webinar_registration':
            trackingCode += `
    // Track webinar registration immediately
    track('webinar_registration', {
      eventName: '${page.name} - Webinar Registration',
      webinarName: '${page.name} Webinar',
      contactInfo: { source: 'page_visit' }
    });`;
            break;
            
          case 'call_booking':
            trackingCode += `
    // Track call booking immediately
    track('call_booking', {
      eventName: '${page.name} - Call Booking',
      appointmentType: '${page.name} Appointment',
      contactInfo: { source: 'page_visit' }
    });`;
            break;
            
          case 'purchase':
            trackingCode += `
    // Track purchase event immediately (for testing)
    track('purchase', {
      eventName: '${page.name} - Purchase',
      revenue: { amount: 99.99, currency: 'USD' },
      contactInfo: { source: 'page_visit' }
    });`;
            break;
            
          default:
            trackingCode += `
    // Track custom event immediately
    track('${eventType}', { eventName: '${page.name} - ${eventType}' });`;
            break;
        }
      });
      
      return trackingCode;
    };

    return `<!-- ${page.name} Tracking Code -->
<script>
(function() {
  const PIXEL_ID = '${pixelId}';
  const API_URL = '${supabaseUrl}/functions/v1/track-event';
  
  console.log('Initializing auto-fire tracking for ${page.name} with pixel:', PIXEL_ID);
  
  function getSessionId() {
    let sessionId = localStorage.getItem('tracking_session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('tracking_session_id', sessionId);
      console.log('Created new session ID:', sessionId);
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
      timestamp: new Date().toISOString(),
      ...data
    };

    console.log('Auto-firing event on ${page.name}:', trackingData);

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trackingData)
    }).then(response => {
      if (response.ok) {
        console.log('Successfully auto-fired ${page.name} event:', eventType);
        return response.json();
      } else {
        console.error('Failed to auto-fire ${page.name} event:', response.status, response.statusText);
        return response.text().then(text => {
          console.error('Error details:', text);
        });
      }
    }).catch(err => {
      console.error('Auto-fire tracking failed for ${page.name}:', err);
    });
  }

  function init() {
    console.log('Auto-firing all events for ${page.name}');
    
    // Fire all configured events immediately on page load
    ${getPageLoadEvents(page.events || [])}
    
    console.log('${page.name} auto-fire tracking complete');
  }

  // Initialize immediately when script loads
  init();

  // Make tracking function globally available
  window.trackEvent = track;
  
  // Debug function to test tracking
  window.testTracking = function() {
    console.log('Testing tracking for ${page.name}');
    track('test_event', { eventName: '${page.name} - Manual Test' });
  };
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

  const togglePixelExpansion = (pixelId: string) => {
    setExpandedPixels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pixelId)) {
        newSet.delete(pixelId);
      } else {
        newSet.add(pixelId);
      }
      return newSet;
    });
  };

  const togglePixelEditing = (pixelId: string) => {
    setEditingPixels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pixelId)) {
        newSet.delete(pixelId);
      } else {
        newSet.add(pixelId);
      }
      return newSet;
    });
  };

  const handleRefreshEvents = () => {
    console.log('TrackingPixelManager: Manually refreshing all data');
    refetchEvents();
    refetchStats();
    refetchPixels(); // Also refresh pixels to get latest config
    toast({
      title: "Refreshed",
      description: "All data has been updated",
    });
  };

  if (isLoading) {
    return <div>Loading tracking pixels...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Tracking Overview
            </CardTitle>
            <Button onClick={handleRefreshEvents} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>
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

          {/* Event Types Breakdown */}
          {pixelStats?.eventTypes && Object.keys(pixelStats.eventTypes).length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="font-medium">Event Types Breakdown:</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(pixelStats.eventTypes).map(([eventType, count]: [string, any]) => (
                  <Badge key={eventType} className={getEventTypeColor(eventType)}>
                    {formatEventType(eventType)}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Recent Events */}
          {recentEvents && recentEvents.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium mb-3">Recent Events (Last 20)</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {recentEvents.map((event, index) => (
                  <div key={event.id} className="flex items-center justify-between p-2 border rounded text-sm">
                    <div className="flex items-center space-x-2">
                      <Badge className={getEventTypeColor(event.event_type)}>
                        {formatEventType(event.event_type)}
                      </Badge>
                      <span>{event.event_name || formatEventType(event.event_type)}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(event.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
                const funnelPages = getFunnelPages(pixel.config);
                const isExpanded = expandedPixels.has(pixel.id);
                const isEditing = editingPixels.has(pixel.id);
                
                console.log(`Rendering pixel ${pixel.name} with ${funnelPages.length} funnel pages:`, funnelPages);
                
                return (
                  <div key={pixel.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{pixel.name}</h3>
                          <Badge variant={pixel.is_active ? "default" : "secondary"}>
                            {pixel.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            Auto-Fire Mode
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
                        <p className="text-xs text-gray-500 mt-1">
                          {funnelPages.length} funnel pages configured
                          {funnelPages.length > 0 && (
                            <span className="text-green-600 ml-1">✓ Pages saved</span>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => togglePixelEditing(pixel.id)}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          {isEditing ? 'Cancel' : 'Edit Pages'}
                        </Button>
                        {funnelPages.length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => togglePixelExpansion(pixel.id)}
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                            {isExpanded ? 'Hide Codes' : 'Show Codes'}
                          </Button>
                        )}
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

                    {/* Display funnel pages with preview screenshots */}
                    {funnelPages.length > 0 && !isEditing && (
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3">Connected Pages</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {funnelPages.map((page: any, index: number) => {
                            const PageIcon = getPageIcon(page.type);
                            
                            return (
                              <Card key={page.id || index} className="p-3">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <PageIcon className="h-4 w-4 text-primary" />
                                      <h5 className="font-medium text-sm">{page.name}</h5>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      {page.type}
                                    </Badge>
                                  </div>
                                  
                                  {/* Website Preview Screenshot */}
                                  <WebsitePreview url={page.url} pageName={page.name} />
                                  
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap gap-1">
                                      {(page.events || []).map((event: string) => (
                                        <Badge key={event} variant="secondary" className="text-xs px-1 py-0">
                                          {event.replace(/_/g, ' ')}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {isEditing && (
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3">Edit Funnel Pages</h4>
                        <FunnelPageMapper
                          onPagesConfigured={(pages) => handlePagesUpdate(pixel.id, pages)}
                          initialPages={funnelPages}
                        />
                      </div>
                    )}

                    {isExpanded && funnelPages.length > 0 && (
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3">Auto-Fire Tracking Codes</h4>
                        <div className="bg-green-50 border border-green-200 p-3 rounded-lg mb-4">
                          <p className="text-sm text-green-800">
                            ✅ These codes will automatically fire all configured events when someone visits the page
                          </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {funnelPages.map((page: any) => {
                            const PageIcon = getPageIcon(page.type);
                            const script = generatePageScript(page, pixel.pixel_id);
                            
                            return (
                              <Card key={page.id} className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <PageIcon className="h-4 w-4 text-primary" />
                                    <h5 className="font-medium">{page.name}</h5>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => copyToClipboard(script, page.name)}
                                  >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy
                                  </Button>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex flex-wrap gap-1">
                                    {(page.events || []).map((event: string) => (
                                      <Badge key={event} variant="secondary" className="text-xs">
                                        {event.replace(/_/g, ' ')}
                                      </Badge>
                                    ))}
                                  </div>
                                  <Textarea
                                    value={script}
                                    readOnly
                                    className="font-mono text-xs h-32 bg-muted resize-none"
                                  />
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {funnelPages.length === 0 && !isEditing && (
                      <div className="text-center py-4 text-gray-500 bg-gray-50 rounded">
                        <p className="text-sm">No funnel pages configured yet.</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => togglePixelEditing(pixel.id)}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Configure Pages
                        </Button>
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
