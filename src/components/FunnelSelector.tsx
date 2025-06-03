
import { ProjectSelector } from "./ProjectSelector";

interface FunnelSelectorProps {
  selectedProjectId?: string;
  onProjectChange: (projectId: string) => void;
  className?: string;
}

export const FunnelSelector = ({ selectedProjectId, onProjectChange, className }: FunnelSelectorProps) => {
  return (
    <ProjectSelector 
      selectedProjectId={selectedProjectId}
      onProjectChange={onProjectChange}
      className={className}
    />
  );
};
