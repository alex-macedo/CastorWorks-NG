# Domain Map (What’s Implemented Where)

This is a practical map of “where to look” for each major product area. It’s not a full spec; it’s a navigation aid for sprint work.

## Projects

- **Routes/pages**
  - `/projects` → `src/pages/Projects.tsx`
  - `/projects/:id` → `src/pages/ProjectDetail.tsx`
  - `/projects/:id/documents` → `src/pages/ProjectDocuments.tsx`
  - `/projects/:id/calendar` → `src/pages/ProjectCalendar.tsx`
  - `/project-phases` → `src/pages/ProjectPhases.tsx`
- **Components**
  - `src/components/Projects/**`
- **Common data**
  - Projects are frequently used as the “scope root” for authorization via RLS helper functions.

## Financial

- **Routes/pages**
  - `/financial` → `src/pages/Financial.tsx`
  - `/financial-ledger` → `src/pages/FinancialLedger.tsx`
  - `/budget-control` → `src/pages/BudgetControl.tsx`
  - `/budget-templates` → `src/pages/BudgetTemplates.tsx`
- **Components**
  - `src/components/Financial/**`

## Procurement (Purchase Orders, Quotes)

- **Routes/pages**
  - `/procurement` → `src/pages/Procurement.tsx`
  - `/purchase-orders` → `src/pages/PurchaseOrdersPage.tsx`
  - `/purchase-orders/:id` → `src/pages/PurchaseOrderDetailPage.tsx`
  - `/approvals` → `src/pages/Approvals.tsx`
- **Edge functions (high signal)**
  - `generate-po-pdf`
  - `send-po-email`
  - `send-quote-requests`
  - quote approval / expiry automation

## Client Portal (RBAC-based)

- **Routes/pages**
  - `/portal/:projectId` → `src/pages/ClientPortal/ClientPortalDashboard.tsx`
  - `/portal/:projectId/schedule` → `src/pages/ClientPortal/ClientPortalSchedule.tsx`
  - `/portal/:projectId/team` → `src/pages/ClientPortal/ClientPortalTeam.tsx`
  - `/portal/:projectId/tasks` → `src/pages/ClientPortal/ClientPortalTasks.tsx`
  - `/portal/:projectId/communication` → `src/pages/ClientPortal/ClientPortalCommunication.tsx`
  - `/portal/:projectId/chat` → `src/pages/ClientPortal/ClientPortalChat.tsx`
  - `/portal/:projectId/financial` → `src/pages/ClientPortal/ClientPortalFinancial.tsx`
  - `/portal/:projectId/photos` → `src/pages/ClientPortal/ClientPortalPhotos.tsx`
- **Auth**
  - `src/lib/clientPortalAuth.ts`
  - `src/hooks/clientPortal/useClientPortalAuth.tsx`

## Supervisor Mobile

- **Routes/pages**
  - `/supervisor/hub` → `src/pages/SupervisorHub.tsx`
  - `/supervisor/deliveries` → `src/pages/SupervisorDeliveryPortal.tsx`
  - `/supervisor/activity-log` → `src/pages/SupervisorActivityLog.tsx`
  - `/supervisor/issues` → `src/pages/SupervisorIssues.tsx`
  - `/supervisor/time-logs` → `src/pages/SupervisorTimeLogs.tsx`
  - `/supervisor/inspections` → `src/pages/SupervisorInspections.tsx`
  - `/supervisor/photos` → `src/pages/SupervisorPhotoGallery.tsx`
- **Context**
  - `src/contexts/SupervisorProjectContext.tsx`

## AI / Analytics

- **Routes/pages**
  - `/ai-insights` → `src/pages/AIInsights.tsx`
  - `/analytics` → `src/pages/Analytics.tsx`
- **Edge functions**
  - `generate-analytics-insights`
  - `ai-chat-assistant`
  - (additional AI utilities: cache manager, usage tracker, estimation generation)

## Maintenance / Admin

- **Routes/pages**
  - `/admin/maintenance` → `src/pages/Admin/MaintenanceManagement.tsx`
  - `/admin/telemetry` → `src/pages/Admin/TelemetryIssues.tsx`
  - `/admin/roles` → `src/pages/RoleManagement.tsx`
  - `/admin/audit-logs` → `src/pages/AuditLogs.tsx`
- **Edge functions**
  - `send-maintenance-notification`
  - `record_admin_event`

## “Where is X implemented?”

Practical approach:

1. Start at `src/App.tsx` to find the route → page.
2. Open the page and scan imports to find feature components/hooks.
3. Search for:
   - `supabase.from("table")` and `supabase.rpc("fn")`
   - `supabase.functions.invoke("edge-fn")`
4. Open the corresponding edge function under `supabase/functions/<edge-fn>/index.ts`.


