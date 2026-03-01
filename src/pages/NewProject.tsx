import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useProjects } from "@/hooks/useProjects";
import { NewProjectSheet } from "@/components/Projects/NewProjectSheet";
import { clearDraft } from "@/utils/draftManager";
import { supabase } from "@/integrations/supabase/client";

const NewProject = () => {
  const navigate = useNavigate();
  const { t } = useLocalization();
  const { createProject } = useProjects();

  // When this page loads, redirect to /projects and open the sheet
  useEffect(() => {
    navigate("/projects", { state: { openNewProjectSheet: true } });
  }, [navigate]);

  const handleSubmit = (data: any) => {
    createProject.mutate(data, {
      onSuccess: (newProject) => {
        // Ensure default project phases exist: Template and Adaptation
        (async () => {
          try {
            const { error: phaseError } = await supabase.from('project_phases').insert([
              { project_id: newProject.id, phase_name: 'Template', start_date: newProject.start_date || null, end_date: newProject.end_date || null, progress_percentage: 0, type: newProject.start_date ? 'schedule' : 'budget' },
              { project_id: newProject.id, phase_name: 'Adaptation', start_date: newProject.start_date || null, end_date: newProject.end_date || null, progress_percentage: 0, type: newProject.start_date ? 'schedule' : 'budget' }
            ]);
            if (phaseError) console.warn('Failed to create default phases:', phaseError.message || phaseError);
          } catch (err) {
            console.error('Error creating default phases', err);
          }
        })();
        clearDraft();
        navigate(`/projects/${newProject.id}`);
      },
    });
  };

  // This component now just redirects, but we keep the sheet here for the redirect
  return (
    <NewProjectSheet
      open={false}
      onOpenChange={() => {}}
      onSubmit={handleSubmit}
      isLoading={createProject.isPending}
    />
  );
};

export default NewProject;
