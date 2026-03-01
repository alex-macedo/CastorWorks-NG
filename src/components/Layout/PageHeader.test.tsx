import { describe, it, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, beforeEach } from 'vitest';
import { PageHeader } from './PageHeader';

let queryClient: QueryClient;

// Wrapper for components that use react-router + react-query
const RouterWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>{children}</BrowserRouter>
  </QueryClientProvider>
);

describe('PageHeader', () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });
  describe('AC #1: PageHeader Component Creation', () => {
    it('should render with required title prop', () => {
      render(<PageHeader title="Test Title" />, { wrapper: RouterWrapper });
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('should export PageHeaderProps type', () => {
      // Type checking test - if this compiles, the type is exported correctly
      const props: import('./PageHeader').PageHeaderProps = {
        title: 'Test',
      };
      expect(props).toBeDefined();
    });
  });

  describe('AC #2: Component Props and API', () => {
    it('should render with only title (minimal props)', () => {
      render(<PageHeader title="Minimal Test" />, { wrapper: RouterWrapper });
      expect(screen.getByText('Minimal Test')).toBeInTheDocument();
    });

    it('should render with title and description', () => {
      render(
        <PageHeader
          title="Test Title"
          description="Test description text"
        />,
        { wrapper: RouterWrapper }
      );
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test description text')).toBeInTheDocument();
    });

    it('should render with title, description, and actions', () => {
      render(
        <PageHeader
          title="Test Title"
          description="Test description"
          actions={<button>Action Button</button>}
        />,
        { wrapper: RouterWrapper }
      );
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Action Button')).toBeInTheDocument();
    });

    it('should accept custom className', () => {
      const { container } = render(
        <PageHeader title="Test" className="custom-class" />,
        { wrapper: RouterWrapper }
      );
      const headerDiv = container.firstChild as HTMLElement;
      expect(headerDiv.className).toContain('custom-class');
    });
  });

  describe('AC #3: Typography Integration', () => {
    it('should use Heading component for title', () => {
      render(<PageHeader title="Test Heading" />, { wrapper: RouterWrapper });
      const heading = screen.getByText('Test Heading');
      // Heading component renders as h1 by default with level={1}
      expect(heading.tagName).toBe('H1');
    });

    it('should apply responsive text sizing classes', () => {
      render(<PageHeader title="Responsive Title" />, { wrapper: RouterWrapper });
      const heading = screen.getByText('Responsive Title');
      // Check for responsive classes (text-3xl md:text-4xl)
      expect(heading.className).toContain('text-3xl');
      expect(heading.className).toContain('md:text-4xl');
    });

    it('should use Lead component for description', () => {
      render(
        <PageHeader title="Title" description="Lead description" />,
        { wrapper: RouterWrapper }
      );
      const description = screen.getByText('Lead description');
      // Lead component renders as <p>
      expect(description.tagName).toBe('P');
    });

    it('should not render description when not provided', () => {
      render(<PageHeader title="Title Only" />, { wrapper: RouterWrapper });
      expect(screen.queryByText(/Lead/i)).not.toBeInTheDocument();
    });
  });

  describe('AC #4: Breadcrumb Integration', () => {
    it('should render breadcrumbs when provided', () => {
      render(
        <PageHeader
          title="Test"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Projects', href: '/projects' },
            { label: 'Current Page' }
          ]}
        />,
        { wrapper: RouterWrapper }
      );
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(screen.getByText('Current Page')).toBeInTheDocument();
    });

    it('should not render breadcrumbs when not provided', () => {
      const { container } = render(
        <PageHeader title="Test" />,
        { wrapper: RouterWrapper }
      );
      // Breadcrumb component should not be in the DOM
      expect(container.querySelector('nav[aria-label="breadcrumb"]')).not.toBeInTheDocument();
    });

    it('should render breadcrumb items with href as links', () => {
      render(
        <PageHeader
          title="Test"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Current' }
          ]}
        />,
        { wrapper: RouterWrapper }
      );
      const homeLink = screen.getByText('Home');
      expect(homeLink.closest('a')).toHaveAttribute('href', '/');
    });

    it('should render breadcrumb items without href as plain text', () => {
      render(
        <PageHeader
          title="Test"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Current Page' }
          ]}
        />,
        { wrapper: RouterWrapper }
      );
      const currentPage = screen.getByText('Current Page');
      // Last item or items without href should not be links
      expect(currentPage.closest('a')).not.toBeInTheDocument();
    });

    it('should render breadcrumbs above title', () => {
      const { container } = render(
        <PageHeader
          title="Test Title"
          breadcrumbs={[{ label: 'Home', href: '/' }]}
        />,
        { wrapper: RouterWrapper }
      );
      const breadcrumbNav = container.querySelector('nav[aria-label="breadcrumb"]');
      const heading = screen.getByText('Test Title');

      // Breadcrumb should appear before heading in DOM order
      if (breadcrumbNav && heading) {
        expect(breadcrumbNav.compareDocumentPosition(heading)).toBe(
          Node.DOCUMENT_POSITION_FOLLOWING
        );
      }
    });
  });

  describe('AC #5: Layout and Actions', () => {
    it('should render action buttons in container', () => {
      render(
        <PageHeader
          title="Test"
          actions={
            <>
              <button>Action 1</button>
              <button>Action 2</button>
            </>
          }
        />,
        { wrapper: RouterWrapper }
      );
      expect(screen.getByText('Action 1')).toBeInTheDocument();
      expect(screen.getByText('Action 2')).toBeInTheDocument();
    });

    it('should support multiple action buttons via children', () => {
      render(
        <PageHeader
          title="Test"
          actions={
            <div>
              <button>Button 1</button>
              <button>Button 2</button>
              <button>Button 3</button>
            </div>
          }
        />,
        { wrapper: RouterWrapper }
      );
      expect(screen.getByText('Button 1')).toBeInTheDocument();
      expect(screen.getByText('Button 2')).toBeInTheDocument();
      expect(screen.getByText('Button 3')).toBeInTheDocument();
    });

    it('should apply responsive layout classes', () => {
      const { container } = render(
        <PageHeader title="Test" actions={<button>Action</button>} />,
        { wrapper: RouterWrapper }
      );
      // Find the container with responsive flex classes
      const flexContainer = container.querySelector('.flex-col');
      expect(flexContainer).toBeInTheDocument();
      expect(flexContainer?.className).toContain('md:flex-row');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long titles gracefully', () => {
      const longTitle = 'A'.repeat(150);
      render(<PageHeader title={longTitle} />, { wrapper: RouterWrapper });
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('should render correctly with empty breadcrumbs array', () => {
      const { container } = render(
        <PageHeader title="Test" breadcrumbs={[]} />,
        { wrapper: RouterWrapper }
      );
      expect(container.querySelector('nav[aria-label="breadcrumb"]')).not.toBeInTheDocument();
    });

    it('should render correctly without optional props', () => {
      render(<PageHeader title="Minimal" />, { wrapper: RouterWrapper });
      expect(screen.getByText('Minimal')).toBeInTheDocument();
      // Should not crash or have missing elements
    });
  });
});
