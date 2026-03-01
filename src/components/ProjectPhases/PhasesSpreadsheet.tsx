import { useState, useRef, useEffect, useCallback } from "react";
import { format, addDays, differenceInDays } from "date-fns";
import { useMemo } from "react";
import { Trash2, X, Download, Copy } from "lucide-react";
import { useProjectPhases } from "@/hooks/useProjectPhases";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useProjectCalendarSettings, useProjectCalendarEntries } from "@/hooks/useProjectCalendar";
import { formatDate } from "@/utils/reportFormatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/DateInput";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type ProjectPhase = Database['public']['Tables']['project_phases']['Row'];

interface PhasesSpreadsheetProps {
  projectId: string;
  canEdit: boolean;
  projectBudget: number;
}

type CellPosition = { rowIndex: number; columnKey: string } | null;
type EditingCell = { rowIndex: number; columnKey: string; value: any } | null;

const COLUMNS = [
  { key: 'phase_name', label: 'Phase Name', type: 'text', editable: true, calculated: false },
  { key: 'start_date', label: 'Start Date', type: 'date', editable: true, calculated: false },
  { key: 'duration', label: 'Duration (days)', type: 'number', editable: true, calculated: false },
  { key: 'end_date', label: 'End Date', type: 'date', editable: true, calculated: false },
  { key: 'progress_percentage', label: 'Progress %', type: 'number', editable: true, calculated: false },
  { key: 'status', label: 'Status', type: 'select', editable: true, calculated: false },
  { key: 'budget_allocated', label: 'Budget Allocated', type: 'currency', editable: true, calculated: false },
  { key: 'budget_spent', label: 'Budget Spent', type: 'currency', editable: true, calculated: false },
  { key: 'budget_percentage', label: 'Budget %', type: 'number', editable: false, calculated: true },
] as const;

