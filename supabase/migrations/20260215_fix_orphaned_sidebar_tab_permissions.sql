-- ============================================================================
-- Fix orphaned sidebar tab permissions
-- ============================================================================
-- Issue: Some roles had tab-level permissions but were missing the corresponding
-- option-level permission. This caused the entire menu section to be hidden
-- for those users, even though they had access to individual tabs.
--
-- Root Cause: The AppSidebar component checks option-level access first.
-- If an option is configured in the database (has any option-level permissions),
-- it ONLY uses database permissions and ignores the constant-based fallback.
-- This means if a role has tab permissions but no option permission, the entire
-- section won't show.
--
-- Fix: Ensure all roles that have tab-level permissions also have the
-- corresponding option-level permission.
-- ============================================================================

BEGIN;

-- Insert missing option-level permissions for roles that have tab-level permissions
-- Uses the minimum sort_order from existing option permissions, or 999 if none exist
INSERT INTO sidebar_option_permissions (option_id, role, sort_order)
SELECT DISTINCT 
  stp.option_id,
  stp.role,
  COALESCE(
    (SELECT MIN(sort_order) FROM sidebar_option_permissions WHERE option_id = stp.option_id),
    999
  ) as sort_order
FROM sidebar_tab_permissions stp
WHERE NOT EXISTS (
  SELECT 1 FROM sidebar_option_permissions sop
  WHERE sop.option_id = stp.option_id AND sop.role = stp.role
)
ON CONFLICT (option_id, role) DO NOTHING;

COMMIT;
