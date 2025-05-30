
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useIntegrations } from "@/hooks/useIntegrations";
import { useApiKeys } from "@/hooks/useApiKeys";
import { ApiKeyManager } from "./ApiKeyManager";
import { GoogleSheetsConnector } from "./GoogleSheetsConnector";
import { SupermetricsConnector } from "./SupermetricsConnector";
import { Settings, CheckCircle, XCircle, RefreshCw, Key, FileSpreadsheet, BarChart3 } from "lucide-react";

const integrationPlatforms = [
  { 
    id: 'google_sheets', 
    name: 'Google Sheets', 
    description: 'Import custom data and reports',
    color: 'bg-green-100 text-green-700',
    icon: FileSpreadsheet
  },
  { 
    id: 'supermetrics', 
    name: 'Supermetrics', 
    description: 'Advanced marketing data analytics',
    color: 'bg-blue-100 text-blue-700',
    icon: BarChart3
  },
  { 
    id: 'clickfunnels', 
    name: 'ClickFunnels', 
    description: 'Funnel analytics and conversions',
    color: 'bg-orange-100 text-orange-700',
    icon: Settings
  },
  { 
    id: 'gohighlevel', 
    name: 'GoHighLevel', 
    description: 'CRM and funnel data',
    color: 'bg-purple-100 text-purple-700',
    icon: Settings
  },
  { 
    id: 'activecampaign', 
    name: 'ActiveCampaign', 
    description: 'Email marketing metrics',
    color: 'bg-indigo-100 text-indigo-700',
    icon: Settings
  },
];

export const IntegrationsPanel = () => {
  const { integrations, updateIntegration } = useIntegrations();
  const { saveApiKeys, getApiKeys, hasApiKeys } = useApiKeys();

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
    <div className="space-y-6">
      {/* Platform Integrations Overview */}
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
            const hasKeys = hasApiKeys(platform.id);
            const integration = integrations?.find(i => i.platform === platform.id);
            const IconComponent = platform.icon;
            
            return (
              <div key={platform.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <IconComponent className="h-5 w-5 text-gray-500" />
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
                      {hasKeys && !['google_sheets', 'supermetrics'].includes(platform.id) && (
                        <Badge variant="outline" className="text-xs">
                          <Key className="h-3 w-3 mr-1" />
                          API Keys Set
                        </Badge>
                      )}
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
                    disabled={!hasKeys && !['google_sheets', 'supermetrics'].includes(platform.id)}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Separator />

      {/* Google Sheets Configuration */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Google Sheets Setup
        </h3>
        <GoogleSheetsConnector />
      </div>

      <Separator />

      {/* Supermetrics Configuration */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Supermetrics Setup
        </h3>
        <SupermetricsConnector />
      </div>

      <Separator />

      {/* API Keys Configuration for other platforms */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Key className="h-5 w-5" />
          API Configuration
        </h3>
        <div className="grid gap-4">
          {integrationPlatforms
            .filter(p => !['google_sheets', 'supermetrics'].includes(p.id))
            .map((platform) => (
              <ApiKeyManager
                key={platform.id}
                platform={platform.id}
                onSave={(keys) => saveApiKeys(platform.id, keys)}
                savedKeys={getApiKeys(platform.id)}
              />
            ))}
        </div>
      </div>
    </div>
  );
};
