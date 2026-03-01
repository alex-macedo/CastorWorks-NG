import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Container } from "@/components/Layout";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useToast } from "@/hooks/use-toast";
import { BudgetList } from "@/components/Templates/ProjectBudgetTemplates/BudgetList";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

/**
 * Project Budgets Page
 * 
 * Manages construction budgets with SINAPI integration, BDI calculations,
 * and detailed line items per project phase.
 */
import { logInfo, logError, logDebug } from '@/lib/logger-migration';

const ProjectBudgets = () => {
  logDebug('[ProjectBudgets] Component initialized');
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id: projectId } = useParams<{ id: string }>();
  const { t, loadTranslationsForRoute } = useLocalization();
  const { toast } = useToast();

  logDebug('[ProjectBudgets] Component state initialized:', {
    projectId,
    hasNavigate: !!navigate,
    hasQueryClient: !!queryClient,
  });

  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load translations
  useEffect(() => {
    logDebug('[ProjectBudgets] Loading translations for route');
    loadTranslationsForRoute('/projects/:id/budgets');
  }, [loadTranslationsForRoute]);

  // Fetch project details including budget_model
  const { data: project, isLoading: isLoadingProject, error: projectError } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      logDebug('[ProjectBudgets] Fetching project data...', { projectId });
      
      if (!projectId) {
        logError('[ProjectBudgets] Project ID is missing');
        throw new Error('Project ID is required');
      }

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, description, budget_model, budget_has_materials, total_gross_floor_area')
        .eq('id', projectId)
        .single();

      if (error) {
        logError('[ProjectBudgets] Error fetching project', {
          error,
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
          projectId,
        });
        throw error;
      }

      logDebug('[ProjectBudgets] Project data fetched successfully:', {
        projectId: data?.id,
        projectName: data?.name,
        budgetModel: data?.budget_model,
        hasDescription: !!data?.description,
      });

      return data;
    },
    enabled: !!projectId,
  });

  // Log project loading state changes
  useEffect(() => {
    logDebug('[ProjectBudgets] Project query state changed:', {
      isLoading: isLoadingProject,
      hasProject: !!project,
      hasError: !!projectError,
      projectId,
      projectName: project?.name,
      budgetModel: project?.budget_model,
    });
  }, [isLoadingProject, project, projectError, projectId]);

  // Fetch budgets to determine if we should show the "Delete and Recreate" button
  const { data: budgets = [], isLoading: isLoadingBudgets, error: budgetsError } = useQuery({
    queryKey: ["project-budgets", projectId],
    queryFn: async () => {
      logDebug('[ProjectBudgets] Fetching existing budgets...', { projectId });
      
      const { data, error } = await supabase
        .from("project_budgets")
        .select('id, name, budget_model, status, created_at')
        .eq("project_id", projectId);
      
      if (error) {
        logError('[ProjectBudgets] Error fetching budgets', {
          error,
          errorCode: error.code,
          errorMessage: error.message,
          projectId,
        });
        throw error;
      }

      logDebug('[ProjectBudgets] Existing budgets fetched', {
        projectId,
        count: data?.length || 0,
        budgets: data?.map(b => ({
          id: b.id,
          name: b.name,
          budgetModel: b.budget_model,
          status: b.status,
        })),
      });

      return data;
    },
    enabled: !!projectId,
  });

  // Log budgets state changes
  useEffect(() => {
    console.log('[ProjectBudgets] Budgets query state changed:', {
      isLoading: isLoadingBudgets,
      budgetsCount: budgets?.length || 0,
      hasError: !!budgetsError,
      projectId,
    });
  }, [isLoadingBudgets, budgets, budgetsError, projectId]);

  // Get the appropriate budget model and name based on project's budget_model
  const getBudgetConfig = (budgetModel: string | null) => {
    console.log('[ProjectBudgets] getBudgetConfig called:', {
      budgetModel,
      projectName: project?.name,
    });

    let config;
    switch (budgetModel) {
      case 'simple':
        config = {
          budget_model: 'simple' as const,
          name: t('budgets:autoCreate.simple.name', { projectName: project?.name }),
          description: t('budgets:autoCreate.simple.description')
        };
        break;
      case 'bdi_brazil':
        config = {
          budget_model: 'bdi_brazil' as const,
          name: t('budgets:autoCreate.bdi.name', { projectName: project?.name }),
          description: t('budgets:autoCreate.bdi.description')
        };
        break;
      case 'cost_control':
        config = {
          budget_model: 'cost_control' as const,
          name: t('budgets:autoCreate.costControl.name', { projectName: project?.name }),
          description: t('budgets:autoCreate.costControl.description')
        };
        break;
      default:
        console.warn('[ProjectBudgets] Unknown budget model, defaulting to simple:', {
          budgetModel,
          defaultValue: 'simple',
        });
        config = {
          budget_model: 'simple' as const,
          name: t('budgets:autoCreate.simple.name', { projectName: project?.name }),
          description: t('budgets:autoCreate.simple.description')
        };
    }

    console.log('[ProjectBudgets] getBudgetConfig result:', config);
    return config;
  };

  const handleCreateBudget = async () => {
    if (!project || isCreating) {
      console.log('[ProjectBudgets] handleCreateBudget: Early return', {
        hasProject: !!project,
        isCreating,
        projectId,
      });
      return;
    }

    console.log('[ProjectBudgets] handleCreateBudget: Starting budget creation', {
      projectId,
      projectName: project.name,
      budgetModel: project.budget_model,
      timestamp: new Date().toISOString(),
    });

    setIsCreating(true);

    try {
      // Step 1: Get authenticated user
      logDebug('[ProjectBudgets] Step 1: Getting authenticated user...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        logError('[ProjectBudgets] Auth error', authError);
        throw new Error(`Authentication failed: ${authError.message}`);
      }
      
      if (!user) {
        logError('[ProjectBudgets] No user found after auth check');
        throw new Error('User not authenticated');
      }

      logDebug('[ProjectBudgets] User authenticated', {
        userId: user.id,
        email: user.email,
      });

      // Step 2: Get budget configuration
      const budgetConfig = getBudgetConfig(project.budget_model);
      logDebug('[ProjectBudgets] Step 2: Budget configuration determined', {
        budgetModel: budgetConfig.budget_model,
        name: budgetConfig.name,
        description: budgetConfig.description,
      });

      // Step 2.1: Load simple budget template (if needed)
      let simpleBudgetTemplate: { id: string; has_materials: boolean } | null = null;
      const shouldUseSimpleTemplate = budgetConfig.budget_model === 'simple';
      const shouldIncludeMaterials = project.budget_has_materials !== false;

      if (shouldUseSimpleTemplate) {
        const { data: template, error: templateError } = await supabase
          .from('budget_templates')
          .select('id, has_materials')
          .eq('budget_type', 'simple')
          .eq('has_materials', shouldIncludeMaterials)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (templateError) {
          console.warn('[ProjectBudgets] Failed to load simple budget template:', {
            error: templateError,
            errorMessage: templateError.message,
            errorCode: templateError.code,
          });
        } else {
          simpleBudgetTemplate = template ?? null;
        }
      }

      // Step 2.2: Get a phase to associate with budget items (for charts)
      let phaseIdForBudget: string | null = null;
      try {
        const { data: phaseRow } = await supabase
          .from('project_phases')
          .select('id')
          .eq('project_id', projectId)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        phaseIdForBudget = phaseRow?.id ?? null;
      } catch (phaseFetchError) {
        console.warn('[ProjectBudgets] Failed to fetch project phases for budget items:', phaseFetchError);
      }

      // Step 3: Create the budget record
      console.log('[ProjectBudgets] Step 3: Creating budget record...', {
        projectId,
        budgetModel: budgetConfig.budget_model,
        name: budgetConfig.name,
        createdBy: user.id,
      });

      const { data: budget, error } = await supabase
        .from('project_budgets')
        .insert({
          project_id: projectId,
          name: budgetConfig.name,
          description: budgetConfig.description,
          budget_model: budgetConfig.budget_model,
          budget_template_id: simpleBudgetTemplate?.id ?? null,
          status: 'draft',
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('[ProjectBudgets] Failed to create budget record:', {
          error,
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
        });
        throw error;
      }

      if (!budget) {
        console.error('[ProjectBudgets] Budget creation returned null data');
        throw new Error('Failed to create budget');
      }

      console.log('[ProjectBudgets] Budget record created successfully:', {
        budgetId: budget.id,
        budgetName: budget.name,
        budgetModel: budget.budget_model,
        status: budget.status,
      });

      // Step 4: Populate budget based on budget model
      console.log('[ProjectBudgets] Step 4: Starting budget population...', {
        budgetModel: budgetConfig.budget_model,
        budgetId: budget.id,
        projectId,
      });

      try {
        if (budgetConfig.budget_model === 'bdi_brazil') {
          console.log('[ProjectBudgets] Populating BDI budget from SINAPI template...');
          const { error: populateError, data: populateData } = await supabase.rpc('populate_budget_from_template', {
            p_budget_id: budget.id,
            p_project_id: projectId,
          });

          // If RPC failed or created no items, attempt a client-side fallback
          if (populateError) {
            console.error('[ProjectBudgets] RPC populate_budget_from_template failed:', {
              error: populateError,
              budgetId: budget.id,
              projectId,
            });
          }

          // Check whether any budget line items were created by the RPC
          const { data: rpcCreatedItems, error: rpcCheckErr } = await supabase
            .from('budget_line_items')
            .select('id')
            .eq('budget_id', budget.id)
            .limit(1);

          const createdCount = rpcCheckErr ? 0 : (rpcCreatedItems?.length || 0);

          if (createdCount === 0) {
            console.log('[ProjectBudgets] RPC created 0 items — attempting client-side fallback population', { budgetId: budget.id });

            try {
              // Fetch template items
              const { data: templateItems, error: templateErr } = await supabase
                .from('sinapi_project_template_items')
                .select('phase_name, phase_order, item_number, sinapi_code, description, unit, quantity, sort_order')
                .order('phase_order', { ascending: true })
                .order('sort_order', { ascending: true });

              if (templateErr) throw templateErr;

              // Load existing phases for project to avoid duplicates
              const { data: existingPhases } = await supabase
                .from('project_phases')
                .select('id, phase_name')
                .eq('project_id', projectId);

              const phaseMap: Record<string, string> = {};
              (existingPhases || []).forEach((p: any) => { phaseMap[p.phase_name] = p.id; });

              const inserts: any[] = [];

              for (const item of (templateItems || [])) {
                // Skip items without sinapi_code as it's required
                if (!item.sinapi_code) {
                  console.warn('[ProjectBudgets] Skipping template item without sinapi_code:', item);
                  continue;
                }
                // Ensure phase exists
                let phaseId = phaseMap[item.phase_name];
                if (!phaseId) {
                  const { data: newPhase, error: phaseInsertErr } = await supabase
                    .from('project_phases')
                    .insert({
                      project_id: projectId,
                      phase_name: item.phase_name,
                      sort_order: item.phase_order || 0,
                      status: 'pending',
                      progress_percentage: 0,
                      type: 'budget',
                    })
                    .select()
                    .single();

                  if (phaseInsertErr) {
                    console.warn('[ProjectBudgets] Failed to create phase during fallback:', { phase: item.phase_name, phaseInsertErr });
                  } else {
                    phaseId = newPhase.id;
                    phaseMap[item.phase_name] = phaseId;
                  }
                }

                // Attempt to lookup SINAPI costs for this sinapi_code
                let unitCostMaterial = 0;
                let unitCostLabor = 0;
                let unitCode = item.unit || 'UN';

                if (item.sinapi_code) {
                  try {
                    // prefer SP state then any state
                    let { data: sinapiRow } = await supabase
                      .from('sinapi_items')
                      .select('sinapi_material_cost, sinapi_labor_cost, sinapi_unit')
                      .eq('sinapi_code', item.sinapi_code)
                      .eq('base_state', 'SP')
                      .order('base_year', { ascending: false })
                      .limit(1)
                      .maybeSingle();

                    if (!sinapiRow) {
                      const { data: sinapiAny } = await supabase
                        .from('sinapi_items')
                        .select('sinapi_material_cost, sinapi_labor_cost, sinapi_unit')
                        .eq('sinapi_code', item.sinapi_code)
                        .order('base_year', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                      sinapiRow = sinapiAny;
                    }

                    if (sinapiRow) {
                      unitCostMaterial = Number(sinapiRow.sinapi_material_cost || 0);
                      unitCostLabor = Number(sinapiRow.sinapi_labor_cost || 0);
                      unitCode = sinapiRow.sinapi_unit || unitCode;
                    }
                  } catch (lookupErr) {
                    console.warn('[ProjectBudgets] SINAPI lookup failed during fallback:', { err: lookupErr, sinapi_code: item.sinapi_code });
                  }
                }

                inserts.push({
                  budget_id: budget.id,
                  phase_id: phaseId || null,
                  sinapi_code: item.sinapi_code,
                  item_number: item.item_number || null,
                  description: item.description || '',
                  unit: item.unit || '',
                  unit_cost_material: unitCostMaterial,
                  unit_cost_labor: unitCostLabor,
                  quantity: Number(item.quantity) || 0,
                  sort_order: Number(item.sort_order) || 0,
                });
              }

              if (inserts.length > 0) {
                const { error: insertErr } = await supabase
                  .from('budget_line_items')
                  .insert(inserts);

                if (insertErr) throw insertErr;
              }

              queryClient.invalidateQueries({ queryKey: ['budget_line_items', budget.id] });
              queryClient.invalidateQueries({ queryKey: ['budget-calculations', budget.id] });
              queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });

              toast({
                title: t('common.success'),
                description: 'Budget populated from template fallback. Some unit costs may be empty; please review.',
              });

              console.log('[ProjectBudgets] Client-side fallback populated items for budget', { budgetId: budget.id, inserted: inserts.length });
            } catch (fallbackErr: any) {
              console.error('[ProjectBudgets] Fallback population failed:', { error: fallbackErr, budgetId: budget.id });
              toast({
                title: t('common.warning'),
                description: 'Budget created but template population failed. You can add items manually.',
                variant: 'destructive',
              });
            }
          } else {
            console.log('[ProjectBudgets] BDI budget populated successfully via RPC or existing data:', {
              budgetId: budget.id,
              populateData,
            });
            queryClient.invalidateQueries({ queryKey: ['budget_line_items', budget.id] });
            queryClient.invalidateQueries({ queryKey: ['budget-calculations', budget.id] });
            queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
          }
        } else if (budgetConfig.budget_model === 'cost_control') {
          console.log('[ProjectBudgets] Populating Cost Control budget from WBS template...');

          const { count: wbsPhaseCount, error: wbsCountError } = await supabase
            .from('project_wbs_items')
            .select('id', { count: 'exact', head: true })
            .eq('project_id', projectId)
            .eq('item_type', 'phase');

          console.log('[ProjectBudgets] WBS phase check:', {
            wbsPhaseCount,
            wbsCountError,
            hasWBSPhases: (wbsPhaseCount ?? 0) > 0,
          });

          if (wbsCountError || (wbsPhaseCount ?? 0) === 0) {
            console.log('[ProjectBudgets] No WBS phases found, applying template...');
            const { data: wbsTemplate } = await supabase
              .from('project_wbs_templates')
              .select('id')
              .order('is_default', { ascending: false })
              .order('created_at', { ascending: true })
              .limit(1)
              .maybeSingle();

            console.log('[ProjectBudgets] WBS template found:', wbsTemplate);

            if (wbsTemplate?.id) {
              const { error: templateError } = await supabase.rpc('apply_wbs_template_to_project_internal', {
                _project_id: projectId,
                _template_id: wbsTemplate.id,
              });

              if (templateError) {
                console.error('[ProjectBudgets] Failed to apply WBS template:', templateError);
              } else {
                console.log('[ProjectBudgets] WBS template applied successfully');
              }
            } else {
              console.log('[ProjectBudgets] No WBS template found');
            }
          }

          const { error: populateError, data: populateData } = await supabase.rpc('populate_budget_from_cost_control_template', {
            p_budget_id: budget.id,
            p_project_id: projectId,
          });

          if (populateError) {
            console.error('[ProjectBudgets] Failed to populate Cost Control budget:', {
              error: populateError,
              errorCode: populateError.code,
              errorMessage: populateError.message,
              errorDetails: populateError.details,
              errorHint: populateError.hint,
              budgetId: budget.id,
              projectId,
            });
            toast({
              title: t('common.warning'),
              description: 'Budget created but WBS population failed. You can add items manually.',
              variant: 'destructive',
            });
          } else {
            console.log('[ProjectBudgets] Cost Control budget populated successfully:', {
              budgetId: budget.id,
              populateData,
              populateDataType: typeof populateData,
              populateDataKeys: populateData ? Object.keys(populateData) : null,
            });

            // Check what was actually created
            const { data: createdLines, error: checkError } = await supabase
              .from('project_budget_lines')
              .select('id, version_id, phase_id, cost_code_id, amount')
              .eq('version_id', populateData?.version_id || 'unknown');

            console.log('[ProjectBudgets] Created budget lines:', {
              count: createdLines?.length || 0,
              lines: createdLines,
              checkError,
            });

            queryClient.invalidateQueries({ queryKey: ['budget_line_items', budget.id] });
            queryClient.invalidateQueries({ queryKey: ['budget-calculations', budget.id] });
            queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
          }
        } else if (budgetConfig.budget_model === 'simple') {
          // Simple Budget: populate from material and labor templates
          console.log('[ProjectBudgets] Populating Simple budget from templates...', {
            budgetId: budget.id,
            projectId,
          });

          const templateHasMaterials = simpleBudgetTemplate?.has_materials ?? shouldIncludeMaterials;
          const projectTgfa = Number(project.total_gross_floor_area || 0);

          // Check template tables directly (the system uses template tables, not template projects)
          console.log('[ProjectBudgets] Checking template tables for data...');
          
          // Check materials template table
          const { data: materialsTemplate, error: materialsTemplateError, count: materialsCount } = await supabase
            .from('simplebudget_materials_template')
            .select('id, description, price_per_unit, unit, tgfa_applicable, factor', { count: 'exact' })
            .limit(10);

          if (materialsTemplateError) {
            console.warn('[ProjectBudgets] Error checking materials template table (non-fatal):', {
              error: materialsTemplateError,
              errorMessage: materialsTemplateError.message,
              errorCode: materialsTemplateError.code,
            });
          } else {
            console.log('[ProjectBudgets] Materials template table:', {
              totalCount: materialsCount || 0,
              sampleItems: materialsTemplate?.slice(0, 5),
              hasData: (materialsCount || 0) > 0,
            });
          }

          // Check labor template table
          const { data: laborTemplate, error: laborTemplateError, count: laborCount } = await supabase
            .from('simplebudget_labor_template')
            .select('id, description, total_value, "group"', { count: 'exact' })
            .limit(10);

          if (laborTemplateError) {
            console.warn('[ProjectBudgets] Error checking labor template table (non-fatal):', {
              error: laborTemplateError,
              errorMessage: laborTemplateError.message,
              errorCode: laborTemplateError.code,
            });
          } else {
            console.log('[ProjectBudgets] Labor template table:', {
              totalCount: laborCount || 0,
              sampleItems: laborTemplate?.slice(0, 5),
              hasData: (laborCount || 0) > 0,
            });
          }

          // Also check for template projects (for backward compatibility info)
          console.log('[ProjectBudgets] Checking for template projects (for reference)...');
          const { data: templateProjects, error: templateCheckError } = await supabase
            .from('projects')
            .select('id, name, budget_model, description')
            .or('name.ilike.%materials%template%,name.ilike.%labor%template%')
            .eq('budget_model', 'simple');

          if (templateCheckError) {
            console.warn('[ProjectBudgets] Error checking template projects (non-fatal):', {
              error: templateCheckError,
              errorMessage: templateCheckError.message,
            });
          } else {
            console.log('[ProjectBudgets] Template projects found (for reference):', {
              count: templateProjects?.length || 0,
              templates: templateProjects?.map(t => ({
                id: t.id,
                name: t.name,
                budgetModel: t.budget_model,
              })),
              note: 'RPC function uses template tables, not template projects',
            });
          }

          if (templateHasMaterials) {
            console.log('[ProjectBudgets] Populating Simple budget with materials-only template...');

            const { data: materialsTemplateData, error: materialsTemplateFetchError } = await supabase
              .from('simplebudget_materials_template')
              .select('sinapi_code, description, unit, price_per_unit, tgfa_applicable, factor, group_name, sort_order')
              .eq('default', true)
              .order('sort_order', { ascending: true })
              .order('group_name', { ascending: true });

            if (materialsTemplateFetchError) {
              throw materialsTemplateFetchError;
            }

            const materialsItems = (materialsTemplateData || []).map((item, index) => {
              const quantity = item.tgfa_applicable
                ? (projectTgfa || item.factor || 1)
                : (item.factor || 1);

              return {
                budget_id: budget.id,
                description: item.description,
                quantity,
                unit_cost_material: item.price_per_unit || 0,
                unit_cost_labor: 0,
                sinapi_code: item.sinapi_code || '',
                unit: item.unit || '',
                group_name: item.group_name || 'Materials',
                sort_order: item.sort_order ?? index + 1,
                phase_id: phaseIdForBudget,
              };
            });

            if (materialsItems.length > 0) {
              const { error: materialsInsertError } = await supabase
                .from('budget_line_items')
                .insert(materialsItems);

              if (materialsInsertError) throw materialsInsertError;
            }
          } else {
            // Populate both materials and labor
            console.log('[ProjectBudgets] Calling populate_budget_from_simple_template RPC...', {
              p_budget_id: budget.id,
              p_project_id: projectId,
            });

            const rpcStartTime = Date.now();
            const { error: populateError, data: populateData } = await supabase.rpc('populate_budget_from_simple_template', {
              p_budget_id: budget.id,
              p_project_id: projectId,
            });
            const rpcDuration = Date.now() - rpcStartTime;

            console.log('[ProjectBudgets] RPC call completed:', {
              duration: `${rpcDuration}ms`,
              hasError: !!populateError,
              hasData: !!populateData,
              budgetId: budget.id,
              projectId,
            });

            if (populateError) {
              console.error('[ProjectBudgets] Failed to populate Simple budget:', {
                error: populateError,
                errorCode: populateError.code,
                errorMessage: populateError.message,
                errorDetails: populateError.details,
                errorHint: populateError.hint,
                budgetId: budget.id,
                projectId,
                rpcDuration: `${rpcDuration}ms`,
              });
              toast({
                title: t('common.warning'),
                description: 'Budget created but template population failed. You can add items manually.',
                variant: 'destructive',
              });
            } else {
              console.log('[ProjectBudgets] Simple budget populated successfully:', {
                budgetId: budget.id,
                populateData,
                rpcDuration: `${rpcDuration}ms`,
              });
            }

            if (phaseIdForBudget) {
              await supabase
                .from('budget_line_items')
                .update({ phase_id: phaseIdForBudget })
                .eq('budget_id', budget.id)
                .is('phase_id', null);
            }
          }

          // Verify items were created
          const { data: createdItems, error: itemsCheckError } = await supabase
            .from('budget_line_items')
            .select('id, description, quantity, unit_cost_material, unit_cost_labor')
            .eq('budget_id', budget.id);

          if (itemsCheckError) {
            console.warn('[ProjectBudgets] Error checking created items (non-fatal):', {
              error: itemsCheckError,
              errorMessage: itemsCheckError.message,
            });
          } else {
            console.log('[ProjectBudgets] Budget line items after population:', {
              budgetId: budget.id,
              itemsCount: createdItems?.length || 0,
              sampleItems: createdItems?.slice(0, 5),
              totalMaterialCost: createdItems?.reduce((sum, item) => sum + (item.unit_cost_material || 0) * (item.quantity || 0), 0) || 0,
              totalLaborCost: createdItems?.reduce((sum, item) => sum + (item.unit_cost_labor || 0) * (item.quantity || 0), 0) || 0,
            });
          }

          queryClient.invalidateQueries({ queryKey: ['budget_line_items', budget.id] });
        } else {
          console.warn('[ProjectBudgets] Unknown budget model, skipping population:', {
            budgetModel: budgetConfig.budget_model,
            budgetId: budget.id,
          });
        }
      } catch (populateErr: any) {
        console.error('[ProjectBudgets] Exception during budget population:', {
          error: populateErr,
          errorMessage: populateErr?.message,
          errorStack: populateErr?.stack,
          budgetId: budget.id,
          projectId,
          budgetModel: budgetConfig.budget_model,
        });
        // Don't fail the entire operation - budget is created, just notify user of population error
      }

      // Step 5: Invalidate queries and show success
      console.log('[ProjectBudgets] Step 5: Invalidating queries and showing success...');
      queryClient.invalidateQueries({ queryKey: ['project-budgets', projectId] });

      toast({
        title: t('common.success'),
        description: t('budgets:notifications.budgetCreated'),
      });

      // Step 6: Navigate to budget editor
      const targetPath = `/projects/${projectId}/budgets/${budget.id}`;
      console.log('[ProjectBudgets] Step 6: Navigating to budget editor:', {
        targetPath,
        budgetId: budget.id,
      });
      navigate(targetPath);

      console.log('[ProjectBudgets] Budget creation completed successfully:', {
        budgetId: budget.id,
        projectId,
        budgetModel: budgetConfig.budget_model,
        totalDuration: 'See individual step logs above',
      });

    } catch (error: any) {
      console.error('[ProjectBudgets] Error creating budget:', {
        error,
        errorMessage: error?.message,
        errorCode: error?.code,
        errorDetails: error?.details,
        errorHint: error?.hint,
        errorStack: error?.stack,
        projectId,
        timestamp: new Date().toISOString(),
      });
      toast({
        title: t('common.errorTitle'),
        description: error.message || t('budgets:errors.creatingFailed'),
        variant: 'destructive',
      });
    } finally {
      console.log('[ProjectBudgets] handleCreateBudget: Cleaning up, setting isCreating to false');
      setIsCreating(false);
    }
  };

  const handleDeleteAndRecreate = async () => {
    if (!projectId || isDeleting) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_all_project_budgets', { p_project_id: projectId });
      if (error) throw error;
      
      toast({
        title: t('common.success'),
        description: t('budgets:notifications.allBudgetsDeleted'),
      });

      // Now create a new one
      await handleCreateBudget();

    } catch (error: any) {
      console.error('Error deleting and recreating budgets:', error);
      toast({
        title: t('common.errorTitle'),
        description: error.message || t('budgets:errors.deletingFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };


  const handleBudgetDeleted = () => {
    toast({
      title: t('common.success'),
      description: t('budgets:notifications.budgetDeleted'),
    });
  };

  if (isLoadingProject) {
    return (
      <Container size="lg">
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <p className="text-muted-foreground">{t('common.loading')}</p>
            </div>
          </CardContent>
        </Card>
      </Container>
    );
  }

  if (!project && projectId) {
    return (
      <Container size="lg">
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center gap-4">
              <p className="text-muted-foreground">{t('common.notFound')}</p>
              <Button onClick={() => navigate('/projects')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('common.back')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="lg">
      <div className="w-full space-y-6">
        {/* Header */}
        <SidebarHeaderShell>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {t('budgets:title')}
              </h1>
              {project && (
                <p className="text-muted-foreground mt-1">
                  {project.name}
                </p>
              )}
            </div>
          </div>
        </SidebarHeaderShell>

        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-muted-foreground">
                {t('budgets:description')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {budgets.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="secondary" disabled={isDeleting || isCreating}>
                      {isDeleting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      {isDeleting ? t('common.deleting') : t('budgets:actionLabels.deleteAllAndRecreate')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogTitle>{t('common.confirmAction')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('budgets:prompts.confirmDeleteAll')}
                    </AlertDialogDescription>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAndRecreate}>
                        {t('common.confirm')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button variant="default" onClick={handleCreateBudget} disabled={isCreating || isDeleting}>
                {isCreating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {isCreating ? t('common.creating') : t('budgets:actionLabels.createBudget')}
              </Button>
            </div>
          </div>

          {/* Budget List */}
          {projectId ? (
            <BudgetList
              projectId={projectId}
              onDelete={handleBudgetDeleted}
            />
          ) : (
            <Card>
              <CardContent className="p-8">
                <p className="text-center text-muted-foreground">
                  {t('budgets:errors.noProject')}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Container>
  );
};

export default ProjectBudgets;
