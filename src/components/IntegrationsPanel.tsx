
import { ProjectIntegrationsPanel } from "./ProjectIntegrationsPanel";
import { ProfileSettings } from "./ProfileSettings";
import { ZohoDealsDisplay } from "./ZohoDealsDisplay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Plug, DollarSign } from "lucide-react";

interface IntegrationsPanelProps {
  projectId?: string;
  funnelType?: string;
}

export const IntegrationsPanel = ({ projectId, funnelType }: IntegrationsPanelProps) => {
  // For ads_only projects, only show integrations tab
  if (funnelType === 'ads_only') {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Integrations</h3>
        <ProjectIntegrationsPanel projectId={projectId} projectFunnelType={funnelType} />
      </div>
    );
  }

  return (
    <Tabs defaultValue="integrations" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="integrations" className="flex items-center gap-2">
          <Plug className="h-4 w-4" />
          Integrations
        </TabsTrigger>
        <TabsTrigger value="zoho-deals" className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Zoho Deals
        </TabsTrigger>
        <TabsTrigger value="profile" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Profile Settings
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="integrations" className="space-y-4">
        <ProjectIntegrationsPanel projectId={projectId} projectFunnelType={funnelType} />
      </TabsContent>
      
      <TabsContent value="zoho-deals" className="space-y-4">
        <ZohoDealsDisplay projectId={projectId} />
      </TabsContent>
      
      <TabsContent value="profile" className="space-y-4">
        <ProfileSettings />
      </TabsContent>
    </Tabs>
  );
};
