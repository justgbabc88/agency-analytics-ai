import { useCalendlyData } from "@/hooks/useCalendlyData";
import { useUserProfile } from "@/hooks/useUserProfile";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { LandingPageMetrics } from "./LandingPageMetrics";
import { CallStatsMetrics } from "./CallStatsMetrics";
import { CallsList } from "./CallsList";
import { useState, useEffect, useMemo } from "react";
import { generateCallDataFromEvents } from "@/utils/chartDataGeneration";
import { useCallStatsCalculations } from "@/hooks/useCallStatsCalculations";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGHLFormSubmissions } from "@/hooks/useGHLFormSubmissions";
import { useFacebookData } from "@/hooks/useFacebookData";

interface BookCallFunnelProps {
  projectId: string;
  dateRange: { from: Date; to: Date };
  selectedCampaignIds?: string[];
  selectedFormIds?: string[];
}

export const BookCallFunnel = ({ projectId, dateRange, selectedCampaignIds = [], selectedFormIds = [] }: BookCallFunnelProps) => {
  const { calendlyEvents, getRecentBookings, getMonthlyComparison, refetch } = useCalendlyData(projectId);
  const { getUserTimezone, profile } = useUserProfile();
  const { toast } = useToast();
  const { metrics: formSubmissions, loading: formSubmissionsLoading, refetch: refetchGHLData } = useGHLFormSubmissions(projectId, dateRange, selectedFormIds);
  const { facebookData } = useFacebookData({ dateRange, campaignIds: selectedCampaignIds });
  
  // State for tracking events
  const [trackingEvents, setTrackingEvents] = useState<any[]>([]);
  const [trackingEventsLoading, setTrackingEventsLoading] = useState(false);
  
  const userTimezone = getUserTimezone();
  
  console.log('🔄 BookCallFunnel render - Project ID:', projectId);
  console.log('🔄 User timezone from profile:', userTimezone);
  console.log('🔄 Profile timezone setting:', profile?.timezone);
  console.log('🔄 Received date range from parent:', {
    from: format(dateRange.from, 'yyyy-MM-dd HH:mm:ss'),
    to: format(dateRange.to, 'yyyy-MM-dd HH:mm:ss'),
    fromISO: dateRange.from.toISOString(),
    toISO: dateRange.to.toISOString()
  });
  console.log('🔄 All Calendly events available:', calendlyEvents.length);

  // State for tracking pixel configuration
  const [pixelConfig, setPixelConfig] = useState<any>(null);
  
  // Fetch pixel configuration to get page settings
  useEffect(() => {
    const fetchPixelConfig = async () => {
      if (!projectId) return;
      
      try {
        const { data, error } = await supabase
          .from('tracking_pixels')
          .select('config')
          .eq('project_id', projectId)
          .eq('is_active', true)
          .single();

        if (error) {
          console.error('Error fetching pixel config:', error);
          return;
        }

        setPixelConfig(data?.config || null);
      } catch (error) {
        console.error('Error fetching pixel config:', error);
      }
    };

    fetchPixelConfig();
  }, [projectId]);

  // Trigger daily aggregation for current and historical data
  const triggerDailyAggregation = async () => {
    if (!projectId) return;
    
    try {
      // Aggregate data for the current date range
      const startDate = dateRange.from.toISOString().split('T')[0];
      const endDate = dateRange.to.toISOString().split('T')[0];
      
      console.log('📊 Triggering daily aggregation for date range:', startDate, 'to', endDate);
      
      // Generate dates array for the range
      const dates = [];
      const currentDate = new Date(startDate);
      const finalDate = new Date(endDate);
      
      while (currentDate <= finalDate) {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Trigger aggregation for each date
      for (const date of dates) {
        await supabase.functions.invoke('daily-aggregation', {
          body: { project_id: projectId, date }
        });
      }
      
      console.log('📊 Daily aggregation completed for all dates');
    } catch (error) {
      console.error('Error triggering daily aggregation:', error);
    }
  };

  // Store aggregated metrics separately from individual events
  const [aggregatedMetrics, setAggregatedMetrics] = useState<any[]>([]);

  // Fetch aggregated metrics for visitor calculations
  const fetchAggregatedMetrics = async () => {
    if (!projectId) return;
    
    setTrackingEventsLoading(true);
    try {
      const startDate = dateRange.from.toISOString().split('T')[0];
      const endDate = dateRange.to.toISOString().split('T')[0];
      
      console.log('📊 Fetching aggregated metrics for date range:', startDate, 'to', endDate);
      
      // Fetch the aggregated data directly
      const { data, error } = await supabase.rpc('get_project_daily_metrics', {
        p_project_id: projectId,
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (error) {
        console.error('Error fetching aggregated metrics:', error);
        // Fallback to raw events if aggregation fails
        await fetchRawTrackingEvents();
        return;
      }

      console.log('📊 Fetched aggregated metrics:', data?.length || 0, 'records');
      console.log('📊 Sample aggregated data:', data?.slice(0, 3));
      
      setAggregatedMetrics(data || []);
      
      // Also fetch raw events for other purposes (chart generation, etc.)
      await fetchRawTrackingEvents();
    } catch (error) {
      console.error('Error fetching aggregated metrics:', error);
      // Fallback to raw events
      await fetchRawTrackingEvents();
    } finally {
      setTrackingEventsLoading(false);
    }
  };

  // Fallback method for raw events (when aggregation fails)
  const fetchRawTrackingEvents = async () => {
    if (!projectId) return;
    
    try {
      const { data, error } = await supabase
        .from('tracking_events')
        .select('*')
        .eq('project_id', projectId)
        .eq('event_type', 'page_view')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .order('created_at', { ascending: false })
        .limit(10000); // Increased limit for better coverage

      if (error) {
        console.error('Error fetching raw tracking events:', error);
        return;
      }

      console.log('📊 Fetched raw tracking events (fallback):', data?.length || 0);
      setTrackingEvents(data || []);
    } catch (error) {
      console.error('Error fetching raw tracking events:', error);
    }
  };

  // Fetch aggregated metrics when component mounts or dependencies change
  useEffect(() => {
    fetchAggregatedMetrics();
  }, [projectId, dateRange.from, dateRange.to]);

  // Real-time listener for new tracking events
  useEffect(() => {
    if (!projectId) return;

    console.log('🎧 Setting up real-time listener for tracking events...');
    
    const trackingChannel = supabase
      .channel('tracking-events-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tracking_events',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log('🆕 New tracking event received:', payload);
          
          // Show toast notification for new page views if it's a page view event
          if (payload.new && payload.new.event_type === 'page_view') {
            toast({
              title: "New Page View! 👀",
              description: `Landing page visited: ${payload.new.page_url}`,
            });
          }
          
          // Refresh tracking events data
          fetchAggregatedMetrics();
        }
      )
      .subscribe();

    return () => {
      console.log('🎧 Cleaning up tracking events real-time listener...');
      supabase.removeChannel(trackingChannel);
    };
  }, [projectId, toast]);

  // Real-time listener for new Calendly events
  useEffect(() => {
    if (!projectId) return;

    console.log('🎧 Setting up real-time listener for Calendly events...');
    
    const channel = supabase
      .channel('calendly-events-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calendly_events',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log('🆕 New Calendly event received:', payload);
          
          // Show toast notification for new bookings
          if (payload.new) {
            toast({
              title: "New Booking! 🎉",
              description: `${payload.new.event_type_name} scheduled for ${format(new Date(payload.new.scheduled_at), 'MMM d, h:mm a')}`,
            });
          }
          
          // Refresh data to show the new event
          refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calendly_events',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log('📝 Calendly event updated:', payload);
          
          // Show notification for status changes
          if (payload.new && payload.old) {
            const oldStatus = payload.old.status;
            const newStatus = payload.new.status;
            
            if (oldStatus !== newStatus) {
              let message = '';
              if (newStatus === 'cancelled') {
                message = `Booking cancelled: ${payload.new.event_type_name}`;
              } else if (newStatus === 'completed') {
                message = `Call completed: ${payload.new.event_type_name}`;
              } else if (newStatus === 'no_show') {
                message = `No-show recorded: ${payload.new.event_type_name}`;
              }
              
              if (message) {
                toast({
                  title: "Booking Status Updated",
                  description: message,
                });
              }
            }
          }
          
          // Refresh data to show the updated event
          refetch();
        }
      )
      .subscribe();

    // Trigger manual gap sync when component loads
    const triggerManualSync = async () => {
      try {
        console.log('🔄 Triggering manual gap sync for missing events...');
        await supabase.functions.invoke('calendly-sync-gaps', {
          body: { 
            triggerReason: 'manual_component_sync',
            projectId 
          }
        });
        
        // Refresh data after gap sync
        setTimeout(() => {
          console.log('🔄 Refreshing data after manual sync...');
          refetch();
        }, 2000);
      } catch (error) {
        console.error('Manual gap sync failed:', error);
      }
    };

    // Trigger sync immediately and then periodically
    triggerManualSync();
    
    const syncInterval = setInterval(() => {
      console.log('🔄 Periodic sync check...');
      triggerManualSync();
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => {
      console.log('🎧 Cleaning up real-time listener and sync intervals...');
      supabase.removeChannel(channel);
      clearInterval(syncInterval);
    };
  }, [projectId, refetch, toast]);

  // Create a more specific dependency key that includes both timezone sources
  const dateRangeKey = useMemo(() => {
    const fromISO = dateRange.from.toISOString();
    const toISO = dateRange.to.toISOString();
    const profileTimezone = profile?.timezone || 'UTC';
    const effectiveTimezone = userTimezone || 'UTC';
    return `${fromISO}-${toISO}-${profileTimezone}-${effectiveTimezone}-${calendlyEvents.length}`;
  }, [dateRange.from, dateRange.to, userTimezone, profile?.timezone, calendlyEvents.length]);
  
  // Filter events to match the date range filtering used in CallsList
  const filteredEvents = useMemo(() => {
    return calendlyEvents.filter(event => {
      // Convert the event's created_at to user's timezone for comparison
      const eventCreatedInUserTz = toZonedTime(new Date(event.created_at), userTimezone);
      const selectedFromDate = toZonedTime(dateRange.from, userTimezone);
      const selectedToDate = toZonedTime(dateRange.to, userTimezone);
      
      // Get the date part only (year, month, day) for comparison
      const eventDate = startOfDay(eventCreatedInUserTz);
      const fromDate = startOfDay(selectedFromDate);
      const toDate = startOfDay(selectedToDate);
      
      return eventDate >= fromDate && eventDate <= toDate;
    });
  }, [calendlyEvents, dateRange, userTimezone]);
  
  const chartData = useMemo(() => {
    console.log('🔄 Recalculating chart data due to dependency change');
    console.log('🔄 Date range key:', dateRangeKey);
    console.log('🔄 Events available:', filteredEvents.length);
    console.log('🔄 Tracking events available:', trackingEvents.length);
    console.log('🔄 Using timezone:', userTimezone);
    console.log('🔄 Profile loaded:', !!profile);
    
    if (filteredEvents.length === 0) {
      console.log('⚠️ No events available for chart generation');
      return [];
    }
    
    const data = generateCallDataFromEvents(filteredEvents, dateRange, userTimezone, trackingEvents);
    console.log('🎯 Generated chart data:', data);
    return data;
  }, [filteredEvents, dateRangeKey, userTimezone, trackingEvents]);

  
  // Calculate stats using the same exact logic as CallsList for consistency
  const callStatsData = useMemo(() => {
    // Helper functions matching CallsList exactly
    const isCallCreatedInDateRange = (call: any): boolean => {
      if (!dateRange) return true;
      
      const callCreatedInUserTz = toZonedTime(new Date(call.created_at), userTimezone);
      const selectedFromDate = toZonedTime(dateRange.from, userTimezone);
      const selectedToDate = toZonedTime(dateRange.to, userTimezone);
      
      const callDate = startOfDay(callCreatedInUserTz);
      const fromDate = startOfDay(selectedFromDate);
      const toDate = startOfDay(selectedToDate);
      
      return callDate >= fromDate && callDate <= toDate;
    };

    const isCallScheduledInDateRange = (call: any): boolean => {
      if (!dateRange) return true;
      
      const callScheduledInUserTz = toZonedTime(new Date(call.scheduled_at), userTimezone);
      const selectedFromDate = toZonedTime(dateRange.from, userTimezone);
      const selectedToDate = toZonedTime(dateRange.to, userTimezone);
      
      const callDate = startOfDay(callScheduledInUserTz);
      const fromDate = startOfDay(selectedFromDate);
      const toDate = startOfDay(selectedToDate);
      
      return callDate >= fromDate && callDate <= toDate;
    };

    // Calculate the exact same numbers as CallsList filter buttons
    const totalBookings = calendlyEvents.filter(call => isCallCreatedInDateRange(call)).length;
    const callsTaken = calendlyEvents.filter(call => 
      isCallScheduledInDateRange(call) && call.status.toLowerCase() !== 'cancelled'
    ).length;
    const callsCancelled = calendlyEvents.filter(c => 
      c.status.toLowerCase() === 'cancelled' && isCallScheduledInDateRange(c)
    ).length;

    // Calculate show up rate
    const totalScheduled = callsTaken + callsCancelled;
    const showUpRate = totalScheduled > 0 ? Math.round((callsTaken / totalScheduled) * 100) : 0;

    return {
      totalBookings,
      callsTaken,
      callsCancelled,
      showUpRate
    };
  }, [calendlyEvents, dateRange, userTimezone]);

  const recentBookings = getRecentBookings(7);
  const monthlyComparison = getMonthlyComparison();

  // Helper function to check if an event belongs to a specific page (same logic as AttributionDashboard)
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

  // Filter page views based on pixel configuration using the same logic as AttributionDashboard
  const filteredPageViews = useMemo(() => {
    if (!pixelConfig?.funnelPages || !trackingEvents.length) {
      console.log('📊 No pixel config or tracking events, returning all events');
      return trackingEvents;
    }

    // Get pages that should be included in metrics (default to true if not set)
    const enabledPages = pixelConfig.funnelPages.filter((page: any) => page.includeInPageViewMetrics !== false);

    console.log('📊 Pages enabled for funnel metrics:', enabledPages.map((p: any) => ({ name: p.name, url: p.url })));

    // If no pages are configured (empty array), return all events instead of empty array
    if (enabledPages.length === 0) {
      console.log('📊 No pages configured for metrics, returning all tracking events');
      return trackingEvents;
    }

    // Filter tracking events using the same isEventForPage logic as AttributionDashboard
    const filtered = trackingEvents.filter((event: any) => {
      return enabledPages.some((page: any) => isEventForPage(event, page));
    });

    console.log('📊 Filtered page views:', filtered.length, 'from', trackingEvents.length, 'total');
    
    // Count specific page events for debugging
    const pdfEvents = filtered.filter(e => e.event_name && e.event_name.includes('250k'));
    const courseEvents = filtered.filter(e => e.event_name && e.event_name.includes('Course'));
    console.log('📊 Events included - 250k PDF:', pdfEvents.length, 'Course:', courseEvents.length);
    
    return filtered;
  }, [pixelConfig, trackingEvents]);

  const totalPageViews = filteredPageViews.length;
  
  // Calculate unique visitors from aggregated metrics (more accurate than event-level calculation)
  const uniqueVisitors = useMemo(() => {
    if (aggregatedMetrics.length > 0) {
      // Use aggregated metrics for accurate unique visitor count
      const enabledPages = pixelConfig?.funnelPages?.filter((page: any) => page.includeInPageViewMetrics !== false) || [];
      
      // If no pages configured, include all metrics
      let filteredMetrics = aggregatedMetrics;
      
      if (enabledPages.length > 0) {
        // Filter metrics to only include enabled pages
        filteredMetrics = aggregatedMetrics.filter((metric: any) => {
          return enabledPages.some((page: any) => {
            // Check if metric matches the page by name or URL
            const pageNameMatch = metric.landing_page_name?.toLowerCase().includes(page.name?.toLowerCase() || '');
            const pageUrlMatch = metric.landing_page_url?.toLowerCase().includes(page.url?.toLowerCase() || '');
            return pageNameMatch || pageUrlMatch;
          });
        });
      }
      
      // For aggregated metrics, we need to handle cross-page visitor overlap
      // Since we don't have session IDs in aggregated data, we need to estimate
      // by taking the maximum unique visitors per date (conservative approach)
      const visitorsByDate = new Map();
      filteredMetrics.forEach((metric: any) => {
        const dateKey = metric.date;
        const currentMax = visitorsByDate.get(dateKey) || 0;
        // Take the maximum unique visitors for any single page on this date
        // This is conservative but avoids double-counting
        visitorsByDate.set(dateKey, Math.max(currentMax, metric.unique_visitors));
      });
      
      // Sum the maximum unique visitors across all dates
      const totalUniqueVisitors = Array.from(visitorsByDate.values()).reduce((sum, count) => sum + count, 0);
      
      console.log('📊 Unique visitors from aggregated metrics:', totalUniqueVisitors);
      console.log('📊 Aggregated metrics used:', filteredMetrics.length, 'metrics for', filteredMetrics.map(m => `${m.date}: ${m.landing_page_name} (${m.unique_visitors} visitors)`));
      console.log('📊 Unique visitors by date:', Object.fromEntries(visitorsByDate));
      
      return totalUniqueVisitors;
    }
    
    // Fallback to event-level calculation if no aggregated metrics available
    const uniqueVisitorIds = new Set();
    filteredPageViews.forEach((event: any) => {
      // Create a visitor ID from session, email, or page/date combination
      const visitorId = event.session_id || 
                       event.contact_email || 
                       `${event.page_url}-${event.created_at.split('T')[0]}`;
      uniqueVisitorIds.add(visitorId);
    });
    console.log('📊 Unique visitors calculated from events (fallback):', uniqueVisitorIds.size, 'from', filteredPageViews.length, 'page views');
    return uniqueVisitorIds.size;
  }, [aggregatedMetrics, pixelConfig, filteredPageViews]);
  const bookingRate = uniqueVisitors > 0 ? ((callStatsData.totalBookings / uniqueVisitors) * 100) : 0;
  const previousBookingRate = 0; // Simplified for now since we're focusing on current period accuracy
  
  const totalSpend = facebookData?.insights?.spend || 1500; // Use actual Facebook spend or fallback
  const costPerBooking = callStatsData.totalBookings > 0 ? (totalSpend / callStatsData.totalBookings) : 0;
  const previousCostPerBooking = 0; // Simplified for now

  console.log('\n=== FINAL COMPONENT STATE ===');
  console.log('Chart data length:', chartData.length);
  console.log('Total bookings for metrics:', callStatsData.totalBookings);
  console.log('Date range key:', dateRangeKey);
  console.log('User timezone being used:', userTimezone);

  const chartKey = `${dateRangeKey}-${callStatsData.totalBookings}`;

  if (!projectId) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Project Selected</h3>
        <p className="text-gray-600">Please select a project to view Calendly booking data.</p>
      </div>
    );
  }

  // Debug logging
  console.log('🔍 [BookCallFunnel] Passing to LandingPageMetrics:', {
    dateRange: {
      from: dateRange.from.toISOString(),
      to: dateRange.to.toISOString()
    },
    formSubmissions: formSubmissions ? {
      totalSubmissions: formSubmissions.totalSubmissions,
      totalForms: formSubmissions.totalForms,
      recentSubmissions: formSubmissions.recentSubmissions?.length
    } : null,
    formSubmissionsLoading
  });

  return (
    <div className="space-y-6">
      {/* Header without date picker */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Book Call Funnel</h2>
      </div>

      <LandingPageMetrics
        totalPageViews={uniqueVisitors}
        bookingRate={bookingRate}
        previousBookingRate={previousBookingRate}
        totalBookings={callStatsData.totalBookings}
        previousTotalBookings={0}
        costPerBooking={costPerBooking}
        previousCostPerBooking={previousCostPerBooking}
        formSubmissions={formSubmissions}
        totalSpend={totalSpend}
      />

      <CallStatsMetrics
        totalBookings={callStatsData.totalBookings}
        previousTotalBookings={0}
        callsTaken={callStatsData.callsTaken}
        previousCallsTaken={0}
        cancelled={callStatsData.callsCancelled}
        previousCancelled={0}
        showUpRate={callStatsData.showUpRate}
        previousShowUpRate={0}
        chartData={chartData}
        chartKey={chartKey}
      />

      <CallsList 
        calls={calendlyEvents}
        isLoading={false}
        dateRange={dateRange}
      />
    </div>
  );
};
