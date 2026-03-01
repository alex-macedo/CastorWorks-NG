import { useOpenSprint, useCloseSprint, useSprintItems } from '@/hooks/useSprints';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, CheckCircle2, Clock, TrendingUp, XCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useLocalization } from "@/contexts/LocalizationContext";
export const SprintBoard = () => {
  const { t } = useLocalization();
  const { data: openSprint, isLoading } = useOpenSprint();
  const { data: sprintItems = [], isLoading: itemsLoading } = useSprintItems(openSprint?.id);
  const closeSprint = useCloseSprint();
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  if (isLoading) {
    return <div className="text-muted-foreground">Loading sprint...</div>;
  }

  if (!openSprint) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Active Sprint</CardTitle>
          <CardDescription>Create a new sprint to get started</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const completedItems = sprintItems.filter(item => item.status === 'done');
  const completionRate = sprintItems.length > 0
    ? Math.round((completedItems.length / sprintItems.length) * 100)
    : 0;

  const daysRemaining = differenceInDays(new Date(openSprint.end_date), new Date());
  const totalDays = differenceInDays(new Date(openSprint.end_date), new Date(openSprint.start_date));
  const daysElapsed = totalDays - daysRemaining;

  const itemsByStatus = {
    backlog: sprintItems.filter(item => item.status === 'backlog'),
    next_up: sprintItems.filter(item => item.status === 'next_up'),
    in_progress: sprintItems.filter(item => item.status === 'in_progress'),
    blocked: sprintItems.filter(item => item.status === 'blocked'),
    done: completedItems,
  };

  const handleCloseSprint = async () => {
    await closeSprint.mutateAsync(openSprint.id);
    setShowCloseDialog(false);
  };

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Sprint {openSprint.sprint_identifier}</CardTitle>
                <CardDescription className="mt-1">{openSprint.title}</CardDescription>
              </div>
              <Badge variant={daysRemaining < 0 ? 'destructive' : 'default'} className="text-sm">
                {daysRemaining < 0 ? 'Overdue' : `${daysRemaining} days left`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{t("ui.period")}</span>
                </div>
                <div className="text-sm font-medium">
                  {format(new Date(openSprint.start_date), 'MMM dd')} - {format(new Date(openSprint.end_date), 'MMM dd, yyyy')}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{t("ui.completion")}</span>
                </div>
                <div className="text-2xl font-bold text-primary">
                  {completionRate}%
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span>{t("ui.items")}</span>
                </div>
                <div className="text-2xl font-bold">
                  {completedItems.length}/{sprintItems.length}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{t("ui.progress")}</span>
                </div>
                <div className="text-sm font-medium">
                  Day {daysElapsed + 1} of {totalDays + 1}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sprint Progress</span>
                <span className="font-medium">{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>

            <Button 
              onClick={() => setShowCloseDialog(true)}
              variant="outline"
              className="w-full"
              disabled={closeSprint.isPending}
            >
              Close Sprint & Generate Release Notes
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Object.entries(itemsByStatus).map(([status, items]) => (
            <Card key={status}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium capitalize">
                  {status.replace('_', ' ')}
                </CardTitle>
                <CardDescription>{items.length} items</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.map(item => (
                  <div key={item.id} className="p-2 rounded-md bg-muted/50 text-sm">
                    <div className="font-medium line-clamp-1">{item.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {item.priority && (
                        <Badge variant="outline" className="text-xs">
                          {item.priority}
                        </Badge>
                      )}
                      {item.category && (
                        <Badge variant="secondary" className="text-xs">
                          {item.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Sprint {openSprint.sprint_identifier}?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This will close the sprint and generate release notes with:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Total items: {sprintItems.length}</li>
                <li>Completed: {completedItems.length} ({completionRate}%)</li>
                <li>Incomplete: {sprintItems.length - completedItems.length}</li>
              </ul>
              <p className="text-sm font-medium mt-3">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseSprint}>
              Close Sprint
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
