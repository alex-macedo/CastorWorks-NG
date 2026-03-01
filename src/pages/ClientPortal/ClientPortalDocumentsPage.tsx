import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientAccessibleProjects } from '@/hooks/clientPortal/useClientAccessibleProjects';
import { useLocalization } from '@/contexts/LocalizationContext';
import { ProjectSelectionModal } from '@/components/ClientPortal/Dialogs/ProjectSelectionModal';

export default function ClientPortalDocumentsPage() {
  const navigate = useNavigate();
  const { data: projects = [], isLoading } = useClientAccessibleProjects();
  const { t } = useLocalization();

  useEffect(() => {
    // If user has only one project, navigate directly
    if (!isLoading && projects.length === 1) {
      navigate(`/portal/${projects[0].id}/documents`);
      return;
    }

    // If user has multiple projects, show modal (handled by the component below)
    // If no projects, show error (handled by modal component)
  }, [projects, isLoading, navigate]);

  // Show modal if multiple projects or loading
  if (isLoading || projects.length > 1 || projects.length === 0) {
    return (
      <ProjectSelectionModal
        isOpen={true}
        onClose={() => navigate('/portal')}
      />
    );
  }

  // This should not be reached, but just in case
  return null;
}