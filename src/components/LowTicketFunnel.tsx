
import { useState } from "react";
import { MetricCard } from "./MetricCard";
import { ConversionChart } from "./ConversionChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, TrendingUp, MousePointer } from "lucide-react";
import { useGoogleSheetsData } from "@/hooks/useGoogleSheetsData";

interface FunnelProductConfig {
  id: string;
  label: string;
  visible: boolean;
  color: string;
}

interface LowTicketFunnelProps {
  dateRange?: {
    from: Date;
    to: Date;
  };
  selectedProducts: FunnelProductConfig[];
}

export const LowTicketFunnel = ({ dateRange, selectedProducts }: LowTicketFunnelProps) => {
  const [expandedSections, setExpandedSections] = useState({
    funnelMetrics: true,
    adMetrics: true,
    conversionStats: true
  });

  const { syncedData } = useGoogleSheetsData();

  // Get filtered metrics from Google Sheets data
  const getFilteredMetrics = () => {
    if (!syncedData) return null;

    // Filter data by date range if provided
    let filteredData = syncedData;
    if (dateRange) {
      const filtered = syncedData.data.filter(row => {
        const dateField = row['Date'] || row['date'];
        
        if (!dateField) return true;
        
        try {
          const rowDate = new Date(dateField);
          if (!isNaN(rowDate.getTime())) {
            return rowDate >= dateRange.from && rowDate <= dateRange.to;
          }
        } catch (error) {
          return true;
        }
        return true;
      });

      filteredData = {
        ...syncedData,
        data: filtered
      };
    }

    const data = filteredData.data;
    
    // Calculate totals from Google Sheets data using actual column names
    const totals = {
      pageViews: 0,
      optins: 0,
      mainOfferBuyers: 0,
      bumpProductBuyers: 0,
      upsell1Buyers: 0,
      downsell1Buyers: 0,
      upsell2Buyers: 0,
      downsell2Buyers: 0,
      roas: 0,
      spend: 0,
      ctrAll: 0,
      ctrLink: 0,
      cpm: 0,
      frequency: 0
    };

    data.forEach(row => {
      // Map Google Sheets column names to our metrics
      totals.pageViews += parseInt(row['Page Views']?.toString().replace(/[^\d]/g, '') || '0') || 0;
      totals.optins += parseInt(row['Opt-Ins']?.toString().replace(/[^\d]/g, '') || '0') || 0;
      totals.mainOfferBuyers += parseInt(row['Main Offer']?.toString().replace(/[^\d]/g, '') || '0') || 0;
      totals.bumpProductBuyers += parseInt(row['Bump']?.toString().replace(/[^\d]/g, '') || '0') || 0;
      totals.upsell1Buyers += parseInt(row['Upsell 1']?.toString().replace(/[^\d]/g, '') || '0') || 0;
      totals.downsell1Buyers += parseInt(row['Downsell 1']?.toString().replace(/[^\d]/g, '') || '0') || 0;
      totals.upsell2Buyers += parseInt(row['Upsell 2']?.toString().replace(/[^\d]/g, '') || '0') || 0;
      totals.downsell2Buyers += parseInt(row['Downsell 2']?.toString().replace(/[^\d]/g, '') || '0') || 0;
      totals.roas += parseFloat(row['ROAS']?.toString().replace(/[^\d.]/g, '') || '0') || 0;
      
      // These fields might come from Facebook data later
      totals.spend += parseFloat(row['Spend']?.toString().replace(/[$,]/g, '') || '0') || 0;
      totals.ctrAll += parseFloat(row['CTR All']?.toString().replace(/[%]/g, '') || '0') || 0;
      totals.ctrLink += parseFloat(row['CTR Link']?.toString().replace(/[%]/g, '') || '0') || 0;
      totals.cpm += parseFloat(row['CPM']?.toString().replace(/[$,]/g, '') || '0') || 0;
      totals.frequency += parseFloat(row['Frequency']?.toString().replace(/[^\d.]/g, '') || '0') || 0;
    });

    // Calculate averages for percentage-based metrics
    const dataLength = data.length || 1;
    totals.roas = totals.roas / dataLength;
    totals.ctrAll = totals.ctrAll / dataLength;
    totals.ctrLink = totals.ctrLink / dataLength;
    totals.cpm = totals.cpm / dataLength;
    totals.frequency = totals.frequency / dataLength;

    return totals;
  };

  const metrics = getFilteredMetrics();

  // Generate chart data from Google Sheets
  const generateChartData = () => {
    if (!syncedData) return [];

    let data = syncedData.data;
    if (dateRange) {
      data = data.filter(row => {
        const dateField = row['Date'] || row['date'];
        
        if (!dateField) return true;
        
        try {
          const rowDate = new Date(dateField);
          if (!isNaN(rowDate.getTime())) {
            return rowDate >= dateRange.from && rowDate <= dateRange.to;
          }
        } catch (error) {
          return true;
        }
        return true;
      });
    }

    return data.map((row, index) => {
      const date = row['Date'] || row['date'] || `Day ${index + 1}`;
      
      return {
        date: date,
        pageViews: parseInt(row['Page Views']?.toString().replace(/[^\d]/g, '') || '0') || 0,
        optins: parseInt(row['Opt-Ins']?.toString().replace(/[^\d]/g, '') || '0') || 0,
        mainOfferBuyers: parseInt(row['Main Offer']?.toString().replace(/[^\d]/g, '') || '0') || 0,
        bumpProductBuyers: parseInt(row['Bump']?.toString().replace(/[^\d]/g, '') || '0') || 0,
        upsell1Buyers: parseInt(row['Upsell 1']?.toString().replace(/[^\d]/g, '') || '0') || 0,
        downsell1Buyers: parseInt(row['Downsell 1']?.toString().replace(/[^\d]/g, '') || '0') || 0,
        upsell2Buyers: parseInt(row['Upsell 2']?.toString().replace(/[^\d]/g, '') || '0') || 0,
        downsell2Buyers: parseInt(row['Downsell 2']?.toString().replace(/[^\d]/g, '') || '0') || 0,
        roas: parseFloat(row['ROAS']?.toString().replace(/[^\d.]/g, '') || '0') || 0,
        spend: parseFloat(row['Spend']?.toString().replace(/[$,]/g, '') || '0') || 0,
        ctrAll: parseFloat(row['CTR All']?.toString().replace(/[%]/g, '') || '0') || 0,
        ctrLink: parseFloat(row['CTR Link']?.toString().replace(/[%]/g, '') || '0') || 0,
        cpm: parseFloat(row['CPM']?.toString().replace(/[$,]/g, '') || '0') || 0,
        frequency: parseFloat(row['Frequency']?.toString().replace(/[^\d.]/g, '') || '0') || 0
      };
    }).slice(0, 30);
  };

  const chartData = generateChartData();

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
    if (!metrics) return null;
    
    const optinRate = metrics.pageViews > 0 ? (metrics.optins / metrics.pageViews) * 100 : 0;
    const mainOfferRate = metrics.pageViews > 0 ? (metrics.mainOfferBuyers / metrics.pageViews) * 100 : 0;
    const bumpRate = metrics.mainOfferBuyers > 0 ? (metrics.bumpProductBuyers / metrics.mainOfferBuyers) * 100 : 0;
    const upsell1Rate = metrics.mainOfferBuyers > 0 ? (metrics.upsell1Buyers / metrics.mainOfferBuyers) * 100 : 0;
    const downsell1Rate = metrics.mainOfferBuyers > 0 ? (metrics.downsell1Buyers / metrics.mainOfferBuyers) * 100 : 0;
    const upsell2Rate = metrics.mainOfferBuyers > 0 ? (metrics.upsell2Buyers / metrics.mainOfferBuyers) * 100 : 0;
    const downsell2Rate = metrics.mainOfferBuyers > 0 ? (metrics.downsell2Buyers / metrics.mainOfferBuyers) * 100 : 0;

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

  // Show message if no data is available
  if (!syncedData || !metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Low Ticket Funnel Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No Google Sheets data available. Please connect and sync your Google Sheets to see funnel metrics.</p>
        </CardContent>
      </Card>
    );
  }

  // Get visible product config for easy lookup
  const productConfig = selectedProducts.reduce((acc, product) => {
    acc[product.id] = product;
    return acc;
  }, {} as Record<string, FunnelProductConfig>);

  // Build metrics array for charts based on visible products
  const getFunnelMetrics = () => {
    const baseMetrics = ['pageViews', 'optins', 'mainOfferBuyers'];
    const productMetrics = [];
    
    if (productConfig.bump?.visible) productMetrics.push('bumpProductBuyers');
    if (productConfig.upsell1?.visible) productMetrics.push('upsell1Buyers');
    if (productConfig.downsell1?.visible) productMetrics.push('downsell1Buyers');
    if (productConfig.upsell2?.visible) productMetrics.push('upsell2Buyers');
    if (productConfig.downsell2?.visible) productMetrics.push('downsell2Buyers');
    
    return [...baseMetrics, ...productMetrics, 'roas'];
  };

  const getConversionMetrics = () => {
    const baseMetrics = ['optinRate', 'mainOfferRate'];
    const conversionMetrics = [];
    
    if (productConfig.bump?.visible) conversionMetrics.push('bumpRate');
    if (productConfig.upsell1?.visible) conversionMetrics.push('upsell1Rate');
    if (productConfig.downsell1?.visible) conversionMetrics.push('downsell1Rate');
    if (productConfig.upsell2?.visible) conversionMetrics.push('upsell2Rate');
    if (productConfig.downsell2?.visible) conversionMetrics.push('downsell2Rate');
    
    return [...baseMetrics, ...conversionMetrics];
  };

  return (
    <div className="space-y-6">
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
              <MetricCard title="Page Views" value={metrics.pageViews} />
              <MetricCard title="Optins" value={metrics.optins} />
              <MetricCard title="Main Offer Buyers" value={metrics.mainOfferBuyers} />
              <MetricCard title="ROAS" value={metrics.roas} />
            </div>
            
            {productConfig.bump?.visible && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard title="Bump Product Buyers" value={metrics.bumpProductBuyers} />
              </div>
            )}

            {(productConfig.upsell1?.visible || productConfig.downsell1?.visible) && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {productConfig.upsell1?.visible && (
                  <MetricCard title="Upsell 1 Buyers" value={metrics.upsell1Buyers} />
                )}
                {productConfig.downsell1?.visible && (
                  <MetricCard title="Downsell 1 Buyers" value={metrics.downsell1Buyers} />
                )}
              </div>
            )}

            {(productConfig.upsell2?.visible || productConfig.downsell2?.visible) && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {productConfig.upsell2?.visible && (
                  <MetricCard title="Upsell 2 Buyers" value={metrics.upsell2Buyers} />
                )}
                {productConfig.downsell2?.visible && (
                  <MetricCard title="Downsell 2 Buyers" value={metrics.downsell2Buyers} />
                )}
              </div>
            )}

            <ConversionChart 
              data={chartData}
              title="Funnel Performance Trends"
              metrics={getFunnelMetrics()}
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
              <MetricCard title="Spend" value={metrics.spend} format="currency" />
              <MetricCard title="CTR (All)" value={metrics.ctrAll} format="percentage" />
              <MetricCard title="CTR (Link)" value={metrics.ctrLink} format="percentage" />
              <MetricCard title="CPM" value={metrics.cpm} format="currency" />
              <MetricCard title="Frequency" value={metrics.frequency} />
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
      {conversions && (
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
                {productConfig.bump?.visible && (
                  <MetricCard title="Bump Conversion" value={conversions.bumpRate} format="percentage" />
                )}
              </div>
              
              {(productConfig.upsell1?.visible || productConfig.downsell1?.visible) && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {productConfig.upsell1?.visible && (
                    <MetricCard title="Upsell 1 Conversion" value={conversions.upsell1Rate} format="percentage" />
                  )}
                  {productConfig.downsell1?.visible && (
                    <MetricCard title="Downsell 1 Conversion" value={conversions.downsell1Rate} format="percentage" />
                  )}
                </div>
              )}

              {(productConfig.upsell2?.visible || productConfig.downsell2?.visible) && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {productConfig.upsell2?.visible && (
                    <MetricCard title="Upsell 2 Conversion" value={conversions.upsell2Rate} format="percentage" />
                  )}
                  {productConfig.downsell2?.visible && (
                    <MetricCard title="Downsell 2 Conversion" value={conversions.downsell2Rate} format="percentage" />
                  )}
                </div>
              )}

              <ConversionChart 
                data={chartData.map(d => ({
                  ...d,
                  optinRate: d.pageViews > 0 ? (d.optins / d.pageViews) * 100 : 0,
                  mainOfferRate: d.pageViews > 0 ? (d.mainOfferBuyers / d.pageViews) * 100 : 0,
                  bumpRate: d.mainOfferBuyers > 0 ? (d.bumpProductBuyers / d.mainOfferBuyers) * 100 : 0,
                  upsell1Rate: d.mainOfferBuyers > 0 ? (d.upsell1Buyers / d.mainOfferBuyers) * 100 : 0,
                  downsell1Rate: d.mainOfferBuyers > 0 ? (d.downsell1Buyers / d.mainOfferBuyers) * 100 : 0,
                  upsell2Rate: d.mainOfferBuyers > 0 ? (d.upsell2Buyers / d.mainOfferBuyers) * 100 : 0,
                  downsell2Rate: d.mainOfferBuyers > 0 ? (d.downsell2Buyers / d.mainOfferBuyers) * 100 : 0
                }))}
                title="Conversion Rate Trends"
                metrics={getConversionMetrics()}
              />
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
};
