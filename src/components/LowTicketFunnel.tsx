
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConversionChart } from "./ConversionChart";
import { MetricCard } from "./MetricCard";
import { FacebookMetrics } from "./FacebookMetrics";
import { useGoogleSheetsData } from "@/hooks/useGoogleSheetsData";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  ShoppingCart,
  BarChart3,
  Target,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

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
          (parseInt(row['Main Offer']?.replace(/[^\d]/g, '') || '0') / parseInt(row['Opt-Ins']?.replace(/[^\d]/g, '') || '1')) * 100 : 0
      }));
    }
    
    // Fallback mock data
    return [
      { date: "Nov 1", pageViews: 10000, optins: 2500, mainOffer: 625, bump: 187, upsell1: 125, downsell1: 150, upsell2: 75, downsell2: 50, roas: 3.2, optinRate: 25, mainOfferRate: 25 },
      { date: "Nov 2", pageViews: 2500, optins: 625, mainOffer: 156, bump: 47, upsell1: 31, downsell1: 38, upsell2: 19, downsell2: 13, roas: 3.5, optinRate: 25, mainOfferRate: 25 },
      { date: "Nov 3", pageViews: 625, optins: 187, mainOffer: 56, bump: 17, upsell1: 11, downsell1: 14, upsell2: 7, downsell2: 5, roas: 3.8, optinRate: 30, mainOfferRate: 30 },
      { date: "Nov 4", pageViews: 625, optins: 125, mainOffer: 25, bump: 8, upsell1: 5, downsell1: 6, upsell2: 3, downsell2: 2, roas: 2.9, optinRate: 20, mainOfferRate: 20 },
      { date: "Nov 5", pageViews: 500, optins: 150, mainOffer: 45, bump: 14, upsell1: 9, downsell1: 11, upsell2: 5, downsell2: 4, roas: 3.1, optinRate: 30, mainOfferRate: 30 },
    ];
  };

  const funnelData = generateFunnelData();

  // Use calculated metrics if available, otherwise fallback to mock data
  const metrics = calculatedMetrics ? {
    totalRevenue: calculatedMetrics.revenue || 47850,
    totalCustomers: calculatedMetrics.conversions || 625,
    averageOrderValue: calculatedMetrics.revenue && calculatedMetrics.conversions ? 
      calculatedMetrics.revenue / calculatedMetrics.conversions : 76.56,
    conversionRate: calculatedMetrics.conversionRate || 6.25,
    costPerAcquisition: calculatedMetrics.cost && calculatedMetrics.conversions ? 
      calculatedMetrics.cost / calculatedMetrics.conversions : 12.50,
    returnOnAdSpend: calculatedMetrics.roas || 3.83
  } : {
    totalRevenue: 47850,
    totalCustomers: 625,
    averageOrderValue: 76.56,
    conversionRate: 6.25,
    costPerAcquisition: 12.50,
    returnOnAdSpend: 3.83
  };

  return (
    <div className="space-y-6">
      {/* Facebook Ads Integration */}
      <FacebookMetrics dateRange={dateRange} />
      
      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          title="Total Revenue"
          value={metrics.totalRevenue}
          previousValue={42150}
          format="currency"
          className="col-span-1"
        />
        <MetricCard
          title="Total Customers"
          value={metrics.totalCustomers}
          previousValue={577}
          className="col-span-1"
        />
        <MetricCard
          title="Average Order Value"
          value={metrics.averageOrderValue}
          previousValue={72.80}
          format="currency"
          className="col-span-1"
        />
        <MetricCard
          title="Conversion Rate"
          value={metrics.conversionRate}
          previousValue={6.4}
          format="percentage"
          className="col-span-1"
        />
        <MetricCard
          title="Cost Per Acquisition"
          value={metrics.costPerAcquisition}
          previousValue={14.85}
          format="currency"
          className="col-span-1"
        />
        <MetricCard
          title="ROAS"
          value={metrics.returnOnAdSpend}
          previousValue={3.22}
          className="col-span-1"
        />
      </div>

      {/* Funnel Conversion Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Funnel Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ConversionChart 
              data={funnelData}
              title="Funnel Volume Metrics"
              metrics={['pageViews', 'optins', 'mainOffer']}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Conversion Rates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ConversionChart 
              data={funnelData}
              title="Conversion Rate Trends"
              metrics={['optinRate', 'mainOfferRate']}
            />
          </CardContent>
        </Card>
      </div>

      {/* Product Performance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Product Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedProducts.filter(p => p.visible).map((product) => {
                // Use actual data if available
                const getProductSales = (productId: string) => {
                  if (calculatedMetrics && funnelData.length > 0) {
                    const latestData = funnelData[funnelData.length - 1];
                    switch(productId) {
                      case 'mainProduct': return latestData.mainOffer || 0;
                      case 'bump': return latestData.bump || 0;
                      case 'upsell1': return latestData.upsell1 || 0;
                      case 'downsell1': return latestData.downsell1 || 0;
                      case 'upsell2': return latestData.upsell2 || 0;
                      case 'downsell2': return latestData.downsell2 || 0;
                      default: return 0;
                    }
                  }
                  // Fallback data
                  return {
                    'mainProduct': 625,
                    'bump': 187,
                    'upsell1': 125,
                    'downsell1': 150,
                    'upsell2': 75,
                    'downsell2': 50
                  }[productId] || 0;
                };

                const sales = getProductSales(product.id);
                const revenue = {
                  'mainProduct': sales * 50,
                  'bump': sales * 50,
                  'upsell1': sales * 50,
                  'downsell1': sales * 30,
                  'upsell2': sales * 30,
                  'downsell2': sales * 30
                }[product.id] || 0;

                return (
                  <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: product.color }}
                      />
                      <div>
                        <div className="font-medium">{product.label}</div>
                        <div className="text-sm text-gray-600">
                          {sales} sales
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        ${revenue.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-1">
                        {Math.random() > 0.5 ? (
                          <>
                            <ArrowUpRight className="h-3 w-3 text-green-600" />
                            <span className="text-green-600">+{(Math.random() * 20).toFixed(1)}%</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownRight className="h-3 w-3 text-red-600" />
                            <span className="text-red-600">-{(Math.random() * 10).toFixed(1)}%</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Traffic Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Facebook Ads</div>
                  <div className="text-sm text-gray-600">Social Media</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{(calculatedMetrics?.pageViews * 0.675) || 6750} visitors</div>
                  <div className="text-sm text-green-600">67.5%</div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Google Ads</div>
                  <div className="text-sm text-gray-600">Search Engine</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{(calculatedMetrics?.pageViews * 0.225) || 2250} visitors</div>
                  <div className="text-sm text-green-600">22.5%</div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Organic</div>
                  <div className="text-sm text-gray-600">Direct & Referral</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{(calculatedMetrics?.pageViews * 0.10) || 1000} visitors</div>
                  <div className="text-sm text-green-600">10%</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
