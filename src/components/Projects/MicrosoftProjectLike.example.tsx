/**
 * MicrosoftProjectLike Usage Examples
 *
 * This file demonstrates various ways to use the MicrosoftProjectLike component
 * for project management and timeline visualization.
 */

import { useState } from 'react';
import { MicrosoftProjectLike, MSProjectTask } from './MicrosoftProjectLike';

/**
 * Example 1: Basic Project Timeline
 * Simple project with a few tasks
 */
export const BasicProjectTimeline = () => {
  const tasks: MSProjectTask[] = [
    {
      id: '1',
      name: 'Project Kickoff',
      startDate: '2024-01-01',
      endDate: '2024-01-05',
      progress: 100,
      status: 'completed',
      priority: 'high',
      assignees: ['Project Manager'],
    },
    {
      id: '2',
      name: 'Requirements Gathering',
      startDate: '2024-01-06',
      endDate: '2024-01-20',
      progress: 100,
      status: 'completed',
      priority: 'critical',
      assignees: ['BA Team', 'Product Owner'],
      dependencies: ['1'],
    },
    {
      id: '3',
      name: 'Development',
      startDate: '2024-01-21',
      endDate: '2024-03-15',
      progress: 45,
      status: 'in_progress',
      priority: 'critical',
      assignees: ['Dev Team'],
      dependencies: ['2'],
    },
  ];

  return (
    <MicrosoftProjectLike
      title="Software Development Project"
      description="Q1 2024 Development Cycle"
      tasks={tasks}
      onTaskClick={(task) => console.log('Task clicked:', task)}
    />
  );
};

/**
 * Example 2: Complex Project with Subtasks
 * Multi-level task hierarchy
 */
export const ComplexProjectWithSubtasks = () => {
  const tasks: MSProjectTask[] = [
    {
      id: '1',
      name: 'Planning Phase',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      progress: 80,
      status: 'in_progress',
      priority: 'high',
      category: 'Planning',
      subtasks: [
        {
          id: '1-1',
          name: 'Market Research',
          startDate: '2024-01-01',
          endDate: '2024-01-15',
          progress: 100,
          status: 'completed',
          priority: 'high',
          assignees: ['Research Team'],
        },
        {
          id: '1-2',
          name: 'Competitive Analysis',
          startDate: '2024-01-16',
          endDate: '2024-01-31',
          progress: 60,
          status: 'in_progress',
          priority: 'medium',
          assignees: ['Strategy Team'],
        },
      ],
    },
    {
      id: '2',
      name: 'Design Phase',
      startDate: '2024-02-01',
      endDate: '2024-02-28',
      progress: 50,
      status: 'in_progress',
      priority: 'critical',
      category: 'Design',
      dependencies: ['1'],
      subtasks: [
        {
          id: '2-1',
          name: 'UI/UX Design',
          startDate: '2024-02-01',
          endDate: '2024-02-15',
          progress: 75,
          status: 'in_progress',
          priority: 'high',
          assignees: ['Design Team'],
        },
        {
          id: '2-2',
          name: 'Design Review',
          startDate: '2024-02-16',
          endDate: '2024-02-28',
          progress: 25,
          status: 'in_progress',
          priority: 'medium',
          assignees: ['Stakeholders'],
        },
      ],
    },
  ];

  return (
    <MicrosoftProjectLike
      title="Product Launch Initiative"
      tasks={tasks}
      showCriticalPath
      showResources
      collapsible
    />
  );
};

/**
 * Example 3: Project with Milestones
 * Includes milestone markers for key deliverables
 */
export const ProjectWithMilestones = () => {
  const tasks: MSProjectTask[] = [
    {
      id: '1',
      name: 'Requirements Phase',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      progress: 100,
      status: 'completed',
      priority: 'high',
    },
    {
      id: 'm1',
      name: 'Requirements Sign-off',
      startDate: '2024-01-31',
      endDate: '2024-01-31',
      progress: 100,
      status: 'completed',
      priority: 'critical',
      milestone: true,
    },
    {
      id: '2',
      name: 'Development Sprint 1',
      startDate: '2024-02-01',
      endDate: '2024-02-15',
      progress: 100,
      status: 'completed',
      priority: 'high',
      dependencies: ['m1'],
    },
    {
      id: '3',
      name: 'Development Sprint 2',
      startDate: '2024-02-16',
      endDate: '2024-02-29',
      progress: 70,
      status: 'in_progress',
      priority: 'high',
    },
    {
      id: 'm2',
      name: 'MVP Release',
      startDate: '2024-02-29',
      endDate: '2024-02-29',
      progress: 0,
      status: 'not_started',
      priority: 'critical',
      milestone: true,
    },
  ];

  return (
    <MicrosoftProjectLike
      title="Agile Sprint Timeline"
      tasks={tasks}
      showMilestones
    />
  );
};

