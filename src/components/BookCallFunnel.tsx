import { MetricCard } from "./MetricCard";
import { ConversionChart } from "./ConversionChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCalendlyData } from "@/hooks/useCalendlyData";
import { format, subDays, startOfDay, endOfDay, isWithinInterval, parseISO, isValid, isSameDay } from "date-fns";
import { AdvancedDateRangePicker } from "./AdvancedDateRangePicker";
import { useState, useEffect } from "react";

// Generate chart data based on real Calendly events with date filtering using created_at
const generateCallDataFromEvents = (calendlyEvents: any[], dateRange: { from: Date; to: Date }) => {
  const dates = [];
  const { from: startDate, to: endDate } = dateRange;
  
  // Calculate the number of days in the range
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  console.log('=== CHART DATA GENERATION DEBUG (CREATED EVENTS) ===');
  console.log('Date range:', format(startDate, 'yyyy-MM-dd'), 'to', format(endDate, 'yyyy-MM-dd'));
  console.log('Today is:', format(new Date(), 'yyyy-MM-dd'));
  console.log('Total days in range:', daysDiff);
  console.log('Total Calendly events available:', calendlyEvents.length);
  
  // Debug: Log first few events with their actual created dates
  console.log('Sample events with created_at dates:');
  calendlyEvents.slice(0, 5).forEach((event, index) => {
    console.log(`Event ${index + 1}:`, {
      id: event.id,
      created_at: event.created_at,
      parsed_created: event.created_at ? parseISO(event.created_at) : null,
      formatted_created: event.created_at ? format(parseISO(event.created_at), 'yyyy-MM-dd HH:mm:ss') : null,
      status: event.status
    });
  });
  
  // Fix: Ensure we include all days in the range, including single day ranges
  const totalDays = daysDiff === 0 ? 1 : daysDiff + 1;
  
  for (let i = 0; i < totalDays; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    const currentDateStr = format(currentDate, 'yyyy-MM-dd');
    
    console.log(`\n--- Processing ${currentDateStr} ---`);
    
    // FIXED: Use consistent Date-based filtering instead of string comparison
    const dayStart = startOfDay(currentDate);
    const dayEnd = endOfDay(currentDate);
    
    const eventsCreatedThisDay = calendlyEvents.filter(event => {
      if (!event.created_at) {
        return false;
      }
      
      try {
        const createdDate = parseISO(event.created_at);
        if (!isValid(createdDate)) {
          return false;
        }
        
        // Use Date object comparison for consistency with metrics calculation
        const isOnThisDay = createdDate >= dayStart && createdDate <= dayEnd;
        
        if (isOnThisDay) {
          console.log('✓ Event created on this day:', {
            id: event.id,
            created_at: format(createdDate, 'yyyy-MM-dd HH:mm:ss'),
            target_date: currentDateStr,
            status: event.status,
            dayStart: format(dayStart, 'yyyy-MM-dd HH:mm:ss'),
            dayEnd: format(dayEnd, 'yyyy-MM-dd HH:mm:ss')
          });
        }
        
        return isOnThisDay;
      } catch (error) {
        console.warn('Error parsing created date:', event.created_at, error);
        return false;
      }
    });
    
    console.log(`Events created on ${currentDateStr}: ${eventsCreatedThisDay.length}`);
    
    // Calculate daily stats based on events created this day
    const callsBooked = eventsCreatedThisDay.length;
    const cancelled = eventsCreatedThisDay.filter(event => 
      event.status === 'canceled' || event.status === 'cancelled'
    ).length;
    const noShows = eventsCreatedThisDay.filter(event => event.status === 'no_show').length;
    const scheduled = eventsCreatedThisDay.filter(event => 
      event.status === 'active' || event.status === 'scheduled'
    ).length;
    const callsTaken = Math.max(0, scheduled - noShows);
    const showUpRate = scheduled > 0 ? ((callsTaken / scheduled) * 100) : 0;
    
    // Generate mock page views for the selected date range
    const pageViews = Math.floor(Math.random() * 300) + 150;
    
    const dayData = {
      date: format(currentDate, 'MMM d'),
      totalBookings: callsBooked,
      callsBooked,
      callsTaken,
      cancelled,
      showUpRate: Math.max(showUpRate, 0),
      pageViews
    };
    
    console.log(`Day data for ${currentDateStr}:`, dayData);
    dates.push(dayData);
  }
  
  console.log('\n=== FINAL CHART DATA SUMMARY (CREATED EVENTS) ===');
  console.log('Generated data points:', dates.length);
  console.log('Calls booked by day:', dates.map(d => ({ date: d.date, callsBooked: d.callsBooked })));
  console.log('Total calls booked across all days:', dates.reduce((sum, d) => sum + d.callsBooked, 0));
  console.log('Full chart data:', dates);
  
  return dates;
};

