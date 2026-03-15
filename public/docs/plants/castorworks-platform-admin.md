# SaaS Platform Team Workspace, Customer Admin, and Global Templates

## Summary
Build a dedicated platform-team workspace for CastorWorks-NG using new platform-only roles: `platform_owner`, `platform_support`, and `platform_sales`. This workspace will expose platform-operated features only for internal staff: Support Chat, Campaigns (WhatsApp), Contact List, Forms, Task Management, and Communication Log. In parallel, keep the `super_admin` customer admin dashboard for tenants, licensing, tenant users, utilization insights, and the shared global template catalog.

This plan follows SaaS best practice by separating platform operations data from customer tenant data, keeping customer administration under a platform-admin role, and avoiding reuse of tenant-facing modules as unrestricted cross-tenant tools.

## Key Changes
### Role model
- Add new enum values to `app_role`:
  - `platform_owner`
  - `platform_support`
  - `platform_sales`
- Keep `super_admin` as the platform infrastructure/customer-admin role for tenant and licensing control.
- Keep existing `global_admin` behavior unchanged for legacy support/project-wide access; do not extend it further.
- Update all role types, generated app-role references, route guards, sidebar permission seeds, role labels/descriptions, and admin role-management UIs to recognize the new platform roles.
- Access split for v1:
  - `platform_owner`: full access to the platform workspace plus customer admin/global templates
  - `platform_support`: Support Chat, Contacts, Forms, Task Management, Communication Log
  - `platform_sales`: Contacts, Campaigns, Forms, Task Management, Communication Log
- `super_admin` and `platform_owner` should both be able to enter the platform workspace if desired, but only `super_admin` owns tenant/licensing governance unless explicitly expanded later.

### Platform workspace
- Add a separate platform navigation/workspace rather than mixing platform-team tools into the main tenant workspace.
- Create a platform-only route group for:
  - Support Chat
  - Campaigns
  - Contacts
  - Forms
  - Task Management
  - Communication Log
- Update sidebar permissions so these features are visible only to the new platform roles in the platform workspace.
- Avoid exposing these modules to customer tenant users through existing sidebar grants, even if those screens already exist elsewhere.

### Platform data architecture
- Use a separate platform workspace data model, not raw cross-tenant reuse of customer operational tables.
- Preferred implementation:
  - introduce platform-owned records/tables or a clear platform namespace for contacts, campaigns, forms, tasks, communication threads/logs, and support chat conversations
  - keep these entities independent of `tenant_id`-scoped customer application data
- Allow controlled links from platform records to customer tenants where useful, for example:
  - a platform contact may reference a tenant/customer
  - a support conversation may be linked to a tenant
  - a campaign may target waiting-list or CRM contacts rather than tenant-owned contacts
- Do not make platform roles automatically query or mutate all tenant `contacts`, `campaigns`, `forms`, or `architect_tasks` rows. That would violate clean SaaS boundary design and create noisy mixed ownership.

### Customer admin dashboard
- Keep the customer admin dashboard as a separate platform-admin surface for:
  - tenant list and customer health
  - subscription/tier overview
  - licensed modules and overrides
  - tenant user roster and membership management
  - utilization ranking and recommendations
- Add customer detail pages with:
  - tenant profile and status
  - current tier and effective modules
  - override management
  - tenant user management
  - onboarding readiness and shared template availability
- Use server-side admin read models for cross-tenant aggregation instead of many client-side joins.

### Global Templates
- Keep the shared-catalog model for global templates.
- Add platform-managed global templates under the existing `Templates` sidebar option, available to onboarded customers as a catalog they can use or duplicate.
- Platform governance:
  - `platform_owner` and/or `super_admin` can create, publish, update, archive platform global templates
  - tenant users can only view/apply allowed published templates
- Extend this to the relevant template families already present:
  - phase templates
  - activity templates
  - WBS templates
  - budget templates
  - optionally WhatsApp templates if treated as platform-curated assets
