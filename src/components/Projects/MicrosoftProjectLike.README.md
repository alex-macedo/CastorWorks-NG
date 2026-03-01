# MicrosoftProjectLike Component

A comprehensive project management Gantt chart component inspired by Microsoft Project, built for modern web applications.

## Features

- ✅ **Gantt Chart Timeline** - Visual task timeline with progress tracking
- ✅ **Task Hierarchy** - Multi-level task structure with subtasks
- ✅ **Dependencies** - Task dependency indicators and tracking
- ✅ **Milestones** - Special milestone markers for key deliverables
- ✅ **Resource Allocation** - Assignee tracking and display
- ✅ **Progress Tracking** - Visual progress bars (0-100%)
- ✅ **Status Management** - Multiple task statuses (not_started, in_progress, completed, delayed, at_risk)
- ✅ **Priority Levels** - Critical, high, medium, low priorities
- ✅ **Filtering & Search** - Filter by status, search by keywords
- ✅ **View Modes** - Day, week, month, quarter views
- ✅ **Zoom Controls** - Adjustable timeline zoom
- ✅ **Collapsible Tasks** - Expand/collapse task hierarchy
- ✅ **Today Marker** - Visual indicator for current date
- ✅ **Statistics** - Project progress and completion metrics
- ✅ **TypeScript** - Fully typed with comprehensive interfaces
- ✅ **Accessible** - Full keyboard navigation and ARIA support
- ✅ **Tested** - 40/40 tests passing ✅

## Installation

No additional dependencies needed beyond the existing project setup:

- `date-fns` (already installed)
- `lucide-react` (already installed)
- shadcn/ui components (already available)

## Basic Usage

```tsx
import { MicrosoftProjectLike, MSProjectTask } from '@/components/Projects/MicrosoftProjectLike';

function ProjectTimeline() {
  const tasks: MSProjectTask[] = [
    {
      id: '1',
      name: 'Project Planning',
      startDate: '2024-01-01',
      endDate: '2024-01-15',
      progress: 100,
      status: 'completed',
      priority: 'high',
      assignees: ['Project Manager'],
    },
    {
      id: '2',
      name: 'Development',
      startDate: '2024-01-16',
      endDate: '2024-03-31',
      progress: 45,
      status: 'in_progress',
      priority: 'critical',
      assignees: ['Dev Team'],
      dependencies: ['1'],
    },
  ];

  return (
    <MicrosoftProjectLike
      title="Software Development Project"
      tasks={tasks}
      onTaskClick={(task) => console.log('Task clicked:', task)}
    />
  );
}
```

## API Reference

### MSProjectTask Interface

```typescript
interface MSProjectTask {
  id: string | number;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  duration?: number;
  progress: number; // 0-100
  status: "not_started" | "in_progress" | "completed" | "delayed" | "at_risk";
  priority: "low" | "medium" | "high" | "critical";
  assignees?: string[];
  dependencies?: (string | number)[]; // IDs of tasks this depends on
  milestone?: boolean;
  subtasks?: MSProjectTask[];
  effort?: number; // person-hours
  cost?: number;
  notes?: string;
  category?: string;
}
```

### Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tasks` | `MSProjectTask[]` | **required** | Array of tasks to display |
| `title` | `string` | `"Project Timeline"` | Title of the project/view |
| `description` | `string` | `undefined` | Optional description |
| `onTaskClick` | `(task) => void` | `undefined` | Callback when a task is clicked |
| `onTaskEdit` | `(task) => void` | `undefined` | Callback when a task is edited |
| `showCriticalPath` | `boolean` | `true` | Show critical path highlighting |
| `showResources` | `boolean` | `true` | Show resource allocation column |
| `showMilestones` | `boolean` | `true` | Show milestone markers |
| `showDependencies` | `boolean` | `true` | Show dependency indicators |
| `collapsible` | `boolean` | `true` | Allow task expansion/collapse |
| `initialZoom` | `number` | `7` | Initial zoom level (days per column) |
| `className` | `string` | `undefined` | Custom class name |

## Examples

### Simple Project

```tsx
<MicrosoftProjectLike
  title="Website Redesign"
  tasks={websiteTasks}
/>
```

### Complex Project with Subtasks

