"use client"

import * as React from "react"
import { format, isValid, parseISO } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useLocalization } from "@/contexts/LocalizationContext"

interface CalendarDatePickerProps {
  value: string | Date | null | undefined;
  onChange: (value: string) => void; // Always yyyy-MM-dd format
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  min?: string; // yyyy-MM-dd format
  max?: string; // yyyy-MM-dd format
}

export const CalendarDatePicker = React.forwardRef<
  HTMLButtonElement,
  CalendarDatePickerProps
>(({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  className,
  min,
  max,
  ...props
  }, ref) => {
  const { dateFormat } = useLocalization()

  // Ensure we have a valid dateFormat, default to DD/MM/YYYY for Brazilian market
  const safeDateFormat = dateFormat || 'DD/MM/YYYY'

  // Convert value to Date object for Calendar component
  const [date, setDate] = React.useState<Date | undefined>(() => {
    if (value instanceof Date) return value
    if (typeof value === 'string' && value) {
      const parsed = parseISO(value)
      return isValid(parsed) ? parsed : undefined
    }
    return undefined
  })

  // Update internal date when value prop changes
  React.useEffect(() => {
    if (value instanceof Date) {
      setDate(value)
    } else if (typeof value === 'string' && value) {
      const parsed = parseISO(value)
      setDate(isValid(parsed) ? parsed : undefined)
    } else {
      setDate(undefined)
    }
  }, [value])

  // Handle date selection
  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate)
    if (selectedDate) {
      // Always output in yyyy-MM-dd format for consistent storage
      const formattedDate = format(selectedDate, "yyyy-MM-dd")
      onChange(formattedDate)
    } else {
      onChange("")
    }
  }

  // Disable dates outside constraints
  const disabledDates = React.useMemo(() => {
    const disabled: (Date | { before: Date } | { after: Date })[] = []

    try {
      const parsedMinDate = min ? parseISO(min) : undefined
      const parsedMaxDate = max ? parseISO(max) : undefined
      const minDate = parsedMinDate && isValid(parsedMinDate) ? parsedMinDate : undefined
      const maxDate = parsedMaxDate && isValid(parsedMaxDate) ? parsedMaxDate : undefined

      if (minDate) {
        disabled.push({ before: minDate })
      }

      if (maxDate) {
        disabled.push({ after: maxDate })
      }
    } catch (error) {
      // If date parsing fails, don't apply constraints
      console.warn('Failed to parse date constraints:', error)
    }

    return disabled
  }, [min, max])

  // Format date for display using localization
  const formatDateForDisplay = (date: Date) => {
    const formatMap = {
      'DD/MM/YYYY': 'dd/MM/yyyy',
      'MM/DD/YYYY': 'MM/dd/yyyy',
      'YYYY-MM-DD': 'yyyy-MM-dd',
      'MMM DD, YYYY': 'MMM dd, yyyy',
    }

    // Default to dd/MM/yyyy if dateFormat is not recognized (Brazilian market default)
    const formatString = formatMap[safeDateFormat] || 'dd/MM/yyyy'
    return format(date, formatString)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          type='button'
          variant={"outline"}
          className={cn(
            "w-[280px] justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
          {...props}
        >
           <CalendarIcon className="mr-2 h-4 w-4" />
           {date ? formatDateForDisplay(date) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          disabled={disabledDates}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
})

CalendarDatePicker.displayName = "CalendarDatePicker"
