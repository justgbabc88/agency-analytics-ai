import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConversionChart } from "./ConversionChart";
import { AIChatPanel } from "./AIChatPanel";
import { useGoogleSheetsData } from "@/hooks/useGoogleSheetsData";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
  Eye,
  EyeOff,
  Settings2
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
  onProductsChange: (products: FunnelProductConfig[]) => void;
  selectedCampaignIds?: string[];
}

export const LowTicketFunnel = ({ dateRange, selectedProducts, onProductsChange, selectedCampaignIds = [] }: LowTicketFunnelProps) => {
  const { syncedData, calculateMetricsFromSyncedData } = useGoogleSheetsData();
  const [isFunnelOpen, setIsFunnelOpen] = useState(true);
  const [isCustomizerExpanded, setIsCustomizerExpanded] = useState(false);
  
  // Calculate metrics from Google Sheets data
  const calculatedMetrics = calculateMetricsFromSyncedData();
  
  // Generate funnel data from Google Sheets if available, otherwise use mock data
  const generateFunnelData = () => {
    if (syncedData && syncedData.data && syncedData.data.length > 0) {
      return syncedData.data.map((row, index) => ({
        date: row.Date || `Day ${index + 1}`,
        pageViews: parseInt(row['Page Views']?.replace(/[^\d]/g, '') || '0') || 0,
        optins: parseInt(row['Opt-Ins']?.replace(/[^\d]/g, '') || '0') || 0,
        mainProductSales: parseInt(row['Main Offer']?.replace(/[^\d]/g, '') || '0') || 0,
        bumpSales: parseInt(row['Bump']?.replace(/[^\d]/g, '') || '0') || 0,
        upsell1Sales: parseInt(row['Upsell 1']?.replace(/[^\d]/g, '') || '0') || 0,
        downsell1Sales: parseInt(row['Downsell 1']?.replace(/[^\d]/g, '') || '0') || 0,
        upsell2Sales: parseInt(row['Upsell 2']?.replace(/[^\d]/g, '') || '0') || 0,
        downsell2Sales: parseInt(row['Downsell 2']?.replace(/[^\d]/g, '') || '0') || 0,
        roas: parseFloat(row['ROAS']?.replace(/[^\d.]/g, '') || '0') || 0,
        optinRate: row['Page Views'] && row['Opt-Ins'] ? 
          (parseInt(row['Opt-Ins']?.replace(/[^\d]/g, '') || '0') / parseInt(row['Page Views']?.replace(/[^\d]/g, '') || '1')) * 100 : 0,
        mainProduct: row['Page Views'] && row['Main Offer'] ? 
          (parseInt(row['Main Offer']?.replace(/[^\d]/g, '') || '0') / parseInt(row['Page Views']?.replace(/[^\d]/g, '') || '1')) * 100 : 0,
        bump: row['Main Offer'] && row['Bump'] ? 
          (parseInt(row['Bump']?.replace(/[^\d]/g, '') || '0') / parseInt(row['Main Offer']?.replace(/[^\d]/g, '') || '1')) * 100 : 0,
        upsell1: row['Main Offer'] && row['Upsell 1'] ? 
          (parseInt(row['Upsell 1']?.replace(/[^\d]/g, '') || '0') / parseInt(row['Main Offer']?.replace(/[^\d]/g, '') || '1')) * 100 : 0,
        downsell1: row['Main Offer'] && row['Downsell 1'] ? 
          (parseInt(row['Downsell 1']?.replace(/[^\d]/g, '') || '0') / parseInt(row['Main Offer']?.replace(/[^\d]/g, '') || '1')) * 100 : 0,
        upsell2: row['Upsell 1'] && row['Upsell 2'] ? 
          (parseInt(row['Upsell 2']?.replace(/[^\d]/g, '') || '0') / parseInt(row['Upsell 1']?.replace(/[^\d]/g, '') || '1')) * 100 : 0,
        downsell2: row['Upsell 1'] && row['Downsell 2'] ? 
          (parseInt(row['Downsell 2']?.replace(/[^\d]/g, '') || '0') / parseInt(row['Upsell 1']?.replace(/[^\d]/g, '') || '1')) * 100 : 0
      }));
    }
    
    // Fallback mock data
    return [
      { date: "Nov 1", pageViews: 10000, optins: 2500, mainProduct: 6.25, bump: 30, upsell1: 20, downsell1: 24, upsell2: 60, downsell2: 40, roas: 3.2 },
      { date: "Nov 2", pageViews: 2500, optins: 625, mainProduct: 6.24, bump: 30, upsell1: 20, downsell1: 24, upsell2: 61, downsell2: 42, roas: 3.5 },
      { date: "Nov 3", pageViews: 625, optins: 187, mainProduct: 8.96, bump: 30, upsell1: 20, downsell1: 25, upsell2: 64, downsell2: 45, roas: 3.8 },
      { date: "Nov 4", pageViews: 625, optins: 125, mainProduct: 4.0, bump: 32, upsell1: 20, downsell1: 24, upsell2: 60, downsell2: 40, roas: 2.9 },
      { date: "Nov 5", pageViews: 500, optins: 150, mainProduct: 9.0, bump: 31, upsell1: 20, downsell1: 24, upsell2: 56, downsell2: 44, roas: 3.1 },
    ];
  };

  const funnelData = generateFunnelData();

  // Get latest metrics for each product
  const latestData = funnelData[funnelData.length - 1];

  // Create a mapping from product IDs to their current values and calculate changes
  const getProductMetrics = () => {
    const currentMetrics: Record<string, number> = {
      mainProduct: latestData.mainProduct || 0,
      bump: latestData.bump || 0,
      upsell1: latestData.upsell1 || 0,
      downsell1: latestData.downsell1 || 0,
      upsell2: latestData.upsell2 || 0,
      downsell2: latestData.downsell2 || 0
    };

    // Mock previous period data for comparison
    const previousMetrics: Record<string, number> = {
      mainProduct: currentMetrics.mainProduct * (0.85 + Math.random() * 0.3),
      bump: currentMetrics.bump * (0.85 + Math.random() * 0.3),
      upsell1: currentMetrics.upsell1 * (0.85 + Math.random() * 0.3),
      downsell1: currentMetrics.downsell1 * (0.85 + Math.random() * 0.3),
      upsell2: currentMetrics.upsell2 * (0.85 + Math.random() * 0.3),
      downsell2: currentMetrics.downsell2 * (0.85 + Math.random() * 0.3)
    };

    return { currentMetrics, previousMetrics };
  };

  const { currentMetrics, previousMetrics } = getProductMetrics();

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

  // Get icon for each product type
  const getProductIcon = (productId: string) => {
    switch (productId) {
      case 'mainProduct': return <Target className="h-3 w-3" />;
      case 'bump': return <ShoppingCart className="h-3 w-3" />;
      case 'upsell1': return <TrendingUp className="h-3 w-3" />;
      case 'downsell1': return <Users className="h-3 w-3" />;
      case 'upsell2': return <DollarSign className="h-3 w-3" />;
      case 'downsell2': return <Target className="h-3 w-3" />;
      default: return <Target className="h-3 w-3" />;
    }
  };

  const toggleProduct = (productId: string) => {
    const updatedProducts = selectedProducts.map(product => 
      product.id === productId ? { ...product, visible: !product.visible } : product
    );
    onProductsChange(updatedProducts);
  };

  // Filter visible products and create chart metrics array
  const visibleProducts = selectedProducts.filter(product => product.visible);
  const chartMetrics = visibleProducts.map(product => product.id);

  return (
    <div className="space-y-6">
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
                Funnel Analysis ({visibleProducts.length} products selected)
              </h3>
              {isFunnelOpen ? <ChevronUp className="h-4 w-4 text-amber-600" /> : <ChevronDown className="h-4 w-4 text-amber-600" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            {/* Subtle Product Display Settings */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-900">
                    Product Display ({visibleProducts.length} selected)
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {visibleProducts.slice(0, 3).map(product => (
                      <div 
                        key={product.id}
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: product.color }}
                      />
                    ))}
                    {visibleProducts.length > 3 && (
                      <span className="text-xs text-amber-700">+{visibleProducts.length - 3}</span>
                    )}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsCustomizerExpanded(!isCustomizerExpanded)}
                  className="h-6 px-2 text-xs text-amber-600 hover:bg-amber-100/50"
                >
                  {isCustomizerExpanded ? 'Hide' : 'Edit'}
                  {isCustomizerExpanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                </Button>
              </div>
              
              {isCustomizerExpanded && (
                <div className="bg-white/50 rounded-md border border-amber-200/50 p-3 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {selectedProducts.map(product => (
                      <div key={product.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-white/80 transition-colors">
                        <Checkbox
                          id={product.id}
                          checked={product.visible}
                          onCheckedChange={() => toggleProduct(product.id)}
                          className="data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <div 
                            className="w-2 h-2 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: product.color }}
                          />
                          <label
                            htmlFor={product.id}
                            className="text-xs font-medium text-gray-700 cursor-pointer flex-1"
                          >
                            {product.label}
                          </label>
                          {product.visible ? <Eye className="h-3 w-3 text-green-600" /> : <EyeOff className="h-3 w-3 text-gray-400" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Funnel Conversion Percentages - Only show selected products */}
            <Card className="border-amber-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="h-5 w-5 text-amber-600" />
                    Selected Funnel Products ({visibleProducts.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {visibleProducts.map(product => {
                    const currentValue = currentMetrics[product.id] || 0;
                    const previousValue = previousMetrics[product.id] || 0;
                    const change = calculatePercentageChange(currentValue, previousValue);
                    
                    return (
                      <div 
                        key={product.id}
                        className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 border"
                        style={{ borderColor: `${product.color}40` }}
                      >
                        <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                          {getProductIcon(product.id)}
                          <span style={{ color: product.color }}>{product.label}</span>
                        </div>
                        <div className="text-lg font-bold text-gray-800">
                          {currentValue.toFixed(1)}%
                        </div>
                        <div className={`flex items-center gap-1 text-xs mt-1 ${getChangeColor(change)}`}>
                          {getChangeIcon(change)}
                          <span>{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {visibleProducts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No products selected. Use the Product Display settings above to select products to display.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Funnel Conversion Charts - Only show if products are selected */}
            {visibleProducts.length > 0 && (
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
                      metrics={['pageViews', 'optins', 'mainProduct']}
                    />
                  </CardContent>
                </Card>

                <Card className="border-amber-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Selected Product Conversion Rates
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ConversionChart 
                      data={funnelData}
                      title=""
                      metrics={chartMetrics}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* AI Chat Panel for funnel insights */}
      <AIChatPanel dateRange={dateRange} />
    </div>
  );
};
