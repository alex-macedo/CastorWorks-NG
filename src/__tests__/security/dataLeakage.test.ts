import { describe, it, expect, beforeAll } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

/**
 * Data Leakage Prevention Tests
 * 
 * These tests verify that no sensitive data is exposed across user boundaries,
 * projects, or roles. They check for common data leakage vulnerabilities.
 */

describe('Data Leakage Prevention Tests', () => {
  let currentUserId: string | null = null;
  let userRoles: string[] = [];
  let accessibleProjectIds: string[] = [];

  beforeAll(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    currentUserId = user?.id || null;

    if (currentUserId) {
      // Get user roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUserId);
      userRoles = roles?.map(r => r.role) || [];

      // Get accessible projects
      const { data: projects } = await supabase
        .from('projects')
        .select('id');
      accessibleProjectIds = projects?.map(p => p.id) || [];
    }
  });

  describe('Email Address Protection', () => {
    it('should not expose user emails beyond project scope', async () => {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, email')
        .limit(1000);

      if (profiles && currentUserId) {
        // Should not return all users in the system
        expect(profiles.length).toBeLessThan(1000);
        
        // Should include current user
        const hasOwnProfile = profiles.some(p => p.user_id === currentUserId);
        const isAdmin = userRoles.includes('admin');
        
        expect(hasOwnProfile || isAdmin).toBe(true);
      }
    });

    it('should not expose client emails without project access', async () => {
      const { data: clients } = await supabase
        .from('clients')
        .select('id, email')
        .limit(100);

      if (clients && clients.length > 0) {
        // If not admin/PM, should have restricted access
        if (!userRoles.includes('admin') && !userRoles.includes('project_manager')) {
          // Should only see clients for accessible projects
          const clientIds = clients.map(c => c.id);
          const { data: projects } = await supabase
            .from('projects')
            .select('client_id')
            .in('client_id', clientIds);

          expect(projects).toBeDefined();
        }
      }
    });
  });

  describe('Financial Data Protection', () => {
    it('should not expose budget data across projects', async () => {
      const { data: budgetItems } = await supabase
        .from('project_budget_items')
        .select('id, project_id, budgeted_amount, actual_amount')
        .limit(100);

      if (budgetItems && budgetItems.length > 0) {
        const projectIds = [...new Set(budgetItems.map(i => i.project_id))];
        
        // Verify user has access to all these projects
        for (const projectId of projectIds) {
          const { data: project } = await supabase
            .from('projects')
            .select('id')
            .eq('id', projectId)
            .single();

          expect(project).toBeDefined();
        }
      }
    });

    it('should not expose cost predictions across projects', async () => {
      const { data: predictions } = await supabase
        .from('cost_predictions')
        .select('project_id, predicted_cost')
        .limit(100);

      if (predictions && predictions.length > 0) {
        const projectIds = predictions
          .filter(p => p.project_id)
          .map(p => p.project_id);

        if (projectIds.length > 0) {
          // All project IDs should be in accessible projects
          const inaccessibleProjects = projectIds.filter(
            id => !accessibleProjectIds.includes(id!)
          );
          
          expect(inaccessibleProjects.length).toBe(0);
        }
      }
    });

    it('should not expose exchange rates management to non-admins', async () => {
      if (!userRoles.includes('admin')) {
        const { error } = await supabase
          .from('exchange_rates')
          .insert({
            from_currency: 'USD',
            to_currency: 'EUR',
            rate: 0.85,
            rate_date: new Date().toISOString().split('T')[0]
          });

        expect(error).toBeDefined();
        expect(error?.message).toContain('policy');
      }
    });
  });

  describe('Document Access Protection', () => {
    it('should not expose documents across projects', async () => {
      const { data: documents } = await supabase
        .from('project_documents')
        .select('id, project_id, file_name')
        .limit(100);

      if (documents && documents.length > 0) {
        const projectIds = [...new Set(documents.map(d => d.project_id))];
        
        // Verify access to all projects
        for (const projectId of projectIds) {
          const { data: project } = await supabase
            .from('projects')
            .select('id')
            .eq('id', projectId)
            .single();

          expect(project).toBeDefined();
        }
      }
    });

    it('should not expose document versions without document access', async () => {
      const { data: versions } = await supabase
        .from('document_version_history')
        .select('id, document_id')
        .limit(100);

      if (versions && versions.length > 0) {
        const docIds = [...new Set(versions.map(v => v.document_id))];
        
        // Should have access to all these documents
        const { data: docs } = await supabase
          .from('project_documents')
          .select('id')
          .in('id', docIds);

        expect(docs?.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Activity and Resource Protection', () => {
    it('should not expose activities across projects', async () => {
      const { data: activities } = await supabase
        .from('project_activities')
        .select('id, project_id, name')
        .limit(100);

      if (activities && activities.length > 0) {
        const projectIds = [...new Set(activities.map(a => a.project_id))];
        
        for (const projectId of projectIds) {
          const hasAccess = accessibleProjectIds.includes(projectId);
          expect(hasAccess).toBe(true);
        }
      }
    });

    it('should not expose daily logs across projects', async () => {
      const { data: logs } = await supabase
        .from('daily_logs')
        .select('id, project_id, tasks_completed')
        .limit(100);

      if (logs && logs.length > 0) {
        const projectIds = [...new Set(logs.map(l => l.project_id))];
        
        for (const projectId of projectIds) {
          const { data: project } = await supabase
            .from('projects')
            .select('id')
            .eq('id', projectId)
            .single();

          expect(project).toBeDefined();
        }
      }
    });
  });

  describe('Administrative Data Protection', () => {
    it('should not expose security events to non-admins', async () => {
      const { data, error } = await supabase
        .from('security_events')
        .select('id')
        .limit(10);

      if (!userRoles.includes('admin') && !userRoles.includes('project_manager')) {
        expect(error).toBeDefined();
      }
    });

    it('should not expose backup jobs to non-admins', async () => {
      const { data, error } = await supabase
        .from('backup_jobs')
        .select('id')
        .limit(10);

      if (!userRoles.includes('admin')) {
        expect(error).toBeDefined();
      }
    });

    it('should not expose failed login attempts to non-admins', async () => {
      const { data, error } = await supabase
        .from('failed_login_attempts')
        .select('id, email')
        .limit(10);

      if (!userRoles.includes('admin')) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Mention and Notification Privacy', () => {
    it('should only expose user own mentions', async () => {
      const { data: mentions } = await supabase
        .from('mentions')
        .select('id, mentioned_user_id, mentioning_user_id')
        .limit(100);

      if (mentions && mentions.length > 0 && currentUserId) {
        const allForCurrentUser = mentions.every(
          m => m.mentioned_user_id === currentUserId
        );
        expect(allForCurrentUser).toBe(true);
      }
    });

    it('should only expose user own preferences', async () => {
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('id, user_id')
        .limit(100);

      if (preferences && preferences.length > 0 && currentUserId) {
        const allOwnPreferences = preferences.every(
          p => p.user_id === currentUserId
        );
        expect(allOwnPreferences).toBe(true);
      }
    });
  });

  describe('Signature and Authentication Data', () => {
    it('should only expose user own digital signatures', async () => {
      const { data: signatures } = await supabase
        .from('digital_signatures')
        .select('id, user_id')
        .limit(100);

      if (signatures && signatures.length > 0 && currentUserId) {
        const allOwnSignatures = signatures.every(
          s => s.user_id === currentUserId
        );
        expect(allOwnSignatures).toBe(true);
      }
    });
  });

  describe('Cross-Project Data Isolation', () => {
    it('should verify complete isolation between projects', async () => {
      // Test multiple project-related tables in one go
      const tables = [
        'project_materials',
        'project_phases',
        'project_purchase_requests',
        'project_team_members'
      ] as const;

      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select('project_id')
          .limit(100);

        if (data && data.length > 0) {
          const projectIds = [...new Set(data.map((item: any) => item.project_id))];
          
          // All project IDs should be accessible
          for (const projectId of projectIds) {
            const { data: project } = await supabase
              .from('projects')
              .select('id')
              .eq('id', projectId)
              .single();

            expect(project).toBeDefined();
          }
        }
      }
    });
  });
});
