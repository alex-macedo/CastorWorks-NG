/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useState } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useArchitectSiteDiary } from '@/hooks/useArchitectSiteDiary';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, CloudSun } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SiteDiaryFormDialog } from './SiteDiaryFormDialog';

interface SiteDiaryListProps {
  projectId: string;
}

export const SiteDiaryList = ({ projectId }: SiteDiaryListProps) => {
  const { t } = useLocalization();
  const { formatDate } = useDateFormat();
  const { diaryEntries, isLoading } = useArchitectSiteDiary(projectId);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);

  const handleEdit = (entry: any) => {
    setSelectedEntry(entry);
    setIsFormOpen(true);
  };

  if (isLoading) return <div>{t('common.loading')}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t('architect.siteDiary.title')}</h3>
        <Button onClick={() => { setSelectedEntry(null); setIsFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          {t('architect.siteDiary.new')}
        </Button>
      </div>

      {diaryEntries && diaryEntries.length > 0 ? (
        <div className="space-y-3">
          {diaryEntries.map((entry) => (
            <Card key={entry.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleEdit(entry)}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center font-medium">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(entry.diary_date)}
                  </div>
                  {entry.weather && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <CloudSun className="h-4 w-4 mr-1" />
                      {entry.weather}
                    </div>
                  )}
                </div>
                {entry.progress_summary && (
                  <div className="text-sm">{entry.progress_summary}</div>
                )}
                {entry.photos && Array.isArray(entry.photos) && entry.photos.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    📷 {entry.photos.length} {t('architect.siteDiary.photos')}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            {t('architect.siteDiary.noEntries')}
          </CardContent>
        </Card>
      )}

      <SiteDiaryFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        entry={selectedEntry}
        projectId={projectId}
      />
    </div>
  );
};