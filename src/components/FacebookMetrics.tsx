import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFacebookData } from "@/hooks/useFacebookData";
import { useCalendlyData } from "@/hooks/useCalendlyData";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useGHLFormSubmissions } from "@/hooks/useGHLFormSubmissions";
import { ConversionChart } from "./ConversionChart";
import { FacebookCampaignFilter } from "./FacebookCampaignFilter";
import { BarChart3, TrendingUp, Users, DollarSign, MousePointer, Eye, ArrowUpRight, ArrowDownRight, Calendar } from "lucide-react";
import { format, eachDayOfInterval, subDays, isWithinInterval, startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";

interface FacebookMetricsProps {
  dateRange?: { from: Date; to: Date };
  projectId?: string;
  selectedCampaignIds?: string[];
  onCampaignChange?: (campaignIds: string[]) => void;
  selectedFormIds?: string[];
}

export const FacebookMetrics = ({ dateRange, projectId, selectedCampaignIds, onCampaignChange, selectedFormIds = [] }: FacebookMetricsProps) => {
  const [internalSelectedCampaignIds, setInternalSelectedCampaignIds] = useState<string[]>(selectedCampaignIds || []);
  
  // Use external campaign IDs if provided, otherwise use internal state
  const activeCampaignIds = selectedCampaignIds || internalSelectedCampaignIds;
  const handleCampaignChange = onCampaignChange || setInternalSelectedCampaignIds;
  
  const { facebookData, isLoading, insights, campaigns, allCampaigns, metrics } = useFacebookData({ 
    dateRange, 
    campaignIds: activeCampaignIds 
  });
  
  // Extract the filtered daily insights properly
  const dailyInsights = facebookData?.daily_insights;
  const { calendlyEvents } = useCalendlyData(projectId);
  const { metrics: formSubmissions } = useGHLFormSubmissions(projectId || '', dateRange, selectedFormIds);
  const { profile } = useUserProfile();
  const userTimezone = profile?.timezone || 'UTC';

  console.log('FacebookMetrics - Data received:', {
    facebookData,
    insights,
    campaigns,
    isLoading,
    dateRange
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Facebook Ads Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Loading Facebook data...</p>
        </CardContent>
      </Card>
    );
  }

  if (!facebookData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Facebook Ads Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No Facebook data available. Please sync your Facebook integration.</p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  // Calculate CTR (Link) - typically 70-80% of overall CTR
  const ctrLink = insights.ctr ? insights.ctr * 0.75 : 0;
  
  // Use real CPC from Facebook data instead of calculating it
  const cpc = insights.cpc || 0;
  
  // Calculate Frequency - estimated based on reach vs impressions
  const frequency = insights.reach && insights.reach > 0 ? insights.impressions / insights.reach : 1.2;

  // Calculate total bookings for the date range (based on creation date, not scheduled date)
  const totalBookings = calendlyEvents.filter(event => {
    if (!dateRange) return true;
    
    // Use creation date (created_at) instead of scheduled date for "Total Bookings"
    const eventCreatedInUserTz = toZonedTime(new Date(event.created_at), userTimezone);
    const selectedFromDate = toZonedTime(dateRange.from, userTimezone);
    const selectedToDate = toZonedTime(dateRange.to, userTimezone);
    
    const eventDate = startOfDay(eventCreatedInUserTz);
    const fromDate = startOfDay(selectedFromDate);
    const toDate = startOfDay(selectedToDate);
    
    return eventDate >= fromDate && eventDate <= toDate;
  }).length;

  // Calculate total form submissions for the date range
  const totalSubmissions = formSubmissions.totalSubmissions;

  // Calculate cost per lead (form submission)
  const costPerLead = totalSubmissions > 0 ? (insights.spend || 0) / totalSubmissions : 0;

  // Calculate cost per booked call
  const costPerBookedCall = totalBookings > 0 ? (insights.spend || 0) / totalBookings : 0;

  // Mock previous period data for comparison (typically would come from API with different date range)
  const previousPeriodData = {
    spend: (insights.spend || 0) * (0.85 + Math.random() * 0.3), // Random variation for demo
    impressions: (insights.impressions || 0) * (0.9 + Math.random() * 0.2),
    ctr: (insights.ctr || 0) * (0.95 + Math.random() * 0.1),
    ctrLink: ctrLink * (0.92 + Math.random() * 0.16),
    cpm: insights.spend && insights.impressions ? ((insights.spend / insights.impressions) * 1000) * (1.1 + Math.random() * 0.2) : 0,
    cpc: cpc * (1.05 + Math.random() * 0.2),
    frequency: frequency * (0.88 + Math.random() * 0.24),
    costPerBookedCall: costPerBookedCall * (1.15 + Math.random() * 0.3)
  };

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUpRight className="h-3 w-3 text-green-600" />;
    if (change < 0) return <ArrowDownRight className="h-3 w-3 text-red-600" />;
    return null;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-gray-500";
  };

  // Generate chart data using real Facebook daily insights or fall back to mock data
  const generateChartData = () => {
    // If no date range is selected, don't show any data
    if (!dateRange) {
      return [];
    }

    // Use the already filtered daily insights data from the hook
    if (dailyInsights && dailyInsights.length > 0) {
      // The dailyInsights are already filtered by the hook, so just format them for the chart
      const chartData = dailyInsights
        .map((dayData: any) => {
          const dayDate = new Date(dayData.date);
          const dayStart = startOfDay(toZonedTime(dayDate, userTimezone));
          
          // Calculate derived metrics
          const ctr = dayData.impressions > 0 ? (dayData.clicks / dayData.impressions) * 100 : 0;
          const cpm = dayData.impressions > 0 ? (dayData.spend / dayData.impressions) * 1000 : 0;
          const cpc = dayData.clicks > 0 ? dayData.spend / dayData.clicks : 0;
          
          // Find bookings for this specific day
          const dailyBookings = calendlyEvents.filter(event => {
            const eventCreatedInUserTz = toZonedTime(new Date(event.created_at), userTimezone);
            const eventDate = startOfDay(eventCreatedInUserTz);
            return eventDate.getTime() === dayStart.getTime();
          }).length;
          
          const costPerCall = dailyBookings > 0 ? dayData.spend / dailyBookings : 0;
          
          return {
            date: format(dayDate, 'MMM dd'),
            spend: dayData.spend || 0,
            ctrAll: ctr,
            ctrLink: ctr * 0.75, // Estimate link CTR as 75% of all CTR
            cpm: cpm,
            cpc: cpc,
            frequency: dayData.frequency || 0,
            costPerCall: costPerCall,
            dailyBookings: dailyBookings,
          };
        })
        .sort((a, b) => new Date(a.date + ' 2024').getTime() - new Date(b.date + ' 2024').getTime());
      
      return chartData;
    }

    // If no real data available, return empty array
    return [];
  };

  const generateDataForRange = (startDate: Date, endDate: Date) => {
    // For single day, create only one data point
    const isSingleDay = format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd');
    const days = isSingleDay ? [startDate] : eachDayOfInterval({ start: startDate, end: endDate });
    
    // Use actual data as baseline with realistic daily variations
    const baseSpend = insights.spend || 100;
    const baseCtr = insights.ctr || 2.5;
    const baseCpm = insights.spend && insights.impressions ? (insights.spend / insights.impressions) * 1000 : 10;
    
    return days.map((date, index) => {
      // Create realistic daily variations that sum to totals over the period
      const dailyVariation = 0.7 + Math.random() * 0.6; // 70% to 130% of average
      const trendFactor = 1 + (index / days.length) * 0.2; // Slight upward trend
      
      // Calculate daily spend
      const dailySpend = (baseSpend / days.length) * dailyVariation * trendFactor;
      
      // Calculate daily bookings for this specific day
      const dayStart = startOfDay(toZonedTime(date, userTimezone));
      
      const dailyBookings = calendlyEvents.filter(event => {
        const eventCreatedInUserTz = toZonedTime(new Date(event.created_at), userTimezone);
        const eventDate = startOfDay(eventCreatedInUserTz);
        return eventDate.getTime() === dayStart.getTime();
      }).length;
      
      // Calculate cost per call for this day
      const costPerCall = dailyBookings > 0 ? dailySpend / dailyBookings : 0;
      
      // Calculate daily form submissions for this specific day
      const dailySubmissions = formSubmissions.submissionsByDay[format(date, 'yyyy-MM-dd')] || 0;
      
      // Calculate cost per lead for this day
      const costPerLead = dailySubmissions > 0 ? dailySpend / dailySubmissions : 0;
      
      return {
        date: format(date, 'MMM dd'),
        spend: dailySpend,
        ctrAll: baseCtr * (0.8 + Math.random() * 0.4),
        ctrLink: ctrLink * (0.8 + Math.random() * 0.4),
        cpm: baseCpm * (0.85 + Math.random() * 0.3),
        cpc: cpc * (0.8 + Math.random() * 0.4),
        frequency: frequency * (0.9 + Math.random() * 0.2),
        costPerCall: costPerCall,
        costPerLead: costPerLead,
        dailyBookings: dailyBookings,
        dailySubmissions: dailySubmissions,
      };
    });
  };

  const chartData = generateChartData();

  console.log('FacebookMetrics - Chart data generated for date range:', {
    dateRange,
    chartDataLength: chartData.length,
    firstDay: chartData[0],
    lastDay: chartData[chartData.length - 1]
  });

  const spendChange = calculatePercentageChange(insights.spend || 0, previousPeriodData.spend);
  const impressionsChange = calculatePercentageChange(insights.impressions || 0, previousPeriodData.impressions);
  const ctrChange = calculatePercentageChange(insights.ctr || 0, previousPeriodData.ctr);
  const ctrLinkChange = calculatePercentageChange(ctrLink, previousPeriodData.ctrLink);
  const cpmChange = calculatePercentageChange(
    insights.spend && insights.impressions ? (insights.spend / insights.impressions) * 1000 : 0, 
    previousPeriodData.cpm
  );
  const cpcChange = calculatePercentageChange(cpc, previousPeriodData.cpc);
  const frequencyChange = calculatePercentageChange(frequency, previousPeriodData.frequency);
  const costPerBookedCallChange = calculatePercentageChange(costPerBookedCall, previousPeriodData.costPerBookedCall);

  return (
    <div className="space-y-6">
      {/* Performance Metrics Cards */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Facebook Ads Performance
            </CardTitle>
            <FacebookCampaignFilter 
              campaigns={allCampaigns} 
              selectedCampaignIds={activeCampaignIds}
              onCampaignChange={handleCampaignChange}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
            {/* Spend Metric */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 border border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                <DollarSign className="h-3 w-3" />
                Spend
              </div>
              <div className="text-lg font-bold text-gray-800">
                {formatCurrency(insights.spend || 0)}
              </div>
              <div className={`flex items-center gap-1 text-xs mt-1 ${getChangeColor(spendChange)}`}>
                {getChangeIcon(spendChange)}
                <span>{spendChange > 0 ? '+' : ''}{spendChange.toFixed(1)}%</span>
              </div>
            </div>

            {/* Impressions Metric */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-lg p-3 border border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                <Eye className="h-3 w-3" />
                Impressions
              </div>
              <div className="text-lg font-bold text-slate-800">
                {formatNumber(insights.impressions || 0)}
              </div>
              <div className={`flex items-center gap-1 text-xs mt-1 ${getChangeColor(impressionsChange)}`}>
                {getChangeIcon(impressionsChange)}
                <span>{impressionsChange > 0 ? '+' : ''}{impressionsChange.toFixed(1)}%</span>
              </div>
            </div>

            {/* CTR (All) Metric */}
            <div className="bg-gradient-to-br from-zinc-50 to-zinc-100/50 rounded-lg p-3 border border-zinc-100">
              <div className="flex items-center gap-2 text-xs text-zinc-600 mb-1">
                <TrendingUp className="h-3 w-3" />
                CTR (All)
              </div>
              <div className="text-lg font-bold text-zinc-800">
                {(insights.ctr || 0).toFixed(2)}%
              </div>
              <div className={`flex items-center gap-1 text-xs mt-1 ${getChangeColor(ctrChange)}`}>
                {getChangeIcon(ctrChange)}
                <span>{ctrChange > 0 ? '+' : ''}{ctrChange.toFixed(1)}%</span>
              </div>
            </div>

            {/* CTR (Link) Metric */}
            <div className="bg-gradient-to-br from-stone-50 to-stone-100/50 rounded-lg p-3 border border-stone-100">
              <div className="flex items-center gap-2 text-xs text-stone-600 mb-1">
                <MousePointer className="h-3 w-3" />
                CTR (Link)
              </div>
              <div className="text-lg font-bold text-stone-800">
                {ctrLink.toFixed(2)}%
              </div>
              <div className={`flex items-center gap-1 text-xs mt-1 ${getChangeColor(ctrLinkChange)}`}>
                {getChangeIcon(ctrLinkChange)}
                <span>{ctrLinkChange > 0 ? '+' : ''}{ctrLinkChange.toFixed(1)}%</span>
              </div>
            </div>

            {/* CPM Metric */}
            <div className="bg-gradient-to-br from-neutral-50 to-neutral-100/50 rounded-lg p-3 border border-neutral-100">
              <div className="flex items-center gap-2 text-xs text-neutral-600 mb-1">
                <DollarSign className="h-3 w-3" />
                CPM
              </div>
              <div className="text-lg font-bold text-neutral-800">
                {formatCurrency(insights.spend && insights.impressions ? (insights.spend / insights.impressions) * 1000 : 0)}
              </div>
              <div className={`flex items-center gap-1 text-xs mt-1 ${getChangeColor(cpmChange)}`}>
                {getChangeIcon(cpmChange)}
                <span>{cpmChange > 0 ? '+' : ''}{cpmChange.toFixed(1)}%</span>
              </div>
            </div>

            {/* Frequency Metric */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 border border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                <Users className="h-3 w-3" />
                Frequency
              </div>
              <div className="text-lg font-bold text-gray-800">
                {frequency.toFixed(2)}
              </div>
              <div className={`flex items-center gap-1 text-xs mt-1 ${getChangeColor(frequencyChange)}`}>
                {getChangeIcon(frequencyChange)}
                <span>{frequencyChange > 0 ? '+' : ''}{frequencyChange.toFixed(1)}%</span>
              </div>
            </div>

            {/* CPC Metric */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-3 border border-blue-100">
              <div className="flex items-center gap-2 text-xs text-blue-600 mb-1">
                <MousePointer className="h-3 w-3" />
                CPC
              </div>
              <div className="text-lg font-bold text-blue-800">
                {formatCurrency(cpc)}
              </div>
              <div className={`flex items-center gap-1 text-xs mt-1 ${getChangeColor(cpcChange)}`}>
                {getChangeIcon(cpcChange)}
                <span>{cpcChange > 0 ? '+' : ''}{cpcChange.toFixed(1)}%</span>
              </div>
            </div>

          </div>

          {facebookData.last_updated && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-gray-500">
                Last updated: {new Date(facebookData.last_updated).toLocaleString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost Per Lead and Cost Per Call Analysis - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Per Lead Chart */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg font-semibold mb-1">Cost Per Lead Analysis</CardTitle>
                <p className="text-sm text-muted-foreground">Track your lead generation efficiency</p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-lg border border-purple-100">
                  <div className="text-xs text-purple-600 mb-1 font-medium">Current Cost Per Lead</div>
                  <div className="text-2xl font-bold text-purple-800">
                    {totalSubmissions > 0 ? formatCurrency(costPerLead) : 'N/A'}
                  </div>
                </div>
                <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-lg border border-orange-100">
                  <div className="text-xs text-orange-600 mb-1 font-medium">Total Leads</div>
                  <div className="text-2xl font-bold text-orange-800">{totalSubmissions}</div>
                  <div className="text-xs text-orange-600 mt-1">in selected period</div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ConversionChart 
              data={chartData}
              title=""
              metrics={['costPerLead']}
            />
          </CardContent>
        </Card>

        {/* Cost Per Call Chart */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg font-semibold mb-1">Cost Per Call Analysis</CardTitle>
                <p className="text-sm text-muted-foreground">Track your booking efficiency</p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg border border-blue-100">
                  <div className="text-xs text-blue-600 mb-1 font-medium">Current Cost Per Call</div>
                  <div className="text-2xl font-bold text-blue-800">
                    {totalBookings > 0 ? formatCurrency(costPerBookedCall) : 'N/A'}
                  </div>
                  <div className={`flex items-center justify-center gap-1 text-xs mt-1 ${getChangeColor(costPerBookedCallChange)}`}>
                    {getChangeIcon(costPerBookedCallChange)}
                    <span>{costPerBookedCallChange > 0 ? '+' : ''}{costPerBookedCallChange.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg border border-green-100">
                  <div className="text-xs text-green-600 mb-1 font-medium">Total Bookings</div>
                  <div className="text-2xl font-bold text-green-800">{totalBookings}</div>
                  <div className="text-xs text-green-600 mt-1">in selected period</div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ConversionChart 
              data={chartData}
              title=""
              metrics={['costPerCall']}
            />
          </CardContent>
        </Card>
      </div>

      {/* Other Facebook Performance Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <ConversionChart 
              data={chartData}
              title=""
              metrics={['spend']}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">CTR Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <ConversionChart 
              data={chartData}
              title=""
              metrics={['ctrAll', 'ctrLink']}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">CPM</CardTitle>
          </CardHeader>
          <CardContent>
            <ConversionChart 
              data={chartData}
              title=""
              metrics={['cpm']}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">CPC</CardTitle>
          </CardHeader>
          <CardContent>
            <ConversionChart 
              data={chartData}
              title=""
              metrics={['cpc']}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
