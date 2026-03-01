import { useState, useEffect, Fragment } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableRow, TableCell, TableHead, TableHeader } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save, X, ChevronRight, ChevronDown, ChevronsDown, ChevronsUp } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";
import { ALL_ROLES, ROLE_LABEL_KEYS, SIDEBAR_OPTIONS } from "@/constants/rolePermissions";
import { useSidebarPermissions } from "@/hooks/useSidebarPermissions";
import { useSidebarPermissionManagement } from "@/hooks/useSidebarPermissionManagement";
import { useUserRoles } from "@/hooks/useUserRoles";
import { RequireAdmin } from "@/components/RoleGuard";
import type { AppRole } from "@/hooks/useUserRoles";
import type { PermissionChange } from "@/hooks/useSidebarPermissionManagement";

export function RolePermissionsTable() {
  const { t } = useLocalization();
  const { data: currentUserRoles = [] } = useUserRoles();
  const currentUserRolesArray = currentUserRoles.map((r) => r.role);
  const isAdmin = currentUserRolesArray.includes("admin");

  const { optionPermissions, tabPermissions, isLoading: isLoadingPermissions } = useSidebarPermissions();
  const { bulkUpdatePermissions, isUpdating } = useSidebarPermissionManagement();

  // Local state for checkbox changes (before saving)
  const [pendingChanges, setPendingChanges] = useState<Map<string, boolean>>(new Map());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [expandedOptions, setExpandedOptions] = useState<Set<string>>(new Set());

  // Get options that have tabs
  const optionsWithTabs = SIDEBAR_OPTIONS.filter((option) => option.tabs.length > 0);
  const allExpanded = optionsWithTabs.length > 0 && expandedOptions.size === optionsWithTabs.length;
  const allCollapsed = expandedOptions.size === 0;

  const handleExpandCollapseAll = () => {
    if (allExpanded) {
      // Collapse all
      setExpandedOptions(new Set());
    } else {
      // Expand all
      setExpandedOptions(new Set(optionsWithTabs.map((option) => option.id)));
    }
  };

  // Initialize pending changes from database permissions
  useEffect(() => {
    if (!isLoadingPermissions && optionPermissions.size > 0) {
      const initialChanges = new Map<string, boolean>();
      SIDEBAR_OPTIONS.forEach((option) => {
        ALL_ROLES.forEach((role) => {
          const key = `option:${option.id}:${role}`;
          const hasAccess = optionPermissions.get(option.id)?.includes(role) || false;
          initialChanges.set(key, hasAccess);
        });
        option.tabs.forEach((tab) => {
          ALL_ROLES.forEach((role) => {
            const key = `tab:${option.id}:${tab.id}:${role}`;
            const tabKey = `${option.id}.${tab.id}`;
            const hasAccess = tabPermissions.get(tabKey)?.includes(role) || false;
            initialChanges.set(key, hasAccess);
          });
        });
      });
      setPendingChanges(initialChanges);
    }
  }, [isLoadingPermissions, optionPermissions, tabPermissions]);

  // Check if a role has access to an option (from pending changes or database)
  const hasOptionAccess = (optionId: string, role: AppRole): boolean => {
    const key = `option:${optionId}:${role}`;
    if (pendingChanges.has(key)) {
      return pendingChanges.get(key) || false;
    }
    return optionPermissions.get(optionId)?.includes(role) || false;
  };

  // Check if a role has access to a tab (from pending changes or database)
  const hasTabAccess = (optionId: string, tabId: string, role: AppRole): boolean => {
    const key = `tab:${optionId}:${tabId}:${role}`;
    if (pendingChanges.has(key)) {
      return pendingChanges.get(key) || false;
    }
    const tabKey = `${optionId}.${tabId}`;
    return tabPermissions.get(tabKey)?.includes(role) || false;
  };

  // Handle checkbox change for option permissions
  const handleOptionPermissionChange = (optionId: string, role: AppRole, granted: boolean) => {
    if (!isAdmin) return;

    const key = `option:${optionId}:${role}`;
    setPendingChanges((prev) => {
      const next = new Map(prev);
      next.set(key, granted);
      return next;
    });
    setHasUnsavedChanges(true);
  };

  // Handle checkbox change for tab permissions
  const handleTabPermissionChange = (optionId: string, tabId: string, role: AppRole, granted: boolean) => {
    if (!isAdmin) return;

    const key = `tab:${optionId}:${tabId}:${role}`;
    setPendingChanges((prev) => {
      const next = new Map(prev);
      next.set(key, granted);
      return next;
    });
    setHasUnsavedChanges(true);
  };

  // Save all pending changes
  const handleSave = () => {
    if (!isAdmin || !hasUnsavedChanges) return;

    const changes: PermissionChange[] = [];

    // Collect option permission changes
    SIDEBAR_OPTIONS.forEach((option) => {
      ALL_ROLES.forEach((role) => {
        const key = `option:${option.id}:${role}`;
        const newValue = pendingChanges.get(key);
        const oldValue = optionPermissions.get(option.id)?.includes(role) || false;

        if (newValue !== undefined && newValue !== oldValue) {
          changes.push({
            type: "option",
            optionId: option.id,
            role,
            granted: newValue,
          });
        }
      });
    });

    // Collect tab permission changes
    SIDEBAR_OPTIONS.forEach((option) => {
      option.tabs.forEach((tab) => {
        ALL_ROLES.forEach((role) => {
          const key = `tab:${option.id}:${tab.id}:${role}`;
          const tabKey = `${option.id}.${tab.id}`;
          const newValue = pendingChanges.get(key);
          const oldValue = tabPermissions.get(tabKey)?.includes(role) || false;

          if (newValue !== undefined && newValue !== oldValue) {
            changes.push({
              type: "tab",
              optionId: option.id,
              tabId: tab.id,
              role,
              granted: newValue,
            });
          }
        });
      });
    });

    if (changes.length > 0) {
      bulkUpdatePermissions(changes);
      // Reset unsaved changes flag - the mutation will invalidate queries and update the UI
      // We'll use useEffect to sync when permissions are refetched
    }
  };

  // Reset unsaved changes when permissions are updated (after successful save)
  // When mutations complete and queries refetch, sync pendingChanges with new database state
  useEffect(() => {
    if (!isUpdating && !isLoadingPermissions) {
      // Rebuild pendingChanges from current database permissions
      const syncedChanges = new Map<string, boolean>();
      SIDEBAR_OPTIONS.forEach((option) => {
        ALL_ROLES.forEach((role) => {
          const key = `option:${option.id}:${role}`;
          const hasAccess = optionPermissions.get(option.id)?.includes(role) || false;
          syncedChanges.set(key, hasAccess);
        });
        option.tabs.forEach((tab) => {
          ALL_ROLES.forEach((role) => {
            const key = `tab:${option.id}:${tab.id}:${role}`;
            const tabKey = `${option.id}.${tab.id}`;
            const hasAccess = tabPermissions.get(tabKey)?.includes(role) || false;
            syncedChanges.set(key, hasAccess);
          });
        });
      });

      // Update pendingChanges to match database, and clear unsaved flag if no differences
      setPendingChanges((prevChanges) => {
        let hasChanges = false;
        for (const [key, dbValue] of syncedChanges.entries()) {
          if (prevChanges.get(key) !== dbValue) {
            hasChanges = true;
            break;
          }
        }

        if (!hasChanges) {
          setHasUnsavedChanges(false);
          return prevChanges;
        }

        return syncedChanges;
      });
    }
  }, [isUpdating, isLoadingPermissions, optionPermissions, tabPermissions]);

  // Cancel changes and revert to database state
  const handleCancel = () => {
    const revertedChanges = new Map<string, boolean>();
    SIDEBAR_OPTIONS.forEach((option) => {
      ALL_ROLES.forEach((role) => {
        const key = `option:${option.id}:${role}`;
        const hasAccess = optionPermissions.get(option.id)?.includes(role) || false;
        revertedChanges.set(key, hasAccess);
      });
      option.tabs.forEach((tab) => {
        ALL_ROLES.forEach((role) => {
          const key = `tab:${option.id}:${tab.id}:${role}`;
          const tabKey = `${option.id}.${tab.id}`;
          const hasAccess = tabPermissions.get(tabKey)?.includes(role) || false;
          revertedChanges.set(key, hasAccess);
        });
      });
    });
    setPendingChanges(revertedChanges);
    setHasUnsavedChanges(false);
  };

  if (isLoadingPermissions) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("settings:rolePermissions.title")}</CardTitle>
          <CardDescription>{t("settings:rolePermissions.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("settings:rolePermissions.title")}</CardTitle>
            <CardDescription>{t("settings:rolePermissions.subtitle")}</CardDescription>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              {optionsWithTabs.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExpandCollapseAll}
                  className="gap-2"
                >
                  {allExpanded ? (
                    <>
                      <ChevronsUp className="h-4 w-4" />
                      {t("settings:sidebarPermissions.collapseAll")}
                    </>
                  ) : (
                    <>
                      <ChevronsDown className="h-4 w-4" />
                      {t("settings:sidebarPermissions.expandAll")}
                    </>
                  )}
                </Button>
              )}
              {hasUnsavedChanges && (
                <Button variant="outline" onClick={handleCancel} disabled={isUpdating}>
                  <X className="mr-2 h-4 w-4" />
                  {t("settings:sidebarPermissions.cancel")}
                </Button>
              )}
              <Button onClick={handleSave} disabled={!hasUnsavedChanges || isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("settings:sidebarPermissions.saving")}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t("settings:sidebarPermissions.saveChanges")}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {hasUnsavedChanges && (
          <Alert className="mb-4">
            <AlertDescription>{t("settings:sidebarPermissions.unsavedChanges")}</AlertDescription>
          </Alert>
        )}
        <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
          <Table className="w-full table-fixed">
            <TableHeader className="sticky top-0 bg-background z-10 border-b">
              <TableRow>
                <TableHead className="w-[180px] min-w-[160px] max-w-[200px] bg-background">{t("settings:rolePermissions.sidebarOption")}</TableHead>
                <TableHead className="w-[200px] min-w-[180px] max-w-[250px] bg-background">{t("settings:rolePermissions.tabs")}</TableHead>
                {ALL_ROLES.map((role) => {
                  const roleLabel = t(ROLE_LABEL_KEYS[role]);
                  // Create compact label - split into words and stack vertically
                  const words = roleLabel.split(' ');
                  
                  return (
                    <TableHead 
                      key={role} 
                      className="text-center w-[85px] min-w-[75px] px-1 align-middle bg-background"
                      title={roleLabel}
                    >
                      <div className="flex flex-col items-center justify-center h-12 py-1">
                        {words.length > 1 ? (
                          <div className="space-y-0">
                            {words.map((word, i) => (
                              <div key={i} className="text-[9px] font-medium leading-[1.1]">
                                {word}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] font-medium leading-tight">
                            {roleLabel}
                          </div>
                        )}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {SIDEBAR_OPTIONS.map((option) => {
                const isExpanded = expandedOptions.has(option.id);
                const hasTabs = option.tabs.length > 0;

                return (
                  <Fragment key={option.id}>
                    <TableRow>
                      <TableCell className="font-medium w-[180px] min-w-[160px] max-w-[200px]">
                        <div className="flex items-center gap-1">
                          {hasTabs ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 shrink-0"
                              onClick={() => {
                                if (isExpanded) {
                                  setExpandedOptions((prev) => {
                                    const next = new Set(prev);
                                    next.delete(option.id);
                                    return next;
                                  });
                                } else {
                                  setExpandedOptions((prev) => new Set(prev).add(option.id));
                                }
                              }}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          ) : (
                            <div className="w-6 shrink-0" />
                          )}
                          <span className="text-sm truncate" title={t(option.titleKey)}>
                            {t(option.titleKey)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="w-[200px] min-w-[180px] max-w-[250px]">
                        {hasTabs ? (
                          <div className="flex flex-wrap gap-1.5">
                            {option.tabs.map((tab) => (
                              <Badge key={tab.id} variant="outline" className="text-xs py-0.5 px-1.5">
                                {t(tab.titleKey)}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {t("settings:rolePermissions.noTabs")}
                          </span>
                        )}
                      </TableCell>
                      {ALL_ROLES.map((role) => (
                        <TableCell key={`${option.id}-${role}`} className="text-center w-[85px] min-w-[75px] px-1">
                          <RequireAdmin>
                            <div className="flex items-center justify-center">
                              <Checkbox
                                checked={hasOptionAccess(option.id, role)}
                                onCheckedChange={(checked) =>
                                  handleOptionPermissionChange(option.id, role, checked === true)
                                }
                                disabled={isUpdating}
                              />
                            </div>
                          </RequireAdmin>
                          {!isAdmin && (
                            <div className="flex items-center justify-center">
                              {hasOptionAccess(option.id, role) ? (
                                <span className="text-success text-sm">✓</span>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </div>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                      {hasTabs && isExpanded && (
                        <>
                          {option.tabs.map((tab) => (
                            <TableRow key={`${option.id}-${tab.id}`} className="bg-muted/30">
                              <TableCell className="w-[180px] min-w-[160px] max-w-[200px] pl-8 font-medium text-xs">
                                <span className="truncate block" title={t(tab.titleKey)}>
                                  {t(tab.titleKey)}
                                </span>
                              </TableCell>
                              <TableCell className="w-[200px] min-w-[180px] max-w-[250px]">
                                <Badge variant="secondary" className="text-xs py-0.5 px-1.5">
                                  {t("settings:sidebarPermissions.tabPermission")}
                                </Badge>
                              </TableCell>
                              {ALL_ROLES.map((role) => (
                                <TableCell key={`${option.id}-${tab.id}-${role}`} className="text-center w-[85px] min-w-[75px] px-1">
                                  <RequireAdmin>
                                    <div className="flex items-center justify-center">
                                      <Checkbox
                                        checked={hasTabAccess(option.id, tab.id, role)}
                                        onCheckedChange={(checked) =>
                                          handleTabPermissionChange(
                                            option.id,
                                            tab.id,
                                            role,
                                            checked === true
                                          )
                                        }
                                        disabled={isUpdating}
                                      />
                                    </div>
                                  </RequireAdmin>
                                  {!isAdmin && (
                                    <div className="flex items-center justify-center">
                                      {hasTabAccess(option.id, tab.id, role) ? (
                                        <span className="text-success text-sm">✓</span>
                                      ) : (
                                        <span className="text-muted-foreground text-sm">—</span>
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </>
                      )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{t("settings:rolePermissions.legend")}</p>
        {isAdmin && (
          <p className="mt-2 text-sm text-muted-foreground">
            {t("settings:sidebarPermissions.adminNote")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
