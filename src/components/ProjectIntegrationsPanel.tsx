import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useProjectIntegrations } from "@/hooks/useProjectIntegrations";
import { GoogleSheetsConnector } from "./GoogleSheetsConnector";
import { FacebookConnector } from "./FacebookConnector";
import { ClickFunnelsOAuthConnector } from "./ClickFunnelsOAuthConnector";
import { CalendlyConnector } from "./CalendlyConnector";
import { GoHighLevelConnector } from "./GoHighLevelConnector";
import { Settings, CheckCircle, XCircle, RefreshCw, FileSpreadsheet, BarChart3, ChevronDown, ChevronRight, Target, Calendar, FormInput } from "lucide-react";
import { useState } from "react";

const integrationPlatforms = [
  { 
    id: 'google_sheets', 
    name: 'Google Sheets', 
    description: 'Import custom data and reports',
    color: 'bg-green-100 text-green-700',
    icon: FileSpreadsheet
  },
  { 
    id: 'facebook', 
    name: 'Facebook Ads', 
    description: 'Facebook advertising data and analytics',
    color: 'bg-blue-100 text-blue-700',
    icon: BarChart3
  },
  { 
    id: 'clickfunnels', 
    name: 'ClickFunnels', 
    description: 'Funnel analytics and conversions',
    color: 'bg-orange-100 text-orange-700',
    icon: Target
  },
  { 
    id: 'calendly', 
    name: 'Calendly', 
    description: 'Track scheduled calls and appointments',
    color: 'bg-purple-100 text-purple-700',
    icon: Calendar
  },
  { 
    id: 'ghl', 
    name: 'Go High Level', 
    description: 'Track form submissions and leads',
    color: 'bg-cyan-100 text-cyan-700',
    icon: FormInput
  },
];

interface ProjectIntegrationsPanelProps {
  projectId?: string;
}

export const ProjectIntegrationsPanel = ({ projectId }: ProjectIntegrationsPanelProps) => {
  const { integrations, updateIntegration } = useProjectIntegrations(projectId);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const getIntegrationStatus = (platformId: string) => {
    const integration = integrations?.find(i => i.platform === platformId);
    return integration?.is_connected || false;
  };

  const handleToggleIntegration = async (platformId: string, isConnected: boolean) => {
    if (!projectId) return;
    
    try {
      await updateIntegration.mutateAsync({ platform: platformId, isConnected });
    } catch (error) {
      console.error('Failed to update integration:', error);
    }
  };

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const renderIntegrationHeader = (platform: any) => {
    const isConnected = getIntegrationStatus(platform.id);
    const integration = integrations?.find(i => i.platform === platform.id);
    const IconComponent = platform.icon;
    const isOpen = openSections[platform.id];
    
    return (
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <IconComponent className="h-5 w-5 text-gray-500" />
            </div>
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
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </CollapsibleTrigger>
    );
  };

  const renderIntegrationContent = (platform: any) => {
    const isConnected = getIntegrationStatus(platform.id);
    
    switch (platform.id) {
      case 'google_sheets':
        return <GoogleSheetsConnector />;
      case 'facebook':
        return <FacebookConnector />;
      case 'clickfunnels':
        return (
          <ClickFunnelsOAuthConnector
            projectId={projectId}
            isConnected={isConnected}
            onConnectionChange={(connected) => {
              if (connected) {
                handleToggleIntegration(platform.id, true);
              }
            }}
          />
        );
      case 'calendly':
        return (
          <CalendlyConnector
            projectId={projectId}
            isConnected={isConnected}
            onConnectionChange={(connected) => {
              if (connected) {
                handleToggleIntegration(platform.id, true);
              }
            }}
          />
        );
        case 'ghl':
        return (
          <GoHighLevelConnector
            projectId={projectId}
            isConnected={isConnected}
            onConnectionChange={(connected) => {
              if (connected) {
                handleToggleIntegration(platform.id, true);
              }
            }}
            selectedFormIds={[]}
            onFormSelectionChange={() => {}} // Add empty handler
          />
        );
      default:
        return null;
    }
  };

  if (!projectId) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-500">Please select a project to manage integrations.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Project Integrations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {integrationPlatforms.map((platform) => (
            <Collapsible
              key={platform.id}
              open={openSections[platform.id]}
              onOpenChange={() => toggleSection(platform.id)}
            >
              {renderIntegrationHeader(platform)}
              <CollapsibleContent className="mt-4">
                <div className="pl-6 border-l-2 border-gray-100">
                  {renderIntegrationContent(platform)}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
