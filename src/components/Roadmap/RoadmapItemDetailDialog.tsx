import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowUp, 
  MessageSquare, 
  Paperclip, 
  Image, 
  Video,
  Download,
  Send,
  Tag,
  Calendar,
  X,
  Pencil,
  Trash2
} from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { formatDate } from '@/utils/formatters';
import { useToggleUpvote, useRoadmapItemComments, useCreateComment, useDeleteRoadmapItem } from '@/hooks/useRoadmapItems';
import { useRoadmapItemAttachments, useUploadAttachment, useDeleteAttachment } from '@/hooks/useRoadmapAttachments';
import { useRoadmapKanbanColumns } from '@/hooks/useRoadmapKanbanColumns';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface RoadmapItemDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  item: {
    id: string;
    title: string;
    description?: string | null;
    category: string;
    status: string;
    priority?: string | null;
    upvotes: number;
    comments_count: number;
    release_version?: string | null;
    created_at: string;
    dependencies?: any;
    roadmap_item_upvotes?: Array<{ user_id: string }> | null;
  } | null;
}

export function RoadmapItemDetailDialog({ 
  open, 
  onOpenChange,
  onEdit,
  item 
}: RoadmapItemDetailDialogProps) {
  const { t, dateFormat } = useLocalization();
  const toggleUpvote = useToggleUpvote();
  const createComment = useCreateComment();
  const deleteItem = useDeleteRoadmapItem();
  const uploadAttachment = useUploadAttachment();
  const deleteAttachment = useDeleteAttachment();
  const { columns: kanbanColumns } = useRoadmapKanbanColumns();

  const [newComment, setNewComment] = useState('');
  const [isUpvoted, setIsUpvoted] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemDeleteConfirmOpen, setItemDeleteConfirmOpen] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<string | null>(null);

  // Get data from hooks
  const { comments = [] } = useRoadmapItemComments(item?.id || '');
  const { attachments = [] } = useRoadmapItemAttachments(item?.id || '');

  if (!item) return null;

  const handleUpvote = async () => {
    const newUpvotedState = !isUpvoted;
    setIsUpvoted(newUpvotedState);
    
    try {
      await toggleUpvote.mutateAsync({
        itemId: item.id,
        isUpvoted: isUpvoted,
      });
    } catch (error) {
      setIsUpvoted(isUpvoted);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !item) return;
    
    try {
      await createComment.mutateAsync({
        itemId: item.id,
        content: newComment.trim(),
      });
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !item) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        await uploadAttachment.mutateAsync({
          roadmapItemId: item.id,
          file: file,
        });
      } catch (error) {
        console.error('Failed to upload file:', error);
      }
    }
    
    // Clear the input
    event.target.value = '';
  };

  const handleDeleteAttachment = (attachmentId: string) => {
    setAttachmentToDelete(attachmentId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteAttachment = async () => {
    if (!attachmentToDelete) return;
    
    try {
      await deleteAttachment.mutateAsync(attachmentToDelete);
      setDeleteDialogOpen(false);
      setAttachmentToDelete(null);
    } catch (error) {
      console.error('Failed to delete attachment:', error);
    }
  };

  const getCategoryBadge = (category: string) => {
    const categoryMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      feature: {
        label: t('roadmap.category.feature'),
        variant: 'default',
      },
      bug_fix: {
        label: t('roadmap.category.bugFix'),
        variant: 'destructive',
      },
      integration: {
        label: t('roadmap.category.integration'),
        variant: 'default',
      },
      refinement: {
        label: t('roadmap.category.refinement'),
        variant: 'secondary',
      },
    };

    const config = categoryMap[category] || categoryMap.feature;
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      backlog: { label: t('roadmap.status.backlog'), variant: 'outline' },
      next_up: { label: t('roadmap.status.nextUp'), variant: 'secondary' },
      in_progress: { label: t('roadmap.status.inProgress'), variant: 'default' },
      blocked: { label: t('roadmap.status.blocked'), variant: 'destructive' },
      done: { label: t('roadmap.status.done'), variant: 'default' },
    };

    let config = statusMap[status];
    if (!config) {
      const col = kanbanColumns.find((c) => c.id === status);
      const label = col ? (col.labelKey ? t(col.labelKey) : (col.label || col.id)) : status;
      config = { label, variant: 'outline' as const };
    }
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold mb-2">
                {item.title || t('roadmap.aiToWorkDialog.untitledTask')}
              </DialogTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {getCategoryBadge(item.category)}
                {getStatusBadge(item.status)}
                {item.priority && (
                  <Badge variant="outline">
                    {t(`roadmap.priority.${item.priority}`)}
                  </Badge>
                )}
                {item.release_version && (
                  <Badge variant="default" className="gap-1">
                    <Tag className="h-3 w-3" />
                    {item.release_version}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setItemDeleteConfirmOpen(true)}
                disabled={deleteItem.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('roadmap.deleteItem')}
              </Button>
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-2" />
                  {t('roadmap.editItem')}
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex gap-6 overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 space-y-4">
            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">{t('roadmap.descriptionField')}</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {item.description || t('roadmap.noDescription')}
              </p>
            </div>

            {/* Attachments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{t('roadmap.attachments')}</h3>
                <div className="flex gap-2">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                    multiple
                    accept="image/*,.pdf,.doc,.docx,video/*"
                    aria-label={t("ariaLabels.uploadAttachments")}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <Paperclip className="h-4 w-4 mr-2" />
                    {t('roadmap.attachFile')}
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {attachments.length === 0 ? (
                  <p className="text-sm text-muted-foreground col-span-2">
                    {t('roadmap.noAttachments')}
                  </p>
                  ) : (
                    attachments.map((attachment) => {
                      const isVideo =
                        attachment.file_type === 'video' ||
                        /\.(mp4|webm|mov|avi|mkv|m4v|ogg|ogv)(\?|$)/i.test(attachment.file_name || '');
                      
                      return (
                        <div 
                          key={attachment.id}
                          className={cn(
                            "flex items-center gap-2 p-2 border rounded-lg",
                            isVideo && "col-span-2"
                          )}
                        >
                          {isVideo ? (
                            <div className="w-full space-y-2">
                              <div className="flex items-center gap-2">
                                <Video className="h-4 w-4" />
                                <span className="text-sm truncate flex-1">
                                  {attachment.file_name}
                                </span>
                                <div className="flex gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => window.open(attachment.file_url, '_blank')}
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleDeleteAttachment(attachment.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              {attachment.file_url ? (
                                <video
                                  controls
                                  className="w-full max-h-64 rounded border"
                                  src={attachment.file_url}
                                >
                                  {t('roadmap.bugRecorder.videoNotSupported')}
                                </video>
                              ) : (
                                <p className="text-sm text-muted-foreground py-4">
                                  {t('roadmap.videoUrlUnavailable')}
                                </p>
                              )}
                            </div>
                          ) : (
                            <>
                              <Image className="h-4 w-4" />
                              <span className="text-sm truncate flex-1">
                                {attachment.file_name}
                              </span>
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => window.open(attachment.file_url, '_blank')}
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleDeleteAttachment(attachment.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

          {/* Sidebar */}
          <ScrollArea className="w-80 border-l">
            <div className="pl-6 space-y-4 pr-4">
              {/* Voting */}
              <div className="space-y-2">
                <Button
                  onClick={handleUpvote}
                  variant={isUpvoted ? "default" : "outline"}
                  className="w-full"
                  disabled={toggleUpvote.isPending}
                >
                  <ArrowUp className="h-4 w-4 mr-2" />
                  {isUpvoted ? t('roadmap.upvoted') : t('roadmap.upvote')}
                  <span className="ml-auto">{item.upvotes}</span>
                </Button>
              </div>

              <Separator />

              {/* Comments Section */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {t('roadmap.comments')} ({item.comments_count})
                </h3>

                {/* Add Comment */}
                <div className="space-y-2">
                  <Textarea
                    placeholder={t('roadmap.addComment')}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <Button 
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    size="sm"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {t('roadmap.postComment')}
                  </Button>
                </div>

                <Separator />

                {/* Comments List */}
                <div className="space-y-3">
                  {comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t('roadmap.noComments')}
                    </p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm">{comment.content}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(comment.created_at, dateFormat)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Footer with metadata */}
        <div className="border-t pt-4 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {t('roadmap.created')}: {formatDate(item.created_at, dateFormat)}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            {t('common.close')}
          </Button>
        </div>
      </DialogContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('roadmap.deleteAttachment')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('roadmap.confirmDeleteAttachment')}
            </AlertDialogDescription>
          </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={confirmDeleteAttachment}>
                        {t('roadmap.deleteAttachment')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
          
                <ConfirmDialog
                  open={itemDeleteConfirmOpen}
                  onOpenChange={setItemDeleteConfirmOpen}
                  onConfirm={async () => {
                    if (item) {
                      await deleteItem.mutateAsync(item.id);
                      onOpenChange(false);
                    }
                  }}
                  title={t('roadmap.deleteItemConfirmTitle')}
                  description={t('roadmap.deleteItemConfirmDescription')}
                  variant="danger"
                  confirmText={t('roadmap.deleteItem')}
                  cancelText={t('common.cancel')}
                />
              </Dialog>
            );
          }
          