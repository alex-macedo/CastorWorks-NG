import { useEffect, useState } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Palette, Plus, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

interface TasksMoodboardViewProps {
  tasks: any[];
  onTaskEdit: (task: any) => void;
  projectId?: string;
}

interface MoodboardItem {
  id: string;
  url: string;
  title?: string;
  project_id?: string;
  description?: string;
  tags?: string[];
}

export const TasksMoodboardView = ({ tasks, onTaskEdit, projectId }: TasksMoodboardViewProps) => {
  const { t } = useLocalization();
  const [moodboardItems, setMoodboardItems] = useState<MoodboardItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    // In real implementation, upload to storage and create moodboard item
    setTimeout(() => {
      const newItems: MoodboardItem[] = Array.from(files).map((file, index) => ({
        id: `temp-${Date.now()}-${index}`,
        url: URL.createObjectURL(file),
        title: file.name,
        project_id: projectId,
      }));
      setMoodboardItems((prev) => [...prev, ...newItems]);
      setIsUploading(false);
    }, 1000);
  };

  const handleRemoveItem = (id: string) => {
    setMoodboardItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddFromUrl = () => {
    const url = window.prompt(t('architect.tasks.enterImageUrl'));
    if (url) {
      const newItem: MoodboardItem = {
        id: `temp-${Date.now()}`,
        url: url,
        title: t('architect.tasks.imageFromUrlTitle'),
        project_id: projectId,
      };
      setMoodboardItems((prev) => [...prev, newItem]);
      toast.success(t('architect.moodboard.messages.imageAdded'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('architect.tasks.viewModes.moodboard')}</h2>
          <p className="text-muted-foreground mt-1">
            {t('architect.tasks.moodboardDescription')}
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
            id="moodboard-upload"
            disabled={isUploading}
          />
          <Button
            variant="outline"
            onClick={() => document.getElementById('moodboard-upload')?.click()}
            disabled={isUploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? t('common.uploading') : t('architect.tasks.uploadImage')}
          </Button>
          <Button onClick={handleAddFromUrl}>
            <Plus className="h-4 w-4 mr-2" />
            {t('architect.tasks.addFromUrl')}
          </Button>
        </div>
      </div>

      {moodboardItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Palette className="h-16 w-16 text-muted-foreground opacity-50 mb-4" />
            <p className="text-muted-foreground mb-4">{t('architect.tasks.noMoodboardItems')}</p>
            <Button
              variant="outline"
              onClick={() => document.getElementById('moodboard-upload')?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {t('architect.tasks.uploadFirstImage')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {moodboardItems.map((item) => (
            <Card key={item.id} className="group relative overflow-hidden">
              <div className="aspect-square relative">
                <img
                  src={item.url}
                  alt={item.title || t('architect.tasks.moodboardImageAlt')}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {(item.title || item.description) && (
                <CardContent className="p-3">
                  {item.title && (
                    <p className="font-medium text-sm truncate">{item.title}</p>
                  )}
                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {item.description}
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
