import React, { useState } from 'react';
import { useMilestoneComments } from '@/hooks/useMilestoneComments';
import { TimelineComment } from '@/types/timeline';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useCurrentUserProfile } from '@/hooks/useCurrentUserProfile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageSquare, 
  Send, 
  Reply, 
  Trash2, 
  Paperclip,
  MoreVertical
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MilestoneCommentsThreadProps {
  milestoneId: string;
  className?: string;
}

/**
 * MilestoneCommentsThread Component
 * Renders a threaded discussion view for a specific milestone.
 * Supports adding new comments, replying to existing ones, and deleting owned comments.
 */
export const MilestoneCommentsThread: React.FC<MilestoneCommentsThreadProps> = ({ 
  milestoneId,
  className 
}) => {
  const { t } = useLocalization();
  const { data: profile } = useCurrentUserProfile();
  const { comments, isLoading, postComment, deleteComment } = useMilestoneComments(milestoneId);
  
  const [newCommentText, setNewCommentText] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const handlePostComment = async () => {
    if (!newCommentText.trim()) return;
    await postComment.mutateAsync({ content: newCommentText });
    setNewCommentText('');
  };

  const handlePostReply = async (parentId: string) => {
    if (!replyText.trim()) return;
    await postComment.mutateAsync({ content: replyText, parentId });
    setReplyText('');
    setReplyToId(null);
  };

  // Internal component for individual comments with recursion for replies
  const CommentItem = ({ comment, isReply = false }: { comment: TimelineComment; isReply?: boolean }) => {
    const isAuthor = profile?.id === comment.userId;
    const [isReplyingLocally, setIsReplyingLocally] = useState(false);

    const handleReplyClick = () => {
      setReplyToId(comment.id);
      setIsReplyingLocally(true);
    };

    const handleCancelReply = () => {
      setReplyToId(null);
      setIsReplyingLocally(false);
      setReplyText('');
    };

    return (
      <div className={cn("flex gap-3 py-3 group animate-in fade-in duration-300", isReply && "ml-8 border-l pl-4 border-muted/50")}>
        <Avatar className="h-8 w-8 border shrink-0 transition-transform hover:scale-105">
          <AvatarImage src={comment.avatarUrl || undefined} />
          <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-bold">
            {comment.userName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2 overflow-hidden">
              <span className="text-sm font-semibold truncate hover:underline cursor-default">
                {comment.userName}
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0 uppercase tracking-tighter">
                {formatDistanceToNow(comment.timestamp, { addSuffix: true })}
              </span>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuItem onClick={handleReplyClick} className="text-xs cursor-pointer">
                  <Reply className="h-3 w-3 mr-2" />
                  {t('common.reply')}
                </DropdownMenuItem>
                {isAuthor && (
                  <DropdownMenuItem 
                    className="text-xs text-destructive focus:text-destructive cursor-pointer"
                    onClick={() => deleteComment.mutate(comment.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    {t('common.delete')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed break-words">
            {comment.text}
          </div>

          <div className="flex items-center gap-3 pt-0.5">
            {!isReply && (
              <button 
                onClick={handleReplyClick}
                className="text-[10px] font-bold text-muted-foreground/70 hover:text-primary transition-colors flex items-center gap-1.5 uppercase tracking-wide"
              >
                <Reply className="h-2.5 w-2.5" />
                {t('common.reply')}
              </button>
            )}
          </div>

          {(replyToId === comment.id || isReplyingLocally) && (
            <div className="pt-3 animate-in slide-in-from-top-2 duration-200">
              <div className="flex flex-col gap-2 p-2.5 bg-muted/40 rounded-xl border border-muted ring-1 ring-black/5">
                <Textarea 
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={t('milestones.comments.replyPlaceholder', { defaultValue: 'Write a reply...' })}
                  className="min-h-[70px] text-sm resize-none bg-background focus-visible:ring-1 border-none shadow-none"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCancelReply}>
                    {t('common.cancel')}
                  </Button>
                  <Button 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={() => handlePostReply(comment.id)}
                    disabled={!replyText.trim() || postComment.isPending}
                  >
                    {postComment.isPending ? t('common.posting', { defaultValue: 'Posting...' }) : t('common.post', { defaultValue: 'Reply' })}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <div className="space-y-1.5 pt-3">
              {comment.replies.map(reply => (
                <CommentItem key={reply.id} comment={reply} isReply />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-6 py-6", className)}>
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-4 px-4">
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-3">
              <div className="h-3 w-1/4 bg-muted rounded animate-pulse" />
              <div className="h-12 w-full bg-muted/50 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-background/30 backdrop-blur-xl", className)}>
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 custom-scrollbar">
        {comments && comments.length > 0 ? (
          comments.map(comment => <CommentItem key={comment.id} comment={comment} />)
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/40 text-center select-none">
            <div className="relative mb-4">
              <MessageSquare className="h-12 w-12 stroke-[1.5]" />
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full animate-ping" />
            </div>
            <p className="text-sm font-medium">{t('milestones.comments.noComments', { defaultValue: 'No discussions yet' })}</p>
            <p className="text-xs max-w-[180px] mt-1 opacity-70">
              Be the first to share an update or ask a question about this milestone.
            </p>
          </div>
        )}
      </div>

      <div className="px-6 py-5 border-t bg-background/80 backdrop-blur-md ring-1 ring-black/5">
        <div className="flex flex-col gap-3 group">
          <div className="relative">
            <Textarea
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder={t('milestones.comments.placeholder', { defaultValue: 'Share an update...' })}
              className="min-h-[100px] text-sm resize-none focus-visible:ring-1 bg-muted/20 border-muted placeholder:text-muted-foreground/50 pr-4 pb-2 pt-3 rounded-xl transition-all group-focus-within:bg-background"
            />
          </div>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" className="text-muted-foreground h-9 px-3 hover:text-foreground hover:bg-muted/50 rounded-lg group/attach">
              <Paperclip className="h-4 w-4 mr-2.5 transition-transform group-hover/attach:-rotate-12" />
              <span className="text-xs font-semibold uppercase tracking-wider transition-colors">{t('common.attach')}</span>
            </Button>
            <Button 
              size="sm" 
              className="h-9 px-4 rounded-lg shadow-sm"
              onClick={handlePostComment}
              disabled={!newCommentText.trim() || postComment.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                {postComment.isPending ? t('common.posting', { defaultValue: 'Posting...' }) : t('common.post', { defaultValue: 'Post' })}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
