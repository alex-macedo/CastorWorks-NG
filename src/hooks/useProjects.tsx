import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';
import { DEFAULT_CONSTRUCTION_ACTIVITIES } from '@/constants/defaultActivities';
import { calculateActivityDates } from '@/utils/timelineCalculators';
import { useUserRoles } from '@/hooks/useUserRoles';

type Project = Database['public']['Tables']['projects']['Row'];
type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
type ProjectUpdate = Database['public']['Tables']['projects']['Update'];
type ProjectTeamMemberInsert = Database['public']['Tables']['project_team_members']['Insert'];

export const useProjects = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: userRoles = [] } = useUserRoles();
  const isArchitect = userRoles.some(r => r.role === 'architect');
  const isAdmin = userRoles.some(r => r.role === 'admin' || r.role === 'project_manager' || r.role === 'global_admin');
  const isGlobalAdmin = userRoles.some(r => r.role === 'global_admin');

  const mapProjectWithAggregates = (project: any) => {
    if (!project) return null;
    const phases = (project as any).project_phases || [];
    const hasPhases = phases.length > 0;

    const avgProgress = hasPhases
      ? phases.reduce((sum: number, phase: any) => sum + (phase.progress_percentage || 0), 0) / phases.length
      : (project as any).avg_progress || 0;

    const totalSpent = hasPhases
      ? phases.reduce((sum: number, phase: any) => sum + Number(phase.budget_spent || 0), 0)
      : (project as any).total_spent || 0;

    const budgetUsedPercentage = hasPhases && (project as any).budget_total > 0
      ? (totalSpent / Number((project as any).budget_total)) * 100
      : (project as any).budget_used_percentage || 0;

    return {
      ...project,
      avg_progress: Math.round(avgProgress),
      total_spent: totalSpent,
      budget_used_percentage: Math.round(budgetUsedPercentage),
      manager: ((project as any).manager && typeof (project as any).manager === 'object') ? (project as any).manager?.display_name : (project as any).manager,
      client_name: ((project as any).clients && typeof (project as any).clients === 'object') ? (Array.isArray((project as any).clients) ? (project as any).clients[0]?.name : (project as any).clients?.name) : (project as any).client_name
    };
  };

  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['projects', isArchitect],
    queryFn: async () => {
      try {
        // Get current user ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          // logger.warn('No user session found');
          return [];
        }

        // CRITICAL: Always fetch projects owned by the current user first
        // This ensures architect-owned projects are visible regardless of role checks
        // RLS allows access if owner_id = user_id (see user_has_project_access function)
        // logger.info('Fetching projects owned by user', { userId: user.id, isArchitect, isAdmin });
        
        const { data: ownedProjects, error: ownedError } = await supabase
          .from('projects')
          .select(`
            *,
            clients (
              name
            ),
            manager:user_profiles(
              display_name
            ),
            project_phases (
              progress_percentage,
              budget_spent
            )
          `)
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (ownedError) {
          /*
          logger.error('Error fetching owned projects:', { 
            error: ownedError.message, 
            code: ownedError.code,
            details: ownedError.details,
            hint: ownedError.hint,
            userId: user.id
          });
          */
          // Don't throw - continue to try regular projects
        } else {
          /*
          logger.info('Owned projects fetched successfully', { 
            count: ownedProjects?.length || 0,
            projectIds: ownedProjects?.map(p => ({ id: p.id, name: p.name, owner_id: (p as any).owner_id })) || []
          });
          */
        }

        // CRITICAL: Architect-only users should ONLY see their owned projects
        // They should NOT see regular projects even if they're team members (isolation requirement)
        // Only admins/PMs can see regular projects (but NOT architect-owned projects)
        let regularProjects: any[] = [];
        if (!isArchitect || isAdmin) {
          // Build query for projects that are NOT owned by this user
          let regularQuery = supabase
            .from('projects')
            .select(`
              *,
              clients (
                name
              ),
              manager:user_profiles(
                display_name
              ),
              project_phases (
                progress_percentage,
                budget_spent
              )
            `);

          // Filter out projects owned by this user (we already fetched those)
          regularQuery = regularQuery.or(`owner_id.is.null,owner_id.neq.${user.id}`);

          const { data: regularData, error: regularError } = await regularQuery.order('created_at', { ascending: false });

          if (regularError) {
            // logger.warn('Error fetching regular projects:', regularError);
          } else {
            regularProjects = regularData || [];
          }
        } else {
          // Architect-only user: explicitly log that we're skipping regular projects
          /*
          logger.info('Architect-only user detected - skipping regular projects query to maintain isolation', {
            userId: user.id,
            ownedProjectsCount: (ownedProjects || []).length
          });
          */
        }

        // CRITICAL: Filter out architect-owned projects for admins
        // Admins should NOT see projects owned by architects (architect isolation)
        // Global admins are exempt from this restriction
        // Architects who are also admins can see their own architect projects, but not others
        // RLS should handle this, but we add frontend filtering as a safety measure
        if (isAdmin && !isGlobalAdmin) {
          // Get all project owner IDs from regular projects
          const ownerIds = regularProjects
            .map((p: any) => p.owner_id)
            .filter((id: string | null) => id !== null && id !== user.id) as string[];
          
          if (ownerIds.length > 0) {
            // Check which owners are architects
            const { data: architectOwners } = await supabase
              .from('user_roles')
              .select('user_id')
              .eq('role', 'architect')
              .in('user_id', ownerIds);
            
            const architectOwnerIds = new Set((architectOwners || []).map((r: any) => r.user_id));
            
            // Filter out projects owned by architects (unless user has explicit grant)
            const projectsToCheck = regularProjects.filter((p: any) => 
              p.owner_id && architectOwnerIds.has(p.owner_id)
            );
            
            if (projectsToCheck.length > 0) {
              // Check for explicit grants
              const projectIdsToCheck = projectsToCheck.map((p: any) => p.id);
              const { data: grants } = await supabase
                .from('project_access_grants')
                .select('project_id')
                .eq('granted_to_user_id', user.id)
                .in('project_id', projectIdsToCheck);
              
              const grantedProjectIds = new Set((grants || []).map((g: any) => g.project_id));
              
              // Store count before filtering for logging
              const beforeFilterCount = regularProjects.length;
              
              // Remove architect-owned projects unless user has explicit grant
              regularProjects = regularProjects.filter((p: any) => {
                if (p.owner_id && architectOwnerIds.has(p.owner_id)) {
                  // Keep only if user has explicit grant
                  return grantedProjectIds.has(p.id);
                }
                return true;
              });
              
              // logger.info('Filtered out architect-owned projects for admin', {
              //   beforeFilter: beforeFilterCount,
              //   afterFilter: regularProjects.length,
              //   architectOwnedProjects: projectsToCheck.length,
              //   explicitGrants: grants?.length || 0,
              //   removedCount: beforeFilterCount - regularProjects.length
              // });
            }
          }
        }

        // Combine owned projects and regular projects, removing duplicates
        const ownedProjectsList = ownedProjects || [];
        
        // CRITICAL: For architect-only users, ONLY show projects they own
        // Filter out any projects that don't have owner_id matching user.id
        // This ensures isolation even if RLS allows access through team membership
        let filteredProjects = [...ownedProjectsList, ...regularProjects];
        if (isArchitect && !isAdmin) {
          filteredProjects = ownedProjectsList.filter((p: any) => p.owner_id === user.id);
          /*
          logger.info('Architect-only user: Filtered to only owned projects', {
            beforeFilter: ownedProjectsList.length + regularProjects.length,
            afterFilter: filteredProjects.length,
            ownedProjects: filteredProjects.map((p: any) => ({ name: p.name, owner_id: p.owner_id }))
          });
          */
        }
        
        const uniqueProjects = filteredProjects.filter((project, index, self) =>
          index === self.findIndex((p) => p.id === project.id)
        );

        if (uniqueProjects.length === 0) {
          /*
          logger.warn('No projects found for user', { 
            userId: user.id, 
            isArchitect, 
            isAdmin,
            ownedProjectsCount: ownedProjectsList.length,
            regularProjectsCount: regularProjects.length,
            ownedError: ownedError?.message,
            ownedErrorCode: ownedError?.code,
            ownedErrorDetails: ownedError?.details
          });
          */
          
          
          // If we got an error fetching owned projects, log it prominently
          if (ownedError) {
            /*
            logger.error('❌ Failed to fetch architect-owned projects:', {
              error: ownedError.message,
              code: ownedError.code,
              details: ownedError.details,
              hint: ownedError.hint,
              userId: user.id,
              message: 'This might indicate an RLS policy issue. Check that projects were created with owner_id matching your user ID.'
            });
            */
          }
          
          return [];
        }

        /*
        logger.info('Projects found for user', { 
          userId: user.id,
          total: uniqueProjects.length,
          owned: ownedProjectsList.length,
          regular: regularProjects.length,
          ownedProjectNames: ownedProjectsList.map(p => ({ name: p.name, owner_id: (p as any).owner_id })),
          regularProjectNames: regularProjects.map(p => ({ name: p.name, owner_id: (p as any).owner_id }))
        });
        */

        // DIAGNOSTIC: Log all projects with their owner_id for debugging
        /*
        logger.debug('🔍 [useProjects] All projects for user:', {
          userId: user.id,
          isArchitect,
          isAdmin,
          ownedProjects: ownedProjectsList.map(p => ({ 
            id: p.id, 
            name: p.name, 
            owner_id: (p as any).owner_id,
            status: (p as any).status 
          })),
          regularProjects: regularProjects.map(p => ({ 
            id: p.id, 
            name: p.name, 
            owner_id: (p as any).owner_id, 
            status: (p as any).status 
          })),
          totalProjects: uniqueProjects.length
        });
        */

        return uniqueProjects.map(mapProjectWithAggregates) as unknown as Project[];
      } catch (err) {
        logger.error('Projects query failed:', err);
        // Don't fall back to mock data on error - return empty array instead
        return [];
      }
    },
  });

  const createProject = useMutation({
    mutationFn: async (projectData: ProjectInsert) => {
      const {
        create_default_phases,
        street_number,
        neighborhood,
        zip_code,
        address_complement,
        construction_address,
        ...rest
      } = projectData as any;

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const user = authData?.user;
      if (!user) throw new Error('User session not found.');

      let finalAddress = construction_address;
      const addressParts = [
        construction_address,
        street_number ? `${street_number}` : '',
        address_complement,
        neighborhood ? `${neighborhood}` : '',
        zip_code ? `CEP: ${zip_code}` : ''
      ].filter(part => part && part.trim() !== '');
      
      if (addressParts.length > 1) {
          finalAddress = addressParts.join(', ');
      }

      const { data, error } = await supabase
        .from('projects')
        .insert({
          ...rest,
          construction_address: finalAddress,
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      const createdProject = data as any;

      const memberPayload: ProjectTeamMemberInsert = {
        project_id: createdProject.id,
        user_id: user.id,
        user_name: (user.user_metadata as any)?.full_name ?? user.email ?? 'Project Owner',
        email: user.email,
        role: 'Project Manager',
      };

      const { error: teamError } = await supabase
        .from('project_team_members')
        .insert(memberPayload);

      if (teamError) {
        await supabase.from('projects').delete().eq('id', createdProject.id);
        throw teamError;
      }

      let phases: any[] = [];
      let phaseCreationFailed = false;
      let activitiesCreationFailed = false;

      const fetchPhases = async () => {
        const { data: phaseRows, error: phaseFetchError } = await supabase
          .from('project_phases')
          .select('id, start_date, end_date')
          .eq('project_id', createdProject.id)
          .order('created_at', { ascending: true });

        if (phaseFetchError) throw phaseFetchError;
        return (phaseRows as any[]) ?? [];
      };

      try {
        phases = await fetchPhases();
      } catch (err) {
        // logger.error('Failed to fetch phases:', err);
      }

      if (phases.length === 0) {
        try {
          const { data: wbsTemplate } = await supabase
            .from('project_wbs_templates')
            .select('id')
            .order('is_default', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (wbsTemplate) {
            await supabase.rpc('apply_wbs_template_to_project_internal', {
              _project_id: createdProject.id,
              _template_id: (wbsTemplate as any).id,
            });
            phases = await fetchPhases();
          }
        } catch (err) {
          // logger.error('WBS failed:', err);
        }
      }

      if (phases.length === 0) {
        try {
          const defaultPhases = [
            { project_id: createdProject.id, phase_name: 'Template', type: (createdProject.start_date ? 'schedule' : 'budget') },
            { project_id: createdProject.id, phase_name: 'Adaptation', type: (createdProject.start_date ? 'schedule' : 'budget') },
          ];
          const { error: insertError } = await supabase.from('project_phases').insert(defaultPhases);
          if (insertError) throw insertError;
          phases = await fetchPhases();
        } catch (err) {
          // logger.error('Failed to create default phases:', err);
          phaseCreationFailed = true;
        }
      }

      let budgetCreationFailed = false;
      if ((projectData.budget_model || 'simple') === 'simple') {
        try {
          const { data: template } = await supabase
            .from('budget_templates')
            .select('id, name, description, has_materials')
            .eq('budget_type', 'simple')
            .order('is_default', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (template) {
            const { data: budget } = await supabase
              .from('project_budgets')
              .insert({
                project_id: createdProject.id,
                name: `${createdProject.name} Budget`,
                description: (template as any).description,
                budget_model: 'simple',
                status: 'draft',
                created_by: user.id,
                budget_template_id: (template as any).id,
              })
              .select()
              .single();

            if (budget) {
              const phaseIdForBudget = (phases[0] as any)?.id ?? null;
              if ((template as any).has_materials) {
                const { data: materialsTemplate } = await supabase.from('simplebudget_materials_template').select('*');
                const projectTgfa = Number(createdProject.total_gross_floor_area || 0);
                const materialsItems = (((materialsTemplate as any[]) || [])).map((item, index) => ({
                  budget_id: (budget as any).id,
                  description: (item as any).description,
                  quantity: (item as any).tgfa_applicable ? (projectTgfa || (item as any).factor || 1) : ((item as any).factor || 1),
                  unit_cost_material: (item as any).price_per_unit || 0,
                  unit_cost_labor: 0,
                  sinapi_code: (item as any).sinapi_code || '',
                  unit: (item as any).unit || '',
                  group_name: (item as any).group_name || 'Materials',
                  sort_order: (item as any).sort_order ?? index + 1,
                  phase_id: phaseIdForBudget,
                }));
                if (materialsItems.length > 0) await supabase.from('budget_line_items').insert(materialsItems);
              } else {
                await supabase.rpc('populate_budget_from_simple_template', { p_budget_id: (budget as any).id, p_project_id: createdProject.id });
                if (phaseIdForBudget) await supabase.from('budget_line_items').update({ phase_id: phaseIdForBudget }).eq('budget_id', (budget as any).id).is('phase_id', null);
              }
            }
          }
        } catch (err) {
          budgetCreationFailed = true;
        }
      }

      if (createdProject.start_date && phases.length > 0) {
        try {
          const { data: activityTemplate } = await supabase.from('activity_templates').select('activities').eq('is_default', true).maybeSingle();
          const templateActivities = (activityTemplate as any)?.activities as any[] | null;
          let activitiesToCalculate: any[] = [];
          
          if (templateActivities && templateActivities.length > 0) {
            const isOffsetMode = 'startOffset' in templateActivities[0];
            activitiesToCalculate = templateActivities.map((act) => ({
              sequence: act.sequence,
              name: act.description || act.activityName || `Activity ${act.sequence}`,
              days_for_activity: isOffsetMode ? ((act.endOffset || 0) - (act.startOffset || 0) + 1) : (act.defaultDays || act.duration || 1),
              completion_percentage: 0,
            }));
          } else {
            activitiesToCalculate = DEFAULT_CONSTRUCTION_ACTIVITIES.map((act) => ({ sequence: act.sequence, name: act.name, days_for_activity: act.defaultDays, completion_percentage: 0 }));
          }

          const calculatedActivities = calculateActivityDates(activitiesToCalculate, new Date(createdProject.start_date), true);
          const sortedPhases = [...phases].sort((a, b) => ((a as any).start_date ? new Date((a as any).start_date).getTime() : 0) - ((b as any).start_date ? new Date((b as any).start_date).getTime() : 0));

          const activitiesToInsert = calculatedActivities.map((act, index) => {
            const actStartDate = new Date(act.start_date);
            let assignedPhase = sortedPhases.find((phase: any) => {
              if (!phase.start_date || !phase.end_date) return false;
              return actStartDate >= new Date(phase.start_date) && actStartDate <= new Date(phase.end_date);
            });
            if (!assignedPhase) assignedPhase = sortedPhases[Math.min(Math.floor(index / Math.ceil(calculatedActivities.length / sortedPhases.length)), sortedPhases.length - 1)];
            return {
              project_id: createdProject.id,
              phase_id: (assignedPhase as any)?.id ?? null,
              sequence: index + 1,
              name: act.name,
              start_date: act.start_date,
              end_date: act.end_date,
              days_for_activity: act.days_for_activity,
              completion_percentage: 0,
            };
          });

          if (activitiesToInsert.length > 0) await supabase.from('project_activities').insert(activitiesToInsert);
        } catch (err) {
          activitiesCreationFailed = true;
        }
      }

      return { ...createdProject, _phaseCreationFailed: phaseCreationFailed, _budgetCreationFailed: budgetCreationFailed, _activitiesCreationFailed: activitiesCreationFailed };
    },
    onSuccess: (result: any) => {
      const { _phaseCreationFailed, _budgetCreationFailed, _activitiesCreationFailed, ...projectData } = result;
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project_phases'] });
      queryClient.invalidateQueries({ queryKey: ['project_budget_items'] });
      queryClient.invalidateQueries({ queryKey: ['project_budgets'] });
      toast({ title: 'Project created', description: 'The project has been created successfully.' });
      if (_phaseCreationFailed || _budgetCreationFailed || _activitiesCreationFailed) {
        toast({ title: 'Warning', description: 'Project created but some initial setups failed.', variant: 'destructive' });
      }
      return projectData;
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: `Failed to create project: ${error.message}`, variant: 'destructive' });
    },
  });

  const updateProject = useMutation({
    mutationFn: async (projectData: any) => {
      const { id, create_default_phases, silent, ...project } = projectData;
      const { data, error } = await supabase.from('projects').update(project).eq('id', id).select().single();
      if (error) throw error;
      return { data, silent };
    },
    onSuccess: (result: any) => {
      const updatedProject = result.data;
      
      // Update ALL project query keys to ensure consistency
      queryClient.setQueriesData({ queryKey: ['projects'] }, (oldData: any) => {
        if (!oldData) return oldData;
        if (Array.isArray(oldData)) {
          return oldData.map((project: any) => 
            project.id === updatedProject.id ? { ...project, ...updatedProject } : project
          );
        }
        return oldData.id === updatedProject.id ? { ...oldData, ...updatedProject } : oldData;
      });
      
      queryClient.invalidateQueries({ queryKey: ['project-materials', updatedProject.id] });
      
      if (!result.silent) {
        toast({ title: 'Project updated', description: 'The project has been updated successfully.' });
      }
    },
    onError: (error: any, variables: any) => {
      if (variables?.silent) return
      toast({ title: 'Error', description: `Failed to update project: ${error.message}`, variant: 'destructive' });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Project deleted', description: 'The project has been deleted successfully.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: `Failed to delete project: ${error.message}`, variant: 'destructive' });
    },
  });

  return { projects, isLoading, error, createProject, updateProject, deleteProject };
};

