import { FileText, Inbox, LayoutDashboard, PenSquare, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useContentHub } from '@/hooks/useContentHub';
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

const STATUSES = ['draft', 'pending_approval', 'published', 'archived'] as const;

type StatusKey = (typeof STATUSES)[number];

export default function ContentHubDashboard() {
  const { t } = useLocalization();
  const navigate = useNavigate();
  const { data = [], isLoading } = useContentHub({ includeArchived: true });

  const statusCounts = STATUSES.reduce<Record<StatusKey, number>>((accumulator, status) => {
    accumulator[status] = data.filter((item) => item.status === status).length;
    return accumulator;
  }, {
    draft: 0,
    pending_approval: 0,
    published: 0,
    archived: 0,
  });

  return (
    <div className="space-y-6 p-6">
      <SidebarHeaderShell>
<div>
        <h1 className="text-3xl font-bold">{t('contentHub.admin.dashboardTitle')}</h1>
        <p className="text-muted-foreground mt-2">{t('contentHub.admin.dashboardDescription')}</p>
      </div>
</SidebarHeaderShell>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">{t('contentHub.status.draft')}</CardTitle>
              <PenSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statusCounts.draft}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">{t('contentHub.status.pending')}</CardTitle>
              <Inbox className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statusCounts.pending_approval}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">{t('contentHub.status.published')}</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statusCounts.published}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">{t('contentHub.status.archived')}</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statusCounts.archived}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            {t('contentHub.admin.quickActions')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => navigate('/admin/content-hub/create')}>{t('contentHub.actions.create')}</Button>
          <Button variant="outline" onClick={() => navigate('/admin/content-hub/list')}>
            {t('contentHub.admin.manageContent')}
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/content-hub/approvals')}>
            {t('contentHub.admin.reviewApprovals')}
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/content-hub/settings')}>
            {t('contentHub.admin.settings')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
