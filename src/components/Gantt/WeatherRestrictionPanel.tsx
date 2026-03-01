/**
 * Weather Restriction Panel - Seasonal & Weather-Based Constraints
 *
 * Manages weather restrictions that affect project scheduling:
 * - Define seasonal restricted periods
 * - Weather-based work prohibitions
 * - Impact analysis on critical path
 * - Restriction windows and holidays
 */

import React, { useState, useMemo } from 'react';
import { format, parseISO, differenceInDays, eachDayOfInterval } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  Plus,
  Trash2,
  Cloud,
  Calendar,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

import type { UnifiedTask, WeatherRestriction } from './types';
import { cn } from '@/lib/utils';

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface WeatherRestrictionPanelProps {
  /** Tasks in project */
  tasks: UnifiedTask[];

  /** Project date range */
  projectStart: Date;
  projectEnd: Date;

  /** Weather restrictions */
  restrictions: WeatherRestriction[];

  /** Callback when restriction is added */
  onRestrictionAdd: (restriction: WeatherRestriction) => void;

  /** Callback when restriction is removed */
  onRestrictionRemove: (restrictionId: string) => void;

  /** Custom className */
  className?: string;
}

// ============================================================================
// STATE TYPES
// ============================================================================

interface NewRestrictionForm {
  name: string;
  startDate: string;
  endDate: string;
  reason: 'seasonal' | 'weather' | 'holiday' | 'maintenance' | 'other';
  severity: 'low' | 'medium' | 'high';
}

// ============================================================================
// COMPONENT
// ============================================================================