/**
 * Example 4: Resource-Heavy Project
 * Focus on resource allocation and team assignment
 */
export const ResourceHeavyProject = () => {
  const tasks: MSProjectTask[] = [
    {
      id: '1',
      name: 'Backend Development',
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      progress: 55,
      status: 'in_progress',
      priority: 'critical',
      assignees: ['Alice (Lead)', 'Bob', 'Charlie', 'David'],
      effort: 480, // person-hours
      category: 'Backend',
    },
    {
      id: '2',
      name: 'Frontend Development',
      startDate: '2024-01-15',
      endDate: '2024-03-31',
      progress: 40,
      status: 'in_progress',
      priority: 'critical',
      assignees: ['Eve (Lead)', 'Frank', 'Grace'],
      effort: 360,
      category: 'Frontend',
    },
    {
      id: '3',
      name: 'DevOps Setup',
      startDate: '2024-01-01',
      endDate: '2024-02-15',
      progress: 90,
      status: 'in_progress',
      priority: 'high',
      assignees: ['Henry'],
      effort: 120,
      category: 'Infrastructure',
    },
  ];

  return (
    <MicrosoftProjectLike
      title="Team Resource Allocation"
      description="Q1 Development Resources"
      tasks={tasks}
      showResources
    />
  );
};

/**
 * Example 5: Delayed Project with Risks
 * Highlighting delayed and at-risk tasks
 */
export const DelayedProjectTracking = () => {
  const tasks: MSProjectTask[] = [
    {
      id: '1',
      name: 'Integration Testing',
      startDate: '2024-01-01',
      endDate: '2024-01-15',
      progress: 60,
      status: 'delayed',
      priority: 'critical',
      assignees: ['QA Team'],
    },
    {
      id: '2',
      name: 'Performance Optimization',
      startDate: '2024-01-10',
      endDate: '2024-01-25',
      progress: 35,
      status: 'at_risk',
      priority: 'high',
      assignees: ['Performance Team'],
      notes: 'Behind schedule due to infrastructure issues',
    },
    {
      id: '3',
      name: 'Security Audit',
      startDate: '2024-01-20',
      endDate: '2024-02-05',
      progress: 10,
      status: 'at_risk',
      priority: 'critical',
      assignees: ['Security Team'],
    },
  ];

  return (
    <MicrosoftProjectLike
      title="Risk Management Dashboard"
      tasks={tasks}
      showCriticalPath
    />
  );
};

/**
 * Example 6: Interactive Project Manager
 * Full example with task editing and state management
 */
export const InteractiveProjectManager = () => {
  const [tasks, setTasks] = useState<MSProjectTask[]>([
    {
      id: '1',
      name: 'Phase 1 - Foundation',
      startDate: '2024-01-01',
      endDate: '2024-02-01',
      progress: 75,
      status: 'in_progress',
      priority: 'high',
      category: 'Infrastructure',
    },
    {
      id: '2',
      name: 'Phase 2 - Core Features',
      startDate: '2024-02-01',
      endDate: '2024-03-15',
      progress: 30,
      status: 'in_progress',
      priority: 'critical',
      dependencies: ['1'],
      category: 'Features',
    },
    {
      id: '3',
      name: 'Phase 3 - Polish',
      startDate: '2024-03-15',
      endDate: '2024-04-01',
      progress: 0,
      status: 'not_started',
      priority: 'medium',
      dependencies: ['2'],
      category: 'Quality',
    },
  ]);

  const handleTaskClick = (task: MSProjectTask) => {
    console.log('Task details:', task);
    // Open task detail dialog
  };

  const handleTaskEdit = (task: MSProjectTask) => {
    console.log('Edit task:', task);
    // Open task edit dialog
  };

  return (
    <div className="space-y-4">
      <MicrosoftProjectLike
        title="Interactive Project"
        description="Click tasks to view details"
        tasks={tasks}
        onTaskClick={handleTaskClick}
        onTaskEdit={handleTaskEdit}
        showCriticalPath
        showResources
        showMilestones
        showDependencies
      />
    </div>
  );
};

/**
 * Example 7: Multi-View Project Dashboard
 * Different zoom levels and view modes
 */
export const MultiViewDashboard = () => {
  const tasks: MSProjectTask[] = [
    {
      id: '1',
      name: 'Q1 Objectives',
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      progress: 60,
      status: 'in_progress',
      priority: 'high',
    },
    {
      id: '2',
      name: 'Q2 Objectives',
      startDate: '2024-04-01',
      endDate: '2024-06-30',
      progress: 20,
      status: 'in_progress',
      priority: 'medium',
    },
    {
      id: '3',
      name: 'Q3 Objectives',
      startDate: '2024-07-01',
      endDate: '2024-09-30',
      progress: 0,
      status: 'not_started',
      priority: 'low',
    },
  ];

  return (
    <MicrosoftProjectLike
      title="Annual Planning View"
      tasks={tasks}
      initialZoom={30} // Monthly view
    />
  );
};

