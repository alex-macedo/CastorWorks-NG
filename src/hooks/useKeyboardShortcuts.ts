import { useEffect } from 'react';

interface KeyboardShortcutsConfig {
  onNewItem?: () => void;
  onToggleDependencies?: () => void;
  onRefresh?: () => void;
  onNavigateLeft?: () => void;
  onNavigateRight?: () => void;
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onNewItem,
  onToggleDependencies,
  onRefresh,
  onNavigateLeft,
  onNavigateRight,
  onNavigateUp,
  onNavigateDown,
  enabled = true,
}: KeyboardShortcutsConfig) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const target = e.target as HTMLElement;
      const isInputField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || 
                          target.isContentEditable;

      // Don't trigger shortcuts when typing in input fields
      if (isInputField && !e.ctrlKey && !e.metaKey) return;

      // Ctrl/Cmd + N - New Item
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        onNewItem?.();
        return;
      }

      // Ctrl/Cmd + D - Toggle Dependencies
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        onToggleDependencies?.();
        return;
      }

      // Ctrl/Cmd + R - Refresh (override default)
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        onRefresh?.();
        return;
      }

      // Arrow keys for navigation (only when not in input field)
      if (!isInputField) {
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            onNavigateLeft?.();
            break;
          case 'ArrowRight':
            e.preventDefault();
            onNavigateRight?.();
            break;
          case 'ArrowUp':
            e.preventDefault();
            onNavigateUp?.();
            break;
          case 'ArrowDown':
            e.preventDefault();
            onNavigateDown?.();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onNewItem, onToggleDependencies, onRefresh, onNavigateLeft, onNavigateRight, onNavigateUp, onNavigateDown]);
}
