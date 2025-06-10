

import { useCalendlyData } from "@/hooks/useCalendlyData";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { AdvancedDateRangePicker } from "./AdvancedDateRangePicker";
import { LandingPageMetrics } from "./LandingPageMetrics";
import { CallStatsMetrics } from "./CallStatsMetrics";
import { SalesConversionMetrics } from "./SalesConversionMetrics";
import { useState, useEffect, useMemo } from "react";
import { generateCallDataFromEvents } from "@/utils/chartDataGeneration";
import { useCallStatsCalculations } from "@/hooks/useCallStatsCalculations";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Zap } from "lucide-react";

interface BookCallFunnelProps {
  projectId: string;
}

export const BookCallFunnel = ({ projectId }: BookCallFunnelProps) => {
  const { calendlyEvents, getRecentBookings, getMonthlyComparison } = useCalendlyData(projectId);
  
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    return {
      from: startOfDay(subDays(today, 29)),
      to: endOfDay(today)
    };
  });

  // Extract time values to simple variables to avoid TypeScript issues
  const fromTime = dateRange.from.getTime();
  const toTime = dateRange.to.getTime();
  const fromIso = dateRange.from.toISOString();
  const toIso = dateRange.to.toISOString();

  // Fetch tracking pixel for this project
  const { data: trackingPixel, isLoading: pixelLoading } = useQuery({
    queryKey: ['tracking-pixel', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      
      const { data, error } = await supabase
        .from('tracking_pixels')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.log('No tracking pixel found for project:', projectId);
        return null;
      }

      return data;
    },
    enabled: !!projectId,
  });

  // Fetch tracking events for pixel pages
  const { data: trackingEvents } = useQuery({
    queryKey: ['tracking-events', trackingPixel?.pixel_id, fromTime, toTime],
    queryFn: async () => {
      if (!trackingPixel?.pixel_id) return [];
      
      const { data, error } = await supabase
        .from('tracking_events')
        .select('*')
        .eq('pixel_id', trackingPixel.pixel_id)
        .eq('event_type', 'page_view')
        .gte('created_at', fromIso)
        .lte('created_at', toIso)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching tracking events:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!trackingPixel?.pixel_id,
  });
  
  console.log('BookCallFunnel render - Project ID:', projectId);
  console.log('Current date range:', {
    from: format(dateRange.from, 'yyyy-MM-dd HH:mm:ss'),
    to: format(dateRange.to, 'yyyy-MM-dd HH:mm:ss')
  });
  console.log('All Calendly events:', calendlyEvents.length);
  console.log('Tracking pixel:', trackingPixel);
  console.log('Tracking events:', trackingEvents?.length || 0);
  
  const chartData = useMemo(() => {
    console.log('🔄 Recalculating chart data due to dependency change');
    console.log('Events available:', calendlyEvents.length);
    
    const data = generateCallDataFromEvents(calendlyEvents, dateRange);
    console.log('Generated chart data:', data);
    return data;
  }, [calendlyEvents, fromTime, toTime]);
  
  const {
    callStats,
    previousStats,
    callsTaken,
    showUpRate,
    previousCallsTaken,
    previousShowUpRate,
  } = useCallStatsCalculations(calendlyEvents, dateRange);
  
  useEffect(() => {
    console.log('🔄 BookCallFunnel dateRange changed:', {
      from: format(dateRange.from, 'yyyy-MM-dd HH:mm:ss'),
      to: format(dateRange.to, 'yyyy-MM-dd HH:mm:ss'),
      totalEvents: calendlyEvents.length
    });
  }, [dateRange, calendlyEvents.length]);

  const recentBookings = getRecentBookings(7);
  const monthlyComparison = getMonthlyComparison();

  // Calculate page views from tracking events or fallback to chart data
  const totalPageViews = useMemo(() => {
    if (trackingEvents && trackingEvents.length > 0) {
      return trackingEvents.length;
    }
    // Fallback to chart data if no tracking events
    return chartData.reduce((sum, day) => sum + day.pageViews, 0);
  }, [trackingEvents, chartData]);

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
  console.log('Total page views (from pixel):', totalPageViews);

  const chartKey = `${fromTime}-${toTime}-${callStats.totalBookings}`;

  if (!projectId) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Project Selected</h3>
        <p className="text-gray-600">Please select a project to view Calendly booking data.</p>
      </div>
    );
  }

  // Show pixel configuration message if no pixel is configured
  if (!pixelLoading && !trackingPixel) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Book Call Funnel</h2>
          <AdvancedDateRangePicker onDateChange={handleDateChange} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Configure Tracking Pixel
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            <Zap className="h-16 w-16 mx-auto text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Setup Required</h3>
            <p className="text-gray-600 mb-4">
              To view accurate landing page metrics, please configure your tracking pixel first.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Go to the "Tracking" tab to set up your pixel and start collecting page view data from your funnel pages.
            </p>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Configure Tracking Pixel
            </Button>
          </CardContent>
        </Card>
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

export default BookCallFunnel;

