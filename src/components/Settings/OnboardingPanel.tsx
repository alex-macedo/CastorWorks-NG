import { useState } from 'react'
import { toast } from 'sonner'
import { UserCheck, Users, RefreshCw, CheckCircle, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { useLocalization } from '@/contexts/LocalizationContext'
import { usePendingOnboardingUsers } from '@/hooks/usePendingOnboardingUsers'
import { useConfirmOnboarding } from '@/hooks/useConfirmOnboarding'
import { useDeletePendingUser } from '@/hooks/useDeletePendingUser'
import { ROLE_LABEL_KEYS, ALL_ROLES } from '@/constants/rolePermissions'
import type { AppRole } from '@/hooks/useUserRoles'

// Roles that are sensible defaults when onboarding a new user
const ONBOARDING_ROLES: AppRole[] = [
  'viewer',
  'project_manager',
  'admin_office',
  'site_supervisor',
  'accountant',
  'architect',
  'editor',
  'admin',
]

function formatDate(dateStr: string, locale: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export function OnboardingPanel() {
  const { t, language } = useLocalization()
  const { data: pendingUsers = [], isLoading, refetch } = usePendingOnboardingUsers()
  const confirmOnboarding = useConfirmOnboarding()
  const deletePendingUser = useDeletePendingUser()

  // Per-user role selection
  const [selectedRoles, setSelectedRoles] = useState<Record<string, AppRole>>({})
  // Delete confirmation dialog
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string } | null>(null)

  const getRole = (userId: string): AppRole => selectedRoles[userId] ?? 'viewer'

  const handleOnboard = async (userId: string, userEmail: string) => {
    const role = getRole(userId)
    try {
      await confirmOnboarding.mutateAsync({ userId, defaultRole: role })
      toast.success(t('settings:onboarding.toast.success'), {
        description: t('settings:onboarding.toast.successDescription', {
          email: userEmail,
          role: t(ROLE_LABEL_KEYS[role] ?? role),
        }),
      })
    } catch (err) {
      console.error('Failed to confirm onboarding:', err)
      toast.error(t('settings:onboarding.toast.error'), {
        description: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      await deletePendingUser.mutateAsync({ userId: deleteTarget.id })
      toast.success(t('settings:onboarding.toast.deleteSuccess'), {
        description: t('settings:onboarding.toast.deleteSuccessDescription', {
          email: deleteTarget.email,
        }),
      })
    } catch (err) {
      console.error('Failed to delete user:', err)
      toast.error(t('settings:onboarding.toast.deleteError'), {
        description: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setDeleteTarget(null)
    }
  }

  const isBusy = confirmOnboarding.isPending || deletePendingUser.isPending

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <UserCheck className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <CardTitle>{t('settings:onboarding.title')}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {t('settings:onboarding.description')}
                </CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
              className="shrink-0"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {t('settings:onboarding.refresh')}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div className="p-4 rounded-full bg-success/10">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <p className="font-medium text-lg">{t('settings:onboarding.empty.title')}</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                {t('settings:onboarding.empty.description')}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Table header */}
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-2 items-center px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                <span>{t('settings:onboarding.table.email')}</span>
                <span className="hidden md:block">{t('settings:onboarding.table.registeredAt')}</span>
                <span>{t('settings:onboarding.table.role')}</span>
                <span>{t('settings:onboarding.table.action')}</span>
              </div>

              {pendingUsers.map((user) => (
                <div
                  key={user.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-2 items-center px-3 py-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Email + Display Name */}
                  <div className="min-w-0">
                    <p className="font-medium truncate text-sm">{user.email}</p>
                    {user.display_name && (
                      <p className="text-xs text-muted-foreground truncate">{user.display_name}</p>
                    )}
                  </div>

                  {/* Registered date */}
                  <div className="hidden md:block shrink-0">
                    <Badge variant="outline" className="text-xs font-normal whitespace-nowrap">
                      {formatDate(user.created_at, language)}
                    </Badge>
                  </div>

                  {/* Role selector */}
                  <Select
                    value={getRole(user.id)}
                    onValueChange={(val) =>
                      setSelectedRoles((prev) => ({ ...prev, [user.id]: val as AppRole }))
                    }
                  >
                    <SelectTrigger className="h-8 w-[120px] text-xs shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ONBOARDING_ROLES.filter((r) => ALL_ROLES.includes(r)).map((role) => (
                        <SelectItem key={role} value={role} className="text-xs">
                          {t(ROLE_LABEL_KEYS[role] ?? role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Actions: Onboard + Delete */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      className="h-8 px-2.5 text-xs"
                      onClick={() => handleOnboard(user.id, user.email)}
                      disabled={isBusy}
                      title={t('settings:onboarding.onboardButton')}
                    >
                      <UserCheck className="h-3.5 w-3.5 mr-1" />
                      {t('settings:onboarding.onboardButton')}
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 px-2.5 text-xs"
                      onClick={() => setDeleteTarget({ id: user.id, email: user.email })}
                      disabled={isBusy}
                      title={t('settings:onboarding.deleteButton')}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      {t('settings:onboarding.deleteButton')}
                    </Button>
                  </div>
                </div>
              ))}

              {/* Summary */}
              <div className="flex items-center gap-2 pt-3 mt-3 border-t text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>
                  {t('settings:onboarding.pendingCount', { count: pendingUsers.length })}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings:onboarding.deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings:onboarding.deleteDialog.description', {
                email: deleteTarget?.email ?? '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePendingUser.isPending}>
              {t('settings:onboarding.deleteDialog.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deletePendingUser.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePendingUser.isPending ? (
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              )}
              {t('settings:onboarding.deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
