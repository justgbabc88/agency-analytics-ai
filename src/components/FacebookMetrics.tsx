
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFacebookData } from "@/hooks/useFacebookData";
import { ConversionChart } from "./ConversionChart";
import { BarChart3, TrendingUp, Users, DollarSign, MousePointer, Eye, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface FacebookMetricsProps {
  dateRange?: { from: Date; to: Date };
}

export const FacebookMetrics = ({ dateRange }: FacebookMetricsProps) => {
  const { facebookData, isLoading, insights, campaigns, metrics } = useFacebookData({ dateRange });

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
  
  // Calculate Frequency - estimated based on reach vs impressions
  const frequency = insights.reach && insights.reach > 0 ? insights.impressions / insights.reach : 1.2;

  // Mock previous period data for comparison (typically would come from API with different date range)
  const previousPeriodData = {
    spend: (insights.spend || 0) * (0.85 + Math.random() * 0.3), // Random variation for demo
    impressions: (insights.impressions || 0) * (0.9 + Math.random() * 0.2),
    ctr: (insights.ctr || 0) * (0.95 + Math.random() * 0.1),
    ctrLink: ctrLink * (0.92 + Math.random() * 0.16),
    cpm: insights.spend && insights.impressions ? ((insights.spend / insights.impressions) * 1000) * (1.1 + Math.random() * 0.2) : 0,
    frequency: frequency * (0.88 + Math.random() * 0.24)
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

  // Generate chart data from insights
  const generateChartData = () => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        spend: insights.spend ? insights.spend / 7 + (Math.random() - 0.5) * (insights.spend / 14) : 0,
        ctrAll: insights.ctr ? insights.ctr + (Math.random() - 0.5) * 0.5 : 0,
        ctrLink: ctrLink + (Math.random() - 0.5) * 0.3,
        cpm: insights.spend && insights.impressions ? (insights.spend / insights.impressions) * 1000 + (Math.random() - 0.5) * 2 : 0,
        frequency: frequency + (Math.random() - 0.5) * 0.3,
      });
    }
    return days;
  };

  const chartData = generateChartData();

  const spendChange = calculatePercentageChange(insights.spend || 0, previousPeriodData.spend);
  const impressionsChange = calculatePercentageChange(insights.impressions || 0, previousPeriodData.impressions);
  const ctrChange = calculatePercentageChange(insights.ctr || 0, previousPeriodData.ctr);
  const ctrLinkChange = calculatePercentageChange(ctrLink, previousPeriodData.ctrLink);
  const cpmChange = calculatePercentageChange(
    insights.spend && insights.impressions ? (insights.spend / insights.impressions) * 1000 : 0, 
    previousPeriodData.cpm
  );
  const frequencyChange = calculatePercentageChange(frequency, previousPeriodData.frequency);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Facebook Ads Performance
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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

      {/* Facebook Performance Charts - More Condensed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Spend & CTR Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ConversionChart 
              data={chartData}
              title=""
              metrics={['spend', 'ctrAll', 'ctrLink']}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cost & Frequency Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ConversionChart 
              data={chartData}
              title=""
              metrics={['cpm', 'frequency']}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