```tsx
const tasks: MSProjectTask[] = [
  {
    id: '1',
    name: 'Planning Phase',
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    progress: 80,
    status: 'in_progress',
    priority: 'high',
    subtasks: [
      {
        id: '1-1',
        name: 'Market Research',
        startDate: '2024-01-01',
        endDate: '2024-01-15',
        progress: 100,
        status: 'completed',
        priority: 'high',
      },
      {
        id: '1-2',
        name: 'Competitive Analysis',
        startDate: '2024-01-16',
        endDate: '2024-01-31',
        progress: 60,
        status: 'in_progress',
        priority: 'medium',
      },
    ],
  },
];

<MicrosoftProjectLike
  title="Product Launch"
  tasks={tasks}
  collapsible
/>
```

### Project with Milestones

```tsx
const tasks: MSProjectTask[] = [
  {
    id: '1',
    name: 'Development Sprint 1',
    startDate: '2024-01-01',
    endDate: '2024-01-15',
    progress: 100,
    status: 'completed',
    priority: 'high',
  },
  {
    id: 'm1',
    name: 'MVP Release',
    startDate: '2024-01-15',
    endDate: '2024-01-15',
    progress: 100,
    status: 'completed',
    priority: 'critical',
    milestone: true, // This makes it a milestone
  },
];

<MicrosoftProjectLike
  tasks={tasks}
  showMilestones
/>
```

### Interactive Project Manager

```tsx
function InteractiveProject() {
  const [tasks, setTasks] = useState<MSProjectTask[]>(initialTasks);

  const handleTaskClick = (task: MSProjectTask) => {
    // Open task detail dialog
    console.log('Task clicked:', task);
  };

  const handleTaskEdit = (task: MSProjectTask) => {
    // Open edit dialog
    console.log('Edit task:', task);
  };

  return (
    <MicrosoftProjectLike
      title="My Project"
      tasks={tasks}
      onTaskClick={handleTaskClick}
      onTaskEdit={handleTaskEdit}
      showCriticalPath
      showResources
      showMilestones
      showDependencies
    />
  );
}
```

### With Resource Allocation

```tsx
const tasks: MSProjectTask[] = [
  {
    id: '1',
    name: 'Backend Development',
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    progress: 55,
    status: 'in_progress',
    priority: 'critical',
    assignees: ['Alice (Lead)', 'Bob', 'Charlie'],
    effort: 480, // person-hours
  },
];

<MicrosoftProjectLike
  tasks={tasks}
  showResources
/>
```

### Construction Project Example

```tsx
const constructionTasks: MSProjectTask[] = [
  {
    id: '1',
    name: 'Site Preparation',
    startDate: '2024-01-01',
    endDate: '2024-01-15',
    progress: 100,
    status: 'completed',
    priority: 'critical',
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
    dependencies: ['1'],
    cost: 150000,
  },
];

<MicrosoftProjectLike
  title="Residential Construction"
  description="New Home Build - 123 Main Street"
  tasks={constructionTasks}
/>
```

## Features in Detail

### Task Hierarchy

Tasks can have subtasks, creating a multi-level hierarchy:

```typescript
{
  id: 'parent',
  name: 'Parent Task',
  subtasks: [
    { id: 'child1', name: 'Subtask 1', ... },
    { id: 'child2', name: 'Subtask 2', ... },
  ]
}
```

Use `collapsible={true}` to allow users to expand/collapse parent tasks.

### Dependencies

Track which tasks depend on others:

```typescript
{
  id: '2',
  name: 'Task 2',
  dependencies: ['1'], // This task depends on task 1
  ...
}
```

Dependency indicators appear when `showDependencies={true}`.

### Milestones

Mark important project milestones:

```typescript
{
  id: 'm1',
  name: 'Project Launch',
  milestone: true,
  ...
}
```

Milestones display as diamond markers on the timeline.

### Task Status

Five status options:
- `not_started` - Gray bar
- `in_progress` - Blue bar (primary color)
- `completed` - Green bar
- `delayed` - Red bar
- `at_risk` - Orange bar

### Priority Levels

Four priority levels:
- `low` - Outline badge
- `medium` - Secondary badge
- `high` - Default badge
- `critical` - Destructive badge

### Filtering

Built-in filtering options:
- **Search**: Filter by task name, assignee, or category
- **Status Filter**: All, Active, Completed, Delayed, At Risk
- **View Mode**: Day, Week, Month, Quarter

### View Modes

