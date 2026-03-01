/**
 * AdminToolsPanel - Admin tools tab content for Settings page
 * Contains sub-tabs for: Maintenance Mode, Telemetry Issues, Database Export
 */

import { lazy, Suspense } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Sliders, Activity, Database } from 'lucide-react'
import { useLocalization } from '@/contexts/LocalizationContext'
import { DataManagementPanel } from './DataManagementPanel'

// Lazy load admin components
const MaintenanceContent = lazy(() => import('@/pages/Admin/MaintenanceManagement'))
const TelemetryContent = lazy(() => import('@/pages/Admin/TelemetryIssues'))

function LoadingFallback() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </CardContent>
    </Card>
  )
}

export function AdminToolsPanel() {
  const { t } = useLocalization()

  return (
    <Tabs defaultValue="maintenance" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="maintenance" className="flex items-center gap-2">
          <Sliders className="h-4 w-4" />
          <span className="hidden sm:inline">{t('settings.adminTools.maintenance')}</span>
        </TabsTrigger>
        <TabsTrigger value="telemetry" className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          <span className="hidden sm:inline">{t('settings.adminTools.telemetry')}</span>
        </TabsTrigger>
        <TabsTrigger value="database" className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          <span className="hidden sm:inline">{t('settings.adminTools.database')}</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="maintenance" className="mt-6">
        <Suspense fallback={<LoadingFallback />}>
          <div className="admin-tools-content">
            <MaintenanceContent />
          </div>
        </Suspense>
      </TabsContent>

      <TabsContent value="telemetry" className="mt-6">
        <Suspense fallback={<LoadingFallback />}>
          <div className="admin-tools-content">
            <TelemetryContent />
          </div>
        </Suspense>
      </TabsContent>

      <TabsContent value="database" className="mt-6">
        <DataManagementPanel />
      </TabsContent>
    </Tabs>
  )
}

export default AdminToolsPanel
