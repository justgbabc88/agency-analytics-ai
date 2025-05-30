
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { MetricCard } from "./MetricCard";
import { ConversionChart } from "./ConversionChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, TrendingUp, MousePointer } from "lucide-react";

const generateSampleData = () => {
  const dates = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      pageViews: Math.floor(Math.random() * 1000) + 800,
      optins: Math.floor(Math.random() * 300) + 200,
      mainOfferBuyers: Math.floor(Math.random() * 80) + 40,
      bumpProductBuyers: Math.floor(Math.random() * 20) + 10,
      upsell1Buyers: Math.floor(Math.random() * 15) + 8,
      downsell1Buyers: Math.floor(Math.random() * 12) + 6,
      upsell2Buyers: Math.floor(Math.random() * 8) + 4,
      downsell2Buyers: Math.floor(Math.random() * 6) + 3,
      roas: Math.random() * 2 + 2,
      spend: Math.floor(Math.random() * 500) + 300,
      ctrAll: Math.random() * 3 + 1,
      ctrLink: Math.random() * 2 + 0.5,
      cpm: Math.random() * 10 + 5,
      frequency: Math.random() * 2 + 1
    });
  }
  return dates;
};

// Sample data for current metrics
const sampleMetrics = {
  pageViews: 15420,
  optins: 4850,
  mainOfferBuyers: 1312,
  bumpProductBuyers: 198,
  upsell1Buyers: 145,
  downsell1Buyers: 87,
  upsell2Buyers: 52,
  downsell2Buyers: 34,
  roas: 3.2,
  spend: 4850,
  ctrAll: 2.4,
  ctrLink: 1.8,
  cpm: 8.5,
  frequency: 1.6
};

// Previous period metrics for comparison
const previousMetrics = {
  pageViews: 14850,
  optins: 4620,
  mainOfferBuyers: 1156,
  bumpProductBuyers: 175,
  upsell1Buyers: 128,
  downsell1Buyers: 78,
  upsell2Buyers: 45,
  downsell2Buyers: 29,
  roas: 2.9,
  spend: 5200,
  ctrAll: 2.1,
  ctrLink: 1.6,
  cpm: 9.2,
  frequency: 1.7
};

