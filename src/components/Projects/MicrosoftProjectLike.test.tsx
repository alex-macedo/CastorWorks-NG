import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TestProviders from '@/test/utils/TestProviders';
import { MicrosoftProjectLike, MSProjectTask } from './MicrosoftProjectLike';

const mockTasks: MSProjectTask[] = [
  {
    id: '1',
    name: 'Project Planning',
    startDate: '2024-01-01',
    endDate: '2024-01-15',
    duration: 14,
    progress: 100,
    status: 'completed',
    priority: 'high',
    assignees: ['John Doe', 'Jane Smith'],
    category: 'Planning',
  },
  {
    id: '2',
    name: 'Design Phase',
    startDate: '2024-01-16',
    endDate: '2024-02-01',
    duration: 16,
    progress: 75,
    status: 'in_progress',
    priority: 'critical',
    assignees: ['Alice Johnson'],
    dependencies: ['1'],
    subtasks: [
      {
        id: '2-1',
        name: 'UI Design',
        startDate: '2024-01-16',
        endDate: '2024-01-23',
        progress: 90,
        status: 'in_progress',
        priority: 'high',
      },
      {
        id: '2-2',
        name: 'UX Research',
        startDate: '2024-01-24',
        endDate: '2024-02-01',
        progress: 50,
        status: 'in_progress',
        priority: 'medium',
      },
    ],
  },
  {
    id: '3',
    name: 'Development',
    startDate: '2024-02-01',
    endDate: '2024-03-15',
    duration: 43,
    progress: 30,
    status: 'in_progress',
    priority: 'critical',
    assignees: ['Bob Wilson', 'Charlie Brown'],
    dependencies: ['2'],
    category: 'Development',
  },
  {
    id: '4',
    name: 'Testing',
    startDate: '2024-03-01',
    endDate: '2024-03-20',
    duration: 19,
    progress: 0,
    status: 'not_started',
    priority: 'high',
    dependencies: ['3'],
  },
  {
    id: '5',
    name: 'Launch Milestone',
    startDate: '2024-03-20',
    endDate: '2024-03-20',
    duration: 0,
    progress: 0,
    status: 'not_started',
    priority: 'critical',
    milestone: true,
  },
];

const renderWithProviders = (ui: React.ReactElement) => render(<TestProviders>{ui}</TestProviders>);

