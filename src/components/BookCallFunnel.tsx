
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

interface BookCallFunnelProps {
  projectId: string;
}

export const BookCallFunnel = ({ projectId }: BookCallFunnelProps) => {
  const { calendlyEvents, getRecentBookings, getMonthlyComparison } = useCalendlyData(projectId);
  const { getUserTimezone, profile } = useUserProfile();
  
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    return {
      from: startOfDay(subDays(today, 29)),
      to: endOfDay(today)
    };
  });
  
  const userTimezone = getUserTimezone();
  
  console.log('BookCallFunnel render - Project ID:', projectId);
  console.log('User timezone:', userTimezone);
  console.log('Profile timezone:', profile?.timezone);
  console.log('Current date range:', {
    from: format(dateRange.from, 'yyyy-MM-dd HH:mm:ss'),
    to: format(dateRange.to, 'yyyy-MM-dd HH:mm:ss')
  });
  console.log('All Calendly events:', calendlyEvents.length);
  
  // Include both timezone and profile changes in the dependency key
  const dateRangeKey = useMemo(() => {
    const fromISO = dateRange.from.toISOString();
    const toISO = dateRange.to.toISOString();
    const timezoneKey = userTimezone || 'UTC';
    const profileTimezoneKey = profile?.timezone || 'UTC';
    return `${fromISO}-${toISO}-${timezoneKey}-${profileTimezoneKey}`;
  }, [dateRange.from, dateRange.to, userTimezone, profile?.timezone]);
  
  const chartData = useMemo(() => {
    console.log('🔄 Recalculating chart data due to dependency change');
    console.log('Date range key:', dateRangeKey);
    console.log('Events available:', calendlyEvents.length);
    console.log('Using timezone:', userTimezone);
    console.log('Profile loaded:', !!profile);
    
    const data = generateCallDataFromEvents(calendlyEvents, dateRange, userTimezone);
    console.log('Generated chart data:', data);
    return data;
  }, [calendlyEvents, dateRangeKey]);
  
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
      profileTimezone: profile?.timezone
    });
  }, [dateRange, calendlyEvents.length, userTimezone, profile?.timezone]);

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
