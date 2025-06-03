
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjects } from "@/hooks/useProjects";

interface ProjectSelectorProps {
  selectedProjectId?: string;
  onProjectChange: (projectId: string) => void;
  className?: string;
}

export const ProjectSelector = ({ selectedProjectId, onProjectChange, className }: ProjectSelectorProps) => {
  const { projects, isLoading } = useProjects();

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Loading projects..." />
        </SelectTrigger>
      </Select>
    );
  }

  return (
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
  );
};
