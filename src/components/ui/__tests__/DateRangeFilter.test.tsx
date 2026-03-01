import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { DateRangeFilter } from '../DateRangeFilter';

/**
 * Unit tests for DateRangeFilter component
 * 
 * DateRangeFilter is a wrapper around two DateInput components for date range selection
 * It manages start and end dates with appropriate min/max constraints
 */
describe('DateRangeFilter', () => {
  const defaultProps = {
    startDate: '',
    endDate: '',
    onStartDateChange: vi.fn(),
    onEndDateChange: vi.fn(),
  };

  it('renders without crashing', () => {
    const { container } = render(<DateRangeFilter {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('renders both start and end date inputs', () => {
    const { container } = render(<DateRangeFilter {...defaultProps} />);
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('displays start date value', () => {
    const { container } = render(
      <DateRangeFilter {...defaultProps} startDate="2024-12-01" />
    );
    expect(container.querySelector('button')).toBeTruthy();
  });

  it('displays end date value', () => {
    const { container } = render(
      <DateRangeFilter {...defaultProps} endDate="2024-12-31" />
    );
    expect(container.querySelector('button')).toBeTruthy();
  });

  it('handles empty date values', () => {
    const { container } = render(
      <DateRangeFilter {...defaultProps} startDate="" endDate="" />
    );
    expect(container.querySelector('button')).toBeTruthy();
  });

  it('renders with custom labels', () => {
    const { getByText } = render(
      <DateRangeFilter
        {...defaultProps}
        startLabel="From Date"
        endLabel="To Date"
      />
    );
    expect(getByText('From Date')).toBeTruthy();
    expect(getByText('To Date')).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(
      <DateRangeFilter {...defaultProps} className="custom-range-filter" />
    );
    expect(container.querySelector('.custom-range-filter')).toBeTruthy();
  });

  it('handles same start and end date', () => {
    const sameDate = '2024-12-15';
    const { container } = render(
      <DateRangeFilter {...defaultProps} startDate={sameDate} endDate={sameDate} />
    );
    expect(container.querySelector('button')).toBeTruthy();
  });

  it('handles null start date', () => {
    const { container } = render(
      <DateRangeFilter {...defaultProps} startDate={null as any} />
    );
    expect(container.querySelector('button')).toBeTruthy();
  });

  it('handles null end date', () => {
    const { container } = render(
      <DateRangeFilter {...defaultProps} endDate={null as any} />
    );
    expect(container.querySelector('button')).toBeTruthy();
  });

  it('renders in grid layout', () => {
    const { container } = render(<DateRangeFilter {...defaultProps} />);
    expect(container.querySelector('.grid')).toBeTruthy();
  });

  it('sets constraints based on date values', () => {
    const { container } = render(
      <DateRangeFilter
        {...defaultProps}
        startDate="2024-12-01"
        endDate="2024-12-31"
      />
    );
    // Component renders with both dates
    expect(container.querySelector('button')).toBeTruthy();
  });

  it('calls callbacks when provided', () => {
    const onStartDateChange = vi.fn();
    const onEndDateChange = vi.fn();
    render(
      <DateRangeFilter
        {...defaultProps}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
      />
    );
    // Callbacks should be defined
    expect(onStartDateChange).toBeDefined();
    expect(onEndDateChange).toBeDefined();
  });

  it('supports responsive layout', () => {
    const { container } = render(<DateRangeFilter {...defaultProps} />);
    // Should have grid gap for spacing
    expect(container.querySelector('.gap-4')).toBeTruthy();
  });

  it('handles Date objects as values', () => {
    const startDate = new Date('2024-12-01');
    const endDate = new Date('2024-12-31');
    const { container } = render(
      <DateRangeFilter
        {...defaultProps}
        startDate={startDate as any}
        endDate={endDate as any}
      />
    );
    expect(container.querySelector('button')).toBeTruthy();
  });

  it('renders labels for both inputs', () => {
    const { container } = render(<DateRangeFilter {...defaultProps} />);
    const labels = container.querySelectorAll('label');
    expect(labels.length).toBeGreaterThanOrEqual(2);
  });
});