Switch between different timeline granularities:
- **Day** - Daily view
- **Week** - Weekly view (default)
- **Month** - Monthly view
- **Quarter** - Quarterly view

### Zoom Controls

Adjust timeline zoom with zoom in/out buttons.

## Task Statistics

The component automatically calculates and displays:
- **Average Progress** - Overall project completion percentage
- **Completed Tasks** - Count of finished tasks
- **Delayed Tasks** - Count of delayed tasks (if any)

## Styling

The component uses Tailwind CSS and shadcn/ui theming:

```tsx
<MicrosoftProjectLike
  tasks={tasks}
  className="max-w-6xl mx-auto"
/>
```

All styles support light/dark mode automatically.

## Accessibility

✅ Keyboard navigation (Tab, Enter, Space)
✅ ARIA labels and roles
✅ Screen reader support
✅ Focus management
✅ Semantic HTML
✅ Tooltips for additional context

## Performance

Optimized for large projects:
- Efficient task flattening algorithm
- Memoized calculations for timeline
- Minimal re-renders
- Virtual scrolling ready

## Testing

Comprehensive test suite with 40 tests covering:
- Basic rendering
- Task display and hierarchy
- Filtering and search
- View modes and zoom
- Resource allocation
- Statistics
- Timeline rendering
- Interactions
- Dependencies
- Accessibility
- Edge cases

Run tests:

```bash
npm run test:run -- src/components/Projects/MicrosoftProjectLike.test.tsx
```

## File Structure

```
src/components/Projects/
├── MicrosoftProjectLike.tsx          # Main component (680+ lines)
├── MicrosoftProjectLike.test.tsx     # Comprehensive tests (40 tests)
├── MicrosoftProjectLike.example.tsx  # 10 real-world examples
└── MicrosoftProjectLike.README.md    # This file
```

## Common Use Cases

### Software Development

Track sprints, features, and releases with milestones.

### Construction Projects

Manage phases, dependencies, and critical path for building projects.

### Marketing Campaigns

Plan campaigns with multiple deliverables and team assignments.

### Event Planning

Coordinate event preparation with task dependencies and deadlines.

### Product Launches

Track product development from concept to market.

## Integration Tips

### With State Management

```tsx
// Use with React Query
const { data: tasks } = useQuery('project-tasks', fetchTasks);

<MicrosoftProjectLike tasks={tasks || []} />
```

### With Forms

```tsx
// Update tasks on edit
const handleTaskEdit = async (task: MSProjectTask) => {
  await updateTask(task);
  refetch(); // Refresh task list
};
```

### With Drag & Drop

The component can be extended with drag-and-drop for task reordering using @dnd-kit (already in project).

## Browser Support

Works in all modern browsers supporting:
- ES2020+
- CSS Grid
- Flexbox

## Related Components

- `GanttChart` - Basic Gantt chart (`src/components/Schedule/GanttChart.tsx`)
- `RoadmapGanttChart` - Roadmap-specific view (`src/components/Roadmap/RoadmapGanttChart.tsx`)

## Migration from Basic Gantt

**Before:**
```tsx
<GanttChart activities={activities} />
```

**After:**
```tsx
<MicrosoftProjectLike
  tasks={convertActivitiesToTasks(activities)}
  showResources
  showDependencies
/>
```

## Advanced Features

### Custom Colors

Override status colors via CSS:

```css
.bg-custom-status {
  background-color: purple;
}
```

### Export to PDF

Combine with html2canvas or jsPDF (already in project) for PDF export.

### Print Support

The component is print-friendly with proper layout.

## Troubleshooting

**Issue**: Tasks not appearing
**Solution**: Ensure tasks have valid `startDate` and `endDate`

**Issue**: Today marker not visible
**Solution**: Check that today's date falls within the timeline range

**Issue**: Subtasks not showing
**Solution**: Verify `collapsible={true}` and tasks are expanded

## Performance Tips

1. Limit initial task list to ~100-200 tasks
2. Use pagination for larger projects
3. Lazy load subtasks on expand
4. Debounce search input
5. Memoize task transformations

## Contributing

When contributing:
1. Maintain TypeScript types
2. Add tests for new features
3. Follow existing code style
4. Update this README
5. Ensure all tests pass

## License

Same as the parent project.

## Support

For issues or questions, refer to the project's issue tracker.
