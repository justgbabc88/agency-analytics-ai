import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, RefreshCw, Trash2 } from "lucide-react";
import { useGoogleSheetsData } from "@/hooks/useGoogleSheetsData";
import { MetricCard } from "./MetricCard";
import { ConversionChart } from "./ConversionChart";
import { isWithinInterval, parseISO, isValid, parse } from "date-fns";

interface GoogleSheetsMetricsProps {
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export const GoogleSheetsMetrics = ({ dateRange }: GoogleSheetsMetricsProps) => {
  const { syncedData, calculateMetricsFromSyncedData, clearSyncedData } = useGoogleSheetsData();
  
  // Enhanced date parsing function
  const parseDate = (dateString: string): Date | null => {
    if (!dateString) return null;
    
    try {
      // Try different date formats
      const formats = [
        'M/d/yyyy',
        'MM/dd/yyyy', 
        'yyyy-MM-dd',
        'M/d/yy',
        'MM/dd/yy',
        'd/M/yyyy',
        'dd/MM/yyyy'
      ];
      
      for (const format of formats) {
        try {
          const parsedDate = parse(dateString, format, new Date());
          if (isValid(parsedDate)) {
            return parsedDate;
          }
        } catch (e) {
          continue;
        }
      }
      
      // Fallback to standard Date parsing
      const date = new Date(dateString);
      return isValid(date) ? date : null;
    } catch (error) {
      console.warn(`Failed to parse date: ${dateString}`, error);
      return null;
    }
  };
  
  // Filter data based on date range if provided
  const getFilteredData = () => {
    if (!syncedData) return syncedData;
    
    if (!dateRange) return syncedData;
    
    console.log('Filtering data with date range:', dateRange);
    console.log('Original data rows:', syncedData.data.length);
    
    const filteredData = syncedData.data.filter(row => {
      // Try to find a date field in the row
      const dateField = Object.keys(row).find(key => 
        key.toLowerCase().includes('date') || 
        key.toLowerCase().includes('day') ||
        key.toLowerCase().includes('time')
      );
      
      if (!dateField || !row[dateField]) {
        console.log('No date field found for row, including by default');
        return true; // Include if no date field
      }
      
      const rowDate = parseDate(row[dateField]);
      
      if (!rowDate) {
        console.log(`Could not parse date: ${row[dateField]}, including by default`);
        return true; // Include if date is invalid
      }
      
      const isInRange = isWithinInterval(rowDate, {
        start: dateRange.from,
        end: dateRange.to
      });
      
      console.log(`Date ${row[dateField]} (${rowDate.toISOString()}) is ${isInRange ? 'within' : 'outside'} range`);
      return isInRange;
    });
    
    console.log('Filtered data rows:', filteredData.length);
    
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

  // Transform the filtered data for charts with better date handling
  const generateChartData = () => {
    const data = filteredSyncedData?.data || [];
    
    console.log('Generating chart data from filtered data:', data.length, 'rows');
    
    // Process each row and create chart data points
    const chartData = data.map((row, index) => {
      // Try to find a date field in the row
      const dateField = Object.keys(row).find(key => 
        key.toLowerCase().includes('date') || 
        key.toLowerCase().includes('day') ||
        key.toLowerCase().includes('time')
      );
      
      const dateValue = dateField ? row[dateField] : `Day ${index + 1}`;
      const parsedDate = parseDate(dateValue);
      
      // Use the original date string for display, but ensure consistent formatting
      const displayDate = parsedDate ? 
        parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 
        dateValue;
      
      return {
        date: displayDate,
        originalDate: dateValue,
        roas: parseFloat(row.ROAS?.replace(/[^\d.]/g, '') || '0') || 0,
        revenue: parseFloat(row.Revenue?.replace(/[$,]/g, '') || '0') || 0,
        cost: parseFloat(row.Cost?.replace(/[$,]/g, '') || '0') || 0,
        conversionRate: parseFloat(row['Conversion Rate']?.replace(/[%]/g, '') || '0') || 0,
        impressions: parseInt(row.Impressions?.replace(/[^\d]/g, '') || '0') || 0,
        clicks: parseInt(row.Clicks?.replace(/[^\d]/g, '') || '0') || 0,
        conversions: parseInt(row.Conversions?.replace(/[^\d]/g, '') || '0') || 0,
        pageViews: parseInt(row['Page Views']?.replace(/[^\d]/g, '') || '0') || 0,
        optins: parseInt(row['Opt-Ins']?.replace(/[^\d]/g, '') || '0') || 0,
        mainOffer: parseInt(row['Main Offer']?.replace(/[^\d]/g, '') || '0') || 0,
        bump: parseInt(row['Bump']?.replace(/[^\d]/g, '') || '0') || 0,
        upsell1: parseInt(row['Upsell 1']?.replace(/[^\d]/g, '') || '0') || 0,
        downsell1: parseInt(row['Downsell 1']?.replace(/[^\d]/g, '') || '0') || 0,
        upsell2: parseInt(row['Upsell 2']?.replace(/[^\d]/g, '') || '0') || 0,
        downsell2: parseInt(row['Downsell 2']?.replace(/[^\d]/g, '') || '0') || 0,
      };
    }).filter(item => 
      // Keep all data points, even if some metrics are zero
      item.date !== undefined
    );

    console.log('Generated chart data:', chartData);
    return chartData;
  };

  const chartData = generateChartData();
  const hasFilteredData = filteredSyncedData && filteredSyncedData.data.length > 0;
  const isFiltered = dateRange && filteredSyncedData && filteredSyncedData.data.length !== syncedData.data.length;

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
                {hasFilteredData ? `${filteredSyncedData.data.length} of ${syncedData.data.length} rows` : `${syncedData.data.length} rows`}
                {isFiltered ? ' (filtered)' : ' synced'}
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
            {isFiltered && (
              <span className="ml-2 text-blue-600">
                • Showing data from {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
              </span>
            )}
            {!hasFilteredData && dateRange && (
              <span className="ml-2 text-amber-600">
                • No data found in selected date range
              </span>
            )}
          </p>
        </CardHeader>
        <CardContent>
          {hasFilteredData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard 
                title="Total Page Views" 
                value={metrics.pageViews} 
                previousValue={Math.floor(metrics.pageViews * 0.9)}
              />
              <MetricCard 
                title="Total Opt-ins" 
                value={metrics.optins} 
                previousValue={Math.floor(metrics.optins * 0.85)}
              />
              <MetricCard 
                title="Total Conversions" 
                value={metrics.conversions} 
                previousValue={Math.floor(metrics.conversions * 0.92)}
              />
              <MetricCard 
                title="Avg ROAS" 
                value={metrics.roas} 
                previousValue={metrics.roas * 0.93}
              />
              <MetricCard 
                title="Conversion Rate" 
                value={metrics.conversionRate} 
                previousValue={metrics.conversionRate * 0.88}
                format="percentage"
              />
              <MetricCard 
                title="Total Revenue" 
                value={metrics.revenue} 
                previousValue={metrics.revenue * 0.95}
                format="currency"
              />
              <MetricCard 
                title="Total Cost" 
                value={metrics.cost} 
                previousValue={metrics.cost * 1.1}
                format="currency"
              />
              <MetricCard 
                title="Data Points" 
                value={metrics.dataRows} 
                previousValue={metrics.dataRows - 1}
              />
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {dateRange ? 'No data available in the selected date range.' : 'No data available.'}
              </p>
              {dateRange && (
                <p className="text-sm text-gray-400 mt-2">
                  Try adjusting your date filter to include more data.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {hasFilteredData && chartData.length > 0 && (
        <>
          {/* Funnel Performance Chart */}
          <ConversionChart 
            data={chartData}
            title="Funnel Performance Over Time"
            metrics={['pageViews', 'optins', 'mainOffer', 'bump']}
          />

          {/* ROAS Trends Chart */}
          <ConversionChart 
            data={chartData}
            title="ROAS Trends"
            metrics={['roas']}
          />

          {/* Upsells Performance Chart */}
          {chartData.some(d => d.upsell1 > 0 || d.downsell1 > 0 || d.upsell2 > 0 || d.downsell2 > 0) && (
            <ConversionChart 
              data={chartData}
              title="Upsells & Downsells Performance"
              metrics={['upsell1', 'downsell1', 'upsell2', 'downsell2']}
            />
          )}

          {/* Revenue & Cost Trends Chart */}
          {chartData.some(d => d.revenue > 0 || d.cost > 0) && (
            <ConversionChart 
              data={chartData}
              title="Revenue & Cost Trends"
              metrics={['revenue', 'cost']}
            />
          )}
        </>
      )}
    </div>
  );
};
