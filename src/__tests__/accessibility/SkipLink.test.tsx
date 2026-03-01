import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SkipLink } from '@/components/Accessibility/SkipLink';

// Mock the useLocalization hook to provide translations
vi.mock('@/contexts/LocalizationContext', () => ({
  useLocalization: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'accessibility.skipToMainContent': 'Skip to main content',
      };
      return translations[key] || key;
    },
    language: 'en-US',
    setLanguage: vi.fn(),
  }),
}));

describe('SkipLink', () => {
  const renderSkipLink = () => {
    return render(
      <>
        <SkipLink />
        <main id="main-content">Main Content</main>
      </>
    );
  };

  describe('Rendering', () => {
    it('should render the skip link', () => {
      renderSkipLink();
      const skipLink = screen.getByRole('link', { name: /skip to main content/i });
      expect(skipLink).toBeInTheDocument();
    });

    it('should have correct href pointing to main content', () => {
      renderSkipLink();
      const skipLink = screen.getByRole('link', { name: /skip to main content/i });
      expect(skipLink).toHaveAttribute('href', '#main-content');
    });

    it('should be screen-reader only by default', () => {
      renderSkipLink();
      const skipLink = screen.getByRole('link', { name: /skip to main content/i });
      expect(skipLink).toHaveClass('sr-only');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should be focusable with keyboard', async () => {
      const user = userEvent.setup();
      renderSkipLink();
      const skipLink = screen.getByRole('link', { name: /skip to main content/i });

      // Tab to focus the skip link
      await user.tab();
      expect(skipLink).toHaveFocus();
    });

    it('should become visible when focused', async () => {
      const user = userEvent.setup();
      renderSkipLink();
      const skipLink = screen.getByRole('link', { name: /skip to main content/i });

      await user.tab();
      // When focused, it should have both sr-only and focus:not-sr-only classes
      expect(skipLink).toHaveClass('sr-only');
      expect(skipLink).toHaveClass('focus:not-sr-only');
    });

    it('should have tabIndex of 0', () => {
      renderSkipLink();
      const skipLink = screen.getByRole('link', { name: /skip to main content/i });
      expect(skipLink).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Accessibility', () => {
    it('should meet accessibility standards', () => {
      renderSkipLink();
      const skipLink = screen.getByRole('link', { name: /skip to main content/i });

      // Should be a valid link
      expect(skipLink.tagName).toBe('A');

      // Should have accessible text
      expect(skipLink).toHaveAccessibleName();

      // Should have valid href
      expect(skipLink.getAttribute('href')).toMatch(/^#/);
    });

    it('should have focus styling classes', () => {
      renderSkipLink();
      const skipLink = screen.getByRole('link', { name: /skip to main content/i });

      // Should have focus ring classes
      expect(skipLink).toHaveClass('focus:ring-2');
      expect(skipLink).toHaveClass('focus:ring-ring');
      expect(skipLink).toHaveClass('focus:ring-offset-2');
      expect(skipLink).toHaveClass('focus:outline-none');
    });
  });
});
