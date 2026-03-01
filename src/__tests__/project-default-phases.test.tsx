import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProjects } from '@/hooks/useProjects';
import React from 'react';

// Mock Supabase client with consistent query builder pattern
const mockProjectInsert = vi.fn();
const mockProjectSelect = vi.fn();
const mockProjectSingle = vi.fn();
const mockProjectDelete = vi.fn();
const mockProjectEq = vi.fn();
const mockTeamMemberInsert = vi.fn();
const mockPhaseInsert = vi.fn().mockResolvedValue({ error: null });
const mockPhaseSelect = vi.fn();
const mockPhaseOrder = vi.fn();
const mockPhaseEq = vi.fn();
const mockWBSTemplateSelect = vi.fn();
const mockWBSTemplateOrder = vi.fn();
const mockWBSTemplateLimit = vi.fn();
const mockWBSTemplateMaybeSingle = vi.fn();
const mockRPC = vi.fn();
const mockBudgetTemplateSelect = vi.fn();
const mockBudgetTemplateEq = vi.fn();
const mockBudgetTemplateOrder = vi.fn();
const mockBudgetTemplateLimit = vi.fn();
const mockBudgetTemplateMaybeSingle = vi.fn();
const mockProjectBudgetsInsert = vi.fn();
const mockProjectBudgetsSelect = vi.fn();
const mockSimpleBudgetMaterialsSelect = vi.fn();
const mockBudgetLineItemsInsert = vi.fn();
const mockBudgetLineItemsUpdate = vi.fn();
const mockActivityTemplateSelect = vi.fn();
const mockActivityTemplateMaybeSingle = vi.fn();
const mockProjectActivitiesInsert = vi.fn();
const mockGetUser = vi.fn();


// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';

// Mock useToast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock LocalizationContext
vi.mock('@/contexts/LocalizationContext', () => ({
  useLocalization: vi.fn(() => ({
    t: (key: string) => key,
    dateFormat: 'MM/dd/yyyy',
    currency: 'USD',
    setLanguage: vi.fn(),
    setCurrency: vi.fn(),
    setDateFormat: vi.fn(),
    language: 'en',
  })),
}));

