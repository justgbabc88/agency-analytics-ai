
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, RefreshCw, Trash2 } from "lucide-react";
import { useGoogleSheetsData } from "@/hooks/useGoogleSheetsData";
import { MetricCard } from "./MetricCard";
import { ConversionChart } from "./ConversionChart";
import { isWithinInterval, parseISO, isValid } from "date-fns";

interface GoogleSheetsMetricsProps {
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export const GoogleSheetsMetrics = ({ dateRange }: GoogleSheetsMetricsProps) => {
  const { syncedData, calculateMetricsFromSyncedData, clearSyncedData } = useGoogleSheetsData();
  
  // Filter data based on date range if provided
  const getFilteredData = () => {
    if (!syncedData || !dateRange) return syncedData;
    
    const filteredData = syncedData.data.filter(row => {
      // Try to find a date field in the row
      const dateField = Object.keys(row).find(key => 
        key.toLowerCase().includes('date') || 
        key.toLowerCase().includes('day') ||
        key.toLowerCase().includes('time')
      );
      
      if (!dateField || !row[dateField]) return true; // Include if no date field
      
      try {
        // Try parsing the date in various formats
        let rowDate: Date;
        const dateValue = row[dateField];
        
        // Try ISO format first
        if (dateValue.includes('-') || dateValue.includes('/')) {
          rowDate = new Date(dateValue);
        } else {
          // If it's just a number, might be a day number
          return true; // Include all non-standard date formats
        }
        
        if (!isValid(rowDate)) return true; // Include if date is invalid
        
        return isWithinInterval(rowDate, {
          start: dateRange.from,
          end: dateRange.to
        });
      } catch (error) {
        return true; // Include if date parsing fails
      }
    });
    
    return {
      ...syncedData,
      data: filteredData
    };
  };

  const filteredSyncedData = getFilteredData();
  const metrics = calculateMetricsFromSyncedData(filteredSyncedData);

  if (!syncedData || !metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Google Sheets Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">No synced data available. Connect and sync your Google Sheets to see metrics here.</p>
        </CardContent>
      </Card>
    );
  }

  // Transform the filtered data for charts
  const generateChartData = () => {
    const data = filteredSyncedData?.data || [];
    
    // Group data by date if there's a date field, otherwise create sample dates
    const chartData = data.map((row, index) => {
      // Try to find a date field in the row
      const dateField = Object.keys(row).find(key => 
        key.toLowerCase().includes('date') || 
        key.toLowerCase().includes('day') ||
        key.toLowerCase().includes('time')
      );
      
      const date = dateField ? row[dateField] : `Day ${index + 1}`;
      
      return {
        date: date,
        roas: parseFloat(row.ROAS?.replace(/[^\d.]/g, '') || '0') || 0,
        revenue: parseFloat(row.Revenue?.replace(/[$,]/g, '') || '0') || 0,
        cost: parseFloat(row.Cost?.replace(/[$,]/g, '') || '0') || 0,
        conversionRate: parseFloat(row['Conversion Rate']?.replace(/[%]/g, '') || '0') || 0,
        impressions: parseInt(row.Impressions?.replace(/[^\d]/g, '') || '0') || 0,
        clicks: parseInt(row.Clicks?.replace(/[^\d]/g, '') || '0') || 0,
        conversions: parseInt(row.Conversions?.replace(/[^\d]/g, '') || '0') || 0,
      };
    }).slice(0, 30); // Limit to last 30 entries for better visualization

    return chartData;
  };

  const chartData = generateChartData();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Google Sheets Data - {syncedData.title}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                {metrics.dataRows} rows {dateRange ? '(filtered)' : 'synced'}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSyncedData}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Last synced: {new Date(syncedData.syncedAt).toLocaleString()}
            {dateRange && (
              <span className="ml-2 text-blue-600">
                • Filtered: {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
              </span>
            )}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard 
              title="Total Impressions" 
              value={metrics.impressions} 
              previousValue={Math.floor(metrics.impressions * 0.9)}
            />
            <MetricCard 
              title="Total Clicks" 
              value={metrics.clicks} 
              previousValue={Math.floor(metrics.clicks * 0.85)}
            />
            <MetricCard 
              title="Total Cost" 
              value={metrics.cost} 
              previousValue={metrics.cost * 1.1}
              format="currency"
            />
            <MetricCard 
              title="Total Revenue" 
              value={metrics.revenue} 
              previousValue={metrics.revenue * 0.92}
              format="currency"
            />
            <MetricCard 
              title="CTR" 
              value={metrics.ctr} 
              previousValue={metrics.ctr * 0.95}
              format="percentage"
            />
            <MetricCard 
              title="Conversion Rate" 
              value={metrics.conversionRate} 
              previousValue={metrics.conversionRate * 0.88}
              format="percentage"
            />
            <MetricCard 
              title="CPC" 
              value={metrics.cpc} 
              previousValue={metrics.cpc * 1.05}
              format="currency"
            />
            <MetricCard 
              title="ROAS" 
              value={metrics.roas} 
              previousValue={metrics.roas * 0.93}
            />
          </div>
        </CardContent>
      </Card>

      {/* ROAS Trends Chart */}
      <ConversionChart 
        data={chartData}
        title="ROAS Trends"
        metrics={['roas']}
      />

      {/* Revenue Trends Chart */}
      <ConversionChart 
        data={chartData}
        title="Revenue Trends"
        metrics={['revenue']}
      />

      {/* Conversion Trends Chart */}
      <ConversionChart 
        data={chartData}
        title="Conversion Trends"
        metrics={['conversionRate', 'conversions']}
      />

      {/* Ad Metrics Trends Chart */}
      <ConversionChart 
        data={chartData}
        title="Ad Metrics Trends"
        metrics={['impressions', 'clicks', 'cost']}
      />
    </div>
  );
};
