import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocalization } from '@/contexts/LocalizationContext';
import { generateSlug } from '@/utils/generateSlug';
import { supabase } from '@/integrations/supabase/client';
import type { ContentStatus, ContentType } from '@/types/contentHub';
import { CONTENT_STATUSES, CONTENT_TYPES } from './contentHubOptions';
import { VisibilitySelector } from './VisibilitySelector';
import { File, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

export type ContentEditorValues = {
  title: string;
  slug: string;
  content: string;
  type: ContentType;
  status: ContentStatus;
  visibility: string[];
  documentUrl?: string;
  documentName?: string;
};

type ContentEditorProps = {
  initialValues?: Partial<ContentEditorValues>;
  onSubmit: (values: ContentEditorValues) => void;
  isSubmitting?: boolean;
  allowStatusChange?: boolean;
};

export const ContentEditor = ({
  initialValues,
  onSubmit,
  isSubmitting = false,
  allowStatusChange = false,
}: ContentEditorProps) => {
  const { t } = useLocalization();
  const [hasTouchedSlug, setHasTouchedSlug] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [values, setValues] = useState<ContentEditorValues>({
    title: initialValues?.title ?? '',
    slug: initialValues?.slug ?? '',
    content: initialValues?.content ?? '',
    type: initialValues?.type ?? 'news',
    status: initialValues?.status ?? 'draft',
    visibility: initialValues?.visibility ?? ['admin'],
    documentUrl: initialValues?.documentUrl ?? '',
    documentName: initialValues?.documentName ?? '',
  });

  const slugPlaceholder = useMemo(() => {
    if (!values.title) return t('contentHub.editor.slugPlaceholder');
    return generateSlug(values.title);
  }, [t, values.title]);

  useEffect(() => {
    if (!hasTouchedSlug && values.title) {
      setValues((prev) => ({ ...prev, slug: generateSlug(values.title) }));
    }
  }, [hasTouchedSlug, values.title]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(values);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('contentHub.errors.fileTooLarge'));
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('content-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('content-documents')
        .getPublicUrl(filePath);

      setValues((prev) => ({
        ...prev,
        documentUrl: publicUrl,
        documentName: file.name,
      }));

      toast.success(t('contentHub.success.fileUploaded'));
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(t('contentHub.errors.uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setValues((prev) => ({
      ...prev,
      documentUrl: '',
      documentName: '',
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('contentHub.editor.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="content-title">{t('contentHub.editor.fields.title')}</Label>
              <Input
                id="content-title"
                value={values.title}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder={t('contentHub.editor.titlePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content-slug">{t('contentHub.editor.fields.slug')}</Label>
              <Input
                id="content-slug"
                value={values.slug}
                onChange={(event) => {
                  setHasTouchedSlug(true);
                  setValues((prev) => ({ ...prev, slug: event.target.value }));
                }}
                placeholder={slugPlaceholder}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('contentHub.editor.fields.type')}</Label>
              <Select
                value={values.type}
                onValueChange={(value) =>
                  setValues((prev) => ({ ...prev, type: value as ContentType }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('contentHub.editor.typePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`contentHub.types.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('contentHub.editor.fields.status')}</Label>
              <Select
                value={values.status}
                onValueChange={(value) =>
                  setValues((prev) => ({ ...prev, status: value as ContentStatus }))
                }
                disabled={!allowStatusChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('contentHub.editor.statusPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {t(`contentHub.status.${status === 'pending_approval' ? 'pending' : status}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('contentHub.editor.fields.visibility')}</Label>
            <VisibilitySelector
              value={values.visibility}
              onChange={(visibility) => setValues((prev) => ({ ...prev, visibility }))}
            />
          </div>

          {/* Document Upload - Only show for documents type */}
          {values.type === 'document' && (
            <div className="space-y-2">
              <Label>{t('contentHub.editor.fields.document')}</Label>
              {values.documentUrl ? (
                <div className="flex items-center gap-3 p-3 border rounded-md bg-muted/30">
                  <File className="h-8 w-8 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{values.documentName}</p>
                    <p className="text-xs text-muted-foreground">{t('contentHub.editor.documentAttached')}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveFile}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    {t('contentHub.editor.documentUploadHint')}
                  </p>
                  <label htmlFor="document-upload" className="cursor-pointer">
                    <span className="text-primary hover:underline">{t('contentHub.editor.browseFiles')}</span>
                    <input
                      id="document-upload"
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                  </label>
                  {isUploading && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {t('contentHub.editor.uploading')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <Tabs defaultValue="edit" variant="pill">
            <TabsList className="bg-muted/40">
              <TabsTrigger value="edit">{t('contentHub.editor.tabs.edit')}</TabsTrigger>
              <TabsTrigger value="preview">{t('contentHub.editor.tabs.preview')}</TabsTrigger>
            </TabsList>
            <TabsContent value="edit" className="space-y-2">
              <Label htmlFor="content-body">{t('contentHub.editor.fields.content')}</Label>
              <Textarea
                id="content-body"
                value={values.content}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, content: event.target.value }))
                }
                placeholder={t('contentHub.editor.contentPlaceholder')}
                rows={12}
              />
              <p className="text-xs text-muted-foreground">
                {t('contentHub.editor.markdownHint')}
              </p>
            </TabsContent>
            <TabsContent value="preview">
              <div className="rounded-md border bg-muted/30 p-4">
                {values.content ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{values.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t('contentHub.editor.previewEmpty')}
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('contentHub.editor.saving') : t('contentHub.editor.save')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