describe('Project Default Phases Creation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();

    // Mock auth.getUser
    supabase.auth.getUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: { full_name: 'Test User' },
        },
      },
      error: null,
    });

    // Mock from() for different tables
    supabase.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'projects') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'project-456',
                  name: 'Test Project',
                  owner_id: 'user-123',
                },
                error: null,
              }),
            }),
          }),
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }
      if (table === 'project_team_members') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === 'project_phases') {
        return {
          insert: mockPhaseInsert,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'project_wbs_templates') {
        const builder: any = {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        };
        return builder;
      }
      if (table === 'budget_templates') {
        const builder: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        };
        return builder;
      }
      if (table === 'activity_templates') {
        const builder: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        };
        return builder;
      }
      // Default mock for other tables
      return {
        insert: vi.fn(),
        select: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };
    });

    // Mock rpc calls
    supabase.rpc = vi.fn().mockResolvedValue({ error: null });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('AC #1: Default Phases Created on Project Creation', () => {
    it('should create two default phases with correct names when project is created', async () => {
      const { result } = renderHook(() => useProjects(), { wrapper });

      await act(async () => {
        await result.current.createProject.mutateAsync({
          name: 'New Project',
          status: 'active',
        });
      });

      // Verify phase insertion was called with correct data
      expect(mockPhaseInsert).toHaveBeenCalledTimes(1);
      const phases = mockPhaseInsert.mock.calls[0][0];

      expect(phases).toHaveLength(2);
      expect(phases[0]).toEqual({
        project_id: 'project-456',
        phase_name: 'Template',
        type: 'budget', // No start_date provided, so defaults to budget
      });

      expect(phases[1]).toEqual({
        project_id: 'project-456',
        phase_name: 'Adaptation',
        type: 'budget', // No start_date provided, so defaults to budget
      });
    });

    it('should use correct project_id for both phases', async () => {
      const { result } = renderHook(() => useProjects(), { wrapper });

      await act(async () => {
        await result.current.createProject.mutateAsync({
          name: 'New Project',
          status: 'active',
        });
      });

      const phases = mockPhaseInsert.mock.calls[0][0];

      // Both phases should have the same project_id
      expect(phases[0].project_id).toBe('project-456');
      expect(phases[1].project_id).toBe('project-456');
    });

    it('should let database defaults handle progress_percentage and status', async () => {
      const { result } = renderHook(() => useProjects(), { wrapper });

      await act(async () => {
        await result.current.createProject.mutateAsync({
          name: 'New Project',
          status: 'active',
        });
      });

      const phases = mockPhaseInsert.mock.calls[0][0];

      // Should have project_id, phase_name, and type (type is set in application code)
      expect(Object.keys(phases[0])).toEqual(['project_id', 'phase_name', 'type']);
      expect(Object.keys(phases[1])).toEqual(['project_id', 'phase_name', 'type']);
    });
  });

  describe('AC #2: Phase Creation is Atomic with Project Creation', () => {
    it('should show warning toast when phase creation fails', async () => {
      // Phase insert fails with error
      mockPhaseInsert.mockResolvedValue({
        error: { message: 'Database error' },
      });

      const { result } = renderHook(() => useProjects(), { wrapper });

      await act(async () => {
        await result.current.createProject.mutateAsync({
          name: 'New Project',
          status: 'active',
        });
      });

      // Should show success toast for project creation
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Project created',
        })
      );

      // Should show warning toast for phase creation failure
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Warning',
          description: expect.stringContaining('initial setups failed'),
          variant: 'destructive',
        })
      );
    });

    it('should succeed in creating project even when phase creation throws error', async () => {
      // Phase insert throws exception
      mockPhaseInsert.mockRejectedValue(new Error('Phase creation failed'));

      const { result } = renderHook(() => useProjects(), { wrapper });

      let createdProject: unknown;
      await act(async () => {
        createdProject = await result.current.createProject.mutateAsync({
          name: 'New Project',
          status: 'active',
        });
      });

      // Project should still be created successfully
      expect(createdProject).toHaveProperty('id', 'project-456');
      expect(createdProject).toHaveProperty('name', 'Test Project');

      // Warning toast should be shown
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Warning',
          variant: 'destructive',
        })
      );
    });

    it('should NOT rollback project creation when phase creation fails', async () => {
      mockPhaseInsert.mockResolvedValue({
        error: { message: 'Phase insert error' },
      });

      const { result } = renderHook(() => useProjects(), { wrapper });

      await act(async () => {
        await result.current.createProject.mutateAsync({
          name: 'New Project',
          status: 'active',
        });
      });

      // Project delete should NOT be called (unlike team member error)
      expect(mockProjectDelete).not.toHaveBeenCalled();
    });
  });

  describe('AC #3: Phases Are Immediately Available', () => {
    it('should invalidate queries after successful project creation', async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useProjects(), { wrapper });

      await act(async () => {
        await result.current.createProject.mutateAsync({
          name: 'New Project',
          status: 'active',
        });
      });

      // Should invalidate both projects and project_phases caches
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['projects'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['project_phases'] });

      invalidateQueriesSpy.mockRestore();
    });

    it('should show success toast for project creation', async () => {
      const { result } = renderHook(() => useProjects(), { wrapper });

      await act(async () => {
        await result.current.createProject.mutateAsync({
          name: 'New Project',
          status: 'active',
        });
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Project created',
        description: 'The project has been created successfully.',
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should throw error when project insert fails', async () => {
      // Override the projects table mock to return an error
      supabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'projects') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Project creation failed' },
                }),
              }),
            }),
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        // Use default mocks for other tables
        return {
          insert: vi.fn(),
          select: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        };
      });

      const { result } = renderHook(() => useProjects(), { wrapper });

      await expect(
        act(async () => {
          await result.current.createProject.mutateAsync({
            name: 'New Project',
            status: 'active',
          });
        })
      ).rejects.toThrow();
    });
  });
});
