
import { ProjectIntegrationsPanel } from "./ProjectIntegrationsPanel";
import { ProfileSettings } from "./ProfileSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Plug } from "lucide-react";

interface IntegrationsPanelProps {
  projectId?: string;
}

export const IntegrationsPanel = ({ projectId }: IntegrationsPanelProps) => {
  return (
    <Tabs defaultValue="integrations" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="integrations" className="flex items-center gap-2">
          <Plug className="h-4 w-4" />
          Integrations
        </TabsTrigger>
        <TabsTrigger value="profile" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Profile Settings
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="integrations" className="space-y-4">
        <ProjectIntegrationsPanel projectId={projectId} />
      </TabsContent>
      
      <TabsContent value="profile" className="space-y-4">
        <ProfileSettings />
      </TabsContent>
    </Tabs>
  );
};