export function WeatherRestrictionPanel({
  tasks,
  projectStart,
  projectEnd,
  restrictions,
  onRestrictionAdd,
  onRestrictionRemove,
  className,
}: WeatherRestrictionPanelProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [newRestriction, setNewRestriction] = useState<NewRestrictionForm>({
    name: '',
    startDate: format(projectStart, 'yyyy-MM-dd'),
    endDate: format(projectStart, 'yyyy-MM-dd'),
    reason: 'seasonal',
    severity: 'medium',
  });

  // ========================================================================
  // DERIVED DATA
  // ========================================================================

  /**
   * Calculate impact on tasks
   */
  const impactAnalysis = useMemo(() => {
    let affectedCriticalTasks = 0;
    let totalAffectedDays = 0;
    const affectedTaskIds = new Set<string>();

    restrictions.forEach((restriction) => {
      const restrictStart = parseISO(restriction.startDate);
      const restrictEnd = parseISO(restriction.endDate);

      tasks.forEach((task) => {
        const taskStart = parseISO(task.startDate);
        const taskEnd = parseISO(task.endDate);

        // Check if task overlaps with restriction
        if (taskEnd >= restrictStart && taskStart <= restrictEnd) {
          affectedTaskIds.add(task.id);

          if (task.isCritical) {
            affectedCriticalTasks++;
          }

          // Calculate overlap days
          const overlapStart = taskStart > restrictStart ? taskStart : restrictStart;
          const overlapEnd = taskEnd < restrictEnd ? taskEnd : restrictEnd;
          const overlapDays = differenceInDays(overlapEnd, overlapStart);
          totalAffectedDays += Math.max(0, overlapDays);
        }
      });
    });

    return {
      affectedTaskCount: affectedTaskIds.size,
      affectedCriticalTasks,
      totalAffectedDays,
      scheduleImpact: totalAffectedDays > 0 ? 'High' : 'Low',
    };
  }, [restrictions, tasks]);

  /**
   * Get restriction color by reason
   */
  const getRestrictionColor = (reason: string) => {
    switch (reason) {
      case 'seasonal':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'weather':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'holiday':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'maintenance':
        return 'bg-orange-100 text-orange-900 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-900 border-gray-300';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'bg-green-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'high':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  /**
   * Handle adding restriction
   */
  const handleAddRestriction = () => {
    if (!newRestriction.name.trim()) return;

    const restriction: WeatherRestriction = {
      id: `restriction-${Date.now()}`,
      name: newRestriction.name,
      startDate: newRestriction.startDate,
      endDate: newRestriction.endDate,
      reason: newRestriction.reason,
      severity: newRestriction.severity,
      createdAt: new Date(),
    };

    onRestrictionAdd(restriction);

    // Reset form
    setNewRestriction({
      name: '',
      startDate: format(projectStart, 'yyyy-MM-dd'),
      endDate: format(projectStart, 'yyyy-MM-dd'),
      reason: 'seasonal',
      severity: 'medium',
    });
    setShowDialog(false);
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Weather & Seasonal Restrictions
          </h3>
          <p className="text-sm text-gray-500">
            Define weather-based scheduling constraints
          </p>
        </div>
        <Button
          onClick={() => setShowDialog(true)}
          size="sm"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Restriction
        </Button>
      </div>

      {/* Impact Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Restrictions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{restrictions.length}</div>
            <p className="text-xs text-gray-500 mt-1">Active periods</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Affected Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{impactAnalysis.affectedTaskCount}</div>
            <p className="text-xs text-gray-500 mt-1">Tasks impacted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Critical Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              'text-2xl font-bold',
              impactAnalysis.affectedCriticalTasks > 0 ? 'text-red-600' : 'text-green-600'
            )}>
              {impactAnalysis.affectedCriticalTasks}
            </div>
            <p className="text-xs text-gray-500 mt-1">At risk</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Affected Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{impactAnalysis.totalAffectedDays}</div>
            <p className="text-xs text-gray-500 mt-1">Work days lost</p>
          </CardContent>
        </Card>
      </div>

      {/* Impact Alert */}
      {impactAnalysis.affectedCriticalTasks > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {impactAnalysis.affectedCriticalTasks} critical task(s) are affected by weather restrictions.
            Consider schedule adjustments or resource reallocation.
          </AlertDescription>
        </Alert>
      )}

      {/* Restrictions List */}
      {restrictions.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No weather restrictions defined. Add restrictions to account for seasonal constraints.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-2">
          {restrictions.map((restriction) => {
            const duration = differenceInDays(
              parseISO(restriction.endDate),
              parseISO(restriction.startDate)
            );

            return (
              <div
                key={restriction.id}
                className={cn(
                  'p-3 rounded-lg border-2',
                  getRestrictionColor(restriction.reason)
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{restriction.name}</h4>
                      <Badge className={cn('text-white text-xs', getSeverityColor(restriction.severity))}>
                        {restriction.severity}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {restriction.reason}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(restriction.startDate), 'MMM d')} -{' '}
                        {format(parseISO(restriction.endDate), 'MMM d')}
                      </span>
                      <span className="text-gray-600">
                        {duration} days
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRestrictionRemove(restriction.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Restriction Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Weather Restriction</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="restriction-name">Restriction Name</Label>
              <Input
                id="restriction-name"
                placeholder="e.g., Winter Shutdown, Monsoon Season"
                value={newRestriction.name}
                onChange={(e) =>
                  setNewRestriction((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
              />
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={newRestriction.startDate}
                onChange={(e) =>
                  setNewRestriction((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={newRestriction.endDate}
                onChange={(e) =>
                  setNewRestriction((prev) => ({
                    ...prev,
                    endDate: e.target.value,
                  }))
                }
              />
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <select
                id="reason"
                value={newRestriction.reason}
                onChange={(e) =>
                  setNewRestriction((prev) => ({
                    ...prev,
                    reason: e.target.value as any,
                  }))
                }
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="seasonal">Seasonal</option>
                <option value="weather">Weather</option>
                <option value="holiday">Holiday</option>
                <option value="maintenance">Maintenance</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Severity */}
            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <select
                id="severity"
                value={newRestriction.severity}
                onChange={(e) =>
                  setNewRestriction((prev) => ({
                    ...prev,
                    severity: e.target.value as any,
                  }))
                }
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="low">Low (Minor Impact)</option>
                <option value="medium">Medium (Moderate Impact)</option>
                <option value="high">High (Critical Impact)</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddRestriction}
              disabled={!newRestriction.name.trim()}
            >
              Add Restriction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default WeatherRestrictionPanel;
