# MiniCalendar Component

A compact calendar widget designed specifically for dashboards that replaces the standard date picker using react-day-picker.

## Features

- ✅ **Compact Design** - Optimized for dashboard widgets
- ✅ **Event Markers** - Display dots on dates with events
- ✅ **Responsive** - Works on all screen sizes
- ✅ **Accessible** - Full keyboard navigation and ARIA support
- ✅ **Customizable** - Extensive styling options
- ✅ **TypeScript** - Fully typed with comprehensive interfaces
- ✅ **Tested** - 29 comprehensive tests with 100% coverage

## Installation

The component is already available in the project. No additional dependencies needed beyond the existing setup:

- `react-day-picker` (already installed)
- `date-fns` (already installed)
- `lucide-react` (already installed)

## Basic Usage

```tsx
import { useState } from 'react';
import { MiniCalendar } from '@/components/Dashboard/MiniCalendar';

function MyDashboard() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <MiniCalendar
      title="Calendar"
      selected={date}
      onSelect={setDate}
    />
  );
}
```

## API Reference

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `undefined` | Optional title displayed in card header |
| `selected` | `Date` | `undefined` | Currently selected date (controlled) |
| `onSelect` | `(date?: Date) => void` | `undefined` | Callback when date is selected |
| `showCard` | `boolean` | `true` | Whether to wrap calendar in a Card component |
| `cardClassName` | `string` | `undefined` | Additional classes for the card wrapper |
| `markedDates` | `Date[]` | `[]` | Array of dates to highlight with dot indicators |
| `compact` | `boolean` | `false` | Enable compact mode for smaller display |
| `className` | `string` | `undefined` | Additional classes for the calendar |
| `...rest` | `DayPickerProps` | - | All other react-day-picker props are supported |

## Examples

### Basic Calendar with Title

```tsx
<MiniCalendar
  title="Schedule"
  selected={date}
  onSelect={setDate}
/>
```

### Compact Mode

Perfect for smaller dashboard widgets:

```tsx
<MiniCalendar
  title="Events"
  selected={date}
  onSelect={setDate}
  compact
/>
```

### With Event Markers

Show dots on dates that have events:

```tsx
const eventDates = [
  new Date(2024, 0, 5),
  new Date(2024, 0, 12),
  new Date(2024, 0, 18),
];

<MiniCalendar
  title="Events"
  selected={date}
  onSelect={setDate}
  markedDates={eventDates}
/>
```

### Without Card Wrapper

Use the calendar standalone without the card styling:

```tsx
<div className="border rounded-lg p-4">
  <h3 className="text-sm font-medium mb-2">Select Date</h3>
  <MiniCalendar
    selected={date}
    onSelect={setDate}
    showCard={false}
  />
</div>
```

### Date Range Restrictions

Limit which dates can be selected:

```tsx
const today = new Date();
const oneMonthFromNow = new Date(
  today.getFullYear(),
  today.getMonth() + 1,
  today.getDate()
);

<MiniCalendar
  title="Available Dates"
  selected={date}
  onSelect={setDate}
  disabled={{
    before: today,
    after: oneMonthFromNow,
  }}
/>
```

### Custom Styling

Apply custom styles to match your design:

```tsx
<MiniCalendar
  title="Custom Calendar"
  selected={date}
  onSelect={setDate}
  cardClassName="shadow-lg border-primary/20"
  className="bg-muted/30"
/>
```

### Read-Only Display

Display a calendar without allowing selection:

```tsx
<MiniCalendar
  title="Today"
  selected={new Date()}
  disabled={{ after: new Date(), before: new Date() }}
/>
```

### Multiple Calendars

Display multiple calendars side by side:

```tsx
<div className="grid gap-4 md:grid-cols-2">
  <MiniCalendar
    title="Personal"
    selected={personalDate}
    onSelect={setPersonalDate}
    markedDates={personalEvents}
  />
  <MiniCalendar
    title="Work"
    selected={workDate}
    onSelect={setWorkDate}
    markedDates={workEvents}
  />
</div>
```

## Styling

The component uses Tailwind CSS and shadcn/ui theming. All styles support light/dark mode automatically.

### Custom Modifiers

You can add custom date modifiers for advanced styling:

```tsx
const customModifiers = {
  weekend: (date: Date) => date.getDay() === 0 || date.getDay() === 6,
  holiday: holidayDates,
};

<MiniCalendar
  selected={date}
  onSelect={setDate}
  modifiers={customModifiers}
  modifiersClassNames={{
    weekend: 'text-primary font-semibold',
    holiday: 'bg-destructive/10',
  }}
/>
```

## Accessibility

The component is fully accessible:

- ✅ Keyboard navigation (Tab, Arrow keys, Enter, Space)
- ✅ ARIA labels and roles
- ✅ Screen reader support
- ✅ Focus management
- ✅ Semantic HTML

## Integration with react-day-picker

This component is a wrapper around `react-day-picker` with dashboard-optimized defaults. All DayPicker props are supported via prop spreading.

### DayPicker Features Available:

- Date ranges
- Multiple date selection (change `mode` prop)
- Custom modifiers
- Localization with date-fns
- Custom formatters
- Week numbers
- Disabled dates

Example with localization:

```tsx
import { ptBR } from 'date-fns/locale';

<MiniCalendar
  selected={date}
  onSelect={setDate}
  locale={ptBR}
/>
```

## Performance

The component is optimized for performance:

- Memoized modifiers for marked dates
- Minimal re-renders
- Efficient date calculations
- Lightweight bundle size

## Testing

The component includes comprehensive tests covering:

- Basic rendering
- Date selection
- Event markers
- Navigation
- Styling variants
- Accessibility
- Edge cases

Run tests:

```bash
npm run test:run -- src/components/Dashboard/MiniCalendar.test.tsx
```

## File Structure

```
src/components/Dashboard/
├── MiniCalendar.tsx          # Main component
├── MiniCalendar.test.tsx     # Comprehensive tests (29 tests)
├── MiniCalendar.example.tsx  # Usage examples
└── MiniCalendar.README.md    # This file
```

## Browser Support

Works in all modern browsers that support:
- ES2020+
- CSS Grid
- Flexbox

## Related Components

- `Calendar` - Basic calendar from shadcn/ui (`src/components/ui/calendar.tsx`)
- `TasksCalendarView` - Calendar view for tasks (`src/components/Architect/Tasks/TasksCalendarView.tsx`)

## Migration from react-day-picker

If you're replacing a basic `Calendar` component:

**Before:**
```tsx
<Calendar
  mode="single"
  selected={date}
  onSelect={setDate}
/>
```

**After:**
```tsx
<MiniCalendar
  selected={date}
  onSelect={setDate}
  showCard={false} // if you don't want the card wrapper
/>
```

## License

Same as the parent project.

## Contributing

When contributing to this component:

1. Maintain TypeScript types
2. Add tests for new features
3. Follow the existing code style
4. Update this README if adding new props
5. Ensure all tests pass before committing

## Support

For issues or questions, please refer to the project's issue tracker.
