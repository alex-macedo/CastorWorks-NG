import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

import { useLocalization } from "@/contexts/LocalizationContext";
export interface MiniCalendarProps extends Omit<DayPickerProps, 'mode'> {
  /**
   * Optional title to display in the card header
   */
  title?: string;
  /**
   * Selected date (controlled component)
   */
  selected?: Date;
  /**
   * Callback when date is selected
   */
  onSelect?: (date: Date | undefined) => void;
  /**
   * Show card wrapper around calendar
   * @default true
   */
  showCard?: boolean;
  /**
   * Additional class names for the card wrapper
   */
  cardClassName?: string;
  /**
   * Dates to highlight with a dot indicator
   */
  markedDates?: Date[];
  /**
   * Compact mode for even smaller display
   * @default false
   */
  compact?: boolean;
}

/**
 * MiniCalendar - A compact calendar widget designed for dashboards
 *
 * @example
 * ```tsx
 * <MiniCalendar
 *   title={t("tooltips.schedule")}
 *   selected={selectedDate}
 *   onSelect={setSelectedDate}
 *   markedDates={eventDates}
 * />
 * ```
 */
export const MiniCalendar = React.forwardRef<HTMLDivElement, MiniCalendarProps>(
  ({
    title,
    selected,
    onSelect,
    showCard = true,
    cardClassName,
    markedDates = [],
    compact = false,
    className,
    classNames,
    ...props
  }, ref) => {
    // Create modifiers for marked dates
    const modifiers = React.useMemo(() => ({
      marked: markedDates,
      ...(props.modifiers || {}),
    }), [markedDates, props.modifiers]);

    const calendar = (
      <DayPicker
        mode="single"
        selected={selected}
        onSelect={onSelect}
        showOutsideDays={false}
        modifiers={modifiers}
        className={cn(
          "p-0 bg-transparent",
          compact ? "text-xs" : "text-sm",
          className
        )}
        classNames={{
          months: "flex flex-col",
          month: "space-y-3",
          caption: "flex items-center justify-between pt-1 px-1 relative",
          caption_label: cn(
            "font-medium",
            compact ? "text-xs" : "text-sm"
          ),
          nav: "flex items-center gap-1",
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "h-6 w-6 bg-transparent p-0 hover:bg-primary/10",
            compact && "h-5 w-5"
          ),
          nav_button_previous: "absolute left-0",
          nav_button_next: "absolute right-0",
          table: "w-full border-collapse mt-1",
          head_row: "flex",
          head_cell: cn(
            "text-muted-foreground font-normal text-center",
            compact ? "text-[10px] w-7 h-7" : "text-xs w-8 h-8"
          ),
          row: "flex w-full mt-0.5",
          cell: cn(
            "relative text-center p-0",
            compact ? "w-7 h-7" : "w-8 h-8",
            "[&:has([aria-selected])]:bg-primary/10",
            "[&:has([aria-selected].day-outside)]:bg-primary/10/50"
          ),
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "font-normal aria-selected:opacity-100",
            compact ? "h-7 w-7 text-xs p-0" : "h-8 w-8 text-sm p-0",
            "hover:bg-primary/10 hover:text-accent-foreground",
            "focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0"
          ),
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-primary/10 text-accent-foreground font-semibold",
          day_outside: "text-muted-foreground/40 opacity-50",
          day_disabled: "text-muted-foreground/40 opacity-50",
          day_hidden: "invisible",
          ...classNames,
        }}
        modifiersClassNames={{
          marked: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-primary after:rounded-full",
          ...props.modifiersClassNames,
        }}
        components={{
          IconLeft: () => <ChevronLeft className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />,
          IconRight: () => <ChevronRight className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />,
        }}
        {...props}
      />
    );

    if (!showCard) {
      return <div ref={ref}>{calendar}</div>;
    }

    return (
      <Card ref={ref} className={cn("w-fit", cardClassName)}>
        {title && (
          <CardHeader className={cn("pb-2", compact && "p-3 pb-1")}>
            <CardTitle className={cn(compact ? "text-sm" : "text-base")}>
              {title}
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className={cn(compact ? "p-3 pt-2" : "p-4 pt-2")}>
          {calendar}
        </CardContent>
      </Card>
    );
  }
);

MiniCalendar.displayName = "MiniCalendar";
