
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjects } from "@/hooks/useProjects";
import { RenameProjectModal } from "./RenameProjectModal";

interface ProjectSelectorProps {
  selectedProjectId?: string;
  onProjectChange: (projectId: string) => void;
  className?: string;
}

export const ProjectSelector = ({ selectedProjectId, onProjectChange, className }: ProjectSelectorProps) => {
  const { projects, isLoading } = useProjects();

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Select disabled>
          <SelectTrigger className={className}>
            <SelectValue placeholder="Loading projects..." />
          </SelectTrigger>
        </Select>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedProjectId} onValueChange={onProjectChange}>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Select a project" />
        </SelectTrigger>
        <SelectContent className="bg-white border border-gray-200 z-50">
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name} ({project.funnel_type.replace('_', ' ')})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedProject && (
        <RenameProjectModal
          projectId={selectedProject.id}
          currentName={selectedProject.name}
          variant="icon"
          size="sm"
        />
      )}
    </div>
  );
};
