import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Trash2, Copy, Globe, ShoppingCart, CheckCircle, Video, Calendar, FileText, Settings, ChevronDown, ChevronUp, ExternalLink, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { FunnelPageMapper } from './wizard/FunnelPageMapper';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

  const clearPixelData = useMutation({
    mutationFn: async (pixelId: string) => {
      console.log('TrackingPixelManager: Clearing data for pixel:', pixelId, 'project:', projectId);
      
      // First get the pixel to get its pixel_id
      const { data: pixel, error: pixelError } = await supabase
        .from('tracking_pixels')
        .select('pixel_id')
        .eq('id', pixelId)
        .single();

      if (pixelError || !pixel) {
        throw new Error('Pixel not found');
      }

      console.log('TrackingPixelManager: Found pixel with ID:', pixel.pixel_id);

      // Delete tracking events for this project
      const { error: eventsError, count: eventsCount } = await supabase
        .from('tracking_events')
        .delete({ count: 'exact' })
        .eq('project_id', projectId);

      if (eventsError) {
        console.error('TrackingPixelManager: Error deleting tracking events:', eventsError);
        throw eventsError;
      }
      console.log('TrackingPixelManager: Deleted', eventsCount, 'tracking events');

      // Delete tracking sessions for this project
      const { error: sessionsError, count: sessionsCount } = await supabase
        .from('tracking_sessions')
        .delete({ count: 'exact' })
        .eq('project_id', projectId);

      if (sessionsError) {
        console.error('TrackingPixelManager: Error deleting tracking sessions:', sessionsError);
        throw sessionsError;
      }
      console.log('TrackingPixelManager: Deleted', sessionsCount, 'tracking sessions');

      // Delete attribution data for this project
      const { error: attributionError, count: attributionCount } = await supabase
        .from('attribution_data')
        .delete({ count: 'exact' })
        .eq('project_id', projectId);

      if (attributionError) {
        console.error('TrackingPixelManager: Error deleting attribution data:', attributionError);
        throw attributionError;
      }
      console.log('TrackingPixelManager: Deleted', attributionCount, 'attribution records');

      console.log('TrackingPixelManager: Successfully cleared all tracking data for project');
    },
    onSuccess: () => {
      console.log('TrackingPixelManager: Starting ultra-aggressive cache clear...');
      
      // Signal to AttributionDashboard that data was cleared
      localStorage.setItem('attribution_data_cleared', Date.now().toString());
      
      // Clear ALL query cache completely
      queryClient.clear();
      
      // Remove all cached data from memory
      queryClient.removeQueries();
      
      // Force immediate garbage collection of queries
      queryClient.cancelQueries();
      
      // Wait and perform multiple rounds of cache clearing
      setTimeout(() => {
        console.log('TrackingPixelManager: Round 1 - Force clearing all caches...');
        queryClient.clear();
        
        setTimeout(() => {
          console.log('TrackingPixelManager: Round 2 - Invalidating all queries...');
          queryClient.invalidateQueries();
          
          setTimeout(() => {
            console.log('TrackingPixelManager: Round 3 - Final refetch...');
            
            // Force refetch pixels
            queryClient.refetchQueries({ queryKey: ['tracking-pixels', projectId] });
            
            // Force refetch events with different query variations
            queryClient.refetchQueries({ queryKey: ['recent-events', projectId] });
            
            // Aggressively invalidate all event-related queries
            queryClient.invalidateQueries({ 
              predicate: (query) => {
                const key = query.queryKey as string[];
                return key && (
                  key.includes('event-stats') || 
                  key.includes('tracking-events') ||
                  key.includes('attribution') ||
                  key.includes(projectId)
                );
              }
            });
            
            // Clear the localStorage signal
            localStorage.removeItem('attribution_data_cleared');
            
            console.log('TrackingPixelManager: Ultra-aggressive cache clear complete');
          }, 300);
        }, 300);
      }, 300);
      
      toast({
        title: "Success",
        description: "All tracking data cleared successfully. Please refresh the Attribution tab to see the changes.",
      });
    },
    onError: (error) => {
      console.error('TrackingPixelManager: Error clearing pixel data:', error);
      toast({
        title: "Error",
        description: "Failed to clear tracking data",
        variant: "destructive",
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

  if (isLoading) {
    return <div>Loading tracking pixels...</div>;
  }

  return (
    <div className="space-y-6">
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
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-orange-600 hover:text-orange-700"
                            >
                              <AlertTriangle className="h-4 w-4 mr-2" />
                              Clear Data
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Clear Tracking Data</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete all tracking events, sessions, and attribution data for this project. 
                                This action cannot be undone. Are you sure you want to proceed?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => clearPixelData.mutate(pixel.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Clear All Data
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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

                    {/* Display funnel pages with clickable links */}
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
                                  
                                  {/* Clickable URL Link */}
                                  <div className="p-3 bg-gray-50 rounded border">
                                    <a 
                                      href={page.url.startsWith('http') ? page.url : `https://${page.url}`}
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 hover:underline flex items-center text-sm break-all"
                                    >
                                      <Globe className="h-4 w-4 mr-2 flex-shrink-0" />
                                      {page.url.length > 50 ? `${page.url.substring(0, 50)}...` : page.url}
                                      <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
                                    </a>
                                  </div>
                                  
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
