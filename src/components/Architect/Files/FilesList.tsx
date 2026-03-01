import { useState } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useProjectDocuments } from '@/hooks/useProjectDocuments';
import { useUploadDocument } from '@/hooks/useUploadDocument';
import { useDeleteDocument } from '@/hooks/useDeleteDocument';
import { formatDate } from '@/utils/reportFormatters';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  Download,
  Trash2,
  Search,
  Filter,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FilesListProps {
  projectId: string;
}

const FILE_TYPE_ICONS = {
  document: FileText,
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  archive: FileArchive,
  other: File,
};

export const FilesList = ({ projectId }: FilesListProps) => {
  const { t, dateFormat } = useLocalization();
  const { data: documents, isLoading } = useProjectDocuments(projectId);
  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');

  // Filter documents
  const filteredDocuments = documents?.filter((doc) => {
    if (searchQuery && !doc.file_name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (typeFilter !== 'all' && doc.file_type !== typeFilter) {
      return false;
    }
    // Client visibility filter removed - property doesn't exist in schema
    return true;
  }) || [];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadDialogOpen(true);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      await uploadMutation.mutateAsync({
        projectId,
        file: selectedFile,
        description: description || undefined,
        tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
      });

      setUploadDialogOpen(false);
      setSelectedFile(null);
      setDescription('');
      setTags('');
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const handleDownload = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-documents')
        .download(doc.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(t('architect.files.downloadFailed'));
      console.error('Download error:', error);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm(t('architect.files.confirmDelete'))) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(docId);
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  // Client visibility feature removed - property doesn't exist in schema
  const toggleVisibility = async (doc: any) => {
    toast.info(t('architect.files.visibilityNotImplemented'));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('architect.files.title')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('architect.files.description')}
          </p>
        </div>
        <div>
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button onClick={() => document.getElementById('file-upload')?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            {t('architect.files.upload')}
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('architect.files.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('architect.files.allTypes')}</SelectItem>
            <SelectItem value="document">{t('architect.files.documents')}</SelectItem>
            <SelectItem value="image">{t('architect.files.images')}</SelectItem>
            <SelectItem value="video">{t('architect.files.videos')}</SelectItem>
            <SelectItem value="other">{t('architect.files.other')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('architect.files.allFiles')}</SelectItem>
            <SelectItem value="visible">{t('architect.files.visibleToClient')}</SelectItem>
            <SelectItem value="hidden">{t('architect.files.hiddenFromClient')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Files Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-2">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
              <p className="text-muted-foreground">
                {searchQuery || typeFilter !== 'all' || visibilityFilter !== 'all'
                  ? t('architect.files.noMatches')
                  : t('architect.files.noFiles')}
              </p>
              <Button variant="outline" onClick={() => document.getElementById('file-upload')?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                {t('architect.files.uploadFirst')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => {
            const IconComponent = FILE_TYPE_ICONS[doc.file_type as keyof typeof FILE_TYPE_ICONS] || File;

            return (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <IconComponent className="h-5 w-5 text-primary shrink-0" />
                      <CardTitle className="text-sm truncate">{doc.file_name}</CardTitle>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <span className="sr-only">{t("architect.openMenu")}</span>
                          •••
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDownload(doc)}>
                          <Download className="mr-2 h-4 w-4" />
                          {t('architect.files.download')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleVisibility(doc)}>
                          <Eye className="mr-2 h-4 w-4" />
                          {t('architect.files.toggleVisibility')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(doc.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('architect.files.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {doc.description && (
                    <CardDescription className="text-xs line-clamp-2 mt-1">
                      {doc.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>{formatDate(doc.created_at, dateFormat)}</span>
                    </div>
                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {doc.tags.slice(0, 3).map((tag: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {doc.file_type}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Dialog */}
      <Sheet open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('architect.files.uploadFile')}</SheetTitle>
            <SheetDescription>
              {selectedFile?.name}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="description">{t('architect.files.description')} ({t('architect.files.optional')})</Label>
              <Textarea
                id="description"
                placeholder={t('architect.files.descriptionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">{t('architect.files.tags')} ({t('architect.files.optional')})</Label>
              <Input
                id="tags"
                placeholder={t('architect.files.tagsPlaceholder')}
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t('architect.files.tagsHelp')}
              </p>
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleUpload} disabled={!selectedFile || uploadMutation.isPending}>
              {uploadMutation.isPending ? t('common.uploading') : t('architect.files.upload')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};