/**
 * Example 8: Construction Project
 * Real-world construction schedule example
 */
export const ConstructionProject = () => {
  const tasks: MSProjectTask[] = [
    {
      id: '1',
      name: 'Site Preparation',
      startDate: '2024-01-01',
      endDate: '2024-01-15',
      progress: 100,
      status: 'completed',
      priority: 'critical',
      assignees: ['Site Team'],
      cost: 50000,
      category: 'Foundation',
    },
    {
      id: '2',
      name: 'Foundation Work',
      startDate: '2024-01-16',
      endDate: '2024-02-15',
      progress: 85,
      status: 'in_progress',
      priority: 'critical',
      assignees: ['Foundation Crew'],
      dependencies: ['1'],
      cost: 150000,
      category: 'Foundation',
    },
    {
      id: '3',
      name: 'Framing',
      startDate: '2024-02-16',
      endDate: '2024-03-31',
      progress: 40,
      status: 'in_progress',
      priority: 'high',
      assignees: ['Framing Team'],
      dependencies: ['2'],
      cost: 200000,
      category: 'Structure',
    },
    {
      id: '4',
      name: 'Electrical & Plumbing',
      startDate: '2024-03-15',
      endDate: '2024-04-30',
      progress: 15,
      status: 'in_progress',
      priority: 'high',
      assignees: ['Electricians', 'Plumbers'],
      dependencies: ['3'],
      cost: 100000,
      category: 'MEP',
    },
    {
      id: 'm1',
      name: 'Final Inspection',
      startDate: '2024-05-15',
      endDate: '2024-05-15',
      progress: 0,
      status: 'not_started',
      priority: 'critical',
      milestone: true,
    },
  ];

  return (
    <MicrosoftProjectLike
      title="Residential Construction Project"
      description="New Home Build - 123 Main Street"
      tasks={tasks}
      showMilestones
      showDependencies
    />
  );
};

/**
 * Example 9: Software Release Cycle
 * Complete software development lifecycle
 */
export const SoftwareReleaseCycle = () => {
  const tasks: MSProjectTask[] = [
    {
      id: 'p1',
      name: 'Sprint Planning',
      startDate: '2024-01-01',
      endDate: '2024-01-02',
      progress: 100,
      status: 'completed',
      priority: 'high',
      milestone: true,
    },
    {
      id: 's1',
      name: 'Sprint 1 - Core Features',
      startDate: '2024-01-03',
      endDate: '2024-01-16',
      progress: 100,
      status: 'completed',
      priority: 'critical',
      dependencies: ['p1'],
      subtasks: [
        {
          id: 's1-1',
          name: 'User Authentication',
          startDate: '2024-01-03',
          endDate: '2024-01-10',
          progress: 100,
          status: 'completed',
          priority: 'critical',
        },
        {
          id: 's1-2',
          name: 'Dashboard UI',
          startDate: '2024-01-11',
          endDate: '2024-01-16',
          progress: 100,
          status: 'completed',
          priority: 'high',
        },
      ],
    },
    {
      id: 'r1',
      name: 'Sprint 1 Review',
      startDate: '2024-01-16',
      endDate: '2024-01-16',
      progress: 100,
      status: 'completed',
      priority: 'medium',
      milestone: true,
    },
    {
      id: 's2',
      name: 'Sprint 2 - Advanced Features',
      startDate: '2024-01-17',
      endDate: '2024-01-30',
      progress: 60,
      status: 'in_progress',
      priority: 'critical',
      dependencies: ['r1'],
    },
  ];

  return (
    <MicrosoftProjectLike
      title="Agile Development Sprint Tracker"
      tasks={tasks}
      showMilestones
      collapsible
    />
  );
};

/**
 * Example 10: Compact View
 * Minimal configuration for embedding
 */
export const CompactProjectView = () => {
  const tasks: MSProjectTask[] = [
    {
      id: '1',
      name: 'Task A',
      startDate: '2024-01-01',
      endDate: '2024-01-15',
      progress: 80,
      status: 'in_progress',
      priority: 'high',
    },
    {
      id: '2',
      name: 'Task B',
      startDate: '2024-01-16',
      endDate: '2024-01-31',
      progress: 30,
      status: 'in_progress',
      priority: 'medium',
    },
  ];

  return (
    <MicrosoftProjectLike
      title="Quick View"
      tasks={tasks}
      showResources={false}
      showDependencies={false}
      collapsible={false}
      className="max-w-4xl"
    />
  );
};
