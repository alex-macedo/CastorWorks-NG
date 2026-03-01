/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useState } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Share2, Image as ImageIcon, Palette, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useArchitectMoodboard } from '@/hooks/useArchitectMoodboard';

interface MoodboardViewProps {
  projectId: string;
}

export const MoodboardView = ({ projectId }: MoodboardViewProps) => {
  const { t } = useLocalization();
  const resolvedProjectId = projectId ?? '';

  // Supabase hooks
  const {
    sections,
    images,
    colors,
    isLoading,
    createSection,
    deleteSection,
    uploadImage,
    deleteImage,
    addColor,
    deleteColor,
  } = useArchitectMoodboard(resolvedProjectId);

  // Dialog states
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [addImageOpen, setAddImageOpen] = useState(false);
  const [addColorOpen, setAddColorOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newColorCode, setNewColorCode] = useState('#000000');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [hiddenImageIds, setHiddenImageIds] = useState<string[]>([]);

  // Early return if no projectId
  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <p className="text-muted-foreground">{t('architect.moodboard.noProject')}</p>
      </div>
    );
  }

  // Handlers
  const handleCreateBoard = async () => {
    if (!newSectionName.trim()) return;

    try {
      await createSection.mutateAsync({
        project_id: projectId,
        name: newSectionName.toUpperCase(),
      });

      toast.success(t('architect.moodboard.messages.boardCreated'));
      setNewSectionName('');
      setCreateBoardOpen(false);
    } catch (error) {
      console.error('Error creating board:', error);
      toast.error(t('architect.moodboard.messages.error'));
    }
  };

  const handleAddColor = async () => {
    try {
      await addColor.mutateAsync({
        project_id: projectId,
        color_code: newColorCode,
      });

      toast.success(t('architect.moodboard.messages.colorAdded'));
      setNewColorCode('#000000');
      setAddColorOpen(false);
    } catch (error) {
      console.error('Error adding color:', error);
      toast.error(t('architect.moodboard.messages.error'));
    }
  };

  const handleRemoveColor = async (colorId: string) => {
    await deleteColor.mutateAsync(colorId);
  };

  const handleShare = () => {
    // Copy link to clipboard
    const link = `${window.location.origin}/architect/projects/${projectId}/moodboard`;
    navigator.clipboard.writeText(link);
    toast.success(t('architect.moodboard.messages.linkCopied'));
  };

  const handleImageUpload = async () => {
    if (!selectedFiles || !selectedSection) return;

    try {
      // Upload each file
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        await uploadImage.mutateAsync({
          section_id: selectedSection,
          project_id: projectId,
          file,
          description: file.name,
        });
      }

      toast.success(t('architect.moodboard.messages.imageAdded'));
      setSelectedFiles(null);
      setAddImageOpen(false);
    } catch (error) {
      console.error('Error uploading images:', error);
      const errorMessage = error instanceof Error ? error.message : t('architect.moodboard.messages.error');
      toast.error(errorMessage);
    }
  };

  const handleRemoveImage = async (imageId: string) => {
    const image = images.find(img => img.id === imageId);
    if (image) {
      await deleteImage.mutateAsync(image);
    }
  };

  const handleRemoveSection = async (sectionId: string) => {
    await deleteSection.mutateAsync(sectionId);
  };

  // Get images for a specific section
  const getImagesForSection = (sectionId: string) => {
    return images.filter(img => img.section_id === sectionId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">{t('architect.common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with action buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => setCreateBoardOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('architect.moodboard.createBoard')}
        </Button>

        <Button
          onClick={() => setAddImageOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          disabled={sections.length === 0}
        >
          <ImageIcon className="h-4 w-4 mr-2" />
          {t('architect.moodboard.addImages')}
        </Button>

        <Button
          onClick={() => setAddColorOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Palette className="h-4 w-4 mr-2" />
          {t('architect.moodboard.addColors')}
        </Button>

        <Button onClick={handleShare} variant="outline">
          <Share2 className="h-4 w-4 mr-2" />
          {t('architect.moodboard.share')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main content area - Image sections */}
        <div className="lg:col-span-3 space-y-6">
          {sections.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                {t('architect.moodboard.noBoards')}
              </CardContent>
            </Card>
          ) : (
            sections.map((section) => {
              const sectionImages = getImagesForSection(section.id);

              return (
                <div key={section.id} className="space-y-4">
                  {/* Section header */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground tracking-wider">
                      {section.name}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSection(section.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Image grid */}
                  {sectionImages.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">
                        {t('architect.moodboard.noImages')}
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {sectionImages.map((image) => {
                        if (hiddenImageIds.includes(image.id)) {
                          return null;
                        }
                        return (
                          <div key={image.id} className="relative group">
                            <img
                              src={image.image_url}
                              alt={image.description || ''}
                              className="w-full h-48 object-cover rounded-lg"
                              onError={() =>
                                setHiddenImageIds((prev) =>
                                  prev.includes(image.id) ? prev : [...prev, image.id],
                                )
                              }
                            />
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleRemoveImage(image.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar - Color palette */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground tracking-wider">
                {t('architect.moodboard.colorPalette').toUpperCase()}
              </h3>

              {colors.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('architect.moodboard.noColors')}
                </p>
              ) : (
                <div className="space-y-3">
                  {colors.map((color) => (
                    <div key={color.id} className="group relative">
                      <div
                        className="w-full h-16 rounded-lg border"
                        style={{ backgroundColor: color.color_code }}
                      />
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm font-mono">{color.color_code}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                          onClick={() => handleRemoveColor(color.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Board Dialog */}
      <Dialog open={createBoardOpen} onOpenChange={setCreateBoardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('architect.moodboard.createBoard')}</DialogTitle>
            <DialogDescription>
              {t('architect.moodboard.sectionName')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="section-name">{t('architect.moodboard.sectionName')}</Label>
              <Input
                id="section-name"
                placeholder={t('architect.moodboard.sectionNamePlaceholder')}
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateBoardOpen(false)}>
              {t('architect.common.cancel')}
            </Button>
            <Button onClick={handleCreateBoard} disabled={createSection.isPending}>
              {createSection.isPending ? t('architect.common.loading') : t('architect.moodboard.createBoard')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Image Dialog */}
      <Dialog open={addImageOpen} onOpenChange={setAddImageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('architect.moodboard.addImages')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="section-select">{t('architect.moodboard.sectionName')}</Label>
              <select
                id="section-select"
                className="w-full p-2 border rounded-md"
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
              >
                <option value="">{t('architect.moodboard.selectSection')}</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="image-upload">{t('architect.moodboard.uploadImage')}</Label>
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setSelectedFiles(e.target.files)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddImageOpen(false)}>
              {t('architect.common.cancel')}
            </Button>
            <Button
              onClick={handleImageUpload}
              disabled={!selectedSection || !selectedFiles || uploadImage.isPending}
            >
              {uploadImage.isPending ? t('architect.common.loading') : t('architect.moodboard.uploadImage')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Color Dialog */}
      <Dialog open={addColorOpen} onOpenChange={setAddColorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('architect.moodboard.addColor')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="color-code">{t('architect.moodboard.colorCode')}</Label>
              <div className="flex gap-2">
                <Input
                  id="color-code"
                  type="color"
                  value={newColorCode}
                  onChange={(e) => setNewColorCode(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  placeholder={t('architect.moodboard.colorCodePlaceholder')}
                  value={newColorCode}
                  onChange={(e) => setNewColorCode(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="p-4 rounded-lg border" style={{ backgroundColor: newColorCode }}>
              <p
                className="text-sm font-mono text-center"
                style={{
                  color: newColorCode.toLowerCase() === '#ffffff' ? '#000000' : '#ffffff',
                }}
              >
                {newColorCode}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddColorOpen(false)}>
              {t('architect.common.cancel')}
            </Button>
            <Button onClick={handleAddColor} disabled={addColor.isPending}>
              {addColor.isPending ? t('architect.common.loading') : t('architect.moodboard.addColor')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
