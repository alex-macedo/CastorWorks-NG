/**
 * MiniCalendar Usage Examples
 *
 * This file demonstrates various ways to use the MiniCalendar component
 * in your dashboard and other parts of the application.
 */

import { useState } from 'react';
import { MiniCalendar } from './MiniCalendar';
import { useDateFormat } from '@/hooks/useDateFormat';

import { useLocalization } from "@/contexts/LocalizationContext";
/**
 * Example 1: Basic Usage
 * Simple calendar with date selection
 */
export const BasicMiniCalendar = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <MiniCalendar
      title="Calendar"
      selected={date}
      onSelect={setDate}
    />
  );
};

/**
 * Example 2: Compact Mode
 * Smaller calendar for tight spaces
 */
export const CompactMiniCalendar = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <MiniCalendar
      title={t("tooltips.schedule")}
      selected={date}
      onSelect={setDate}
      compact
    />
  );
};

/**
 * Example 3: Calendar with Event Markers
 * Shows dots on dates that have events
 */
export const EventCalendar = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());

  // Example: Mark dates with events
  const eventDates = [
    new Date(2024, 0, 5),
    new Date(2024, 0, 12),
    new Date(2024, 0, 18),
    new Date(2024, 0, 25),
  ];

  return (
    <MiniCalendar
      title="Events"
      selected={date}
      onSelect={setDate}
      markedDates={eventDates}
    />
  );
};

/**
 * Example 4: Without Card Wrapper
 * Calendar without the card styling
 */
export const StandaloneMiniCalendar = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-sm font-medium mb-2">Select Date</h3>
      <MiniCalendar
        selected={date}
        onSelect={setDate}
        showCard={false}
      />
    </div>
  );
};

/**
 * Example 5: With Custom Styling
 * Apply custom classes to the calendar
 */
export const StyledMiniCalendar = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <MiniCalendar
      title="Custom Calendar"
      selected={date}
      onSelect={setDate}
      cardClassName="shadow-lg border-primary/20"
      className="bg-muted/30"
    />
  );
};

/**
 * Example 6: Read-Only Calendar
 * Display-only calendar without selection
 */
export const ReadOnlyMiniCalendar = () => {
  const today = new Date();

  return (
    <MiniCalendar
      title="Today"
      selected={today}
      disabled={{ after: today, before: today }}
    />
  );
};

/**
 * Example 7: Date Range Restrictions
 * Limit selectable dates
 */
export const RestrictedMiniCalendar = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const today = new Date();
  const oneMonthFromNow = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());

  return (
    <MiniCalendar
      title="Available Dates"
      selected={date}
      onSelect={setDate}
      disabled={{
        before: today,
        after: oneMonthFromNow,
      }}
    />
  );
};

/**
 * Example 8: Multiple Calendars Side by Side
 * Display multiple calendars in a dashboard
 */
export const MultipleCalendars = () => {
  const [personalDate, setPersonalDate] = useState<Date | undefined>(new Date());
  const [workDate, setWorkDate] = useState<Date | undefined>(new Date());

  const personalEvents = [new Date(2024, 0, 10), new Date(2024, 0, 20)];
  const workEvents = [new Date(2024, 0, 15), new Date(2024, 0, 25)];

  return (
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
  );
};

/**
 * Example 9: Calendar with Action Handler
 * Trigger actions when date is selected
 */
export const InteractiveMiniCalendar = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedDateInfo, setSelectedDateInfo] = useState<string>('');

  const { formatLongDate } = useDateFormat();

  const handleDateSelect = (newDate: Date | undefined) => {
    setDate(newDate);
    if (newDate) {
      setSelectedDateInfo(formatLongDate(newDate));
    }
  };

  return (
    <div className="space-y-4">
      <MiniCalendar
        title="Select a Date"
        selected={date}
        onSelect={handleDateSelect}
      />
      {selectedDateInfo && (
        <div className="text-sm text-muted-foreground">
          Selected: {selectedDateInfo}
        </div>
      )}
    </div>
  );
};

/**
 * Example 10: Dashboard Widget
 * Complete example for use in a dashboard
 */
export const DashboardCalendarWidget = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());

  // Example: Get upcoming events from your data
  const upcomingEvents = [
    new Date(2024, 0, 8),
    new Date(2024, 0, 15),
    new Date(2024, 0, 22),
  ];

  return (
    <div className="space-y-4">
      <MiniCalendar
        title="Project Schedule"
        selected={date}
        onSelect={setDate}
        markedDates={upcomingEvents}
        compact
      />

      {/* Additional dashboard content */}
      <div className="text-xs text-muted-foreground">
        {upcomingEvents.length} upcoming milestones
      </div>
    </div>
  );
};
