import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useProjectIntegrations } from "@/hooks/useProjectIntegrations";
import { FacebookConnector } from "./FacebookConnector";
import { CalendlyConnector } from "./CalendlyConnector";
import { GoHighLevelConnector } from "./GoHighLevelConnector";
import { ZohoCRMConnector } from "./ZohoCRMConnector";
import { ZohoDealsDisplay } from "./ZohoDealsDisplay";
import { EverWebinarConnector } from "./EverWebinarConnector";
import { Settings, CheckCircle, XCircle, RefreshCw, BarChart3, ChevronDown, ChevronRight, Calendar, FormInput, Users, Video } from "lucide-react";
import { useState } from "react";

interface ProjectIntegrationsPanelProps {
  projectId?: string;
  selectedFormIds?: string[];
  onFormSelectionChange?: (formIds: string[]) => void;
  onGHLDataRefresh?: () => void; // Add GHL data refresh function
  projectFunnelType?: string; // Add funnel type to show appropriate integrations
  zohoLeadSourceFilter?: {
    leadSources: string[];
    selectedLeadSources: string[];
    filteredDeals: any[];
    loading: boolean;
    handleLeadSourceToggle: (source: string, checked: boolean) => void;
    clearAllLeadSources: () => void;
    selectAllLeadSources: () => void;
  };
}

export const ProjectIntegrationsPanel = ({ projectId, selectedFormIds = [], onFormSelectionChange, onGHLDataRefresh, projectFunnelType, zohoLeadSourceFilter }: ProjectIntegrationsPanelProps) => {
  const { integrations, updateIntegration } = useProjectIntegrations(projectId);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  // Get integrations available for this project type
  const getAvailableIntegrations = () => {
    const baseIntegrations = [
      { 
        id: 'facebook', 
        name: 'Facebook Ads', 
        description: 'Facebook advertising data and analytics',
        color: 'bg-blue-100 text-blue-700',
        icon: BarChart3
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
      { 
        id: 'zoho_crm', 
        name: 'Zoho CRM', 
        description: 'Sync contacts, leads, and deals',
        color: 'bg-red-100 text-red-700',
        icon: Users
      },
    ];

    // Add EverWebinar integration only for webinar projects
    if (projectFunnelType === 'webinar') {
      baseIntegrations.push({
        id: 'everwebinar',
        name: 'EverWebinar',
        description: 'Webinar registrations and attendance tracking',
        color: 'bg-purple-100 text-purple-700',
        icon: Video
      });
    }

    return baseIntegrations;
  };

  const integrationPlatforms = getAvailableIntegrations();

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
      case 'facebook':
        return <FacebookConnector projectId={selectedProject.id} />;
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
            selectedFormIds={selectedFormIds}
            onFormSelectionChange={onFormSelectionChange}
            onDataRefresh={onGHLDataRefresh}
          />
        );
      case 'zoho_crm':
        return (
          <div className="space-y-4">
            <ZohoCRMConnector
              projectId={projectId}
              isConnected={isConnected}
              onConnectionChange={(connected) => {
                if (connected) {
                  handleToggleIntegration(platform.id, true);
                }
              }}
            />
            {isConnected && <ZohoDealsDisplay projectId={projectId} zohoLeadSourceFilter={zohoLeadSourceFilter} />}
          </div>
        );
      case 'everwebinar':
        return (
          <EverWebinarConnector
            projectId={projectId}
            isConnected={isConnected}
            onConnectionChange={(connected) => {
              if (connected) {
                handleToggleIntegration(platform.id, true);
              }
            }}
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
