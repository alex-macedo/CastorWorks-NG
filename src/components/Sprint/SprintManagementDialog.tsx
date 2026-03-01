import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DateInput } from '@/components/ui/DateInput';
import { Textarea } from '@/components/ui/textarea';
import { useCreateSprint } from '@/hooks/useSprints';
import { CalendarIcon } from 'lucide-react';
import { format, addDays, subDays, isBefore, isAfter } from 'date-fns';

import { useLocalization } from "@/contexts/LocalizationContext";
interface SprintManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SprintManagementDialog = ({ open, onOpenChange }: SprintManagementDialogProps) => {
  const { t } = useLocalization();
  const [sprintIdentifier, setSprintIdentifier] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const createSprint = useCreateSprint();

  // Calculate date range constraints: today ± 30 days
  const today = new Date();
  const minDate = format(subDays(today, 30), 'yyyy-MM-dd');
  const maxDate = format(addDays(today, 30), 'yyyy-MM-dd');

  const getWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const getWeekDates = (year: number, week: number) => {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    const ISOweekEnd = new Date(ISOweekStart);
    ISOweekEnd.setDate(ISOweekStart.getDate() + 6);
    return { start: ISOweekStart, end: ISOweekEnd };
  };

  useEffect(() => {
    if (open) {
      const now = new Date();
      const year = now.getFullYear();
      const weekNumber = getWeekNumber(now);
      const identifier = `${year}-${String(weekNumber).padStart(2, '0')}`;

      setSprintIdentifier(identifier);

      const { start, end } = getWeekDates(year, weekNumber);

      // Ensure default dates are within the valid range (±30 days from today)
      const minDateObj = subDays(now, 30);
      const maxDateObj = addDays(now, 30);

      let adjustedStart = start;
      let adjustedEnd = end;

      // If start date is before min date, set it to min date
      if (isBefore(start, minDateObj)) {
        adjustedStart = minDateObj;
      }

      // If end date is after max date, set it to max date
      if (isAfter(end, maxDateObj)) {
        adjustedEnd = maxDateObj;
      }

      // If start date is now after end date due to adjustment, adjust end date too
      if (isAfter(adjustedStart, adjustedEnd)) {
        adjustedEnd = adjustedStart;
      }

      setStartDate(format(adjustedStart, 'yyyy-MM-dd'));
      setEndDate(format(adjustedEnd, 'yyyy-MM-dd'));
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !sprintIdentifier.trim()) {
      return;
    }

    await createSprint.mutateAsync({
      sprint_identifier: sprintIdentifier,
      title: title.trim(),
      description: description.trim() || undefined,
      start_date: startDate,
      end_date: endDate,
    });

    onOpenChange(false);
    setTitle('');
    setDescription('');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Create New Sprint</SheetTitle>
          <SheetDescription>
            Create a new sprint using the YYYY-WEEKNUMBER format. All new roadmap items will be assigned to the open sprint.
          </SheetDescription>
        </SheetHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sprint-identifier">Sprint Identifier</Label>
            <Input
              id="sprint-identifier"
              value={sprintIdentifier}
              onChange={(e) => setSprintIdentifier(e.target.value)}
              placeholder="2025-06"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sprint-title">Title</Label>
            <Input
              id="sprint-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("additionalPlaceholders.sprintTitle")}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sprint-description">Description (Optional)</Label>
            <Textarea
              id="sprint-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("additionalPlaceholders.sprintGoals")}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <DateInput
                value={startDate}
                onChange={setStartDate}
                min={minDate}
                max={maxDate}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <DateInput
                value={endDate}
                onChange={setEndDate}
                min={minDate}
                max={maxDate}
              />
            </div>
          </div>

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || !sprintIdentifier.trim() || createSprint.isPending}
            >
              {createSprint.isPending ? 'Creating...' : 'Create Sprint'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};
