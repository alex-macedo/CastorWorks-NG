import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useLocalization } from "@/contexts/LocalizationContext";

interface ProjectSelectorProps {
  selectedProjectId: string | null;
  onProjectChange: (projectId: string | null) => void;
  modeType: "single" | "multi";
}

export function ProjectSelector({
  selectedProjectId,
  onProjectChange,
  modeType,
}: ProjectSelectorProps) {
  const { t } = useLocalization();

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  if (modeType === "multi") {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      <Label htmlFor="project-select" className="font-semibold">
        {t("schedule:calendar.selectProject") || "Select Project"}
      </Label>
      <Select
        value={selectedProjectId || ""}
        onValueChange={(value) => onProjectChange(value || null)}
      >
        <SelectTrigger id="project-select" className="w-64">
          <SelectValue placeholder={t("schedule:calendar.chooseProject") || "Choose a project"} />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
