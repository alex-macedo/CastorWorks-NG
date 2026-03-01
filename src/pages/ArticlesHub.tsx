import { useMemo, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/EmptyState';
import { ContentCard } from '@/components/ContentHub/ContentCard';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useContentHub } from '@/hooks/useContentHub';
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

export default function ArticlesHub() {
  const { t } = useLocalization();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filters = useMemo(() => ({
    type: 'article' as const,
    status: 'published' as const,
    search,
  }), [search]);

  const { data = [], isLoading } = useContentHub(filters);

  return (
    <div className="space-y-6 p-6">
      <SidebarHeaderShell>
<div>
        <h1 className="text-3xl font-bold">{t('contentHub.articlesTitle')}</h1>
        <p className="text-muted-foreground mt-2">{t('contentHub.articlesDescription')}</p>
      </div>
</SidebarHeaderShell>

      <div className="max-w-md">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('contentHub.filters.search')}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : data.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={t('contentHub.empty.articlesTitle')}
          description={t('contentHub.empty.articlesDescription')}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((item) => (
            <ContentCard
              key={item.id}
              content={item}
              onView={() => navigate(`/articles/${item.slug}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
