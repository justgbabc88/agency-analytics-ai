import { useState } from "react";
import { useFacebookData } from "@/hooks/useFacebookData";

import { FacebookCampaignFilter } from "./FacebookCampaignFilter";
import { FacebookBatchSyncButton } from "./FacebookBatchSyncButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, AlertTriangle } from "lucide-react";

interface FacebookMetricsEnhancedProps {
  dateRange?: { from: Date; to: Date };
}

export const FacebookMetricsEnhanced = ({ dateRange }: FacebookMetricsEnhancedProps) => {
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [selectedAdSetIds, setSelectedAdSetIds] = useState<string[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);

  const { 
    facebookData, 
    isLoading, 
    insights, 
    campaigns, 
    adSets, 
    filteredAdSets,
    meta 
  } = useFacebookData({ 
    dateRange, 
    campaignIds: selectedCampaignIds,
    adSetIds: selectedAdSetIds 
  });

  const handleRetrySyncAd = async () => {
    setIsRetrying(true);
    // Trigger a manual sync - this would typically refetch the data
    setTimeout(() => {
      setIsRetrying(false);
    }, 3000);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Facebook Advertising</h2>
          <Badge variant="outline">Loading...</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!facebookData) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold mb-2">Facebook Advertising</h2>
        <p className="text-muted-foreground">Connect your Facebook account to view advertising metrics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Facebook Advertising</h2>
          {meta?.adSetsAvailable ? (
            <Badge variant="default" className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Full Data Available
            </Badge>
          ) : (
            <Badge variant="outline" className="border-yellow-500 text-yellow-700">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Limited Data
            </Badge>
          )}
        </div>
        <FacebookBatchSyncButton />
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          <FacebookCampaignFilter
            campaigns={campaigns}
            selectedCampaignIds={selectedCampaignIds}
            onCampaignChange={setSelectedCampaignIds}
          />
          
        </div>
        
        <Separator />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${insights.spend?.toLocaleString() || '0'}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Impressions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.impressions?.toLocaleString() || '0'}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.clicks?.toLocaleString() || '0'}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">CTR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.ctr?.toFixed(2) || '0.00'}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Data Status Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Data Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Campaigns Available</span>
            <Badge variant="default">{campaigns.length}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Ad Sets Available</span>
            <Badge variant={meta?.adSetsAvailable ? "default" : "outline"}>
              {adSets.length}
              {meta?.rateLimitHit && " (Rate Limited)"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Sync Method</span>
            <Badge variant="outline">{meta?.syncMethod || 'Unknown'}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Last Updated</span>
            <span className="text-sm">{facebookData.last_updated ? new Date(facebookData.last_updated).toLocaleString() : 'Never'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};