/**
 * AILoadingState - AI-specific Loading Component
 *
 * Skeleton loader with AI-specific messaging and animations:
 * - Skeleton UI with shimmer effect
 * - Optional progress bar
 * - Animated "thinking" indicator
 * - Customizable messages
 * - Estimated time display
 */

import React, { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Brain, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AILoadingStateProps {
  message?: string;
  showProgress?: boolean;
  estimatedTimeSeconds?: number;
  variant?: 'default' | 'compact' | 'full';
  className?: string;
}

const loadingMessages = [
  'Analyzing data with AI...',
  'Generating insights...',
  'Processing information...',
  'Computing recommendations...',
  'AI is thinking...',
  'Crunching the numbers...',
  'Evaluating patterns...',
  'Synthesizing results...',
];

export const AILoadingState: React.FC<AILoadingStateProps> = ({
  message,
  showProgress = false,
  estimatedTimeSeconds,
  variant = 'default',
  className,
}) => {
  const [currentMessage, setCurrentMessage] = useState(
    message || loadingMessages[0]
  );
  const [progress, setProgress] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Rotate through messages if no custom message provided
  useEffect(() => {
    if (!message) {
      const interval = setInterval(() => {
        setCurrentMessage(
          loadingMessages[Math.floor(Math.random() * loadingMessages.length)]
        );
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [message]);

  // Progress simulation
  useEffect(() => {
    if (showProgress && estimatedTimeSeconds) {
      const interval = setInterval(() => {
        setElapsedSeconds((prev) => {
          const newElapsed = prev + 0.5;
          const newProgress = Math.min(
            (newElapsed / estimatedTimeSeconds) * 100,
            95 // Cap at 95% to avoid reaching 100% before actual completion
          );
          setProgress(newProgress);
          return newElapsed;
        });
      }, 500);

      return () => clearInterval(interval);
    }
  }, [showProgress, estimatedTimeSeconds]);

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="relative">
          <Sparkles className="h-4 w-4 animate-pulse text-primary" />
          <span className="absolute -right-1 -top-1 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
          </span>
        </div>
        <span className="text-sm text-muted-foreground animate-pulse">
          {currentMessage}
        </span>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={cn('space-y-6 py-8', className)}>
        {/* Animated Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <Brain className="h-16 w-16 text-primary animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Cpu className="h-8 w-8 text-primary/50 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="text-center">
          <p className="text-lg font-medium">{currentMessage}</p>
          {estimatedTimeSeconds && (
            <p className="mt-1 text-sm text-muted-foreground">
              Estimated time: ~{estimatedTimeSeconds} seconds
            </p>
          )}
        </div>

        {/* Progress Bar */}
        {showProgress && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-center text-xs text-muted-foreground">
              {Math.round(progress)}% complete
            </p>
          </div>
        )}

        {/* Skeleton Content */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Sparkles className="h-6 w-6 text-primary animate-pulse" />
          <span className="absolute -right-1 -top-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex h-3 w-3 rounded-full bg-primary"></span>
          </span>
        </div>
        <div className="flex-1">
          <p className="font-medium">{currentMessage}</p>
          {estimatedTimeSeconds && (
            <p className="text-xs text-muted-foreground">
              ~{estimatedTimeSeconds}s remaining
            </p>
          )}
        </div>
      </div>

      {/* Progress */}
      {showProgress && estimatedTimeSeconds && (
        <Progress value={progress} className="h-1.5" />
      )}

      {/* Skeleton Lines */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Animated Dots */}
      <div className="flex items-center gap-1">
        <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );
};
