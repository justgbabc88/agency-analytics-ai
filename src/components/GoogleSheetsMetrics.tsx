
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, RefreshCw, Trash2 } from "lucide-react";
import { useGoogleSheetsData } from "@/hooks/useGoogleSheetsData";
import { MetricCard } from "./MetricCard";

export const GoogleSheetsMetrics = () => {
  const { syncedData, calculateMetricsFromSyncedData, clearSyncedData } = useGoogleSheetsData();
  
  const metrics = calculateMetricsFromSyncedData();

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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Google Sheets Data - {syncedData.title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              {metrics.dataRows} rows synced
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
  );
};
