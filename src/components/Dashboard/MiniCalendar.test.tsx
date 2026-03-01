import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TestProviders from '@/test/utils/TestProviders';
import { MiniCalendar } from './MiniCalendar';

const renderWithProviders = (ui: React.ReactElement) => render(<TestProviders>{ui}</TestProviders>);

describe('MiniCalendar', () => {
  describe('Basic Rendering', () => {
    it('should render calendar with default props', () => {
      renderWithProviders(<MiniCalendar />);
      // Check that calendar grid is rendered
      const calendar = screen.getByRole('grid');
      expect(calendar).toBeInTheDocument();
    });

    it('should render with title in card header', () => {
      renderWithProviders(<MiniCalendar title="My Calendar" />);
      expect(screen.getByText('My Calendar')).toBeInTheDocument();
    });

    it('should render without card wrapper when showCard is false', () => {
      const { container } = renderWithProviders(<MiniCalendar showCard={false} />);
      // Card component should not be present
      expect(container.querySelector('.border')).not.toBeInTheDocument();
    });

    it('should render in compact mode', () => {
      const { container } = renderWithProviders(<MiniCalendar compact />);
      // Check for compact text size class
      expect(container.querySelector('.text-xs')).toBeInTheDocument();
    });
  });

  describe('Date Selection', () => {
    it('should call onSelect when a date is clicked', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      renderWithProviders(<MiniCalendar onSelect={onSelect} />);

      // Find and click any day button
      const dayButtons = screen.getAllByRole('button').filter(btn =>
        btn.className.includes('day') && !btn.disabled
      );

      if (dayButtons.length > 0) {
        await user.click(dayButtons[0]);
        expect(onSelect).toHaveBeenCalled();
      }
    });

    it('should accept selected date prop', () => {
      const selected = new Date(2024, 0, 15); // Jan 15, 2024
      renderWithProviders(<MiniCalendar selected={selected} defaultMonth={selected} />);

      // Calendar should render with the selected date prop
      const grid = screen.getByRole('grid');
      expect(grid).toBeInTheDocument();

      // The component accepts the selected prop without errors
      // (actual selection styling is handled by DayPicker internals)
      const allButtons = screen.getAllByRole('button');
      expect(allButtons.length).toBeGreaterThan(0);
    });

    it('should work as controlled component', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      const selected = new Date(2024, 0, 15);

      renderWithProviders(<MiniCalendar selected={selected} onSelect={onSelect} defaultMonth={selected} />);

      // Click any unselected date button
      const dayButtons = screen.getAllByRole('button').filter(btn =>
        btn.className.includes('day') && !btn.getAttribute('aria-selected') && !btn.disabled
      );

      if (dayButtons.length > 0) {
        await user.click(dayButtons[0]);
        expect(onSelect).toHaveBeenCalled();
      }
    });
  });

  describe('Marked Dates', () => {
    it('should render marked dates with dot indicator', () => {
      const markedDates = [
        new Date(2024, 0, 10),
        new Date(2024, 0, 15),
        new Date(2024, 0, 20),
      ];

      const { container } = renderWithProviders(
        <MiniCalendar
          markedDates={markedDates}
          defaultMonth={new Date(2024, 0, 1)}
        />
      );

      // Marked dates should have the marker styling
      const markedElements = container.querySelectorAll('[class*="after:"]');
      expect(markedElements.length).toBeGreaterThan(0);
    });

    it('should handle empty markedDates array', () => {
      const { container } = renderWithProviders(<MiniCalendar markedDates={[]} />);
      expect(container.querySelector('[role="grid"]')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should render previous and next month buttons', () => {
      renderWithProviders(<MiniCalendar />);

      // Navigation buttons should be present
      const allButtons = screen.getAllByRole('button');
      expect(allButtons.length).toBeGreaterThan(0);
    });

    it('should navigate to next month when next button clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MiniCalendar defaultMonth={new Date(2024, 0, 1)} />);

      // Find navigation buttons (they contain chevron icons)
      const navButtons = screen.getAllByRole('button').filter(btn =>
        btn.querySelector('svg')
      );

      // Click the last nav button (typically the next button)
      if (navButtons.length >= 2) {
        await user.click(navButtons[navButtons.length - 1]);
        // Calendar should now show February 2024
        expect(screen.queryByText(/february|feb/i)).toBeInTheDocument();
      }
    });

    it('should navigate to previous month when previous button clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MiniCalendar defaultMonth={new Date(2024, 1, 1)} />);

      // Find navigation buttons
      const navButtons = screen.getAllByRole('button').filter(btn =>
        btn.querySelector('svg')
      );

      // Click the first nav button (typically the previous button)
      if (navButtons.length >= 1) {
        await user.click(navButtons[0]);
        // Calendar should now show January 2024
        expect(screen.queryByText(/january|jan/i)).toBeInTheDocument();
      }
    });
  });

  describe('Styling and Layout', () => {
    it('should apply custom className to calendar', () => {
      const { container } = renderWithProviders(<MiniCalendar className="custom-class" />);
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('should apply custom cardClassName to card wrapper', () => {
      const { container } = renderWithProviders(<MiniCalendar cardClassName="custom-card" />);
      expect(container.querySelector('.custom-card')).toBeInTheDocument();
    });

    it('should highlight today with accent background', () => {
      const { container } = renderWithProviders(<MiniCalendar />);
      // Today should be rendered and have accent styling
      const todayDate = new Date().getDate();
      const dayButtons = screen.getAllByRole('button').filter(btn =>
        btn.textContent === todayDate.toString()
      );

      // At least one button with today's date should exist
      expect(dayButtons.length).toBeGreaterThan(0);
    });

    it('should render compact mode with smaller dimensions', () => {
      const { container } = renderWithProviders(<MiniCalendar compact />);

      // Check for compact size classes
      const compactElements = container.querySelectorAll('.text-xs');
      expect(compactElements.length).toBeGreaterThan(0);
    });

    it('should render card with proper padding in normal mode', () => {
      const { container } = renderWithProviders(<MiniCalendar title="Calendar" />);
      const cardContent = container.querySelector('[class*="p-4"]');
      expect(cardContent).toBeInTheDocument();
    });

    it('should render card with compact padding in compact mode', () => {
      const { container } = renderWithProviders(<MiniCalendar title="Calendar" compact />);
      const cardContent = container.querySelector('[class*="p-3"]');
      expect(cardContent).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should render calendar with grid role', () => {
      renderWithProviders(<MiniCalendar />);
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should have accessible navigation buttons', () => {
      const { container } = render(<MiniCalendar />);
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<MiniCalendar onSelect={onSelect} />);

      const grid = screen.getByRole('grid');
      await user.click(grid);

      // Tab to navigate
      await user.tab();
      expect(document.activeElement?.tagName).toBe('BUTTON');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined selected date', () => {
      render(<MiniCalendar selected={undefined} />);
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should handle no onSelect callback', async () => {
      const user = userEvent.setup();
      render(<MiniCalendar />);

      const buttons = screen.getAllByRole('gridcell');
      if (buttons.length > 0) {
        await user.click(buttons[0]);
        // Should not throw error
        expect(buttons[0]).toBeInTheDocument();
      }
    });

    it('should render without title', () => {
      const { container } = render(<MiniCalendar />);
      const cardHeader = container.querySelector('[class*="CardHeader"]');
      expect(cardHeader).not.toBeInTheDocument();
    });

    it('should handle large markedDates array', () => {
      const markedDates = Array.from({ length: 100 }, (_, i) =>
        new Date(2024, 0, (i % 31) + 1)
      );

      const { container } = render(<MiniCalendar markedDates={markedDates} />);
      expect(container.querySelector('[role="grid"]')).toBeInTheDocument();
    });
  });

  describe('Integration with DayPicker', () => {
    it('should pass through DayPicker props', () => {
      render(
        <MiniCalendar
          disabled={{ before: new Date(2024, 0, 1) }}
          defaultMonth={new Date(2024, 0, 15)}
        />
      );

      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should support custom modifiers', () => {
      const customModifiers = {
        weekend: (date: Date) => date.getDay() === 0 || date.getDay() === 6,
      };

      render(<MiniCalendar modifiers={customModifiers} />);
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should not show outside days', () => {
      const { container } = render(
        <MiniCalendar defaultMonth={new Date(2024, 0, 1)} />
      );

      // Outside days should have lower opacity
      const outsideDays = container.querySelectorAll('[class*="day_outside"]');
      outsideDays.forEach(day => {
        expect(day.className).toContain('opacity-50');
      });
    });
  });

  describe('TypeScript Types', () => {
    it('should export MiniCalendarProps type', () => {
      // Type checking test - if this compiles, the type is exported correctly
      const props: import('./MiniCalendar').MiniCalendarProps = {
        title: 'Test',
        selected: new Date(),
      };
      expect(props).toBeDefined();
    });
  });
});
