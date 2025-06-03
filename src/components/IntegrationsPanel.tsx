
import { ProjectIntegrationsPanel } from "./ProjectIntegrationsPanel";

interface IntegrationsPanelProps {
  projectId?: string;
}

export const IntegrationsPanel = ({ projectId }: IntegrationsPanelProps) => {
  return <ProjectIntegrationsPanel projectId={projectId} />;
};
