import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LiveRegion } from '@/components/Accessibility/LiveRegion';

describe('LiveRegion', () => {
  describe('Rendering', () => {
    it('should render children', () => {
      render(<LiveRegion>Test content</LiveRegion>);
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should render with default aria-live="polite"', () => {
      const { container } = render(<LiveRegion>Content</LiveRegion>);
      const liveRegion = container.firstChild as HTMLElement;
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    });

    it('should render with default aria-atomic="true"', () => {
      const { container } = render(<LiveRegion>Content</LiveRegion>);
      const liveRegion = container.firstChild as HTMLElement;
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });

    it('should render with default aria-relevant="all"', () => {
      const { container } = render(<LiveRegion>Content</LiveRegion>);
      const liveRegion = container.firstChild as HTMLElement;
      expect(liveRegion).toHaveAttribute('aria-relevant', 'all');
    });
  });

  describe('Politeness Levels', () => {
    it('should render with aria-live="polite"', () => {
      const { container } = render(
        <LiveRegion politeness="polite">Polite content</LiveRegion>
      );
      const liveRegion = container.firstChild as HTMLElement;
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    });

    it('should render with aria-live="assertive"', () => {
      const { container } = render(
        <LiveRegion politeness="assertive">Assertive content</LiveRegion>
      );
      const liveRegion = container.firstChild as HTMLElement;
      expect(liveRegion).toHaveAttribute('aria-live', 'assertive');
    });

    it('should render with aria-live="off"', () => {
      const { container } = render(
        <LiveRegion politeness="off">Off content</LiveRegion>
      );
      const liveRegion = container.firstChild as HTMLElement;
      expect(liveRegion).toHaveAttribute('aria-live', 'off');
    });
  });

  describe('Atomic Property', () => {
    it('should set aria-atomic to true when atomic is true', () => {
      const { container } = render(
        <LiveRegion atomic={true}>Content</LiveRegion>
      );
      const liveRegion = container.firstChild as HTMLElement;
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });

    it('should set aria-atomic to false when atomic is false', () => {
      const { container } = render(
        <LiveRegion atomic={false}>Content</LiveRegion>
      );
      const liveRegion = container.firstChild as HTMLElement;
      expect(liveRegion).toHaveAttribute('aria-atomic', 'false');
    });
  });

  describe('Relevant Property', () => {
    it('should set aria-relevant="additions"', () => {
      const { container } = render(
        <LiveRegion relevant="additions">Content</LiveRegion>
      );
      const liveRegion = container.firstChild as HTMLElement;
      expect(liveRegion).toHaveAttribute('aria-relevant', 'additions');
    });

    it('should set aria-relevant="removals"', () => {
      const { container } = render(
        <LiveRegion relevant="removals">Content</LiveRegion>
      );
      const liveRegion = container.firstChild as HTMLElement;
      expect(liveRegion).toHaveAttribute('aria-relevant', 'removals');
    });

    it('should set aria-relevant="text"', () => {
      const { container } = render(
        <LiveRegion relevant="text">Content</LiveRegion>
      );
      const liveRegion = container.firstChild as HTMLElement;
      expect(liveRegion).toHaveAttribute('aria-relevant', 'text');
    });

    it('should set aria-relevant="all"', () => {
      const { container } = render(
        <LiveRegion relevant="all">Content</LiveRegion>
      );
      const liveRegion = container.firstChild as HTMLElement;
      expect(liveRegion).toHaveAttribute('aria-relevant', 'all');
    });
  });

  describe('Screen Reader Only Mode', () => {
    it('should have sr-only class when srOnly is true', () => {
      const { container } = render(
        <LiveRegion srOnly={true}>Content</LiveRegion>
      );
      const liveRegion = container.firstChild as HTMLElement;
      expect(liveRegion).toHaveClass('sr-only');
    });

    it('should not have sr-only class when srOnly is false', () => {
      const { container } = render(
        <LiveRegion srOnly={false}>Content</LiveRegion>
      );
      const liveRegion = container.firstChild as HTMLElement;
      expect(liveRegion).not.toHaveClass('sr-only');
    });

    it('should not have sr-only class by default', () => {
      const { container } = render(<LiveRegion>Content</LiveRegion>);
      const liveRegion = container.firstChild as HTMLElement;
      expect(liveRegion).not.toHaveClass('sr-only');
    });
  });

  describe('Custom ClassName', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <LiveRegion className="custom-class">Content</LiveRegion>
      );
      const liveRegion = container.firstChild as HTMLElement;
      expect(liveRegion).toHaveClass('custom-class');
    });

    it('should merge custom className with srOnly class', () => {
      const { container } = render(
        <LiveRegion className="custom-class" srOnly={true}>
          Content
        </LiveRegion>
      );
      const liveRegion = container.firstChild as HTMLElement;
      expect(liveRegion).toHaveClass('custom-class');
      expect(liveRegion).toHaveClass('sr-only');
    });
  });

  describe('Complex Content', () => {
    it('should render complex JSX content', () => {
      render(
        <LiveRegion>
          <div>
            <h2>Title</h2>
            <p>Description</p>
          </div>
        </LiveRegion>
      );
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <LiveRegion>
          <span>First</span>
          <span>Second</span>
        </LiveRegion>
      );
      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
    });
  });

  describe('Use Cases', () => {
    it('should work for form validation announcements', () => {
      const { container } = render(
        <LiveRegion politeness="assertive" role="alert">
          Email is required
        </LiveRegion>
      );
      const alert = screen.getByText('Email is required');
      expect(alert).toBeInTheDocument();
      expect(container.firstChild).toHaveAttribute('aria-live', 'assertive');
    });

    it('should work for loading state announcements', () => {
      render(
        <LiveRegion politeness="polite" srOnly={true}>
          Loading data...
        </LiveRegion>
      );
      const announcement = screen.getByText('Loading data...');
      expect(announcement).toBeInTheDocument();
    });

    it('should work for success message announcements', () => {
      render(
        <LiveRegion politeness="polite">Data saved successfully</LiveRegion>
      );
      const message = screen.getByText('Data saved successfully');
      expect(message).toBeInTheDocument();
    });

    it('should work for count/metric updates', () => {
      const { container, rerender } = render(
        <LiveRegion atomic={true}>Items: 5</LiveRegion>
      );
      expect(screen.getByText('Items: 5')).toBeInTheDocument();

      rerender(<LiveRegion atomic={true}>Items: 10</LiveRegion>);
      expect(screen.getByText('Items: 10')).toBeInTheDocument();
      expect(container.firstChild).toHaveAttribute('aria-atomic', 'true');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', () => {
      const { container } = render(<LiveRegion>{''}</LiveRegion>);
      const liveRegion = container.firstChild as HTMLElement;
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toBeEmptyDOMElement();
    });

    it('should handle null children', () => {
      const { container } = render(<LiveRegion>{null}</LiveRegion>);
      const liveRegion = container.firstChild as HTMLElement;
      expect(liveRegion).toBeInTheDocument();
    });

    it('should handle undefined children', () => {
      const { container } = render(<LiveRegion>{undefined}</LiveRegion>);
      const liveRegion = container.firstChild as HTMLElement;
      expect(liveRegion).toBeInTheDocument();
    });

    it('should handle conditional content', () => {
      const showContent = true;
      render(
        <LiveRegion>{showContent && 'Conditional content'}</LiveRegion>
      );
      expect(screen.getByText('Conditional content')).toBeInTheDocument();
    });
  });
});
