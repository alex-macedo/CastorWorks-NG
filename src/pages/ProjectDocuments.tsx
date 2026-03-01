/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import { useParams } from "react-router-dom";
import { useProject } from "@/hooks/useProjects";
import { ProjectHeader } from "@/components/Project/ProjectHeader";
import { DocumentsPage } from "@/components/Documents/DocumentsPage";

export default function ProjectDocuments() {
  const { id: projectId } = useParams();
  const { project, isLoading: projectLoading } = useProject(projectId);

  return (
    <DocumentsPage
      projectId={projectId}
      headerComponent={
        <ProjectHeader project={project} isLoading={projectLoading} />
      }
      showProjectHeader={true}
      showAutoCreateFolders={true}
      showApplyTemplates={true}
    />
  );
}