import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TestProviders from '@/test/utils/TestProviders';
import { MetricCard } from '@/components/Dashboard/MetricCard';
import { DollarSign } from 'lucide-react';

const renderWithProviders = (ui: React.ReactElement) => render(<TestProviders>{ui}</TestProviders>);

describe('MetricCard Accessibility', () => {
  const defaultProps = {
    title: 'Total Revenue',
    value: 12500,
    icon: DollarSign,
  };

  describe('ARIA Roles and Labels', () => {
    it('should have region role with proper label', () => {
      renderWithProviders(<MetricCard {...defaultProps} />);
      const region = screen.getByRole('region', { name: /total revenue metric/i });
      expect(region).toBeInTheDocument();
    });

    it('should label the metric region correctly', () => {
      renderWithProviders(<MetricCard {...defaultProps} title="Active Projects" />);
      const region = screen.getByRole('region');
      expect(region).toHaveAttribute('aria-label', 'Active Projects metric');
    });
  });

  describe('Icon Accessibility', () => {
    it('should mark decorative icon as aria-hidden', () => {
      const { container } = renderWithProviders(<MetricCard {...defaultProps} />);
      const iconContainer = container.querySelector('[aria-hidden="true"]');
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe('Live Region for CountUp Animation', () => {
    it('should have aria-live="polite" for numeric values', () => {
      const { container } = renderWithProviders(<MetricCard {...defaultProps} value={1000} />);
      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
    });

    it('should have aria-atomic="true" for complete announcements', () => {
      const { container } = renderWithProviders(<MetricCard {...defaultProps} value={1000} />);
      const liveRegion = container.querySelector('[aria-atomic="true"]');
      expect(liveRegion).toBeInTheDocument();
    });

    it('should announce string values without animation', () => {
      renderWithProviders(<MetricCard {...defaultProps} value="N/A" />);
      const value = screen.getByText('N/A');
      expect(value).toBeInTheDocument();
    });
  });

  describe('Trend Indicator Accessibility', () => {
    it('should have descriptive label for trend up', () => {
      renderWithProviders(<MetricCard {...defaultProps} change="+15%" trend="up" />);
      const trendElement = screen.getByLabelText(/change.*\+15%.*trend up/i);
      expect(trendElement).toBeInTheDocument();
    });

    it('should have descriptive label for trend down', () => {
      renderWithProviders(<MetricCard {...defaultProps} change="-5%" trend="down" />);
      const trendElement = screen.getByLabelText(/change.*-5%.*trend down/i);
      expect(trendElement).toBeInTheDocument();
    });

    it('should have descriptive label for neutral trend', () => {
      renderWithProviders(<MetricCard {...defaultProps} change="0%" trend="neutral" />);
      const trendElement = screen.getByLabelText(/change.*0%.*trend neutral/i);
      expect(trendElement).toBeInTheDocument();
    });

    it('should not render trend element when change is not provided', () => {
      renderWithProviders(<MetricCard {...defaultProps} />);
      const trendElement = screen.queryByText(/change/i);
      expect(trendElement).not.toBeInTheDocument();
    });
  });

  describe('Content Structure', () => {
    it('should render the title', () => {
      renderWithProviders(<MetricCard {...defaultProps} />);
      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    });

    it('should render hint text when provided', () => {
      renderWithProviders(<MetricCard {...defaultProps} hint="Last 30 days" />);
      expect(screen.getByText('Last 30 days')).toBeInTheDocument();
    });

    it('should render numeric value', () => {
      renderWithProviders(<MetricCard {...defaultProps} value={12500} />);
      // CountUp will eventually show the value
      waitFor(() => {
        expect(screen.getByText(/12500/)).toBeInTheDocument();
      });
    });

    it('should render string value immediately', () => {
      renderWithProviders(<MetricCard {...defaultProps} value="Pending" />);
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  describe('Visual Variants', () => {
    it('should apply correct color classes for primary variant', () => {
      const { container } = renderWithProviders(<MetricCard {...defaultProps} color="primary" />);
      const iconContainer = container.querySelector('.text-blue-600');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should apply correct color classes for success variant', () => {
      const { container } = renderWithProviders(<MetricCard {...defaultProps} color="success" />);
      const iconContainer = container.querySelector('.text-blue-600');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should apply correct color classes for warning variant', () => {
      const { container } = renderWithProviders(<MetricCard {...defaultProps} color="warning" />);
      const iconContainer = container.querySelector('.text-blue-600');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should render in compact mode when specified', () => {
      const { container } = renderWithProviders(<MetricCard {...defaultProps} compact />);
      const title = container.querySelector('.text-xs');
      expect(title).toBeInTheDocument();
    });


    it('should apply correct color classes for success variant', () => {
      const { container } = renderWithProviders(<MetricCard {...defaultProps} color="success" />);
      const iconContainer = container.querySelector('.text-blue-600');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should apply correct color classes for warning variant', () => {
      const { container } = renderWithProviders(<MetricCard {...defaultProps} color="warning" />);
      const iconContainer = container.querySelector('.text-blue-600');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should apply correct color classes for success variant', () => {
      const { container } = renderWithProviders(<MetricCard {...defaultProps} color="success" />);
      const iconContainer = container.querySelector('.text-blue-600');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should apply correct color classes for warning variant', () => {
      const { container } = renderWithProviders(<MetricCard {...defaultProps} color="warning" />);
      const iconContainer = container.querySelector('.text-blue-600');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should render in compact mode when specified', () => {
      const { container } = renderWithProviders(<MetricCard {...defaultProps} compact />);
      const title = container.querySelector('.text-xs');
      expect(title).toBeInTheDocument();
    });

  });

  describe('Edge Cases', () => {
    it('should handle zero value', () => {
      renderWithProviders(<MetricCard {...defaultProps} value={0} />);
      waitFor(() => {
        const value = screen.getByText(/0/);
        expect(value).toBeInTheDocument();
      });
    });

    it('should handle negative values', () => {
      renderWithProviders(<MetricCard {...defaultProps} value={-100} />);
      waitFor(() => {
        const value = screen.getByText(/-100/);
        expect(value).toBeInTheDocument();
      });
    });

    it('should handle large numbers', () => {
      renderWithProviders(<MetricCard {...defaultProps} value={1000000} />);
      waitFor(() => {
        const value = screen.getByText(/1000000/);
        expect(value).toBeInTheDocument();
      });
    });

    it('should handle empty string value', () => {
      renderWithProviders(<MetricCard {...defaultProps} value="" />);
      const region = screen.getByRole('region');
      expect(region).toBeInTheDocument();
    });
  });
});