- Add metadata to distinguish platform-global, tenant-owned, and existing system/default templates.

### Utilization and recommendations
- Build v1 utilization from existing telemetry and AI usage signals rather than introducing a full product analytics redesign now.
- Use current tenant-linked signals such as:
  - `ai_usage_logs`
  - tenant-scoped operational/activity volume where `tenant_id` exists
  - licensed modules versus observed usage
  - user recency/activity where available
- Surface “most used options” only where the signal is reliable.
- Add rule-based recommendations for onboarding, module adoption, tier pressure, and upsell/training opportunities.
- Mark inferred metrics clearly when precision is limited.

## Public Interfaces / Types
- Extend all app-role typings and role-label metadata with:
  - `platform_owner`
  - `platform_support`
  - `platform_sales`
  - `super_admin` where still missing
- Add typed contracts for:
  - platform workspace dashboard/navigation state
  - platform contacts/campaigns/forms/tasks/communication entities
  - platform support chat entities
  - customer admin aggregate and detail responses
  - global template visibility/source metadata
- Keep admin and platform workspace APIs explicit and server-shaped rather than exposing raw table joins to the client.

## Test Plan
- Role and guard tests:
  - `platform_owner`, `platform_support`, `platform_sales` route access
  - platform-only feature visibility
  - non-platform roles denied from platform workspace
  - non-`super_admin` denied from customer admin if that separation is kept
- Authorization/RLS tests:
  - platform workspace data is isolated from tenant data
  - tenant users cannot access platform records
  - platform roles cannot bypass into customer tenant transactional data except through intended admin read models
- Query/mutation tests for:
  - platform contacts/campaigns/forms/tasks/communications/support chat
  - customer admin aggregates and detail
  - module override add/remove
  - tenant membership add/remove/update
  - global template publish/archive
- UI tests:
  - platform workspace sidebar visibility by role
  - customer admin dashboard and drill-down
  - global templates catalog management
  - tenant-facing visibility of published global templates
- E2E with agent-browser:
  - login as each platform role and verify only allowed tools appear
  - exercise support and sales workflows
  - verify platform-only data remains isolated
  - login as `super_admin` for customer admin flows
  - verify a tenant user can see published global templates but not platform workspace tools
- Run i18n validation for all new strings across `en-US`, `pt-BR`, `es-ES`, and `fr-FR`.

## Best-Practice Validation
This plan is aligned with SaaS platform best practices in these ways:
- Separation of concerns: platform operations are isolated from customer tenant operations instead of reusing tenant-facing modules as unrestricted cross-tenant tools.
- Least privilege: roles are split by job function, with `platform_owner` broader than support/sales, and customer admin remaining under a distinct higher-trust path.
- Multi-tenant safety: cross-tenant customer views are served through deliberate admin read models, not broad raw-table access for internal users.
- Data ownership clarity: platform CRM/support/campaign data has a platform owner; customer data remains tenant-owned.
- Extensibility: the model supports later additions like SLA workflows, lead pipelines, tenant success playbooks, or selective tenant drill-down without reworking the trust boundary.
- Auditability: platform actions and customer-admin actions can be logged separately, which is important for compliance and incident review.

This plan avoids common SaaS anti-patterns:
- no shared “god mode” for all internal users
- no broad cross-tenant reuse of tenant transactional tables for platform operations
- no conflation of support/sales data with customer application data
- no duplication of global templates into every tenant by default

## Assumptions and defaults
- Use `platform_sales` as the correct role name; `platformt_sales` is treated as a typo and should not be introduced.
- Platform-team tools will use separate platform-owned data structures and workspace routing.
- `super_admin` remains the primary tenant/licensing/customer-admin authority.
- `platform_owner` gets access to the platform workspace and may also be allowed into platform-governed global template management.
- Global templates remain shared-catalog based, not copied into every tenant at onboarding.
- Utilization remains based on current telemetry plus recommendation logic; full feature-event analytics is out of scope for this phase.