interface BookCallFunnelProps {
  projectId: string;
}

export const BookCallFunnel = ({ projectId }: BookCallFunnelProps) => {
  const { calendlyEvents, getRecentBookings, getMonthlyComparison } = useCalendlyData(projectId);
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date() // This should include today
  });
  
  // Add useEffect to force re-render when dateRange changes
  useEffect(() => {
    console.log('🔄 BookCallFunnel dateRange changed:', {
      from: format(dateRange.from, 'yyyy-MM-dd HH:mm:ss'),
      to: format(dateRange.to, 'yyyy-MM-dd HH:mm:ss'),
      totalEvents: calendlyEvents.length
    });
  }, [dateRange, calendlyEvents.length]);
  
  console.log('BookCallFunnel render - Project ID:', projectId);
  console.log('Current date range:', {
    from: format(dateRange.from, 'yyyy-MM-dd'),
    to: format(dateRange.to, 'yyyy-MM-dd')
  });
  console.log('Today is:', format(new Date(), 'yyyy-MM-dd'));
  console.log('All Calendly events:', calendlyEvents.length);
  
  // Enhanced debugging for today's events
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  
  console.log('\n=== DETAILED TODAY EVENTS ANALYSIS ===');
  console.log('Searching for events created on:', todayStr);
  
  const todayEvents = calendlyEvents.filter(event => {
    if (!event.created_at) {
      console.log('❌ Event missing created_at:', event.id);
      return false;
    }
    try {
      const createdDate = parseISO(event.created_at);
      if (!isValid(createdDate)) {
        console.log('❌ Invalid created_at date:', event.created_at);
        return false;
      }
      const createdDateStr = format(createdDate, 'yyyy-MM-dd');
      const isToday = createdDateStr === todayStr;
      
      console.log(`${isToday ? '✅' : '⏭️'} Event check:`, {
        id: event.id,
        created_at: event.created_at,
        parsed_date: createdDateStr,
        is_today: isToday,
        status: event.status
      });
      
      return isToday;
    } catch (error) {
      console.log('❌ Error parsing event:', event.id, error);
      return false;
    }
  });
  
  console.log(`\n📊 FINAL COUNT - Events created TODAY (${todayStr}):`, todayEvents.length);
  if (todayEvents.length > 0) {
    console.log('Today\'s events details:', todayEvents.map(e => ({
      id: e.id,
      created_at: e.created_at,
      scheduled_at: e.scheduled_at,
      status: e.status
    })));
  } else {
    console.log('⚠️ NO EVENTS FOUND FOR TODAY');
    console.log('All event created_at dates:', calendlyEvents.map(e => e.created_at).filter(Boolean));
  }
  
  // Calculate chart data based on real Calendly events and date range (using created_at)
  const chartData = generateCallDataFromEvents(calendlyEvents, dateRange);
  const recentBookings = getRecentBookings(7);
  const monthlyComparison = getMonthlyComparison();

  // Filter events within the selected date range for statistics (using created_at)
  // FIXED: Ensure consistent date filtering
  const filteredEvents = calendlyEvents.filter(event => {
    if (!event.created_at) return false;
    
    try {
      const createdDate = parseISO(event.created_at);
      if (!isValid(createdDate)) return false;
      
      // Use consistent Date object comparison
      const rangeStart = startOfDay(dateRange.from);
      const rangeEnd = endOfDay(dateRange.to);
      
      const isInRange = createdDate >= rangeStart && createdDate <= rangeEnd;
      
      if (isInRange) {
        console.log(`✅ Event IN RANGE for metrics:`, {
          id: event.id,
          created_at: format(createdDate, 'yyyy-MM-dd HH:mm:ss'),
          range_start: format(rangeStart, 'yyyy-MM-dd HH:mm:ss'),
          range_end: format(rangeEnd, 'yyyy-MM-dd HH:mm:ss'),
          status: event.status
        });
      }
      
      return isInRange;
    } catch (error) {
      console.warn('Error filtering event by created date:', event, error);
      return false;
    }
  });

  console.log('\n=== METRICS CALCULATION ===');
  console.log('Filtered events for metrics (by created_at):', filteredEvents.length);
  console.log('Filtered events sample:', filteredEvents.slice(0, 5).map(e => ({ 
    id: e.id, 
    created_at: e.created_at, 
    scheduled_at: e.scheduled_at,
    status: e.status 
  })));

  // Calculate call statistics from filtered data
  const callStats = filteredEvents.reduce((stats, event) => {
    stats.totalBookings++;
    switch (event.status) {
      case 'active':
      case 'scheduled':
        stats.scheduled++;
        break;
      case 'canceled':
      case 'cancelled':
        stats.cancelled++;
        break;
      case 'no_show':
        stats.noShows++;
        break;
      default:
        stats.other++;
    }
    return stats;
  }, { totalBookings: 0, scheduled: 0, cancelled: 0, noShows: 0, other: 0 });

  console.log('Calculated call stats:', callStats);

  // Calculate calls taken (assuming scheduled calls that aren't no-shows are taken)
  const callsTaken = callStats.scheduled - callStats.noShows;
  
  // Calculate show up rate
  const showUpRate = callStats.scheduled > 0 ? ((callsTaken / callStats.scheduled) * 100) : 0;

  // Calculate previous period data for comparison (using created_at)
  const last30Days = calendlyEvents.filter(event => {
    if (!event.created_at) return false;
    try {
      const createdDate = parseISO(event.created_at);
      const thirtyDaysAgo = subDays(new Date(), 30);
      return isValid(createdDate) && createdDate >= thirtyDaysAgo;
    } catch (error) {
      return false;
    }
  });

  const previous30Days = calendlyEvents.filter(event => {
    if (!event.created_at) return false;
    try {
      const createdDate = parseISO(event.created_at);
      const thirtyDaysAgo = subDays(new Date(), 30);
      const sixtyDaysAgo = subDays(new Date(), 60);
      return isValid(createdDate) && createdDate >= sixtyDaysAgo && createdDate < thirtyDaysAgo;
    } catch (error) {
      return false;
    }
  });

  // Calculate previous period stats for comparison
  const previousStats = previous30Days.reduce((stats, event) => {
    stats.totalBookings++;
    switch (event.status) {
      case 'active':
      case 'scheduled':
        stats.scheduled++;
        break;
      case 'canceled':
      case 'cancelled':
        stats.cancelled++;
        break;
      case 'no_show':
        stats.noShows++;
        break;
    }
    return stats;
  }, { totalBookings: 0, scheduled: 0, cancelled: 0, noShows: 0 });

  const previousCallsTaken = previousStats.scheduled - previousStats.noShows;
  const previousShowUpRate = previousStats.scheduled > 0 ? ((previousCallsTaken / previousStats.scheduled) * 100) : 0;

  // Calculate booking metrics
  const totalPageViews = chartData.reduce((sum, day) => sum + day.pageViews, 0);
  const bookingRate = totalPageViews > 0 ? ((callStats.totalBookings / totalPageViews) * 100) : 0;
  const previousBookingRate = previous30Days.length > 0 ? bookingRate * 0.85 : 0; // Mock previous rate
  
  const costPerBooking = callStats.totalBookings > 0 ? (1500 / callStats.totalBookings) : 0; // Mock cost calculation
  const previousCostPerBooking = previous30Days.length > 0 ? costPerBooking * 1.15 : 0;

  const handleDateChange = (from: Date, to: Date) => {
    console.log('🚀 Date range changed FROM PICKER:', format(from, 'yyyy-MM-dd HH:mm:ss'), 'to', format(to, 'yyyy-MM-dd HH:mm:ss'));
    console.log('Today is:', format(new Date(), 'yyyy-MM-dd'));
    console.log('Is today in new range?', format(new Date(), 'yyyy-MM-dd') >= format(from, 'yyyy-MM-dd') && format(new Date(), 'yyyy-MM-dd') <= format(to, 'yyyy-MM-dd'));
    
    // Force component re-render by creating new objects
    setDateRange({ 
      from: new Date(from.getTime()), 
      to: new Date(to.getTime()) 
    });
  };

  console.log('\n=== FINAL COMPONENT STATE ===');
  console.log('Chart data length:', chartData.length);
  console.log('Total bookings for metrics:', filteredEvents.length);
  console.log('Chart data summary:', chartData.map(d => ({ date: d.date, bookings: d.callsBooked })));

  // Show a message if no project is selected
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

      {/* Landing Page */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Landing Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard title="Page Views" value={totalPageViews} previousValue={Math.floor(totalPageViews * 0.9)} />
            <MetricCard 
              title="Booking Rate" 
              value={bookingRate} 
              previousValue={previousBookingRate} 
              format="percentage" 
            />
            <MetricCard 
              title="Total Bookings" 
              value={callStats.totalBookings} 
              previousValue={previousStats.totalBookings}
              description="Events created in date range"
            />
            <MetricCard 
              title="Cost Per Booking" 
              value={costPerBooking} 
              previousValue={previousCostPerBooking} 
              format="currency" 
            />
          </div>
        </CardContent>
      </Card>

      {/* Call Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Call Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard 
              title="Total Bookings" 
              value={callStats.totalBookings} 
              previousValue={previousStats.totalBookings}
              description="Events created in date range"
            />
            <MetricCard 
              title="Calls Taken" 
              value={callsTaken} 
              previousValue={previousCallsTaken}
              description="Completed calls"
            />
            <MetricCard 
              title="Calls Cancelled" 
              value={callStats.cancelled} 
              previousValue={previousStats.cancelled}
              description="Cancelled bookings"
            />
            <MetricCard 
              title="Show Up Rate" 
              value={showUpRate} 
              previousValue={previousShowUpRate} 
              format="percentage"
              description="% of scheduled calls attended"
            />
          </div>
          <ConversionChart 
            key={`calls-${dateRange.from.getTime()}-${dateRange.to.getTime()}`}
            data={chartData}
            title="Call Performance Trends"
            metrics={['callsBooked', 'cancelled']}
          />
        </CardContent>
      </Card>

      {/* Sales Conversion */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Sales Conversion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard title="Close Rate" value={28.4} previousValue={25.1} format="percentage" />
            <MetricCard title="Total Closes" value={135} previousValue={91} />
            <MetricCard title="Revenue" value={405000} previousValue={273000} format="currency" />
            <MetricCard title="ROAS" value={8.2} previousValue={6.8} />
          </div>
          <ConversionChart 
            key={`sales-${dateRange.from.getTime()}-${dateRange.to.getTime()}`}
            data={chartData}
            title="Sales Performance"
            metrics={['showUpRate']}
          />
        </CardContent>
      </Card>
    </div>
  );
};
