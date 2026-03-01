/**
 * AIFeedbackWidget - User Feedback Collection Component
 *
 * Compact widget for collecting user feedback on AI outputs:
 * - Thumbs up/down buttons
 * - Optional 5-star rating
 * - Optional comment textarea
 * - Submits to ai_feedback table
 * - Shows thank you message after submission
 */

import React, { useState } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ThumbsUp, ThumbsDown, Star, MessageSquare, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AIFeedbackWidgetProps {
  insightId?: string;
  onFeedback: (feedback: {
    rating: 'thumbs_up' | 'thumbs_down';
    starRating?: number;
    comment?: string;
  }) => void;
  compact?: boolean;
  showStars?: boolean;
  showComment?: boolean;
  className?: string;
}

export const AIFeedbackWidget: React.FC<AIFeedbackWidgetProps> = ({
  insightId,
  onFeedback,
  compact = false,
  showStars = false,
  showComment = true,
  className,
}) => {
  const [submitted, setSubmitted] = useState(false);
  const [selectedRating, setSelectedRating] = useState<'thumbs_up' | 'thumbs_down' | null>(
    null
  );
  const [starRating, setStarRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState('');
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { t } = useLocalization();

  const handleThumbsClick = (rating: 'thumbs_up' | 'thumbs_down') => {
    setSelectedRating(rating);

    if (compact && !showStars && !showComment) {
      // Submit immediately for compact mode without extras
      handleSubmit(rating);
    } else {
      // Open popover for additional feedback
      setPopoverOpen(true);
    }
  };

  const handleSubmit = (rating?: 'thumbs_up' | 'thumbs_down') => {
    const finalRating = rating || selectedRating;
    if (!finalRating) return;

    onFeedback({
      rating: finalRating,
      starRating: showStars && starRating > 0 ? starRating : undefined,
      comment: showComment && comment.trim() ? comment : undefined,
    });

    setSubmitted(true);
    setPopoverOpen(false);

    // Reset after 3 seconds
    setTimeout(() => {
      setSubmitted(false);
      setSelectedRating(null);
      setStarRating(0);
      setComment('');
    }, 3000);
  };

  const handleStarClick = (rating: number) => {
    setStarRating(rating);
  };

  if (submitted) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-green-600', className)}>
        <Check className="h-4 w-4" />
        <span>{t('settings.aiFeedback.thankYou')}</span>
      </div>
    );
  }

  if (compact && !showStars && !showComment) {
    // Simple thumbs up/down only
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <span className="text-sm text-muted-foreground">{t('settings.aiFeedback.helpful')}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleThumbsClick('thumbs_up')}
          aria-label={t('settings.aiFeedback.buttons.yes')}
          className={cn(
            'gap-1 h-8',
            selectedRating === 'thumbs_up' && 'bg-green-100 text-green-700 dark:bg-green-900/20'
          )}
        >
          <ThumbsUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleThumbsClick('thumbs_down')}
          aria-label={t('settings.aiFeedback.buttons.no')}
          className={cn(
            'gap-1 h-8',
            selectedRating === 'thumbs_down' && 'bg-red-100 text-red-700 dark:bg-red-900/20'
          )}
        >
          <ThumbsDown className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-sm text-muted-foreground">{t('settings.aiFeedback.wasHelpful')}</span>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <div className="flex gap-2">
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleThumbsClick('thumbs_up')}
              className={cn(
                'gap-1 h-8',
                selectedRating === 'thumbs_up' &&
                  'bg-green-100 text-green-700 dark:bg-green-900/20'
              )}
            >
              <ThumbsUp className="h-4 w-4" />
              {t('settings.aiFeedback.buttons.yes')}
            </Button>
          </PopoverTrigger>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleThumbsClick('thumbs_down')}
              className={cn(
                'gap-1 h-8',
                selectedRating === 'thumbs_down' &&
                  'bg-red-100 text-red-700 dark:bg-red-900/20'
              )}
            >
              <ThumbsDown className="h-4 w-4" />
              {t('settings.aiFeedback.buttons.no')}
            </Button>
          </PopoverTrigger>
        </div>

        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">{t('settings.aiFeedback.tellUsMore.title')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('settings.aiFeedback.tellUsMore.description')}
              </p>
            </div>

            {/* Star Rating */}
            {showStars && (
              <div className="space-y-2">
                <Label className="text-sm">{t('settings.aiFeedback.rate.label')}</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleStarClick(star)}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                      className="transition-colors"
                      aria-label={`${star} ${t('settings.aiFeedback.rate.label')}`}
                    >
                      <Star
                        className={cn(
                          'h-6 w-6',
                          star <= (hoveredStar || starRating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Comment */}
            {showComment && (
              <div className="space-y-2">
                <Label htmlFor="feedback-comment" className="text-sm">
                  {t('settings.aiFeedback.comments.label')}
                </Label>
                <Textarea
                  id="feedback-comment"
                  placeholder={t('settings.aiFeedback.comments.placeholder')}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPopoverOpen(false);
                  setSelectedRating(null);
                  setStarRating(0);
                  setComment('');
                }}
              >
                {t('settings.aiFeedback.buttons.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={() => handleSubmit()}
                disabled={!selectedRating}
              >
                <MessageSquare className="mr-1 h-4 w-4" />
                {t('settings.aiFeedback.buttons.submit')}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
