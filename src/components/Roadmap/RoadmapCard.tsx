import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ArrowUp, MessageSquare, Calendar, User } from 'lucide-react';
import { useToggleUpvote } from '@/hooks/useRoadmapItems';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useDateFormat } from '@/hooks/useDateFormat';
import { DependencyIndicator } from './DependencyIndicator';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOpenSprint } from '@/hooks/useSprints';
import type { RoadmapItem } from '@/hooks/useRoadmapItems';

interface RoadmapCardProps {
  item: {
    id: string;
    title: string;
    description?: string | null;
    category: string;
    upvotes: number;
    comments_count: number;
    status: string;
    priority?: string | null;
    release_version?: string | null;
    created_at: string;
    due_date?: string | null;
    roadmap_item_upvotes?: Array<{ user_id: string }> | null;
    dependencies?: any;
    sprint_id?: string | null;
    assignee?: { user_id: string; display_name?: string | null; avatar_url?: string | null } | null;
  };
  allItems?: RoadmapItem[];
  onDragStart?: (e: React.DragEvent, itemId: string) => void;
  onDragEnd?: () => void;
  onClick?: () => void;
}

export function RoadmapCard({ item, allItems = [], onDragStart, onDragEnd, onClick }: RoadmapCardProps) {
  const parsedDeps = item.dependencies ? (typeof item.dependencies === 'string' ? JSON.parse(item.dependencies) : item.dependencies) : [];
  const { t } = useLocalization();
  const { formatDate } = useDateFormat();
  const toggleUpvote = useToggleUpvote();
  const { data: openSprint } = useOpenSprint();
  const isOverdue = item.due_date && new Date(item.due_date) < new Date() && item.status !== 'done';
  const [isUpvoted, setIsUpvoted] = useState(false);
  const [isCheckingUpvote, setIsCheckingUpvote] = useState(true);

  // Check if current user has upvoted
  useEffect(() => {
    const checkUpvote = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && item.roadmap_item_upvotes) {
        setIsUpvoted(item.roadmap_item_upvotes.some((uv: any) => uv.user_id === user.id));
      }
      setIsCheckingUpvote(false);
    };
    checkUpvote();
  }, [item.roadmap_item_upvotes]);

  const handleUpvote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCheckingUpvote) return;
    
    const newUpvotedState = !isUpvoted;
    setIsUpvoted(newUpvotedState);
    
    try {
      await toggleUpvote.mutateAsync({
        itemId: item.id,
        isUpvoted: isUpvoted,
      });
    } catch (error) {
      // Revert on error
      setIsUpvoted(isUpvoted);
    }
  };

  const getCategoryBadge = (category: string) => {
    const categoryMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'active' | 'paused' | 'delayed' | 'completed' | 'on-hold' }> = {
      feature: {
        label: t('roadmap.category.feature'),
        variant: 'default', // Primary color (blue)
      },
      bug_fix: {
        label: t('roadmap.category.bugFix'),
        variant: 'destructive', // Red
      },
      integration: {
        label: t('roadmap.category.integration'),
        variant: 'secondary', // Purple/Accent
      },
      refinement: {
        label: t('roadmap.category.refinement'),
        variant: 'warning', // Orange
      },
    };

    const config = categoryMap[category] || categoryMap.feature;
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  return (
    <Card
      className={cn(
        "p-4 cursor-move hover:shadow-md transition-shadow",
        "bg-card border border-border",
        onClick && "cursor-pointer"
      )}
      draggable
      onDragStart={(e) => onDragStart?.(e, item.id)}
      onDragEnd={onDragEnd}
      onClick={() => onClick?.()}
      data-item-id={item.id}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight flex-1">
            {item.title || t('roadmap.aiToWorkDialog.untitledTask')}
          </h3>
        </div>

        {item.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Sprint: read-only on card; change via Edit when opening the issue */}
        {item.sprint_id && openSprint && item.sprint_id === openSprint.id && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>Sprint {openSprint.sprint_identifier}</span>
          </div>
        )}

        {/* Assignee and due date row (same look as Architect TaskCard) */}
        {(item.assignee || item.due_date) && (
          <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50">
            {item.assignee && (
              <div className="flex items-center text-muted-foreground gap-1.5">
                <div className="p-1 rounded bg-primary/10">
                  <User className="h-3 w-3 text-primary" />
                </div>
                <span className="font-medium truncate max-w-[120px]">
                  {item.assignee.display_name || t('common.unassigned')}
                </span>
              </div>
            )}
            {item.due_date && (
              <div
                className={cn(
                  'flex items-center gap-1.5',
                  isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'
                )}
              >
                <Calendar className="h-3 w-3 shrink-0" />
                <span className="font-medium">{formatDate(item.due_date)}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {allItems && allItems.length > 0 && (
              <DependencyIndicator dependencies={parsedDeps} allItems={allItems} />
            )}
            <button
              onClick={handleUpvote}
              className={cn(
                "flex items-center gap-1 hover:text-foreground transition-colors",
                isUpvoted && "text-primary"
              )}
              disabled={isCheckingUpvote || toggleUpvote.isPending}
            >
              <ArrowUp className="h-3 w-3" />
              <span>{item.upvotes}</span>
            </button>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              <span>{item.comments_count}</span>
            </div>
          </div>
          {getCategoryBadge(item.category)}
        </div>
      </div>
    </Card>
  );
}

