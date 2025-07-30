import { useState, useEffect, useMemo } from "react";
import { useFacebookData } from "@/hooks/useFacebookData";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConversionChart } from "./ConversionChart";
import { format, eachDayOfInterval, startOfDay } from "date-fns";

interface FacebookZohoAnalyticsProps {
  projectId?: string;
  dateRange?: { from: Date; to: Date };
}

interface DealData {
  Agreement_Received_Date: string;
  Fixed_Fee_Inc_GST?: number;
  Total_Commission?: number;
  Deal_Name: string;
}

interface ChartDataPoint {
  date: string;
  totalDeals: number;
  costPerDeal: number;
  spend: number;
}

export const FacebookZohoAnalytics = ({ projectId, dateRange }: FacebookZohoAnalyticsProps) => {
  const [deals, setDeals] = useState<DealData[]>([]);
  const [loading, setLoading] = useState(true);

  const { facebookData, insights } = useFacebookData({ dateRange });
  
  // Use the same dailyInsights that FacebookMetrics uses for cost per lead
  const dailyInsights = facebookData?.daily_insights;

  useEffect(() => {
    if (projectId) {
      fetchZohoDeals();
    }
  }, [projectId]);

  const fetchZohoDeals = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_integration_data')
        .select('data')
        .eq('project_id', projectId)
        .eq('platform', 'zoho_crm')
        .order('synced_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data?.data) {
        const zohoData = data.data as any;
        const dealsData = zohoData.data?.deals?.records || [];
        
        // Filter deals with valid Agreement_Received_Date and amount
        const validDeals = dealsData.filter((deal: any) => {
          const hasDate = deal.Agreement_Received_Date;
          const hasAmount = deal.Fixed_Fee_Inc_GST || deal.Total_Commission;
          const amountValue = deal.Fixed_Fee_Inc_GST || deal.Total_Commission;
          return hasDate && hasAmount && !isNaN(parseFloat(amountValue));
        });
        
        setDeals(validDeals);
      }
    } catch (error) {
      console.error('Error fetching Zoho deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = useMemo(() => {
    console.log('FacebookZohoAnalytics - Daily insights data:', dailyInsights?.slice(0, 5));
    console.log('FacebookZohoAnalytics - Available spend data:', {
      totalInsights: dailyInsights?.length,
      firstInsight: dailyInsights?.[0],
      hasSpendData: dailyInsights?.some(d => d.spend > 0)
    });
    console.log('FacebookZohoAnalytics - Chart date range:', dateRange);
    
    if (!dateRange || !dailyInsights || deals.length === 0) {
      console.log('FacebookZohoAnalytics - No chart data available:', {
        hasDateRange: !!dateRange,
        hasDailyInsights: !!dailyInsights,
        dealsCount: deals.length
      });
      return [];
    }

    // Create array of all dates in range
    const allDates = eachDayOfInterval({
      start: startOfDay(dateRange.from),
      end: startOfDay(dateRange.to)
    });

    const chartData = allDates.map(date => {
      const dateStr = format(date, 'MMM dd');
      const isoDateStr = format(date, 'yyyy-MM-dd');

      // Count deals for this date first
      const dealsOnDate = deals.filter(deal => {
        const dealDate = new Date(deal.Agreement_Received_Date);
        return format(dealDate, 'yyyy-MM-dd') === isoDateStr;
      });

      // Get Facebook spend for this date using the same approach as cost per lead
      const facebookInsight = dailyInsights.find(
        (insight: any) => insight.date === isoDateStr || insight.date_start === isoDateStr
      );
      const dailySpend = facebookInsight?.spend || 0;
      
      // Debug the date matching - same as cost per lead does it
      if (dealsOnDate.length > 0) {
        console.log(`FacebookZohoAnalytics - Date matching debug for ${isoDateStr}:`, {
          lookingFor: isoDateStr,
          availableDates: dailyInsights.slice(0, 3).map(i => i.date || i.date_start),
          foundInsight: !!facebookInsight,
          insightData: facebookInsight,
          spendFound: facebookInsight?.spend || 'No spend data'
        });
      }

      const totalDeals = dealsOnDate.length;
      
      // Calculate cost per deal using actual daily spend for this specific date
      const costPerDeal = totalDeals > 0 && dailySpend > 0 ? dailySpend / totalDeals : 0;

      const dataPoint = {
        date: dateStr,
        totalDeals,
        costPerDeal: Math.round(costPerDeal * 100) / 100,
        spend: dailySpend
      };
      
      console.log(`FacebookZohoAnalytics - ${dateStr}:`, {
        ...dataPoint,
        dealsOnThisDate: dealsOnDate.map(d => d.Deal_Name),
        facebookSpend: dailySpend,
        costPerDealCalculation: totalDeals > 0 ? `$${dailySpend} ÷ ${totalDeals} deals = $${costPerDeal.toFixed(2)}` : 'No deals'
      });
      return dataPoint;
    });
    
    console.log('FacebookZohoAnalytics - Final chart data:', chartData);
    return chartData;
  }, [dailyInsights, deals, dateRange]);

  const totalDeals = useMemo(() => {
    if (!dateRange || deals.length === 0) return deals.length; // Show total deals even without date range
    
    return deals.filter(deal => {
      const dealDate = new Date(deal.Agreement_Received_Date);
      return dealDate >= dateRange.from && dealDate <= dateRange.to;
    }).length;
  }, [deals, dateRange]);

  const averageCostPerDeal = useMemo(() => {
    const totalSpend = insights?.spend || 0;
    return totalDeals > 0 ? Math.round((totalSpend / totalDeals) * 100) / 100 : 0;
  }, [insights?.spend, totalDeals]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Deal Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!projectId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Deal Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Select a project to view deal performance</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold mb-1">Deal Performance Analysis</CardTitle>
            <p className="text-sm text-muted-foreground">Track your deal conversion and acquisition efficiency</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="text-center p-3 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-lg border border-amber-100">
              <div className="text-xs text-amber-600 mb-1 font-medium">Average Cost Per Deal</div>
              <div className="text-2xl font-bold text-amber-800">
                {totalDeals > 0 ? `$${averageCostPerDeal.toLocaleString()}` : 'N/A'}
              </div>
              <div className="text-xs text-amber-600 mt-1">
                based on Facebook spend
              </div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-lg border border-purple-100">
              <div className="text-xs text-purple-600 mb-1 font-medium">Total Deals Closed</div>
              <div className="text-2xl font-bold text-purple-800">
                {totalDeals}
              </div>
              <div className="text-xs text-purple-600 mt-1">
                {dateRange ? 'in selected period' : 'all time'}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ConversionChart 
            data={chartData}
            title=""
            metrics={['costPerDeal']}
          />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No chart data available - ensure both Facebook and Zoho data is synced
          </div>
        )}
      </CardContent>
    </Card>
  );
};