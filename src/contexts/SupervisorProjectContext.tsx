import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Project {
  id: string;
  name: string;
  client_id?: string | null;
}

interface SupervisorProjectContextType {
  projects: Project[];
  selectedProject: string;
  setSelectedProject: (projectId: string) => void;
  loading: boolean;
  refreshProjects: () => void;
}

const SupervisorProjectContext = createContext<SupervisorProjectContextType | undefined>(undefined);

export const SupervisorProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchProjects = React.useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error("Auth error in SupervisorProjectContext:", authError);
        setLoading(false);
        return;
      }
      
      if (!user) {
        console.warn("No user found in SupervisorProjectContext");
        setLoading(false);
        return;
      }

      console.log("Fetching projects for user:", user.id);
      console.log("User email:", user.email);

      // Verify session is valid
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error("No valid session found:", sessionError);
        setProjects([]);
        setLoading(false);
        return;
      }
      console.log("Session valid, access token present:", !!session.access_token);

      // Query projects directly - RLS will filter based on user access
      // This includes projects from project_team_members, client_project_access,
      // project ownership, and internal roles
      // Fetch client info separately to avoid RLS join issues
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, client_id")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching projects from Supabase:", error);
        console.error("Error details:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        setProjects([]);
        setLoading(false);
        return;
      }

      console.log("Projects fetched successfully:", data?.length || 0, "projects");
      if (data && data.length > 0) {
        console.log("Project IDs:", data.map(p => ({ id: p.id, name: p.name })));
      } else {
        console.warn("No projects returned - this might be an RLS issue");
      }
      
      // Deduplicate projects by ID (in case of any duplicates)
      const uniqueProjects = Array.from(
        new Map(data?.map(p => [p.id, p]) || []).values()
      );
      
      console.log("Unique projects after deduplication:", uniqueProjects.length);
      setProjects(uniqueProjects);

      // Try to restore last selected project from localStorage
      const savedProjectId = localStorage.getItem('supervisor-selected-project');
      if (savedProjectId && uniqueProjects.find(p => p.id === savedProjectId)) {
        setSelectedProject(savedProjectId);
      } else if (uniqueProjects.length > 0) {
        // Select first project if no saved selection
        setSelectedProject(uniqueProjects[0].id);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      // Set empty array on error to prevent stale data
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Log when projects change
  useEffect(() => {
    console.log("Projects state updated:", projects.length, "projects");
    if (projects.length > 0) {
      console.log("Available projects:", projects.map(p => p.name));
    }
  }, [projects]);

  useEffect(() => {
    // Persist selected project to localStorage
    if (selectedProject) {
      localStorage.setItem('supervisor-selected-project', selectedProject);
    }
  }, [selectedProject]);


  return (
    <SupervisorProjectContext.Provider
      value={{
        projects,
        selectedProject,
        setSelectedProject,
        loading,
        refreshProjects: fetchProjects,
      }}
    >
      {children}
    </SupervisorProjectContext.Provider>
  );
};

export const useSupervisorProject = () => {
  const context = useContext(SupervisorProjectContext);
  if (!context) {
    throw new Error('useSupervisorProject must be used within SupervisorProjectProvider');
  }
  return context;
};
