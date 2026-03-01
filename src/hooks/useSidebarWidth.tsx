/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';

const SIDEBAR_WIDTH_KEY = 'sidebar:width';
const DEFAULT_WIDTH = 256; // 16rem in pixels
const MIN_WIDTH = 200; // Minimum sidebar width
const MAX_WIDTH = 400; // Maximum sidebar width

export const useSidebarWidth = () => {
  const { data: profile } = useUserProfile();
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    // Initialize from localStorage for immediate UI update
    const stored = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return stored ? Number(stored) : DEFAULT_WIDTH;
  });

  // Load width from database when profile is available
  useEffect(() => {
    if (profile?.sidebar_width) {
      const dbWidth = Number(profile.sidebar_width);
      if (dbWidth >= MIN_WIDTH && dbWidth <= MAX_WIDTH) {
        setSidebarWidth(dbWidth);
        localStorage.setItem(SIDEBAR_WIDTH_KEY, String(dbWidth));
      }
    }
  }, [profile]);

  // Update sidebar width and persist to both localStorage and database
  const updateSidebarWidth = useCallback(
    async (width: number) => {
      // Clamp width between min and max
      const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width));

      setSidebarWidth(clampedWidth);
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(clampedWidth));

      // Sync to database (fire and forget - don't block UI)
      if (profile?.user_id) {
        try {
          await supabase
            .from('user_profiles')
            .update({ sidebar_width: clampedWidth })
            .eq('user_id', profile.user_id);
        } catch (error) {
          console.error('Failed to sync sidebar width to database:', error);
        }
      }
    },
    [profile]
  );

  return {
    sidebarWidth,
    updateSidebarWidth,
    minWidth: MIN_WIDTH,
    maxWidth: MAX_WIDTH,
  };
};
