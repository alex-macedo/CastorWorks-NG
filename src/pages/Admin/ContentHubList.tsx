import { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ContentCard } from '@/components/ContentHub/ContentCard';
import { ContentFilters } from '@/components/ContentHub/ContentFilters';
import { EmptyState } from '@/components/EmptyState';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useContentHub } from '@/hooks/useContentHub';
import type { ContentHubFilters } from '@/types/contentHub';
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

export default function ContentHubList() {
  const { t } = useLocalization();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ContentHubFilters>({ includeArchived: true });
  const { data = [], isLoading } = useContentHub(filters);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <SidebarHeaderShell>
<div>
          <h1 className="text-3xl font-bold">{t('contentHub.admin.listTitle')}</h1>
          <p className="text-muted-foreground mt-2">{t('contentHub.admin.listDescription')}</p>
        </div>
</SidebarHeaderShell>
        <Button onClick={() => navigate('/admin/content-hub/create')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('contentHub.actions.create')}
        </Button>
      </div>

      <ContentFilters filters={filters} onChange={setFilters} />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : data.length === 0 ? (
        <EmptyState
          title={t('contentHub.empty.adminTitle')}
          description={t('contentHub.empty.adminDescription')}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((item) => (
            <ContentCard
              key={item.id}
              content={item}
              onView={() => navigate(`/content/${item.slug}`)}
              onEdit={() => navigate(`/admin/content-hub/${item.id}/edit`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
