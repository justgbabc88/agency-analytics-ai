
import { useCalendlyData } from "@/hooks/useCalendlyData";
import { useUserProfile } from "@/hooks/useUserProfile";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { LandingPageMetrics } from "./LandingPageMetrics";
import { CallStatsMetrics } from "./CallStatsMetrics";
import { CallsList } from "./CallsList";
import { useState, useEffect, useMemo } from "react";
import { generateCallDataFromEvents } from "@/utils/chartDataGeneration";
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
  const { 
    calendlyEvents, 
    getRecentBookings, 
    getMonthlyComparison, 
    refetch,
    userTimezone,
    filterEventsByDateRangeWithTimezone,
    filterEventsByScheduledDateRangeWithTimezone,
    filterCancelledEventsByDateRangeWithTimezone
  } = useCalendlyData(projectId);
  
  const { getUserTimezone, profile } = useUserProfile();
  const { toast } = useToast();
  const { metrics: formSubmissions, loading: formSubmissionsLoading } = useGHLFormSubmissions(projectId, dateRange, selectedFormIds);
  const { facebookData } = useFacebookData({ dateRange, campaignIds: selectedCampaignIds });
  
  const effectiveTimezone = userTimezone || getUserTimezone();
  
  console.log('🔄 BookCallFunnel render - Project ID:', projectId);
  console.log('🌍 BookCallFunnel - User timezone:', effectiveTimezone);
  console.log('🔄 Profile timezone setting:', profile?.timezone);
  console.log('🔄 Received date range from parent:', {
    from: format(dateRange.from, 'yyyy-MM-dd HH:mm:ss'),
    to: format(dateRange.to, 'yyyy-MM-dd HH:mm:ss'),
    fromISO: dateRange.from.toISOString(),
    toISO: dateRange.to.toISOString(),
    timezone: effectiveTimezone
  });
  console.log('🔄 All Calendly events available:', calendlyEvents.length);

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
          
          if (payload.new) {
            toast({
              title: "New Booking! 🎉",
              description: `${payload.new.event_type_name} scheduled for ${format(new Date(payload.new.scheduled_at), 'MMM d, h:mm a')}`,
            });
          }
          
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
          
          refetch();
        }
      )
      .subscribe();

    // Trigger timezone-aware manual gap sync when component loads
    const triggerManualSync = async () => {
      try {
        console.log('🔄 Triggering timezone-aware manual gap sync for missing events...');
        await supabase.functions.invoke('calendly-sync-gaps', {
          body: { 
            triggerReason: 'manual_component_sync',
            projectId,
            userTimezone: effectiveTimezone
          }
        });
        
        // Refresh data after gap sync
        setTimeout(() => {
          console.log('🔄 Refreshing data after timezone-aware manual sync...');
          refetch();
        }, 2000);
      } catch (error) {
        console.error('Manual gap sync failed:', error);
      }
    };

    // Trigger sync immediately and then periodically
    triggerManualSync();
    
    const syncInterval = setInterval(() => {
      console.log('🔄 Periodic timezone-aware sync check...');
      triggerManualSync();
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => {
      console.log('🎧 Cleaning up real-time listener and sync intervals...');
      supabase.removeChannel(channel);
      clearInterval(syncInterval);
    };
  }, [projectId, refetch, toast, effectiveTimezone]);

  // Filter events using timezone-aware functions
  const filteredEvents = useMemo(() => {
    if (!calendlyEvents.length || !effectiveTimezone) return [];
    
    console.log('\n=== TIMEZONE-AWARE EVENT FILTERING ===');
    console.log('🌍 Using timezone:', effectiveTimezone);
    console.log('📅 Date range:', {
      from: dateRange.from.toISOString(),
      to: dateRange.to.toISOString(),
      from_user_tz: dateRange.from.toLocaleString('en-US', { timeZone: effectiveTimezone }),
      to_user_tz: dateRange.to.toLocaleString('en-US', { timeZone: effectiveTimezone })
    });
    
    const filtered = filterEventsByDateRangeWithTimezone(dateRange);
    
    console.log('📊 Filtered events result:', {
      total_events: calendlyEvents.length,
      filtered_events: filtered.length,
      timezone: effectiveTimezone
    });
    
    if (filtered.length > 0) {
      console.log('📋 Sample filtered events:', filtered.slice(0, 3).map(e => ({
        id: e.calendly_event_id,
        event_type: e.event_type_name,
        created_utc: e.created_at,
        created_user_tz: new Date(e.created_at).toLocaleString('en-US', { timeZone: effectiveTimezone }),
        status: e.status
      })));
    }
    
    return filtered;
  }, [calendlyEvents, dateRange, effectiveTimezone, filterEventsByDateRangeWithTimezone]);
  
  const chartData = useMemo(() => {
    console.log('🔄 Recalculating timezone-aware chart data');
    console.log('🔄 Events available:', filteredEvents.length);
    console.log('🔄 Using timezone:', effectiveTimezone);
    
    if (filteredEvents.length === 0) {
      console.log('⚠️ No events available for chart generation');
      return [];
    }
    
    const data = generateCallDataFromEvents(filteredEvents, dateRange, effectiveTimezone);
    console.log('🎯 Generated timezone-aware chart data:', data);
    return data;
  }, [filteredEvents, dateRange, effectiveTimezone]);

  
  // Calculate stats using timezone-aware filtering
  const callStatsData = useMemo(() => {
    if (!calendlyEvents.length || !effectiveTimezone) {
      return { totalBookings: 0, callsTaken: 0, callsCancelled: 0, showUpRate: 0 };
    }

    console.log('\n=== TIMEZONE-AWARE STATS CALCULATION ===');
    
    // Total bookings created in the date range (timezone-aware)
    const totalBookings = filterEventsByDateRangeWithTimezone(dateRange).length;
    
    // Calls taken (scheduled in the date range, not cancelled)
    const scheduledEvents = filterEventsByScheduledDateRangeWithTimezone(dateRange);
    const callsTaken = scheduledEvents.filter(call => 
      call.status.toLowerCase() !== 'cancelled'
    ).length;
    
    // Calls cancelled (cancelled events scheduled in the date range)
    const callsCancelled = scheduledEvents.filter(call => 
      call.status.toLowerCase() === 'cancelled'
    ).length;

    // Calculate show up rate
    const totalScheduled = callsTaken + callsCancelled;
    const showUpRate = totalScheduled > 0 ? Math.round((callsTaken / totalScheduled) * 100) : 0;

    console.log('📊 Timezone-aware stats:', {
      totalBookings,
      callsTaken,
      callsCancelled,
      totalScheduled,
      showUpRate,
      timezone: effectiveTimezone
    });

    return {
      totalBookings,
      callsTaken,
      callsCancelled,
      showUpRate
    };
  }, [calendlyEvents, dateRange, effectiveTimezone, filterEventsByDateRangeWithTimezone, filterEventsByScheduledDateRangeWithTimezone]);

  const recentBookings = getRecentBookings(7);
  const monthlyComparison = getMonthlyComparison();

  const totalPageViews = chartData.reduce((sum, day) => sum + day.pageViews, 0);
  const bookingRate = totalPageViews > 0 ? ((callStatsData.totalBookings / totalPageViews) * 100) : 0;
  const previousBookingRate = 0; // Simplified for now since we're focusing on current period accuracy
  
  const totalSpend = facebookData?.insights?.spend || 1500; // Use actual Facebook spend or fallback
  const costPerBooking = callStatsData.totalBookings > 0 ? (totalSpend / callStatsData.totalBookings) : 0;
  const previousCostPerBooking = 0; // Simplified for now

  console.log('\n=== FINAL TIMEZONE-AWARE COMPONENT STATE ===');
  console.log('Chart data length:', chartData.length);
  console.log('Total bookings for metrics:', callStatsData.totalBookings);
  console.log('Effective timezone being used:', effectiveTimezone);
  console.log('Profile timezone:', profile?.timezone);

  const chartKey = `${dateRange.from.toISOString()}-${dateRange.to.toISOString()}-${effectiveTimezone}-${callStatsData.totalBookings}`;

  if (!projectId) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Project Selected</h3>
        <p className="text-gray-600">Please select a project to view Calendly booking data.</p>
      </div>
    );
  }

  // Debug logging
  console.log('🔍 [BookCallFunnel] Passing timezone-aware data to LandingPageMetrics:', {
    dateRange: {
      from: dateRange.from.toISOString(),
      to: dateRange.to.toISOString()
    },
    timezone: effectiveTimezone,
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
        <div className="text-sm text-gray-500">
          Timezone: {effectiveTimezone}
        </div>
      </div>

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
