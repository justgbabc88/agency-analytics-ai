import { useCalendlyData } from "@/hooks/useCalendlyData";
import { useUserProfile } from "@/hooks/useUserProfile";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { AdvancedDateRangePicker } from "./AdvancedDateRangePicker";
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
}

export const BookCallFunnel = ({ projectId }: BookCallFunnelProps) => {
  const { calendlyEvents, getRecentBookings, getMonthlyComparison, refetch } = useCalendlyData(projectId);
  const { getUserTimezone, profile } = useUserProfile();
  const { toast } = useToast();
  
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    return {
      from: startOfDay(subDays(today, 29)),
      to: endOfDay(today)
    };
  });
  
  const userTimezone = getUserTimezone();
  
  console.log('🔄 BookCallFunnel render - Project ID:', projectId);
  console.log('🔄 User timezone from profile:', userTimezone);
  console.log('🔄 Profile timezone setting:', profile?.timezone);
  console.log('🔄 Current date range:', {
    from: format(dateRange.from, 'yyyy-MM-dd HH:mm:ss'),
    to: format(dateRange.to, 'yyyy-MM-dd HH:mm:ss')
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

  // DEBUG: Log the most recent events to help identify the missing booking
  useEffect(() => {
    if (calendlyEvents.length > 0) {
      console.log('\n=== DEBUGGING RECENT CALENDLY EVENTS ===');
      console.log('Total events in database:', calendlyEvents.length);
      
      // Sort by created_at to see most recent bookings
      const sortedByCreated = [...calendlyEvents].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      console.log('Most recent 5 events by created_at (when booked):');
      sortedByCreated.slice(0, 5).forEach((event, index) => {
        const createdAt = new Date(event.created_at);
        const scheduledAt = new Date(event.scheduled_at);
        const phoenixTime = createdAt.toLocaleString('en-US', { 
          timeZone: 'America/Phoenix',
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        
        console.log(`${index + 1}. Event ID: ${event.calendly_event_id}`);
        console.log(`   Created: ${event.created_at} (${phoenixTime} Phoenix)`);
        console.log(`   Scheduled: ${event.scheduled_at}`);
        console.log(`   Status: ${event.status}`);
        console.log(`   Event Type: ${event.event_type_name}`);
        console.log('   ---');
      });

      // Check if there are any events created in the last 2 hours
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const recentEvents = calendlyEvents.filter(event => 
        new Date(event.created_at) > twoHoursAgo
      );
      
      console.log(`Events created in the last 2 hours: ${recentEvents.length}`);
      if (recentEvents.length > 0) {
        recentEvents.forEach(event => {
          const phoenixTime = new Date(event.created_at).toLocaleString('en-US', { 
            timeZone: 'America/Phoenix',
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
          console.log(`Recent: ${event.calendly_event_id} - Created at ${phoenixTime} Phoenix`);
        });
      }

      // Check for events that might match the 12:14 PM Phoenix time booking
      console.log('\n=== LOOKING FOR 12:14 PM PHOENIX BOOKING ===');
      const today = new Date();
      const targetTime = new Date(today);
      targetTime.setHours(19, 14, 0, 0); // 12:14 PM Phoenix = ~7:14 PM UTC (depending on DST)
      
      const timeWindow = 30 * 60 * 1000; // 30 minutes window
      const possibleMatches = calendlyEvents.filter(event => {
        const eventTime = new Date(event.created_at);
        const timeDiff = Math.abs(eventTime.getTime() - targetTime.getTime());
        return timeDiff <= timeWindow;
      });
      
      console.log(`Events near 12:14 PM Phoenix time window: ${possibleMatches.length}`);
      possibleMatches.forEach(event => {
        const phoenixTime = new Date(event.created_at).toLocaleString('en-US', { 
          timeZone: 'America/Phoenix',
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        console.log(`Possible match: ${event.calendly_event_id} - Created at ${phoenixTime} Phoenix`);
      });
    }
  }, [calendlyEvents]);
  
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
      dateRangeKey
    });
  }, [dateRange, calendlyEvents.length, userTimezone, profile?.timezone, dateRangeKey]);

  const recentBookings = getRecentBookings(7);
  const monthlyComparison = getMonthlyComparison();

  const totalPageViews = chartData.reduce((sum, day) => sum + day.pageViews, 0);
  const bookingRate = totalPageViews > 0 ? ((callStats.totalBookings / totalPageViews) * 100) : 0;
  const previousBookingRate = previousStats.totalBookings > 0 ? bookingRate * 0.85 : 0;
  
  const costPerBooking = callStats.totalBookings > 0 ? (1500 / callStats.totalBookings) : 0;
  const previousCostPerBooking = previousStats.totalBookings > 0 ? costPerBooking * 1.15 : 0;

  const handleDateChange = (from: Date, to: Date) => {
    console.log('🚀 Date range changed FROM PICKER:', format(from, 'yyyy-MM-dd HH:mm:ss'), 'to', format(to, 'yyyy-MM-dd HH:mm:ss'));
    
    const normalizedFrom = startOfDay(from);
    const normalizedTo = endOfDay(to);
    
    console.log('🚀 Normalized dates:', format(normalizedFrom, 'yyyy-MM-dd HH:mm:ss'), 'to', format(normalizedTo, 'yyyy-MM-dd HH:mm:ss'));
    
    setDateRange({ 
      from: normalizedFrom, 
      to: normalizedTo 
    });
  };

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
      {/* Date Range Picker */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Book Call Funnel</h2>
        <AdvancedDateRangePicker onDateChange={handleDateChange} />
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
