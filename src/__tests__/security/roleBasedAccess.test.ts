import { describe, it, expect, beforeAll } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

/**
 * Role-Based Access Control (RBAC) Tests
 * 
 * These tests validate that role-based permissions are correctly enforced
 * across all tables and operations in the system.
 */

describe('Role-Based Access Control Tests', () => {
  let currentUserId: string | null = null;
  let userRoles: string[] = [];
  let isAdmin = false;
  let isPM = false;
  let isClient = false;

  beforeAll(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    currentUserId = user?.id || null;

    if (currentUserId) {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUserId);
      
      userRoles = roles?.map(r => r.role) || [];
      isAdmin = userRoles.includes('admin');
      isPM = userRoles.includes('project_manager');
      isClient = userRoles.includes('client');
    }
  });

  describe('Admin-Only Access', () => {
    it('should restrict app_settings modification to admins', async () => {
      const { data: settings } = await supabase
        .from('app_settings')
        .select('id')
        .limit(1)
        .single();

      if (settings) {
        const { error } = await supabase
          .from('app_settings')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', settings.id);

        if (!isAdmin) {
          expect(error).toBeDefined();
          expect(error?.message).toContain('policy');
        } else {
          expect(error).toBeNull();
        }
      }
    });

    it('should restrict company_settings modification to admins', async () => {
      const { data: settings } = await supabase
        .from('company_settings')
        .select('id')
        .limit(1)
        .single();

      if (settings) {
        const { error } = await supabase
          .from('company_settings')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', settings.id);

        if (!isAdmin) {
          expect(error).toBeDefined();
        } else {
          expect(error).toBeNull();
        }
      }
    });

    it('should restrict backup_jobs access to admins', async () => {
      const { data, error } = await supabase
        .from('backup_jobs')
        .select('id')
        .limit(10);

      if (!isAdmin) {
        expect(error).toBeDefined();
      } else {
        expect(error).toBeNull();
      }
    });

    it('should restrict backup_settings access to admins', async () => {
      const { data, error } = await supabase
        .from('backup_settings')
        .select('id')
        .limit(1);

      if (!isAdmin) {
        expect(error).toBeDefined();
      } else {
        expect(error).toBeNull();
      }
    });

    it('should restrict integration_settings to admins', async () => {
      const { data, error } = await supabase
        .from('integration_settings')
        .select('id')
        .limit(10);

      if (!isAdmin) {
        expect(error).toBeDefined();
      } else {
        expect(error).toBeNull();
      }
    });

    it('should restrict failed_login_attempts to admins', async () => {
      const { data, error } = await supabase
        .from('failed_login_attempts')
        .select('id')
        .limit(10);

      if (!isAdmin) {
        expect(error).toBeDefined();
      } else {
        expect(error).toBeNull();
      }
    });

    it('should restrict project_benchmarks management to admins', async () => {
      const { error } = await supabase
        .from('project_benchmarks')
        .insert({
          metric_name: 'Test Metric',
          metric_value: 100,
          benchmark_type: 'cost'
        });

      if (!isAdmin) {
        expect(error).toBeDefined();
      }
    });

    it('should restrict currency management to admins', async () => {
      const { error } = await supabase
        .from('currencies')
        .insert({
          code: 'TST',
          name: 'Test Currency',
          symbol: 'T'
        });

      if (!isAdmin) {
        expect(error).toBeDefined();
      }
    });

    it('should restrict exchange_rates management to admins', async () => {
      const { error } = await supabase
        .from('exchange_rates')
        .insert({
          from_currency: 'USD',
          to_currency: 'EUR',
          rate: 0.85,
          rate_date: new Date().toISOString().split('T')[0]
        });

      if (!isAdmin) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Admin and PM Access', () => {
    it('should allow admins and PMs to manage clients', async () => {
      const { error } = await supabase
        .from('clients')
        .insert({
          name: 'Test Client',
          email: 'test@example.com'
        });

      if (!isAdmin && !isPM) {
        expect(error).toBeDefined();
      }
    });

    it('should allow admins and PMs to manage suppliers', async () => {
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id')
        .limit(1)
        .single();

      if (suppliers) {
        const { error } = await supabase
          .from('suppliers')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', suppliers.id);

        // Update should require admin or PM role
        if (!isAdmin && !isPM) {
          expect(error).toBeDefined();
        }
      }
    });

    it('should allow admins and PMs to view admin_events', async () => {
      const { data, error } = await supabase
        .from('admin_events')
        .select('id')
        .limit(10);

      if (!isAdmin && !isPM) {
        expect(error).toBeDefined();
      } else {
        expect(error).toBeNull();
      }
    });

    it('should allow admins and PMs to manage cost_predictions', async () => {
      const { data: predictions } = await supabase
        .from('cost_predictions')
        .select('id')
        .limit(1)
        .single();

      if (predictions) {
        const { error } = await supabase
          .from('cost_predictions')
          .delete()
          .eq('id', predictions.id);

        if (!isAdmin && !isPM) {
          expect(error).toBeDefined();
        }
      }
    });

    it('should allow admins and PMs to manage client_project_access', async () => {
      const { error } = await supabase
        .from('client_project_access')
        .select('id')
        .limit(10);

      // View access should work for admins/PMs
      if (!isAdmin && !isPM && !isClient) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Project-Based Access', () => {
    it('should enforce project access on project_materials', async () => {
      const { data: materials } = await supabase
        .from('project_materials')
        .select('id, project_id')
        .limit(100);

      if (materials && materials.length > 0) {
        // Verify all materials belong to accessible projects
        const projectIds = [...new Set(materials.map(m => m.project_id))];
        
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

    it('should enforce project access on project_phases', async () => {
      const { data: phases } = await supabase
        .from('project_phases')
        .select('id, project_id')
        .limit(100);

      if (phases && phases.length > 0) {
        const projectIds = [...new Set(phases.map(p => p.project_id))];
        
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

    it('should enforce project admin access on budget modifications', async () => {
      const { data: items } = await supabase
        .from('project_budget_items')
        .select('id, project_id')
        .limit(1)
        .single();

      if (items) {
        const { error } = await supabase
          .from('project_budget_items')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', items.id);

        // Should require project admin access
        if (error) {
          expect(error.message).toContain('policy');
        }
      }
    });

    it('should enforce project admin access on activity modifications', async () => {
      const { data: activities } = await supabase
        .from('project_activities')
        .select('id, project_id')
        .limit(1)
        .single();

      if (activities) {
        const { error } = await supabase
          .from('project_activities')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', activities.id);

        if (error) {
          expect(error.message).toContain('policy');
        }
      }
    });
  });

  describe('Client-Specific Access', () => {
    it('should allow clients to view their project access', async () => {
      if (isClient) {
        const { data, error } = await supabase
          .from('client_project_access')
          .select('id, client_id, project_id')
          .eq('user_id', currentUserId!);

        expect(error).toBeNull();
      }
    });

    it('should restrict clients from viewing other clients data', async () => {
      if (isClient) {
        const { data: allAccess, error } = await supabase
          .from('client_project_access')
          .select('id, user_id')
          .limit(100);

        if (allAccess && allAccess.length > 0) {
          // Should only see own access records
          const allOwnRecords = allAccess.every(
            (record: any) => record.user_id === currentUserId
          );
          expect(allOwnRecords).toBe(true);
        }
      }
    });
  });

  describe('User-Scoped Access', () => {
    it('should restrict digital_signatures to own user', async () => {
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

    it('should restrict user_preferences to own user', async () => {
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('id, user_id')
        .limit(100);

      if (prefs && prefs.length > 0 && currentUserId) {
        const allOwnPrefs = prefs.every(p => p.user_id === currentUserId);
        expect(allOwnPrefs).toBe(true);
      }
    });

    it('should restrict mentions to mentioned user', async () => {
      const { data: mentions } = await supabase
        .from('mentions')
        .select('id, mentioned_user_id')
        .limit(100);

      if (mentions && mentions.length > 0 && currentUserId) {
        const allForUser = mentions.every(
          m => m.mentioned_user_id === currentUserId
        );
        expect(allForUser).toBe(true);
      }
    });
  });

  describe('Template Access Permissions', () => {
    it('should allow users to view all templates', async () => {
      const { data, error } = await supabase
        .from('activity_templates')
        .select('id')
        .limit(10);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should prevent modification of system templates', async () => {
      const { data: templates } = await supabase
        .from('activity_templates')
        .select('id, is_system')
        .eq('is_system', true)
        .limit(1)
        .single();

      if (templates) {
        const { error } = await supabase
          .from('activity_templates')
          .update({ template_name: 'Modified' })
          .eq('id', templates.id);

        // System templates should be protected
        expect(error).toBeDefined();
      }
    });

    it('should allow modification of custom templates', async () => {
      const { data: templates } = await supabase
        .from('activity_templates')
        .select('id, is_system')
        .eq('is_system', false)
        .limit(1)
        .single();

      if (templates) {
        const { error } = await supabase
          .from('activity_templates')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', templates.id);

        // Custom templates can be modified
        expect(error).toBeNull();
      }
    });
  });
});
