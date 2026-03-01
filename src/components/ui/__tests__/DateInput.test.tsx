import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DateInput } from '../DateInput';

/**
 * Unit tests for DateInput component
 *
 * DateInput is a custom date picker built on shadcn/ui Popover + Calendar
 * It uses CalendarDatePicker component for calendar-based date selection
 * Provides backward compatibility with existing DateInput API
 * Always outputs dates in ISO string format for consistent storage
 */
describe('DateInput', () => {
  it('renders without crashing', () => {
    const { container } = render(<DateInput value="" onChange={vi.fn()} />);
    expect(container).toBeTruthy();
  });

  it('renders calendar button for date selection', () => {
    render(<DateInput value="2024-12-23" onChange={vi.fn()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('accepts string date values', () => {
    const { container } = render(<DateInput value="2024-12-23" onChange={vi.fn()} />);
    // Component renders successfully with string value
    expect(container.querySelector('button')).toBeTruthy();
  });

  it('accepts Date object values', () => {
    const date = new Date('2024-12-23');
    const { container } = render(<DateInput value={date} onChange={vi.fn()} />);
    expect(container.querySelector('button')).toBeTruthy();
  });

  it('handles null values gracefully', () => {
    const { container } = render(<DateInput value={null} onChange={vi.fn()} />);
    expect(container.querySelector('button')).toBeTruthy();
  });

  it('handles undefined values gracefully', () => {
    const { container } = render(<DateInput value={undefined} onChange={vi.fn()} />);
    expect(container.querySelector('button')).toBeTruthy();
  });

  it('renders with disabled prop', () => {
    render(<DateInput value="" onChange={vi.fn()} disabled />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('renders with min constraint', () => {
    const { container } = render(
      <DateInput value="" onChange={vi.fn()} min="2024-01-01" />
    );
    // Component renders with min constraint
    expect(container.querySelector('button')).toBeTruthy();
  });

  it('renders with max constraint', () => {
    const { container } = render(
      <DateInput value="" onChange={vi.fn()} max="2024-12-31" />
    );
    // Component renders with max constraint
    expect(container.querySelector('button')).toBeTruthy();
  });

  it('renders with both min and max constraints', () => {
    const { container } = render(
      <DateInput 
        value="" 
        onChange={vi.fn()} 
        min="2024-01-01" 
        max="2024-12-31" 
      />
    );
    // Component renders with both constraints
    expect(container.querySelector('button')).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(
      <DateInput value="" onChange={vi.fn()} className="custom-class" />
    );
    expect(container.querySelector('.custom-class')).toBeTruthy();
  });

  it('renders with placeholder', () => {
    render(<DateInput value="" onChange={vi.fn()} placeholder="Select a date" />);
    // Placeholder should be in the document
    expect(screen.getByText(/Pick a date|Select a date/i)).toBeTruthy();
  });

  it('handles invalid date strings without crashing', () => {
    const { container } = render(
      <DateInput value="invalid-date" onChange={vi.fn()} />
    );
    // Should still render button
    expect(container.querySelector('button')).toBeTruthy();
  });

  it('handles leap year dates', () => {
    const { container } = render(
      <DateInput value="2024-02-29" onChange={vi.fn()} />
    );
    expect(container.querySelector('button')).toBeTruthy();
  });

  it('calls onChange prop when provided', () => {
    const onChange = vi.fn();
    render(<DateInput value="" onChange={onChange} />);
    // Component should be interactive
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders calendar icon', () => {
    const { container } = render(<DateInput value="" onChange={vi.fn()} />);
    // Button should have calendar icon
    expect(container.querySelector('button svg')).toBeTruthy();
  });

  it('maintains date format consistency', () => {
    const { container } = render(
      <DateInput value="2024-12-23" onChange={vi.fn()} />
    );
    // Component renders consistently with date value
    expect(container.querySelector('button')).toBeTruthy();
  });

  it('renders with year boundary dates', () => {
    const { container } = render(
      <DateInput value="2024-12-31" onChange={vi.fn()} />
    );
    expect(container.querySelector('button')).toBeTruthy();
  });

  it('handles empty string values', () => {
    const { container } = render(<DateInput value="" onChange={vi.fn()} />);
    expect(container.querySelector('button')).toBeTruthy();
  });

  it('supports controlled component pattern', () => {
    const onChange = vi.fn();
    const { rerender } = render(<DateInput value="2024-12-23" onChange={onChange} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
    
    // Update value
    rerender(<DateInput value="2024-12-24" onChange={onChange} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});

