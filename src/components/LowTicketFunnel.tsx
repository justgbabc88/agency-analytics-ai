
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConversionChart } from "./ConversionChart";
import { MetricCard } from "./MetricCard";
import { FacebookMetrics } from "./FacebookMetrics";
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
  // Mock data for demonstration
  const funnelData = [
    { stage: "Landing Page Views", visitors: 10000, conversions: 2500, rate: 25 },
    { stage: "Main Product", visitors: 2500, conversions: 625, rate: 25 },
    { stage: "Bump Offer", visitors: 625, conversions: 187, rate: 30 },
    { stage: "Upsell 1", visitors: 625, conversions: 125, rate: 20 },
    { stage: "Downsell 1", visitors: 500, conversions: 150, rate: 30 },
  ];

  const metrics = {
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
      <FacebookMetrics />
      
      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          title="Total Revenue"
          value={`$${metrics.totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          trend={{ value: 12.5, isPositive: true }}
          className="col-span-1"
        />
        <MetricCard
          title="Total Customers"
          value={metrics.totalCustomers.toLocaleString()}
          icon={Users}
          trend={{ value: 8.3, isPositive: true }}
          className="col-span-1"
        />
        <MetricCard
          title="Average Order Value"
          value={`$${metrics.averageOrderValue.toFixed(2)}`}
          icon={ShoppingCart}
          trend={{ value: 5.2, isPositive: true }}
          className="col-span-1"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${metrics.conversionRate}%`}
          icon={Target}
          trend={{ value: 2.1, isPositive: false }}
          className="col-span-1"
        />
        <MetricCard
          title="Cost Per Acquisition"
          value={`$${metrics.costPerAcquisition.toFixed(2)}`}
          icon={TrendingUp}
          trend={{ value: 15.7, isPositive: false }}
          className="col-span-1"
        />
        <MetricCard
          title="ROAS"
          value={`${metrics.returnOnAdSpend.toFixed(2)}x`}
          icon={BarChart3}
          trend={{ value: 18.9, isPositive: true }}
          className="col-span-1"
        />
      </div>

      {/* Funnel Conversion Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Funnel Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ConversionChart data={funnelData} />
        </CardContent>
      </Card>

      {/* Product Performance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Product Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedProducts.filter(p => p.visible).map((product) => (
                <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: product.color }}
                    />
                    <div>
                      <div className="font-medium">{product.label}</div>
                      <div className="text-sm text-gray-600">
                        {product.id === 'mainProduct' ? '625 sales' : 
                         product.id === 'bump' ? '187 sales' :
                         product.id === 'upsell1' ? '125 sales' :
                         product.id === 'downsell1' ? '150 sales' : '75 sales'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {product.id === 'mainProduct' ? '$31,250' : 
                       product.id === 'bump' ? '$9,350' :
                       product.id === 'upsell1' ? '$6,250' :
                       product.id === 'downsell1' ? '$4,500' : '$2,250'}
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
              ))}
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
                  <div className="font-semibold">6,750 visitors</div>
                  <div className="text-sm text-green-600">67.5%</div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Google Ads</div>
                  <div className="text-sm text-gray-600">Search Engine</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">2,250 visitors</div>
                  <div className="text-sm text-green-600">22.5%</div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Organic</div>
                  <div className="text-sm text-gray-600">Direct & Referral</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">1,000 visitors</div>
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
