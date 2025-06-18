
import { useCalendlyData } from "@/hooks/useCalendlyData";
import { useUserProfile } from "@/hooks/useUserProfile";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { LandingPageMetrics } from "./LandingPageMetrics";
import { CallStatsMetrics } from "./CallStatsMetrics";
import { SalesConversionMetrics } from "./SalesConversionMetrics";
import { useState, useEffect, useMemo } from "react";
import { generateCallDataFromEvents } from "@/utils/chartDataGeneration";
import { useCallStatsCalculations } from "@/hooks/useCallStatsCalculations";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BookCallFunnelProps {
  projectId: string;
  dateRange: { from: Date; to: Date };
}

export const BookCallFunnel = ({ projectId, dateRange }: BookCallFunnelProps) => {
  const { calendlyEvents, getRecentBookings, getMonthlyComparison, refetch } = useCalendlyData(projectId);
  const { getUserTimezone, profile } = useUserProfile();
  const { toast } = useToast();
  
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

  // DEBUG: Check if today is included in the date range
  useEffect(() => {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    
    const isTodayInRange = todayStart >= dateRange.from && todayEnd <= dateRange.to;
    
    console.log('\n=== DATE RANGE ANALYSIS ===');
    console.log('Today (start of day):', format(todayStart, 'yyyy-MM-dd HH:mm:ss'));
    console.log('Today (end of day):', format(todayEnd, 'yyyy-MM-dd HH:mm:ss'));
    console.log('Date range from:', format(dateRange.from, 'yyyy-MM-dd HH:mm:ss'));
    console.log('Date range to:', format(dateRange.to, 'yyyy-MM-dd HH:mm:ss'));
    console.log('Is today included in date range?', isTodayInRange);
    
    if (!isTodayInRange) {
      console.log('⚠️ TODAY IS NOT INCLUDED IN THE CURRENT DATE RANGE!');
      console.log('This is why your recent booking is not showing up.');
      console.log('You need to adjust the date range to include today.');
    }
  }, [dateRange]);

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
        
        // Refresh data after gap sync with a longer delay
        setTimeout(() => {
          console.log('🔄 Refreshing data after manual sync...');
          refetch();
        }, 3000);
      } catch (error) {
        console.error('Manual gap sync failed:', error);
      }
    };

    // Trigger sync immediately and then every 30 seconds for the first 5 minutes
    triggerManualSync();
    
    const syncInterval = setInterval(() => {
      console.log('🔄 Periodic sync check...');
      triggerManualSync();
    }, 30000);

    // Clear interval after 5 minutes
    const clearSyncTimeout = setTimeout(() => {
      clearInterval(syncInterval);
      console.log('🛑 Stopping periodic sync - switching to real-time only');
    }, 5 * 60 * 1000);

    return () => {
      console.log('🎧 Cleaning up real-time listener and sync intervals...');
      supabase.removeChannel(channel);
      clearInterval(syncInterval);
      clearTimeout(clearSyncTimeout);
    };
  }, [projectId, refetch, toast]);

  // DEBUG: Enhanced logging for today's events and timezone handling
  useEffect(() => {
    if (calendlyEvents.length > 0) {
      console.log('\n=== DEBUGGING TODAY\'S BOOKINGS ===');
      console.log('Total events in database:', calendlyEvents.length);
      console.log('User timezone:', userTimezone);
      console.log('Today\'s date range for filtering:', {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString()
      });
      
      // Check events created today
      const today = new Date();
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);
      
      console.log('Today boundaries (local):', {
        start: todayStart.toISOString(),
        end: todayEnd.toISOString()
      });
      
      // Find events created today
      const todaysEvents = calendlyEvents.filter(event => {
        const createdAt = new Date(event.created_at);
        const isToday = createdAt >= todayStart && createdAt <= todayEnd;
        
        if (isToday) {
          console.log('✅ Event created today:', {
            id: event.calendly_event_id,
            created_at: event.created_at,
            scheduled_at: event.scheduled_at,
            status: event.status,
            event_type: event.event_type_name,
            createdAtLocal: createdAt.toLocaleString()
          });
        }
        
        return isToday;
      });
      
      console.log(`Found ${todaysEvents.length} events created today`);
      
      // Check the most recent events to see if our test booking is there
      const recentEvents = [...calendlyEvents]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);
      
      console.log('Most recent 5 events:');
      recentEvents.forEach((event, index) => {
        console.log(`${index + 1}. ${event.calendly_event_id} - Created: ${event.created_at} - Type: ${event.event_type_name}`);
      });
      
      // Check if we have the test booking from justin.babcock98@gmail.com
      const testBooking = calendlyEvents.find(event => 
        event.invitee_email === 'justin.babcock98@gmail.com' || 
        event.calendly_event_id?.includes('b3135d95-c8f9-436d-b4f8-90e347d5aea2')
      );
      
      if (testBooking) {
        console.log('🎯 Found test booking:', {
          id: testBooking.calendly_event_id,
          created_at: testBooking.created_at,
          scheduled_at: testBooking.scheduled_at,
          status: testBooking.status,
          invitee_email: testBooking.invitee_email,
          createdAtLocal: new Date(testBooking.created_at).toLocaleString(),
          isInToday: new Date(testBooking.created_at) >= todayStart && new Date(testBooking.created_at) <= todayEnd,
          isInDateRange: new Date(testBooking.created_at) >= dateRange.from && new Date(testBooking.created_at) <= dateRange.to
        });
      } else {
        console.log('❌ Test booking not found in calendlyEvents array');
      }
    }
  }, [calendlyEvents, dateRange, userTimezone]);
  
  // Create a more specific dependency key that includes both timezone sources
  const dateRangeKey = useMemo(() => {
    const fromISO = dateRange.from.toISOString();
    const toISO = dateRange.to.toISOString();
    const profileTimezone = profile?.timezone || 'UTC';
    const effectiveTimezone = userTimezone || 'UTC';
    return `${fromISO}-${toISO}-${profileTimezone}-${effectiveTimezone}-${calendlyEvents.length}`;
  }, [dateRange.from, dateRange.to, userTimezone, profile?.timezone, calendlyEvents.length]);
  
  const chartData = useMemo(() => {
    console.log('🔄 Recalculating chart data due to dependency change');
    console.log('🔄 Date range key:', dateRangeKey);
    console.log('🔄 Events available:', calendlyEvents.length);
    console.log('🔄 Using timezone:', userTimezone);
    console.log('🔄 Profile loaded:', !!profile);
    
    if (calendlyEvents.length === 0) {
      console.log('⚠️ No events available for chart generation');
      return [];
    }
    
    const data = generateCallDataFromEvents(calendlyEvents, dateRange, userTimezone);
    console.log('🎯 Generated chart data:', data);
    return data;
  }, [calendlyEvents, dateRangeKey, userTimezone]);
  
  const {
    callStats,
    previousStats,
    callsTaken,
    showUpRate,
    previousCallsTaken,
    previousShowUpRate,
  } = useCallStatsCalculations(calendlyEvents, dateRange, userTimezone);
  
  useEffect(() => {
    console.log('🔄 BookCallFunnel dependencies changed:', {
      from: format(dateRange.from, 'yyyy-MM-dd HH:mm:ss'),
      to: format(dateRange.to, 'yyyy-MM-dd HH:mm:ss'),
      totalEvents: calendlyEvents.length,
      userTimezone,
      profileTimezone: profile?.timezone,
      dateRangeKey,
      totalBookings: callStats.totalBookings
    });
  }, [dateRange, calendlyEvents.length, userTimezone, profile?.timezone, dateRangeKey, callStats.totalBookings]);

  const recentBookings = getRecentBookings(7);
  const monthlyComparison = getMonthlyComparison();

  const totalPageViews = chartData.reduce((sum, day) => sum + day.pageViews, 0);
  const bookingRate = totalPageViews > 0 ? ((callStats.totalBookings / totalPageViews) * 100) : 0;
  const previousBookingRate = previousStats.totalBookings > 0 ? bookingRate * 0.85 : 0;
  
  const costPerBooking = callStats.totalBookings > 0 ? (1500 / callStats.totalBookings) : 0;
  const previousCostPerBooking = previousStats.totalBookings > 0 ? costPerBooking * 1.15 : 0;

  console.log('\n=== FINAL COMPONENT STATE ===');
  console.log('Chart data length:', chartData.length);
  console.log('Total bookings for metrics:', callStats.totalBookings);
  console.log('Date range key:', dateRangeKey);
  console.log('User timezone being used:', userTimezone);
  console.log('Today\'s events should be visible with timezone:', userTimezone);

  const chartKey = `${dateRangeKey}-${callStats.totalBookings}`;

  if (!projectId) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Project Selected</h3>
        <p className="text-gray-600">Please select a project to view Calendly booking data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header without date picker */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Book Call Funnel</h2>
      </div>

      <LandingPageMetrics
        totalPageViews={totalPageViews}
        bookingRate={bookingRate}
        previousBookingRate={previousBookingRate}
        totalBookings={callStats.totalBookings}
        previousTotalBookings={previousStats.totalBookings}
        costPerBooking={costPerBooking}
        previousCostPerBooking={previousCostPerBooking}
      />

      <CallStatsMetrics
        totalBookings={callStats.totalBookings}
        previousTotalBookings={previousStats.totalBookings}
        callsTaken={callsTaken}
        previousCallsTaken={previousCallsTaken}
        cancelled={callStats.cancelled}
        previousCancelled={previousStats.cancelled}
        showUpRate={showUpRate}
        previousShowUpRate={previousShowUpRate}
        chartData={chartData}
        chartKey={chartKey}
      />

      <SalesConversionMetrics
        chartData={chartData}
        chartKey={chartKey}
      />
    </div>
  );
};
