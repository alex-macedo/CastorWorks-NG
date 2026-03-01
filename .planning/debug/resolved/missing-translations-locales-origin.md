---
status: resolved
trigger: "Investigate issue: missing-translations-locales-origin. Were src/locales copied from CastorWorks? Find missing keys and fix."
created: "2025-03-01T00:00:00.000Z"
updated: "2025-03-01T00:00:00.000Z"
---

## Current Focus

hypothesis: CONFIRMED — Code references settings:bdi.*, settings:digitalSignature.*, settings:googleDrive.*, settings:editProfileDialog.*, settings:rolePermissions.*, settings:sidebarPermissions.* and other keys that do not exist in settings.json (any language). check-translations only compares “all keys in en-US present in others”; it does not check “all keys used in code present in en-US”.
test: Add missing keys to settings.json for all 4 languages.
expecting: UI shows translated strings instead of raw keys.
next_action: Run i18n:check and confirm app shows translated strings.

## Symptoms

expected: All UI strings translated (4 languages: en-US, es-ES, fr-FR, pt-BR). If NG was branched/copied from CastorWorks, src/locales in NG should match or extend CastorWorks locales.
actual: Many places show missing translations (raw keys or fallbacks).
errors: (none specified)
reproduction: Use app in different languages or run i18n validation; observe missing keys or hardcoded strings.
started: Unknown; likely since NG inception or after adding new features.

## Eliminated

(none yet)

## Evidence

- timestamp: 2025-03-01
  checked: src/locales glob and package.json i18n scripts
  found: 510+ files under src/locales; some filenames are sentence-like (e.g. "1 item, R$ 1.json", "Loading data.json") suggesting keys-as-filenames or noise. Scripts: validate:json, i18n:scan, i18n:check, i18n:report, i18n:validate, i18n:unused, i18n:cleanup. CI runs i18n:validate.
  implication: Will run i18n:check and i18n:report for missing keys; need to compare namespace files across en-US, es-ES, fr-FR, pt-BR.
- timestamp: 2025-03-01
  checked: Git history for src/locales
  found: Initial commit "Initial commit - CastorWorks-NG multi-tenant SaaS foundation from CastorWorks v1.56"; later commits add onboarding, admin panel. Locales were copied from CastorWorks at NG inception.
  implication: Origin confirmed: locales came from CastorWorks; NG-added features (onboarding, auth forgot password, settings BDI/roles/Google Drive/edit profile) added t() calls; many keys never added to JSON.
- timestamp: 2025-03-01
  checked: i18n:check and translation-report.json
  found: "All translations are complete" (0 missing). check-translations.cjs uses en-US as reference and ensures pt-BR, es-ES, fr-FR have same keys; it does NOT check that keys used in source code exist in any locale.
  implication: Script can pass while UI still shows raw keys for keys referenced in code but missing from en-US.
- timestamp: 2025-03-01
  checked: settings.json en-US vs code (BDIParametersForm, GoogleDriveSettings, EditProfileDialog, RolePermissionsTable, SignatureCanvas, UserManagementPanel)
  found: Code uses settings:bdi.infoTitle, settings:bdi.fields.*, settings:digitalSignature.saveButton, settings:googleDrive.*, settings:editProfileDialog.*, settings:rolePermissions.*, settings:sidebarPermissions.*, settings:manageRoles, settings:noUsers, settings:noRoles, settings:userManagement, settings:editUserProfile, settings:globalAdminSupportOnly. en-US settings.json has no "bdi" object with infoTitle/fields/descriptions, no "digitalSignature", no "googleDrive", no "editProfileDialog", no "rolePermissions", no "sidebarPermissions"; only tabs.bdi, status.noRoles as labels.
  implication: Root cause: missing keys in settings namespace for all 4 languages.

## Resolution

root_cause: Translation keys used in the code (especially settings:bdi.*, settings:digitalSignature.*, settings:googleDrive.*, settings:editProfileDialog.*, settings:rolePermissions.*, settings:sidebarPermissions.*, and flat keys like manageRoles, noUsers, userManagement, editUserProfile, globalAdminSupportOnly) do not exist in src/locales/*/settings.json. Locales were copied from CastorWorks at NG inception; NG-specific UI added t() calls without adding corresponding keys to the JSON files. The i18n check script only verifies key parity across languages (en-US as reference), not that code-referenced keys exist.
fix: Add missing keys to settings.json for en-US, pt-BR, es-ES, fr-FR.
verification: i18n:check and validate:json pass; user confirmed fix in app (Settings BDI/Users/Edit Profile/language switch).
files_changed: [src/locales/en-US/settings.json, src/locales/pt-BR/settings.json, src/locales/es-ES/settings.json, src/locales/fr-FR/settings.json]
