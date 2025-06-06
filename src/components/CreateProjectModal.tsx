
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useProjects } from "@/hooks/useProjects";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface CreateProjectModalProps {
  onProjectCreated?: (projectId: string) => void;
}

export const CreateProjectModal = ({ onProjectCreated }: CreateProjectModalProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [funnelType, setFunnelType] = useState("");
  const { createProject } = useProjects();

  const funnelTypes = [
    { 
      value: "webinar", 
      label: "Webinar Funnel",
      description: "Registration → Webinar → Sales"
    },
    { 
      value: "book_call", 
      label: "Book A Call Funnel",
      description: "Landing Page → Booking → Sales Call"
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !funnelType) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const project = await createProject.mutateAsync({
        name: name.trim(),
        funnel_type: funnelType,
      });
      
      toast.success("Project created successfully!");
      setName("");
      setFunnelType("");
      setOpen(false);
      onProjectCreated?.(project.id);
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="funnel-type">Funnel Type</Label>
            <Select value={funnelType} onValueChange={setFunnelType} required>
              <SelectTrigger>
                <SelectValue placeholder="Select funnel type" />
              </SelectTrigger>
              <SelectContent>
                {funnelTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-gray-500">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
