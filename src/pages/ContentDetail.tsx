import { ArrowLeft, Calendar } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useContentHubBySlug } from '@/hooks/useContentHub';
import { WorkflowStatusBadge } from '@/components/ContentHub/WorkflowStatusBadge';
import { formatDate } from '@/utils/reportFormatters';
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

export default function ContentDetail() {
  const { t, dateFormat } = useLocalization();
  const navigate = useNavigate();
  const { slug } = useParams();
  const { data, isLoading } = useContentHubBySlug(slug);

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">{t('common.loading')}</div>;
  }

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">{t('contentHub.detail.notFound')}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('contentHub.actions.back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Button variant="outline" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('contentHub.actions.back')}
      </Button>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <WorkflowStatusBadge status={data.status} />
            <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
              {t(`contentHub.types.${data.type}`)}
            </span>
          </div>
          <SidebarHeaderShell>
<div>
            <h1 className="text-3xl font-bold">{data.title}</h1>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {data.published_at
                  ? t('contentHub.detail.published', { date: formatDate(data.published_at, dateFormat) })
                  : t('contentHub.detail.updated', { date: formatDate(data.updated_at, dateFormat) })}
              </span>
            </div>
          </div>
</SidebarHeaderShell>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none dark:prose-invert">
            <ReactMarkdown>{data.content}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