export function PhasesSpreadsheet({ projectId, canEdit, projectBudget }: PhasesSpreadsheetProps) {
  const { t, currency } = useLocalization();
  const { phases, updatePhase, bulkUpdatePhases, bulkDeletePhases } = useProjectPhases(projectId);

  // Calendar integration for working days
  const { data: calendarSettings } = useProjectCalendarSettings(projectId);
  const { data: calendarEntries } = useProjectCalendarEntries(projectId, {
    startDate: '2024-01-01',
    endDate: '2025-12-31',
  });
  
  const [activeCell, setActiveCell] = useState<CellPosition>(null);
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [copiedCell, setCopiedCell] = useState<any>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] });
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, Partial<ProjectPhase>>>(new Map());
  const [datePickerOpen, setDatePickerOpen] = useState<{ rowIndex: number; columnKey: string } | null>(null);
  
  const tableRef = useRef<HTMLTableElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Prepare calendar data for working day calculations
  const calendarData = useMemo(() => {
    if (!calendarSettings) return null;

    return {
      enabled: calendarSettings.calendar_enabled,
      workingDays: calendarSettings.calendar_default_working_days?.split(',').map(d => d.trim()) || [],
      holidays: calendarEntries?.map(entry => ({
        date: entry.calendar_date,
        reason: entry.reason || 'Holiday'
      })) || []
    };
  }, [calendarSettings, calendarEntries]);

  // Helper functions for working day calculations
  const isWorkingDay = useCallback((date: Date): boolean => {
    if (!calendarData?.enabled) return true;

    // Check if it's a holiday
    const dateStr = format(date, 'yyyy-MM-dd');
    const isHoliday = calendarData.holidays.some(h => h.date === dateStr);
    if (isHoliday) return false;

    // Check if it's a working day of the week
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[date.getDay()];
    return calendarData.workingDays.includes(dayName);
  }, [calendarData]);

  const calculateWorkingDays = useCallback((startDate: string | null, endDate: string | null): number => {
    if (!startDate || !endDate || !calendarData?.enabled) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;
    let current = new Date(start);

    while (current <= end) {
      if (isWorkingDay(current)) {
        workingDays++;
      }
      current = addDays(current, 1);
    }

    return workingDays;
  }, [calendarData, isWorkingDay]);

  const calculateEndDateFromWorkingDays = useCallback((startDate: string | null, workingDays: number): string | null => {
    if (!startDate || workingDays <= 0 || !calendarData?.enabled) return null;

    const start = new Date(startDate);
    let daysCounted = 0;
    let current = new Date(start);

    while (daysCounted < workingDays) {
      if (isWorkingDay(current)) {
        daysCounted++;
      }
      if (daysCounted < workingDays) {
        current = addDays(current, 1);
      }
    }

    return format(current, 'yyyy-MM-dd');
  }, [calendarData, isWorkingDay]);

  // Calculate duration between dates using calendar days or working days
  // The start date counts as day 1
  const calculateDuration = useCallback((startDate: string | null, endDate: string | null): number => {
    if (!startDate || !endDate) return 0;

    if (calendarData?.enabled) {
      // Use working days calculation
      return calculateWorkingDays(startDate, endDate);
    } else {
      // Use calendar days calculation
      const start = new Date(startDate);
      const end = new Date(endDate);
      return differenceInDays(end, start) + 1;
    }
  }, [calendarData, calculateWorkingDays]);

  // Calculate end date from start date and duration using calendar days or working days
  const calculateEndDate = useCallback((startDate: string | null, duration: number): string | null => {
    if (!startDate || duration <= 0) return null;

    if (calendarData?.enabled) {
      // Use working days calculation
      return calculateEndDateFromWorkingDays(startDate, duration);
    } else {
      // Use calendar days calculation
      const start = new Date(startDate);
      const endDate = addDays(start, duration - 1);
      return format(endDate, 'yyyy-MM-dd');
    }
  }, [calendarData, calculateEndDateFromWorkingDays]);

  // Calculate budget percentage
  const calculateBudgetPercentage = useCallback((budgetAllocated: number | null): number => {
    if (!budgetAllocated || !projectBudget || projectBudget === 0) return 0;
    return (budgetAllocated / projectBudget) * 100;
  }, [projectBudget]);

  // Validate cell value
  const validateCell = useCallback((columnKey: string, value: any, rowIndex: number): string | null => {
    const phase = phases?.[rowIndex];
    if (!phase) return null;

    if (columnKey === 'end_date' && value && phase.start_date) {
      const endDate = new Date(value);
      const startDate = new Date(phase.start_date);
      if (endDate < startDate) {
        return 'End date must be after start date';
      }
    }

    if (columnKey === 'start_date' && value && phase.end_date) {
      const startDate = new Date(value);
      const endDate = new Date(phase.end_date);
      if (startDate > endDate) {
        return 'Start date must be before end date';
      }
    }

    if (columnKey === 'duration') {
      const num = Number(value);
      if (isNaN(num) || num < 1) {
        return 'Duration must be at least 1 day';
      }
    }

    if (columnKey === 'progress_percentage') {
      const num = Number(value);
      if (isNaN(num) || num < 0 || num > 100) {
        return 'Progress must be between 0 and 100';
      }
    }

    if (columnKey === 'budget_allocated' || columnKey === 'budget_spent') {
      const num = Number(value);
      if (isNaN(num) || num < 0) {
        return 'Budget cannot be negative';
      }
    }

    return null;
  }, [phases]);

  // Handle cell click
  const handleCellClick = useCallback((rowIndex: number, columnKey: string, pasteValue?: any) => {
    if (!canEdit) return;
    
    const column = COLUMNS.find(col => col.key === columnKey);
    if (!column || !column.editable) return;

    const phase = phases?.[rowIndex];
    if (!phase) return;

    setActiveCell({ rowIndex, columnKey });
    
    let value: any;
    // If pasteValue is provided, use it; otherwise use the current phase value
    if (pasteValue !== undefined) {
      value = pasteValue;
    } else if (columnKey === 'start_date' || columnKey === 'end_date') {
      value = phase[columnKey] || '';
    } else {
      value = phase[columnKey as keyof ProjectPhase] || '';
    }

    setEditingCell({ rowIndex, columnKey, value });
  }, [canEdit, phases]);

  // Handle cell save
  const handleCellSave = useCallback(async (rowIndex: number, columnKey: string, value: any) => {
    const phase = phases?.[rowIndex];
    if (!phase) return;

    const error = validateCell(columnKey, value, rowIndex);
    if (error) {
      // Show error but don't save
      console.error(error);
      return;
    }

    // Prepare update
    const updateData: any = {};
    
    if (columnKey === 'start_date') {
      const newStartDate = value ? new Date(value).toISOString().split('T')[0] : null;
      updateData.start_date = newStartDate;
      
      // If we have an end date, recalculate duration
      if (newStartDate && phase.end_date) {
        const duration = calculateDuration(newStartDate, phase.end_date);
        // Don't update duration in DB, it's derived
      } else if (newStartDate && phase.duration) {
        // If we have duration but no end date, calculate end date
        const newEndDate = calculateEndDate(newStartDate, phase.duration);
        if (newEndDate) {
          updateData.end_date = newEndDate;
        }
      }
    } else if (columnKey === 'end_date') {
      const newEndDate = value ? new Date(value).toISOString().split('T')[0] : null;
      updateData.end_date = newEndDate;
      
      // Recalculate duration if we have start date
      if (newEndDate && phase.start_date) {
        const duration = calculateDuration(phase.start_date, newEndDate);
        // Don't update duration in DB, it's derived
      }
    } else if (columnKey === 'duration') {
      const newDuration = Number(value) || 0;
      updateData.duration = newDuration;
      
      // If we have start date, recalculate end date
      if (phase.start_date && newDuration > 0) {
        const newEndDate = calculateEndDate(phase.start_date, newDuration);
        if (newEndDate) {
          updateData.end_date = newEndDate;
        }
      }
    } else if (columnKey === 'progress_percentage') {
      updateData.progress_percentage = Number(value) || 0;
    } else if (columnKey === 'budget_allocated' || columnKey === 'budget_spent') {
      updateData[columnKey] = Number(value) || 0;
    } else {
      updateData[columnKey] = value;
    }

    // Add to pending updates
    const currentUpdates = pendingUpdates.get(phase.id) || {};
    setPendingUpdates(new Map(pendingUpdates.set(phase.id, {
      ...currentUpdates,
      ...updateData,
    })));

    // Save immediately
    try {
      await updatePhase.mutateAsync({
        id: phase.id,
        updates: updateData,
      });
      
      // Remove from pending updates
      const updated = new Map(pendingUpdates);
      updated.delete(phase.id);
      setPendingUpdates(updated);
    } catch (error) {
      console.error('Failed to save cell:', error);
    }
  }, [phases, pendingUpdates, updatePhase, validateCell, calculateDuration, calculateEndDate]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeCell || editingCell) return;

      const { rowIndex, columnKey } = activeCell;
      const columnIndex = COLUMNS.findIndex(col => col.key === columnKey);
      
      let newRowIndex = rowIndex;
      let newColumnIndex = columnIndex;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          newRowIndex = Math.max(0, rowIndex - 1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          newRowIndex = Math.min((phases?.length || 1) - 1, rowIndex + 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          newColumnIndex = Math.max(0, columnIndex - 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          newColumnIndex = Math.min(COLUMNS.length - 1, columnIndex + 1);
          break;
        case 'Tab':
          e.preventDefault();
          if (e.shiftKey) {
            if (columnIndex > 0) {
              newColumnIndex = columnIndex - 1;
            } else if (rowIndex > 0) {
              newRowIndex = rowIndex - 1;
              newColumnIndex = COLUMNS.length - 1;
            }
          } else {
            if (columnIndex < COLUMNS.length - 1) {
              newColumnIndex = columnIndex + 1;
            } else if (rowIndex < (phases?.length || 1) - 1) {
              newRowIndex = rowIndex + 1;
              newColumnIndex = 0;
            }
          }
          break;
        case 'Enter':
          e.preventDefault();
          if (columnIndex < COLUMNS.length - 1) {
            newColumnIndex = columnIndex + 1;
          } else if (rowIndex < (phases?.length || 1) - 1) {
            newRowIndex = rowIndex + 1;
            newColumnIndex = 0;
          }
          break;
        case 'Escape':
          setActiveCell(null);
          setEditingCell(null);
          return;
        case 'c':
        case 'C':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const phase = phases?.[rowIndex];
            if (phase) {
              const value = phase[columnKey as keyof ProjectPhase];
              setCopiedCell(value);
            }
          }
          return;
        case 'v':
        case 'V':
          if ((e.ctrlKey || e.metaKey) && copiedCell !== null) {
            e.preventDefault();
            handleCellClick(rowIndex, columnKey, copiedCell);
          }
          return;
        default:
          return;
      }

      const newColumn = COLUMNS[newColumnIndex];
      if (newColumn && newColumn.editable) {
        setActiveCell({ rowIndex: newRowIndex, columnKey: newColumn.key });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCell, editingCell, phases, copiedCell, handleCellClick]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // Render cell content
  const renderCell = useCallback((phase: ProjectPhase, rowIndex: number, columnKey: string) => {
    const column = COLUMNS.find(col => col.key === columnKey);
    if (!column) return null;

    const isActive = activeCell?.rowIndex === rowIndex && activeCell?.columnKey === columnKey;
    const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnKey === columnKey;
    const hasPendingUpdate = pendingUpdates.has(phase.id);

    let displayValue: any;
    
    if (column.calculated) {
      if (columnKey === 'budget_percentage') {
        displayValue = calculateBudgetPercentage(phase.budget_allocated);
        return (
          <span className="text-muted-foreground">
            {displayValue.toFixed(1)}%
          </span>
        );
      }
    }
    
    // Special handling for duration - show calculated value but allow editing
    if (columnKey === 'duration' && !isEditing) {
      const calculatedDuration = phase.start_date && phase.end_date
        ? calculateDuration(phase.start_date, phase.end_date)
        : phase.duration || 0;
      return (
        <span
          className={cn(
            "cursor-pointer hover:text-primary",
            isActive && "ring-2 ring-primary ring-offset-2",
            hasPendingUpdate && "opacity-50"
          )}
          onClick={() => handleCellClick(rowIndex, columnKey)}
          title={t("tooltips.calendarDaysIncludesAllDays")}
        >
          {calculatedDuration} days
        </span>
      );
    }

    if (isEditing) {
      const currentValue = editingCell?.value;
      
      if (column.type === 'date') {
        const isDatePickerOpen = datePickerOpen?.rowIndex === rowIndex && datePickerOpen?.columnKey === columnKey;
        return (
          <Popover open={isDatePickerOpen} onOpenChange={(open) => {
            if (open) {
              setDatePickerOpen({ rowIndex, columnKey });
            } else {
              setDatePickerOpen(null);
            }
          }}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-8 w-full justify-start text-left font-normal",
                  !currentValue && "text-muted-foreground"
                )}
                onClick={() => setDatePickerOpen({ rowIndex, columnKey })}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {currentValue ? formatDate(currentValue) : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <DateInput
                value={currentValue ? format(new Date(currentValue), "yyyy-MM-dd") : ""}
                onChange={(value) => {
                  handleCellSave(rowIndex, columnKey, value || null);
                  setDatePickerOpen(null);
                  setEditingCell(null);
                  setActiveCell(null);
                }}
                className="w-56"
              />
            </PopoverContent>
          </Popover>
        );
      }

      if (column.type === 'select') {
        return (
          <Select
            value={currentValue || ''}
            onValueChange={(value) => {
              handleCellSave(rowIndex, columnKey, value);
              setEditingCell(null);
              setActiveCell(null);
            }}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        );
      }

      return (
        <Input
          ref={inputRef}
          type={column.type === 'number' || column.type === 'currency' ? 'number' : 'text'}
          value={currentValue || ''}
          onChange={(e) => {
            setEditingCell({ rowIndex, columnKey, value: e.target.value });
          }}
          onBlur={() => {
            if (editingCell) {
              handleCellSave(rowIndex, columnKey, editingCell.value);
              setEditingCell(null);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (editingCell) {
                handleCellSave(rowIndex, columnKey, editingCell.value);
                setEditingCell(null);
                // Move to next cell
                const columnIndex = COLUMNS.findIndex(col => col.key === columnKey);
                if (columnIndex < COLUMNS.length - 1) {
                  const nextColumn = COLUMNS[columnIndex + 1];
                  if (nextColumn.editable) {
                    setActiveCell({ rowIndex, columnKey: nextColumn.key });
                  }
                } else if (rowIndex < (phases?.length || 1) - 1) {
                  const firstColumn = COLUMNS.find(col => col.editable);
                  if (firstColumn) {
                    setActiveCell({ rowIndex: rowIndex + 1, columnKey: firstColumn.key });
                  }
                }
              }
            } else if (e.key === 'Escape') {
              setEditingCell(null);
              setActiveCell(null);
            }
          }}
          className="h-8"
          step={column.type === 'currency' ? '0.01' : undefined}
          min={column.type === 'number' && columnKey === 'progress_percentage' ? 0 : undefined}
          max={column.type === 'number' && columnKey === 'progress_percentage' ? 100 : undefined}
        />
      );
    }

    // Display mode
    const value = phase[columnKey as keyof ProjectPhase];
    
    if (columnKey === 'start_date' || columnKey === 'end_date') {
      return (
        <span
          className={cn(
            "cursor-pointer hover:text-primary",
            isActive && "ring-2 ring-primary ring-offset-2",
            hasPendingUpdate && "opacity-50"
          )}
          onClick={() => handleCellClick(rowIndex, columnKey)}
        >
            {value ? formatDate(value) : '-'}
        </span>
      );
    }

    if (columnKey === 'status') {
      const statusColors: Record<string, string> = {
        completed: 'bg-green-500/10 text-green-700 dark:text-green-400',
        in_progress: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
        pending: 'bg-muted text-muted-foreground',
      };
      
      return (
        <Badge
          variant="outline"
          className={cn(
            "cursor-pointer",
            statusColors[value as string] || statusColors.pending,
            isActive && "ring-2 ring-primary ring-offset-2",
            hasPendingUpdate && "opacity-50"
          )}
          onClick={() => handleCellClick(rowIndex, columnKey)}
        >
          {value === 'completed' ? 'Completed' : value === 'in_progress' ? 'In Progress' : 'Pending'}
        </Badge>
      );
    }

    if (column.type === 'currency') {
      return (
        <span
          className={cn(
            "cursor-pointer hover:text-primary",
            isActive && "ring-2 ring-primary ring-offset-2",
            hasPendingUpdate && "opacity-50"
          )}
          onClick={() => handleCellClick(rowIndex, columnKey)}
        >
          {currency} {Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      );
    }

    return (
      <span
        className={cn(
          "cursor-pointer hover:text-primary",
          isActive && "ring-2 ring-primary ring-offset-2",
          hasPendingUpdate && "opacity-50"
        )}
        onClick={() => handleCellClick(rowIndex, columnKey)}
      >
        {value !== null && value !== undefined ? String(value) : '-'}
      </span>
    );
  }, [activeCell, editingCell, phases, pendingUpdates, calculateDuration, calculateBudgetPercentage, currency, handleCellClick, handleCellSave, datePickerOpen, t]);

  // Handle row selection
  const handleSelectRow = useCallback((rowIndex: number, checked: boolean) => {
    const newSelection = new Set(selectedRows);
    if (checked) {
      newSelection.add(rowIndex);
    } else {
      newSelection.delete(rowIndex);
    }
    setSelectedRows(newSelection);
  }, [selectedRows]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(phases?.map((_, idx) => idx) || []));
    } else {
      setSelectedRows(new Set());
    }
  }, [phases]);

  // Handle bulk delete
  const handleBulkDelete = useCallback(async () => {
    const idsToDelete = Array.from(selectedRows).map(idx => phases?.[idx]?.id).filter(Boolean) as string[];
    if (idsToDelete.length === 0) return;

    try {
      await bulkDeletePhases.mutateAsync(idsToDelete);
      setSelectedRows(new Set());
      setDeleteDialog({ open: false, ids: [] });
    } catch (error) {
      console.error('Failed to delete phases:', error);
    }
  }, [selectedRows, phases, bulkDeletePhases]);

  // Export to CSV
  const handleExportCSV = useCallback(() => {
    if (!phases || phases.length === 0) return;

    const headers = COLUMNS.map(col => col.label).join(',');
    const rows = phases.map(phase => {
      return COLUMNS.map(col => {
        let value: any = phase[col.key as keyof ProjectPhase];
        
        if (col.calculated) {
          if (col.key === 'duration') {
            value = calculateDuration(phase.start_date, phase.end_date);
          } else if (col.key === 'budget_percentage') {
            value = calculateBudgetPercentage(phase.budget_allocated);
          }
        }
        
        if (col.type === 'currency') {
          value = Number(value || 0).toFixed(2);
        }
        
        if (value === null || value === undefined) {
          value = '';
        }
        
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',');
    });

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-phases-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [phases, calculateDuration, calculateBudgetPercentage]);

  if (!phases || phases.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">No phases found</p>
        </CardContent>
      </Card>
    );
  }

  const allSelected = phases.length > 0 && selectedRows.size === phases.length;

  return (
    <>
      {/* Bulk Actions Bar */}
      {canEdit && selectedRows.size > 0 && (
        <Card className="mb-4 border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">
                {selectedRows.size} phase(s) selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRows(new Set())}
              >
                <X className="h-4 w-4 mr-1" />
                Clear Selection
              </Button>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialog({ open: true, ids: Array.from(selectedRows).map(idx => phases[idx]?.id).filter(Boolean) as string[] })}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete Selected
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>
        {copiedCell !== null && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Copy className="h-4 w-4" />
            <span>Copied: {String(copiedCell)}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCopiedCell(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Working Days Mode Indicator */}
      {calendarData?.enabled && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              Working Days Mode
            </Badge>
            <span className="text-sm text-muted-foreground">
              Duration and date calculations use working days (excluding weekends and holidays)
            </span>
          </div>
        </div>
      )}

      {/* Spreadsheet Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table ref={tableRef}>
            <TableHeader>
              <TableRow>
                {canEdit && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                )}
                 {COLUMNS.map((column) => (
                   <TableHead key={column.key} className="min-w-[120px]">
                     <TooltipProvider>
                       <Tooltip>
                         <TooltipTrigger asChild>
                           <span className="cursor-help">{column.label}</span>
                         </TooltipTrigger>
                         <TooltipContent>
                           <p>
                             {column.key === 'duration' && calendarData?.enabled
                               ? 'Duration in working days (excludes weekends and holidays)'
                               : column.key === 'start_date' || column.key === 'end_date'
                               ? calendarData?.enabled
                                 ? 'Dates calculated using working days'
                                 : 'Dates calculated using calendar days'
                               : column.label
                             }
                           </p>
                         </TooltipContent>
                       </Tooltip>
                     </TooltipProvider>
                   </TableHead>
                 ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {phases.map((phase, rowIndex) => (
                <TableRow key={phase.id}>
                  {canEdit && (
                    <TableCell>
                      <Checkbox
                        checked={selectedRows.has(rowIndex)}
                        onCheckedChange={(checked) => handleSelectRow(rowIndex, checked as boolean)}
                      />
                    </TableCell>
                  )}
                  {COLUMNS.map((column) => (
                    <TableCell key={column.key}>
                      {renderCell(phase, rowIndex, column.key)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, ids: [] })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Phases?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteDialog.ids.length} phase(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