// Helper function to check if a string is a valid UUID
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const useProject = (id: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mapProjectWithAggregates = (project: any) => {
    if (!project) return null;
    const phases = project.project_phases || [];
    const hasPhases = phases.length > 0;
    const avgProgress = hasPhases ? phases.reduce((sum: number, phase: any) => sum + (phase.progress_percentage || 0), 0) / phases.length : project.avg_progress || 0;
    const totalSpent = hasPhases ? phases.reduce((sum: number, phase: any) => sum + Number(phase.budget_spent || 0), 0) : project.total_spent || 0;
    const budgetUsedPercentage = hasPhases && project.budget_total > 0 ? (totalSpent / Number(project.budget_total)) * 100 : project.budget_used_percentage || 0;

    return {
      ...project,
      avg_progress: Math.round(avgProgress),
      total_spent: totalSpent,
      budget_used_percentage: Math.round(budgetUsedPercentage),
      manager: (project.manager && typeof project.manager === 'object') ? project.manager?.display_name : project.manager,
      client_name: (project.clients && typeof project.clients === 'object') ? (Array.isArray(project.clients) ? project.clients[0]?.name : project.clients?.name) : project.client_name
    };
  };

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      if (!id) return null;
      
      // If ID is not a valid UUID (e.g., "project-01" from mock data), skip DB query and use mock data
      if (!isValidUUID(id)) {
        return null;
      }
      
      try {
        const { data, error } = await supabase.from('projects').select('*, clients(name), manager:user_profiles(display_name)').eq('id', id).maybeSingle();
        if (error) throw error;
        return data ? mapProjectWithAggregates(data) as Project : null;
      } catch (err) {
        // logger.warn('Project not found, returning null', err);
        return null;
      }
    },
    enabled: !!id,
  });

  const deleteProject = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Project deleted', description: 'The project has been deleted successfully.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: `Failed to delete project: ${error.message}`, variant: 'destructive' });
    },
  });

  return { project, isLoading, error, deleteProject };
};
