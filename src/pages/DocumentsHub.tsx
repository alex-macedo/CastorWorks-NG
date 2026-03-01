import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { ContentDocumentList } from '@/components/ContentHub/ContentDocumentList';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useContentHub } from '@/hooks/useContentHub';
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

export default function DocumentsHub() {
  const { t } = useLocalization();
  const navigate = useNavigate();
  const { data = [], isLoading } = useContentHub({
    type: 'document',
    status: 'published',
  });

  return (
    <div className="space-y-6 p-6">
      <SidebarHeaderShell>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('contentHub.documentsTitle')}</h1>
            <p className="text-sm text-sidebar-primary-foreground/80 mt-2">{t('contentHub.documentsDescription')}</p>
          </div>
        </div>
      </SidebarHeaderShell>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : data.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t('contentHub.empty.documentsTitle')}
          description={t('contentHub.empty.documentsDescription')}
        />
      ) : (
        <ContentDocumentList items={data} onSelect={(item) => navigate(`/documents/${item.slug}`)} />
      )}
    </div>
  );
}
