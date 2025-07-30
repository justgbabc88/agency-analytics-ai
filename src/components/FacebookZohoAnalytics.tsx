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
  Amount: number;
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
        
        // Filter deals with valid Agreement_Received_Date and Amount
        const validDeals = dealsData.filter((deal: any) => 
          deal.Agreement_Received_Date && 
          deal.Amount && 
          !isNaN(parseFloat(deal.Amount))
        );
        
        setDeals(validDeals);
      }
    } catch (error) {
      console.error('Error fetching Zoho deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = useMemo(() => {
    if (!dateRange || !facebookData?.daily_insights || deals.length === 0) {
      return [];
    }

    // Create array of all dates in range
    const allDates = eachDayOfInterval({
      start: startOfDay(dateRange.from),
      end: startOfDay(dateRange.to)
    });

    return allDates.map(date => {
      const dateStr = format(date, 'MMM dd');
      const isoDateStr = format(date, 'yyyy-MM-dd');

      // Get Facebook spend for this date
      const facebookInsight = facebookData.daily_insights.find(
        (insight: any) => insight.date_start === isoDateStr
      );
      const dailySpend = facebookInsight?.spend || 0;

      // Count deals for this date
      const dealsOnDate = deals.filter(deal => {
        const dealDate = new Date(deal.Agreement_Received_Date);
        return format(dealDate, 'yyyy-MM-dd') === isoDateStr;
      });

      const totalDeals = dealsOnDate.length;
      const costPerDeal = totalDeals > 0 ? dailySpend / totalDeals : 0;

      return {
        date: dateStr,
        totalDeals,
        costPerDeal: Math.round(costPerDeal * 100) / 100, // Round to 2 decimal places
        spend: dailySpend
      };
    });
  }, [facebookData, deals, dateRange]);

  const totalDeals = useMemo(() => {
    if (!dateRange || deals.length === 0) return 0;
    
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
      <CardHeader>
        <CardTitle>Deal Performance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Deals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDeals}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Cost Per Deal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${averageCostPerDeal.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {chartData.length > 0 && (
          <ConversionChart 
            data={chartData}
            title="Daily Deal Performance"
            metrics={['totalDeals', 'costPerDeal']}
          />
        )}
      </CardContent>
    </Card>
  );
};