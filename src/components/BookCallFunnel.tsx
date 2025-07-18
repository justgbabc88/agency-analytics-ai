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
import { PageViewFilter } from "./PageViewFilter";

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
  const { metrics: formSubmissions, loading: formSubmissionsLoading } = useGHLFormSubmissions(projectId, dateRange, selectedFormIds);
  const { facebookData } = useFacebookData({ dateRange, campaignIds: selectedCampaignIds });
  
  // State for tracking events
  const [trackingEvents, setTrackingEvents] = useState<any[]>([]);
  const [trackingEventsLoading, setTrackingEventsLoading] = useState(false);
  const [enabledPages, setEnabledPages] = useState<string[]>([]);
  
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

  // Fetch tracking events for page views
  const fetchTrackingEvents = async () => {
    if (!projectId) return;
    
    setTrackingEventsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tracking_events')
        .select('*')
        .eq('project_id', projectId)
        .eq('event_type', 'page_view')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tracking events:', error);
        return;
      }

      console.log('📊 Fetched tracking events:', data?.length || 0);
      setTrackingEvents(data || []);
    } catch (error) {
      console.error('Error fetching tracking events:', error);
    } finally {
      setTrackingEventsLoading(false);
    }
  };

  // Fetch tracking events when component mounts or dependencies change
  useEffect(() => {
    fetchTrackingEvents();
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
          fetchTrackingEvents();
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
    
    // Filter tracking events based on enabled pages
    const filteredTrackingEvents = trackingEvents.filter(event => 
      enabledPages.length === 0 || enabledPages.includes(event.page_url)
    );
    
    const data = generateCallDataFromEvents(filteredEvents, dateRange, userTimezone, filteredTrackingEvents);
    console.log('🎯 Generated chart data:', data);
    return data;
  }, [filteredEvents, dateRangeKey, userTimezone, trackingEvents, enabledPages]);

  
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

  const filteredTrackingEvents = trackingEvents.filter(event => 
    enabledPages.length === 0 || enabledPages.includes(event.page_url)
  );
  const totalPageViews = chartData.reduce((sum, day) => sum + day.pageViews, 0);
  const bookingRate = totalPageViews > 0 ? ((callStatsData.totalBookings / totalPageViews) * 100) : 0;
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

      <PageViewFilter
        trackingEvents={trackingEvents}
        onFilterChange={setEnabledPages}
      />

      <LandingPageMetrics
        totalPageViews={totalPageViews}
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