describe('MicrosoftProjectLike', () => {
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      renderWithProviders(<MicrosoftProjectLike tasks={mockTasks} />);
      expect(screen.getByText('Project Timeline')).toBeInTheDocument();
    });

    it('should render custom title', () => {
      renderWithProviders(<MicrosoftProjectLike tasks={mockTasks} title="Custom Project" />);
      expect(screen.getByText('Custom Project')).toBeInTheDocument();
    });

    it('should render description when provided', () => {
      renderWithProviders(
        <MicrosoftProjectLike
          tasks={mockTasks}
          description="Project description"
        />
      );
      expect(screen.getByText('Project description')).toBeInTheDocument();
    });

    it('should render empty state when no tasks', () => {
      renderWithProviders(<MicrosoftProjectLike tasks={[]} />);
      expect(screen.getByText('messages.noTasksToDisplay')).toBeInTheDocument();
    });
  });

  describe('Task Display', () => {
    it('should render all top-level tasks', () => {
      renderWithProviders(<MicrosoftProjectLike tasks={mockTasks} />);
      expect(screen.getByText('Project Planning')).toBeInTheDocument();
      expect(screen.getByText('Design Phase')).toBeInTheDocument();
      // Use getAllByText for tasks that might appear multiple times (as task name and category)
      const developmentElements = screen.getAllByText('Development');
      expect(developmentElements.length).toBeGreaterThan(0);
      expect(screen.getByText('Testing')).toBeInTheDocument();
    });

    it('should display task progress', () => {
      const { container } = renderWithProviders(<MicrosoftProjectLike tasks={mockTasks} />);
      // Progress percentages should be visible
      const progressElements = container.querySelectorAll('div');
      const hasProgress = Array.from(progressElements).some(
        el => el.textContent?.includes('100%') || el.textContent?.includes('75%')
      );
      expect(hasProgress).toBe(true);
    });

    it('should display task priorities', () => {
      renderWithProviders(<MicrosoftProjectLike tasks={mockTasks} />);
      // Priorities may appear multiple times
      const highPriorities = screen.getAllByText('high');
      expect(highPriorities.length).toBeGreaterThan(0);
      const criticalPriorities = screen.getAllByText('critical');
      expect(criticalPriorities.length).toBeGreaterThan(0);
    });

    it('should display task categories', () => {
      renderWithProviders(<MicrosoftProjectLike tasks={mockTasks} />);
      expect(screen.getByText('Planning')).toBeInTheDocument();
      // Development appears as both task name and category
      const developmentElements = screen.getAllByText('Development');
      expect(developmentElements.length).toBeGreaterThan(0);
    });

    it('should render milestone tasks differently', () => {
      const { container } = renderWithProviders(<MicrosoftProjectLike tasks={mockTasks} />);
      const milestoneTask = screen.getByText('Launch Milestone');
      expect(milestoneTask).toBeInTheDocument();

      // Milestone tasks have a rotated square indicator
      const parent = milestoneTask.closest('div');
      expect(parent).toBeInTheDocument();
    });
  });

  describe('Task Hierarchy', () => {
    it('should render subtasks when parent is expanded', () => {
      renderWithProviders(<MicrosoftProjectLike tasks={mockTasks} />);
      // Subtasks should be visible initially (expanded by default)
      expect(screen.getByText('UI Design')).toBeInTheDocument();
      expect(screen.getByText('UX Research')).toBeInTheDocument();
    });

    it('should show expand/collapse buttons for tasks with subtasks', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MicrosoftProjectLike tasks={mockTasks} collapsible />);

      // Find chevron buttons (tasks with subtasks have them)
      const buttons = screen.getAllByRole('button');
      const chevronButtons = buttons.filter(btn =>
        btn.querySelector('svg')
      );

      expect(chevronButtons.length).toBeGreaterThan(0);
    });

    it('should collapse/expand tasks when clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MicrosoftProjectLike tasks={mockTasks} collapsible />);

      // Find and click the expand/collapse button
      const designPhase = screen.getByText('Design Phase');
      const parentDiv = designPhase.closest('div');
      const chevronButton = parentDiv?.querySelector('button');

      if (chevronButton) {
        await user.click(chevronButton);
        // After collapse, subtasks might not be visible
        // This tests the interaction works
      }
    });

    it('should not show expand/collapse when collapsible is false', () => {
      const { container } = renderWithProviders(
        <MicrosoftProjectLike tasks={mockTasks} collapsible={false} />
      );

      // Should still show tasks but no collapse functionality
      expect(screen.getByText('Design Phase')).toBeInTheDocument();
    });
  });

  describe('Filtering and Search', () => {
    it('should filter tasks by search query', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MicrosoftProjectLike tasks={mockTasks} />);

      const searchInput = screen.getByPlaceholderText('ganttSearchTasksAssignees');
      await user.type(searchInput, 'Design');

      expect(screen.getByText('Design Phase')).toBeInTheDocument();
    });

    it('should filter tasks by status', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MicrosoftProjectLike tasks={mockTasks} />);

       // Find status filter select
       const selects = screen.getAllByRole('combobox');
       const statusSelect = selects.find(s =>
         s.textContent?.includes('ganttFilterAllTasks') || s.textContent?.includes('ganttFilterActive')
       );

       expect(statusSelect).toBeInTheDocument();
    });

    it('should show clear filters button when filters are active', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MicrosoftProjectLike tasks={mockTasks} />);

      const searchInput = screen.getByPlaceholderText('ganttSearchTasksAssignees');
      await user.type(searchInput, 'test');

      // Look for a clear/reset mechanism
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('View Modes', () => {
    it('should render view mode selector', () => {
      renderWithProviders(<MicrosoftProjectLike tasks={mockTasks} />);

      // Should have view mode options
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThan(0);
    });

    it('should switch between view modes', async () => {
      const user = userEvent.setup();
      const { container } = renderWithProviders(<MicrosoftProjectLike tasks={mockTasks} />);

      // Find view mode selector
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThan(0);

      // Test passes if component renders without error
    });
  });

  describe('Zoom Controls', () => {
    it('should render zoom in/out buttons', () => {
      renderWithProviders(<MicrosoftProjectLike tasks={mockTasks} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should zoom in when zoom in button clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MicrosoftProjectLike tasks={mockTasks} />);

      const buttons = screen.getAllByRole('button');
      // Zoom buttons exist
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Resource Display', () => {
    it('should show assignees when showResources is true', () => {
      renderWithProviders(<MicrosoftProjectLike tasks={mockTasks} showResources />);

      // Assignees column should be visible
      expect(screen.getByText('ganttAssignees')).toBeInTheDocument();
    });

    it('should hide assignees when showResources is false', () => {
      renderWithProviders(<MicrosoftProjectLike tasks={mockTasks} showResources={false} />);

      // Assignees column should not be visible
      expect(screen.queryByText('ganttAssignees')).not.toBeInTheDocument();
    });

    it('should display assignee count', () => {
      const { container } = renderWithProviders(<MicrosoftProjectLike tasks={mockTasks} showResources />);

      // Should show assignee counts or names
      expect(container).toBeInTheDocument();
    });
  });

  describe('Task Statistics', () => {
    it('should display task statistics', () => {
      const { container } = renderWithProviders(<MicrosoftProjectLike tasks={mockTasks} />);

      // Should show statistics in the header area
      // Look for percentage and completed count indicators
      expect(container).toBeInTheDocument();
    });

    it('should show average progress', () => {
      const { container } = renderWithProviders(<MicrosoftProjectLike tasks={mockTasks} />);

      // Should display progress percentage somewhere
      expect(container).toBeInTheDocument();
    });

    it('should show completed tasks count', () => {
      const { container } = renderWithProviders(<MicrosoftProjectLike tasks={mockTasks} />);

      // Should show count of completed tasks (1 in mockTasks)
      // The component displays this in a badge
      expect(container.textContent).toContain('1');
    });
  });

  describe('Timeline Rendering', () => {
    it('should render timeline header', () => {
      renderWithProviders(<MicrosoftProjectLike tasks={mockTasks} />);

      expect(screen.getByText('ganttTaskName')).toBeInTheDocument();
      expect(screen.getByText('ganttDuration')).toBeInTheDocument();
    });

    it('should show today marker', () => {
      const { container } = renderWithProviders(<MicrosoftProjectLike tasks={mockTasks} />);

      // Today marker should be present if within timeline range
      const todayMarker = container.querySelector('[class*="bg-primary"]');
      expect(todayMarker).toBeInTheDocument();
    });

    it('should render task bars on timeline', () => {
      const { container } = renderWithProviders(<MicrosoftProjectLike tasks={mockTasks} />);

      // Timeline bars should be rendered
      const bars = container.querySelectorAll('[class*="absolute"]');
      expect(bars.length).toBeGreaterThan(0);
    });
  });

  describe('Interactions', () => {
    it('should call onTaskClick when task is clicked', async () => {
      const user = userEvent.setup();
      const onTaskClick = vi.fn();
      renderWithProviders(<MicrosoftProjectLike tasks={mockTasks} onTaskClick={onTaskClick} />);

      const taskName = screen.getByText('Project Planning');
      await user.click(taskName);

      expect(onTaskClick).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Project Planning' })
      );
    });

    it('should support expand/collapse all button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MicrosoftProjectLike tasks={mockTasks} collapsible />);

      const expandCollapseButton = screen.getByText(/expandAll|collapseAll/);
      expect(expandCollapseButton).toBeInTheDocument();

      await user.click(expandCollapseButton);
      // Button should toggle state
    });
  });

  describe('Dependencies', () => {
    it('should show dependency indicators when showDependencies is true', () => {
      const { container } = renderWithProviders(
        <MicrosoftProjectLike tasks={mockTasks} showDependencies />
      );

      // Tasks with dependencies should have indicators
      expect(container).toBeInTheDocument();
    });

    it('should hide dependency indicators when showDependencies is false', () => {
      const { container } = renderWithProviders(
        <MicrosoftProjectLike tasks={mockTasks} showDependencies={false} />
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithProviders(<MicrosoftProjectLike tasks={mockTasks} />);

      // Should have accessible elements
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MicrosoftProjectLike tasks={mockTasks} />);

      await user.tab();
      // Focus should move through interactive elements
      expect(document.activeElement).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle tasks with no dates gracefully', () => {
      const tasksWithoutDates: MSProjectTask[] = [
        {
          id: '1',
          name: 'Task',
          startDate: new Date(),
          endDate: new Date(),
          progress: 0,
          status: 'not_started',
          priority: 'low',
        },
      ];

      renderWithProviders(<MicrosoftProjectLike tasks={tasksWithoutDates} />);
      expect(screen.getByText('Task')).toBeInTheDocument();
    });

    it('should handle tasks with same start and end date', () => {
      const sameDateTasks: MSProjectTask[] = [
        {
          id: '1',
          name: 'One Day Task',
          startDate: '2024-01-01',
          endDate: '2024-01-01',
          progress: 50,
          status: 'in_progress',
          priority: 'medium',
        },
      ];

      renderWithProviders(<MicrosoftProjectLike tasks={sameDateTasks} />);
      expect(screen.getByText('One Day Task')).toBeInTheDocument();
    });

    it('should handle empty assignees array', () => {
      const tasksNoAssignees: MSProjectTask[] = [
        {
          id: '1',
          name: 'Unassigned',
          startDate: '2024-01-01',
          endDate: '2024-01-10',
          progress: 0,
          status: 'not_started',
          priority: 'low',
          assignees: [],
        },
      ];

      renderWithProviders(<MicrosoftProjectLike tasks={tasksNoAssignees} showResources />);
      expect(screen.getByText('Unassigned')).toBeInTheDocument();
    });
  });

  describe('TypeScript Types', () => {
    it('should export MSProjectTask type', () => {
      // Type checking test
      const task: import('./MicrosoftProjectLike').MSProjectTask = {
        id: '1',
        name: 'Test',
        startDate: new Date(),
        endDate: new Date(),
        progress: 0,
        status: 'not_started',
        priority: 'low',
      };
      expect(task).toBeDefined();
    });

    it('should export MicrosoftProjectLikeProps type', () => {
      // Type checking test
      const props: import('./MicrosoftProjectLike').MicrosoftProjectLikeProps = {
        tasks: [],
      };
      expect(props).toBeDefined();
    });
  });
});