export const LowTicketFunnel = () => {
  const [expandedSections, setExpandedSections] = useState({
    funnelMetrics: true,
    adMetrics: true,
    conversionStats: true
  });

  const [selectedProducts, setSelectedProducts] = useState({
    mainProduct: true,
    bump: true,
    upsell1: true,
    downsell1: true,
    upsell2: false,
    downsell2: false
  });

  const chartData = generateSampleData();

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const toggleProduct = (product: keyof typeof selectedProducts) => {
    setSelectedProducts(prev => ({
      ...prev,
      [product]: !prev[product]
    }));
  };

  // Calculate conversion rates
  const calculateConversions = () => {
    const optinRate = (sampleMetrics.optins / sampleMetrics.pageViews) * 100;
    const mainOfferRate = (sampleMetrics.mainOfferBuyers / sampleMetrics.pageViews) * 100;
    const bumpRate = (sampleMetrics.bumpProductBuyers / sampleMetrics.mainOfferBuyers) * 100;
    const upsell1Rate = (sampleMetrics.upsell1Buyers / sampleMetrics.mainOfferBuyers) * 100;
    const downsell1Rate = (sampleMetrics.downsell1Buyers / sampleMetrics.mainOfferBuyers) * 100;
    const upsell2Rate = (sampleMetrics.upsell2Buyers / sampleMetrics.mainOfferBuyers) * 100;
    const downsell2Rate = (sampleMetrics.downsell2Buyers / sampleMetrics.mainOfferBuyers) * 100;

    return {
      optinRate,
      mainOfferRate,
      bumpRate,
      upsell1Rate,
      downsell1Rate,
      upsell2Rate,
      downsell2Rate
    };
  };

  const conversions = calculateConversions();

  return (
    <div className="space-y-6">
      {/* Product Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Funnel Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(selectedProducts).map(([product, selected]) => (
              <div key={product} className="flex items-center space-x-2">
                <Checkbox
                  id={product}
                  checked={selected}
                  onCheckedChange={() => toggleProduct(product as keyof typeof selectedProducts)}
                />
                <label htmlFor={product} className="text-sm font-medium capitalize cursor-pointer">
                  {product.replace(/([A-Z])/g, ' $1').trim()}
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Funnel Metrics Section */}
      <Card>
        <CardHeader 
          className="cursor-pointer"
          onClick={() => toggleSection('funnelMetrics')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Funnel Metrics
            </CardTitle>
            {expandedSections.funnelMetrics ? 
              <ChevronUp className="h-5 w-5" /> : 
              <ChevronDown className="h-5 w-5" />
            }
          </div>
        </CardHeader>
        {expandedSections.funnelMetrics && (
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <MetricCard title="Page Views" value={sampleMetrics.pageViews} previousValue={previousMetrics.pageViews} />
              <MetricCard title="Optins" value={sampleMetrics.optins} previousValue={previousMetrics.optins} />
              <MetricCard title="Main Offer Buyers" value={sampleMetrics.mainOfferBuyers} previousValue={previousMetrics.mainOfferBuyers} />
              <MetricCard title="ROAS" value={sampleMetrics.roas} previousValue={previousMetrics.roas} />
            </div>
            
            {selectedProducts.bump && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard title="Bump Product Buyers" value={sampleMetrics.bumpProductBuyers} previousValue={previousMetrics.bumpProductBuyers} />
              </div>
            )}

            {(selectedProducts.upsell1 || selectedProducts.downsell1) && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {selectedProducts.upsell1 && (
                  <MetricCard title="Upsell 1 Buyers" value={sampleMetrics.upsell1Buyers} previousValue={previousMetrics.upsell1Buyers} />
                )}
                {selectedProducts.downsell1 && (
                  <MetricCard title="Downsell 1 Buyers" value={sampleMetrics.downsell1Buyers} previousValue={previousMetrics.downsell1Buyers} />
                )}
              </div>
            )}

            {(selectedProducts.upsell2 || selectedProducts.downsell2) && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {selectedProducts.upsell2 && (
                  <MetricCard title="Upsell 2 Buyers" value={sampleMetrics.upsell2Buyers} previousValue={previousMetrics.upsell2Buyers} />
                )}
                {selectedProducts.downsell2 && (
                  <MetricCard title="Downsell 2 Buyers" value={sampleMetrics.downsell2Buyers} previousValue={previousMetrics.downsell2Buyers} />
                )}
              </div>
            )}

            <ConversionChart 
              data={chartData}
              title="Funnel Performance Trends"
              metrics={['pageViews', 'optins', 'mainOfferBuyers', 'roas']}
            />
          </CardContent>
        )}
      </Card>

      {/* Ad Metrics Section */}
      <Card>
        <CardHeader 
          className="cursor-pointer"
          onClick={() => toggleSection('adMetrics')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <MousePointer className="h-5 w-5" />
              Ad Metrics
            </CardTitle>
            {expandedSections.adMetrics ? 
              <ChevronUp className="h-5 w-5" /> : 
              <ChevronDown className="h-5 w-5" />
            }
          </div>
        </CardHeader>
        {expandedSections.adMetrics && (
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <MetricCard title="Spend" value={sampleMetrics.spend} previousValue={previousMetrics.spend} format="currency" />
              <MetricCard title="CTR (All)" value={sampleMetrics.ctrAll} previousValue={previousMetrics.ctrAll} format="percentage" />
              <MetricCard title="CTR (Link)" value={sampleMetrics.ctrLink} previousValue={previousMetrics.ctrLink} format="percentage" />
              <MetricCard title="CPM" value={sampleMetrics.cpm} previousValue={previousMetrics.cpm} format="currency" />
              <MetricCard title="Frequency" value={sampleMetrics.frequency} previousValue={previousMetrics.frequency} />
            </div>
            
            <ConversionChart 
              data={chartData}
              title="Ad Performance Trends"
              metrics={['spend', 'ctrAll', 'cpm', 'frequency']}
            />
          </CardContent>
        )}
      </Card>

      {/* Conversion Stats Section */}
      <Card>
        <CardHeader 
          className="cursor-pointer"
          onClick={() => toggleSection('conversionStats')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Conversion Statistics</CardTitle>
            {expandedSections.conversionStats ? 
              <ChevronUp className="h-5 w-5" /> : 
              <ChevronDown className="h-5 w-5" />
            }
          </div>
        </CardHeader>
        {expandedSections.conversionStats && (
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <MetricCard title="Optin Rate" value={conversions.optinRate} format="percentage" />
              <MetricCard title="Main Offer Conversion" value={conversions.mainOfferRate} format="percentage" />
              {selectedProducts.bump && (
                <MetricCard title="Bump Conversion" value={conversions.bumpRate} format="percentage" />
              )}
            </div>
            
            {(selectedProducts.upsell1 || selectedProducts.downsell1) && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {selectedProducts.upsell1 && (
                  <MetricCard title="Upsell 1 Conversion" value={conversions.upsell1Rate} format="percentage" />
                )}
                {selectedProducts.downsell1 && (
                  <MetricCard title="Downsell 1 Conversion" value={conversions.downsell1Rate} format="percentage" />
                )}
              </div>
            )}

            {(selectedProducts.upsell2 || selectedProducts.downsell2) && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {selectedProducts.upsell2 && (
                  <MetricCard title="Upsell 2 Conversion" value={conversions.upsell2Rate} format="percentage" />
                )}
                {selectedProducts.downsell2 && (
                  <MetricCard title="Downsell 2 Conversion" value={conversions.downsell2Rate} format="percentage" />
                )}
              </div>
            )}

            <ConversionChart 
              data={chartData.map(d => ({
                ...d,
                optinRate: (d.optins / d.pageViews) * 100,
                mainOfferRate: (d.mainOfferBuyers / d.pageViews) * 100,
                bumpRate: (d.bumpProductBuyers / d.mainOfferBuyers) * 100,
                upsell1Rate: (d.upsell1Buyers / d.mainOfferBuyers) * 100
              }))}
              title="Conversion Rate Trends"
              metrics={['optinRate', 'mainOfferRate', 'bumpRate', 'upsell1Rate']}
            />
          </CardContent>
        )}
      </Card>
    </div>
  );
};
