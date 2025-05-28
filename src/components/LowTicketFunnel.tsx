
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { MetricCard } from "./MetricCard";
import { ConversionChart } from "./ConversionChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";

const generateSampleData = () => {
  const dates = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      conversionRate: Math.random() * 10 + 5,
      roas: Math.random() * 3 + 1,
      pageViews: Math.floor(Math.random() * 1000) + 500
    });
  }
  return dates;
};

export const LowTicketFunnel = () => {
  const [expandedSections, setExpandedSections] = useState({
    mainProduct: true,
    bump: false,
    upsells: false
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

      {/* Main Product Section */}
      {selectedProducts.mainProduct && (
        <Card>
          <CardHeader 
            className="cursor-pointer"
            onClick={() => toggleSection('mainProduct')}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Main Product</CardTitle>
              {expandedSections.mainProduct ? 
                <ChevronUp className="h-5 w-5" /> : 
                <ChevronDown className="h-5 w-5" />
              }
            </div>
          </CardHeader>
          {expandedSections.mainProduct && (
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard title="Page Views" value={15420} previousValue={14850} />
                <MetricCard title="Conversion Rate" value={8.5} previousValue={7.8} format="percentage" />
                <MetricCard title="Revenue" value={89540} previousValue={85200} format="currency" />
                <MetricCard title="ROAS" value={3.2} previousValue={2.9} />
              </div>
              <ConversionChart 
                data={chartData}
                title="Main Product Performance"
                metrics={['conversionRate', 'roas', 'pageViews']}
              />
            </CardContent>
          )}
        </Card>
      )}

      {/* Bump Product Section */}
      {selectedProducts.bump && (
        <Card>
          <CardHeader 
            className="cursor-pointer"
            onClick={() => toggleSection('bump')}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Bump Product</CardTitle>
              {expandedSections.bump ? 
                <ChevronUp className="h-5 w-5" /> : 
                <ChevronDown className="h-5 w-5" />
              }
            </div>
          </CardHeader>
          {expandedSections.bump && (
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard title="Bump Views" value={1312} previousValue={1156} />
                <MetricCard title="Bump Conversion" value={15.2} previousValue={13.8} format="percentage" />
                <MetricCard title="Bump Revenue" value={12840} previousValue={11200} format="currency" />
                <MetricCard title="Bump AOV" value={64.20} previousValue={62.50} format="currency" />
              </div>
              <ConversionChart 
                data={chartData.map(d => ({...d, conversionRate: d.conversionRate * 1.8}))}
                title="Bump Product Performance"
                metrics={['conversionRate', 'roas']}
              />
            </CardContent>
          )}
        </Card>
      )}

      {/* Upsells Section */}
      {(selectedProducts.upsell1 || selectedProducts.downsell1 || selectedProducts.upsell2 || selectedProducts.downsell2) && (
        <Card>
          <CardHeader 
            className="cursor-pointer"
            onClick={() => toggleSection('upsells')}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Upsells & Downsells</CardTitle>
              {expandedSections.upsells ? 
                <ChevronUp className="h-5 w-5" /> : 
                <ChevronDown className="h-5 w-5" />
              }
            </div>
          </CardHeader>
          {expandedSections.upsells && (
            <CardContent className="space-y-6">
              {selectedProducts.upsell1 && (
                <div>
                  <h4 className="font-medium text-gray-800 mb-3">Upsell 1</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <MetricCard title="Views" value={985} previousValue={912} />
                    <MetricCard title="Conversion" value={22.1} previousValue={19.8} format="percentage" />
                    <MetricCard title="Revenue" value={18540} previousValue={16200} format="currency" />
                    <MetricCard title="AOV" value={85.20} previousValue={81.50} format="currency" />
                  </div>
                </div>
              )}
              
              {selectedProducts.downsell1 && (
                <div>
                  <h4 className="font-medium text-gray-800 mb-3">Downsell 1</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <MetricCard title="Views" value={768} previousValue={723} />
                    <MetricCard title="Conversion" value={35.4} previousValue={32.1} format="percentage" />
                    <MetricCard title="Revenue" value={8940} previousValue={8200} format="currency" />
                    <MetricCard title="AOV" value={32.80} previousValue={35.20} format="currency" />
                  </div>
                </div>
              )}

              <ConversionChart 
                data={chartData.map(d => ({...d, conversionRate: d.conversionRate * 2.5}))}
                title="Upsells Performance Overview"
                metrics={['conversionRate', 'roas']}
              />
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
};
