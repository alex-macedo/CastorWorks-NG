/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useEffect, useRef, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface UseFormAutoSaveOptions<T> {
  formKey: string;
  formData: T;
  enabled?: boolean;
  debounceMs?: number;
  onRestore?: (data: T) => void;
}

export function useFormAutoSave<T extends Record<string, any>>({
  formKey,
  formData,
  enabled = true,
  debounceMs = 1000,
  onRestore,
}: UseFormAutoSaveOptions<T>) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const hasRestoredRef = useRef(false);

  // Save form data to localStorage
  const saveFormData = useCallback((data: T) => {
    try {
      const serialized = JSON.stringify({
        data,
        timestamp: Date.now(),
      });
      localStorage.setItem(`form-autosave-${formKey}`, serialized);
    } catch (error) {
      console.error('Failed to save form data to localStorage:', error);
    }
  }, [formKey]);

  // Clear saved form data
  const clearFormData = useCallback(() => {
    try {
      localStorage.removeItem(`form-autosave-${formKey}`);
    } catch (error) {
      console.error('Failed to clear form data from localStorage:', error);
    }
  }, [formKey]);

  // Load form data from localStorage
  const loadFormData = useCallback((): T | null => {
    try {
      const saved = localStorage.getItem(`form-autosave-${formKey}`);
      if (!saved) return null;

      const parsed = JSON.parse(saved);
      
      // Optional: Check if data is not too old (e.g., 24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - parsed.timestamp > maxAge) {
        clearFormData();
        return null;
      }

      return parsed.data as T;
    } catch (error) {
      console.error('Failed to load form data from localStorage:', error);
      return null;
    }
  }, [formKey, clearFormData]);

  // Auto-restore on mount
  useEffect(() => {
    if (!enabled || hasRestoredRef.current) return;

    const savedData = loadFormData();
    if (savedData && onRestore) {
      onRestore(savedData);
      hasRestoredRef.current = true;
      
      toast({
        title: "Form Restored",
        description: "Your previously saved form data has been restored.",
        duration: 3000,
      });
    }
  }, [enabled, loadFormData, onRestore]);

  // Auto-save on form data change (debounced)
  useEffect(() => {
    if (!enabled || !hasRestoredRef.current) return;

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced save
    timeoutRef.current = setTimeout(() => {
      // Only save if form has meaningful data
      const hasData = Object.values(formData).some(value => {
        if (typeof value === 'string') return value.trim().length > 0;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'number') return value > 0;
        return Boolean(value);
      });

      if (hasData) {
        saveFormData(formData);
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [formData, enabled, debounceMs, saveFormData]);

  return {
    clearFormData,
    loadFormData,
    saveFormData,
  };
}