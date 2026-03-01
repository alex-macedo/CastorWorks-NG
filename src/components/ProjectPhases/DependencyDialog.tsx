import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";

interface Dependency {
  activityId: string;
  type: 'FS' | 'SS' | 'FF' | 'SF'; // Finish-to-Start, Start-to-Start, Finish-to-Finish, Start-to-Finish
  lag: number; // Days
}

interface DependencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: any;
  allActivities: any[];
  onSave: (dependencies: Dependency[]) => void;
}

const DEPENDENCY_TYPES = [
  { value: 'FS', label: 'Finish-to-Start (FS)', description: 'Successor starts when predecessor finishes' },
  { value: 'SS', label: 'Start-to-Start (SS)', description: 'Both start together' },
  { value: 'FF', label: 'Finish-to-Finish (FF)', description: 'Both finish together' },
  { value: 'SF', label: 'Start-to-Finish (SF)', description: 'Successor finishes when predecessor starts' },
];

export function DependencyDialog({
  open,
  onOpenChange,
  activity,
  allActivities,
  onSave,
}: DependencyDialogProps) {
  const [dependencies, setDependencies] = useState<Dependency[]>([]);

  useEffect(() => {
    if (activity?.dependencies && Array.isArray(activity.dependencies)) {
      setDependencies(activity.dependencies);
    } else {
       
      setDependencies([]);
    }
  }, [activity]);

  const availableActivities = allActivities.filter(
    a => a.id !== activity?.id && a.phase_id === activity?.phase_id
  );

  const handleAddDependency = () => {
    if (availableActivities.length === 0) return;
    
    setDependencies([
      ...dependencies,
      { activityId: availableActivities[0].id, type: 'FS', lag: 0 },
    ]);
  };

  const handleRemoveDependency = (index: number) => {
    setDependencies(dependencies.filter((_, i) => i !== index));
  };

  const handleUpdateDependency = (index: number, field: keyof Dependency, value: any) => {
    const updated = [...dependencies];
    updated[index] = { ...updated[index], [field]: value };
    setDependencies(updated);
  };

  const handleSave = () => {
    onSave(dependencies);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Dependencies</DialogTitle>
          <DialogDescription>
            Set predecessor activities for "{activity?.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {dependencies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No dependencies set. Add predecessors to control activity scheduling.
            </div>
          ) : (
            <div className="space-y-3">
              {dependencies.map((dep, index) => {
                const predecessor = allActivities.find(a => a.id === dep.activityId);
                
                return (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="flex-1 space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1">Predecessor Activity</Label>
                        <Select
                          value={dep.activityId}
                          onValueChange={(value) => handleUpdateDependency(index, 'activityId', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableActivities.map((act) => (
                              <SelectItem key={act.id} value={act.id}>
                                #{act.sequence} - {act.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1">Dependency Type</Label>
                          <Select
                            value={dep.type}
                            onValueChange={(value) => handleUpdateDependency(index, 'type', value as Dependency['type'])}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DEPENDENCY_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">
                            {DEPENDENCY_TYPES.find(t => t.value === dep.type)?.description}
                          </p>
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground mb-1">Lag (days)</Label>
                          <Select
                            value={dep.lag.toString()}
                            onValueChange={(value) => handleUpdateDependency(index, 'lag', parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="-5">-5 days</SelectItem>
                              <SelectItem value="-3">-3 days</SelectItem>
                              <SelectItem value="-1">-1 day</SelectItem>
                              <SelectItem value="0">0 days</SelectItem>
                              <SelectItem value="1">+1 day</SelectItem>
                              <SelectItem value="3">+3 days</SelectItem>
                              <SelectItem value="5">+5 days</SelectItem>
                              <SelectItem value="10">+10 days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveDependency(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddDependency}
            disabled={availableActivities.length === 0}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Predecessor
          </Button>

          {availableActivities.length === 0 && (
            <p className="text-sm text-muted-foreground text-center">
              No other activities in this phase to add as predecessors
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Dependencies
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
