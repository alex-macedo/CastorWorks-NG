import { HelpCircle } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { ContentFaqAccordion } from '@/components/ContentHub/ContentFaqAccordion';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useContentHub } from '@/hooks/useContentHub';
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

export default function FaqHub() {
  const { t } = useLocalization();
  const { data = [], isLoading } = useContentHub({
    type: 'faq',
    status: 'published',
  });

  return (
    <div className="space-y-6 p-6">
      <SidebarHeaderShell>
<div>
        <h1 className="text-3xl font-bold">{t('contentHub.faqTitle')}</h1>
        <p className="text-muted-foreground mt-2">{t('contentHub.faqDescription')}</p>
      </div>
</SidebarHeaderShell>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : data.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title={t('contentHub.empty.faqTitle')}
          description={t('contentHub.empty.faqDescription')}
        />
      ) : (
        <ContentFaqAccordion items={data} />
      )}
    </div>
  );
}
