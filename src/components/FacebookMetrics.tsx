
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFacebookData } from "@/hooks/useFacebookData";
import { BarChart3, TrendingUp, Users, DollarSign, MousePointer, Eye } from "lucide-react";

interface FacebookMetricsProps {
  dateRange?: { from: Date; to: Date };
}

export const FacebookMetrics = ({ dateRange }: FacebookMetricsProps) => {
  const { facebookData, isLoading, insights, campaigns, metrics } = useFacebookData({ dateRange });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Facebook Ads Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Loading Facebook data...</p>
        </CardContent>
      </Card>
    );
  }

  if (!facebookData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Facebook Ads Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No Facebook data available. Please sync your Facebook integration.</p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Facebook Ads Performance
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {campaigns.length} Campaigns
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Eye className="h-4 w-4" />
                Impressions
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatNumber(insights.impressions || 0)}
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MousePointer className="h-4 w-4" />
                Clicks
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatNumber(insights.clicks || 0)}
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <DollarSign className="h-4 w-4" />
                Spend
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(insights.spend || 0)}
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                Reach
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatNumber(insights.reach || 0)}
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <TrendingUp className="h-4 w-4" />
                CTR
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {(insights.ctr || 0).toFixed(2)}%
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <DollarSign className="h-4 w-4" />
                CPC
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(insights.cpc || 0)}
              </div>
            </div>
          </div>

          {insights.conversions > 0 && (
            <div className="mt-6 pt-4 border-t">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <div className="text-sm text-gray-600">Conversions</div>
                  <div className="text-xl font-bold text-green-600">
                    {formatNumber(insights.conversions || 0)}
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="text-sm text-gray-600">Conversion Value</div>
                  <div className="text-xl font-bold text-green-600">
                    {formatCurrency(insights.conversion_values || 0)}
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="text-sm text-gray-600">ROAS</div>
                  <div className="text-xl font-bold text-green-600">
                    {insights.spend > 0 
                      ? ((insights.conversion_values || 0) / insights.spend).toFixed(2) + 'x'
                      : '0x'
                    }
                  </div>
                </div>
              </div>
            </div>
          )}

          {facebookData.last_updated && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-gray-500">
                Last updated: {new Date(facebookData.last_updated).toLocaleString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {campaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {campaigns.slice(0, 5).map((campaign: any) => (
                <div key={campaign.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{campaign.name}</div>
                    <div className="text-sm text-gray-600">
                      {campaign.objective} • Created: {new Date(campaign.created_time).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge 
                    variant={campaign.status === 'ACTIVE' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {campaign.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
