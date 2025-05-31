import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConversionChart } from "./ConversionChart";
import { FacebookMetrics } from "./FacebookMetrics";
import { useGoogleSheetsData } from "@/hooks/useGoogleSheetsData";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  BarChart3,
  Target,
  ShoppingCart,
  Users,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
  Facebook
} from "lucide-react";
import { useState } from "react";

interface FunnelProductConfig {
  id: string;
  label: string;
  visible: boolean;
  color: string;
}

interface LowTicketFunnelProps {
  dateRange: { from: Date; to: Date };
  selectedProducts: FunnelProductConfig[];
}

export const LowTicketFunnel = ({ dateRange, selectedProducts }: LowTicketFunnelProps) => {
  const { syncedData, calculateMetricsFromSyncedData } = useGoogleSheetsData();
  const [isAdsOpen, setIsAdsOpen] = useState(true);
  const [isFunnelOpen, setIsFunnelOpen] = useState(true);
  
  // Calculate metrics from Google Sheets data
  const calculatedMetrics = calculateMetricsFromSyncedData();
  
  // Generate funnel data from Google Sheets if available, otherwise use mock data
  const generateFunnelData = () => {
    if (syncedData && syncedData.data && syncedData.data.length > 0) {
      return syncedData.data.map((row, index) => ({
        date: row.Date || `Day ${index + 1}`,
        pageViews: parseInt(row['Page Views']?.replace(/[^\d]/g, '') || '0') || 0,
        optins: parseInt(row['Opt-Ins']?.replace(/[^\d]/g, '') || '0') || 0,
        mainOffer: parseInt(row['Main Offer']?.replace(/[^\d]/g, '') || '0') || 0,
        bump: parseInt(row['Bump']?.replace(/[^\d]/g, '') || '0') || 0,
        upsell1: parseInt(row['Upsell 1']?.replace(/[^\d]/g, '') || '0') || 0,
        downsell1: parseInt(row['Downsell 1']?.replace(/[^\d]/g, '') || '0') || 0,
        upsell2: parseInt(row['Upsell 2']?.replace(/[^\d]/g, '') || '0') || 0,
        downsell2: parseInt(row['Downsell 2']?.replace(/[^\d]/g, '') || '0') || 0,
        roas: parseFloat(row['ROAS']?.replace(/[^\d.]/g, '') || '0') || 0,
        optinRate: row['Page Views'] && row['Opt-Ins'] ? 
          (parseInt(row['Opt-Ins']?.replace(/[^\d]/g, '') || '0') / parseInt(row['Page Views']?.replace(/[^\d]/g, '') || '1')) * 100 : 0,
        mainOfferRate: row['Opt-Ins'] && row['Main Offer'] ? 
          (parseInt(row['Main Offer']?.replace(/[^\d]/g, '') || '0') / parseInt(row['Opt-Ins']?.replace(/[^\d]/g, '') || '1')) * 100 : 0,
        bumpRate: row['Main Offer'] && row['Bump'] ? 
          (parseInt(row['Bump']?.replace(/[^\d]/g, '') || '0') / parseInt(row['Main Offer']?.replace(/[^\d]/g, '') || '1')) * 100 : 0,
        upsell1Rate: row['Main Offer'] && row['Upsell 1'] ? 
          (parseInt(row['Upsell 1']?.replace(/[^\d]/g, '') || '0') / parseInt(row['Main Offer']?.replace(/[^\d]/g, '') || '1')) * 100 : 0,
        downsell1Rate: row['Main Offer'] && row['Downsell 1'] ? 
          (parseInt(row['Downsell 1']?.replace(/[^\d]/g, '') || '0') / parseInt(row['Main Offer']?.replace(/[^\d]/g, '') || '1')) * 100 : 0,
        upsell2Rate: row['Upsell 1'] && row['Upsell 2'] ? 
          (parseInt(row['Upsell 2']?.replace(/[^\d]/g, '') || '0') / parseInt(row['Upsell 1']?.replace(/[^\d]/g, '') || '1')) * 100 : 0,
        downsell2Rate: row['Upsell 1'] && row['Downsell 2'] ? 
          (parseInt(row['Downsell 2']?.replace(/[^\d]/g, '') || '0') / parseInt(row['Upsell 1']?.replace(/[^\d]/g, '') || '1')) * 100 : 0
      }));
    }
    
    // Fallback mock data
    return [
      { date: "Nov 1", pageViews: 10000, optins: 2500, mainOffer: 625, bump: 187, upsell1: 125, downsell1: 150, upsell2: 75, downsell2: 50, roas: 3.2, optinRate: 25, mainOfferRate: 25, bumpRate: 30, upsell1Rate: 20, downsell1Rate: 24, upsell2Rate: 60, downsell2Rate: 40 },
      { date: "Nov 2", pageViews: 2500, optins: 625, mainOffer: 156, bump: 47, upsell1: 31, downsell1: 38, upsell2: 19, downsell2: 13, roas: 3.5, optinRate: 25, mainOfferRate: 25, bumpRate: 30, upsell1Rate: 20, downsell1Rate: 24, upsell2Rate: 61, downsell2Rate: 42 },
      { date: "Nov 3", pageViews: 625, optins: 187, mainOffer: 56, bump: 17, upsell1: 11, downsell1: 14, upsell2: 7, downsell2: 5, roas: 3.8, optinRate: 30, mainOfferRate: 30, bumpRate: 30, upsell1Rate: 20, downsell1Rate: 25, upsell2Rate: 64, downsell2Rate: 45 },
      { date: "Nov 4", pageViews: 625, optins: 125, mainOffer: 25, bump: 8, upsell1: 5, downsell1: 6, upsell2: 3, downsell2: 2, roas: 2.9, optinRate: 20, mainOfferRate: 20, bumpRate: 32, upsell1Rate: 20, downsell1Rate: 24, upsell2Rate: 60, downsell2Rate: 40 },
      { date: "Nov 5", pageViews: 500, optins: 150, mainOffer: 45, bump: 14, upsell1: 9, downsell1: 11, upsell2: 5, downsell2: 4, roas: 3.1, optinRate: 30, mainOfferRate: 30, bumpRate: 31, upsell1Rate: 20, downsell1Rate: 24, upsell2Rate: 56, downsell2Rate: 44 },
    ];
  };

  const funnelData = generateFunnelData();

  // Calculate funnel conversion percentages
  const latestData = funnelData[funnelData.length - 1];
  const mainOfferPercent = latestData.optins > 0 ? (latestData.mainOffer / latestData.optins) * 100 : 0;
  const bumpPercent = latestData.mainOffer > 0 ? (latestData.bump / latestData.mainOffer) * 100 : 0;
  const upsell1Percent = latestData.mainOffer > 0 ? (latestData.upsell1 / latestData.mainOffer) * 100 : 0;
  const downsell1Percent = latestData.mainOffer > 0 ? (latestData.downsell1 / latestData.mainOffer) * 100 : 0;
  const upsell2Percent = latestData.upsell1 > 0 ? (latestData.upsell2 / latestData.upsell1) * 100 : 0;
  const downsell2Percent = latestData.upsell1 > 0 ? (latestData.downsell2 / latestData.upsell1) * 100 : 0;

  // Mock previous period data for comparison
  const previousPeriodData = {
    mainOffer: mainOfferPercent * (0.85 + Math.random() * 0.3),
    bump: bumpPercent * (0.85 + Math.random() * 0.3),
    upsell1: upsell1Percent * (0.85 + Math.random() * 0.3),
    downsell1: downsell1Percent * (0.85 + Math.random() * 0.3),
    upsell2: upsell2Percent * (0.85 + Math.random() * 0.3),
    downsell2: downsell2Percent * (0.85 + Math.random() * 0.3)
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

  const mainOfferChange = calculatePercentageChange(mainOfferPercent, previousPeriodData.mainOffer);
  const bumpChange = calculatePercentageChange(bumpPercent, previousPeriodData.bump);
  const upsell1Change = calculatePercentageChange(upsell1Percent, previousPeriodData.upsell1);
  const downsell1Change = calculatePercentageChange(downsell1Percent, previousPeriodData.downsell1);
  const upsell2Change = calculatePercentageChange(upsell2Percent, previousPeriodData.upsell2);
  const downsell2Change = calculatePercentageChange(downsell2Percent, previousPeriodData.downsell2);

  return (
    <div className="space-y-6">
      {/* Facebook Analysis Section */}
      <div className="bg-blue-50/30 rounded-lg border border-blue-100/80 p-4 shadow-sm">
        <Collapsible open={isAdsOpen} onOpenChange={setIsAdsOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-between p-0 h-auto hover:bg-transparent"
            >
              <h3 className="text-lg font-semibold text-blue-700 flex items-center gap-2">
                <Facebook className="h-5 w-5 text-blue-600" />
                Facebook Analysis
              </h3>
              {isAdsOpen ? <ChevronUp className="h-4 w-4 text-blue-600" /> : <ChevronDown className="h-4 w-4 text-blue-600" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <FacebookMetrics dateRange={dateRange} />
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Funnel Analysis Section */}
      <div className="bg-amber-50/30 rounded-lg border border-amber-100/80 p-4 shadow-sm">
        <Collapsible open={isFunnelOpen} onOpenChange={setIsFunnelOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-between p-0 h-auto hover:bg-transparent"
            >
              <h3 className="text-lg font-semibold text-amber-700 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-amber-600" />
                Funnel Analysis
              </h3>
              {isFunnelOpen ? <ChevronUp className="h-4 w-4 text-amber-600" /> : <ChevronDown className="h-4 w-4 text-amber-600" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            {/* Funnel Conversion Percentages */}
            <Card className="border-amber-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="h-5 w-5 text-amber-600" />
                    Funnel Conversion Rates
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {/* Main Offer Metric */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 border border-gray-100">
                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                      <Target className="h-3 w-3" />
                      Main Offer
                    </div>
                    <div className="text-lg font-bold text-gray-800">
                      {mainOfferPercent.toFixed(1)}%
                    </div>
                    <div className={`flex items-center gap-1 text-xs mt-1 ${getChangeColor(mainOfferChange)}`}>
                      {getChangeIcon(mainOfferChange)}
                      <span>{mainOfferChange > 0 ? '+' : ''}{mainOfferChange.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Bump Metric */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-lg p-3 border border-slate-100">
                    <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                      <ShoppingCart className="h-3 w-3" />
                      Bump
                    </div>
                    <div className="text-lg font-bold text-slate-800">
                      {bumpPercent.toFixed(1)}%
                    </div>
                    <div className={`flex items-center gap-1 text-xs mt-1 ${getChangeColor(bumpChange)}`}>
                      {getChangeIcon(bumpChange)}
                      <span>{bumpChange > 0 ? '+' : ''}{bumpChange.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Upsell 1 Metric */}
                  <div className="bg-gradient-to-br from-zinc-50 to-zinc-100/50 rounded-lg p-3 border border-zinc-100">
                    <div className="flex items-center gap-2 text-xs text-zinc-600 mb-1">
                      <TrendingUp className="h-3 w-3" />
                      Upsell 1
                    </div>
                    <div className="text-lg font-bold text-zinc-800">
                      {upsell1Percent.toFixed(1)}%
                    </div>
                    <div className={`flex items-center gap-1 text-xs mt-1 ${getChangeColor(upsell1Change)}`}>
                      {getChangeIcon(upsell1Change)}
                      <span>{upsell1Change > 0 ? '+' : ''}{upsell1Change.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Downsell 1 Metric */}
                  <div className="bg-gradient-to-br from-stone-50 to-stone-100/50 rounded-lg p-3 border border-stone-100">
                    <div className="flex items-center gap-2 text-xs text-stone-600 mb-1">
                      <Users className="h-3 w-3" />
                      Downsell 1
                    </div>
                    <div className="text-lg font-bold text-stone-800">
                      {downsell1Percent.toFixed(1)}%
                    </div>
                    <div className={`flex items-center gap-1 text-xs mt-1 ${getChangeColor(downsell1Change)}`}>
                      {getChangeIcon(downsell1Change)}
                      <span>{downsell1Change > 0 ? '+' : ''}{downsell1Change.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Upsell 2 Metric */}
                  <div className="bg-gradient-to-br from-neutral-50 to-neutral-100/50 rounded-lg p-3 border border-neutral-100">
                    <div className="flex items-center gap-2 text-xs text-neutral-600 mb-1">
                      <DollarSign className="h-3 w-3" />
                      Upsell 2
                    </div>
                    <div className="text-lg font-bold text-neutral-800">
                      {upsell2Percent.toFixed(1)}%
                    </div>
                    <div className={`flex items-center gap-1 text-xs mt-1 ${getChangeColor(upsell2Change)}`}>
                      {getChangeIcon(upsell2Change)}
                      <span>{upsell2Change > 0 ? '+' : ''}{upsell2Change.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Downsell 2 Metric */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 border border-gray-100">
                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                      <Target className="h-3 w-3" />
                      Downsell 2
                    </div>
                    <div className="text-lg font-bold text-gray-800">
                      {downsell2Percent.toFixed(1)}%
                    </div>
                    <div className={`flex items-center gap-1 text-xs mt-1 ${getChangeColor(downsell2Change)}`}>
                      {getChangeIcon(downsell2Change)}
                      <span>{downsell2Change > 0 ? '+' : ''}{downsell2Change.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Funnel Conversion Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border-amber-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Funnel Volume
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ConversionChart 
                    data={funnelData}
                    title=""
                    metrics={['pageViews', 'optins', 'mainOffer']}
                  />
                </CardContent>
              </Card>

              <Card className="border-amber-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    All Conversion Rates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ConversionChart 
                    data={funnelData}
                    title=""
                    metrics={['optinRate', 'mainOfferRate', 'bumpRate', 'upsell1Rate', 'downsell1Rate', 'upsell2Rate', 'downsell2Rate']}
                  />
                </CardContent>
              </Card>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};
