
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useIntegrations } from "@/hooks/useIntegrations";
import { Settings, CheckCircle, XCircle, RefreshCw } from "lucide-react";

const integrationPlatforms = [
  { 
    id: 'google_sheets', 
    name: 'Google Sheets', 
    description: 'Import custom data and reports',
    color: 'bg-green-100 text-green-700'
  },
  { 
    id: 'facebook_ads', 
    name: 'Facebook Ads', 
    description: 'Ad spend and performance metrics',
    color: 'bg-blue-100 text-blue-700'
  },
  { 
    id: 'clickfunnels', 
    name: 'ClickFunnels', 
    description: 'Funnel analytics and conversions',
    color: 'bg-orange-100 text-orange-700'
  },
  { 
    id: 'gohighlevel', 
    name: 'GoHighLevel', 
    description: 'CRM and funnel data',
    color: 'bg-purple-100 text-purple-700'
  },
  { 
    id: 'activecampaign', 
    name: 'ActiveCampaign', 
    description: 'Email marketing metrics',
    color: 'bg-indigo-100 text-indigo-700'
  },
];

export const IntegrationsPanel = () => {
  const { integrations, updateIntegration } = useIntegrations();

  const getIntegrationStatus = (platformId: string) => {
    const integration = integrations?.find(i => i.platform === platformId);
    return integration?.is_connected || false;
  };

  const handleToggleIntegration = async (platformId: string, isConnected: boolean) => {
    try {
      await updateIntegration.mutateAsync({ platform: platformId, isConnected });
    } catch (error) {
      console.error('Failed to update integration:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Platform Integrations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {integrationPlatforms.map((platform) => {
          const isConnected = getIntegrationStatus(platform.id);
          const integration = integrations?.find(i => i.platform === platform.id);
          
          return (
            <div key={platform.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {isConnected ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{platform.name}</h3>
                    <Badge className={platform.color} variant="secondary">
                      {isConnected ? 'Connected' : 'Not Connected'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{platform.description}</p>
                  {integration?.last_sync && (
                    <p className="text-xs text-gray-500">
                      Last sync: {new Date(integration.last_sync).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isConnected && (
                  <Button variant="ghost" size="sm">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
                <Switch
                  checked={isConnected}
                  onCheckedChange={(checked) => handleToggleIntegration(platform.id, checked)}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
