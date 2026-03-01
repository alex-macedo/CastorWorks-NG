import { useState } from 'react';
import { Check, ChevronsUpDown, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RoadmapItem } from '@/hooks/useRoadmapItems';

import { useLocalization } from "@/contexts/LocalizationContext";
interface DependencySelectorProps {
  currentItemId?: string;
  selectedDependencies: string[];
  onDependenciesChange: (dependencies: string[]) => void;
  availableItems: RoadmapItem[];
}

export function DependencySelector({
  currentItemId,
  selectedDependencies,
  onDependenciesChange,
  availableItems,
}: DependencySelectorProps) {
  const { t } = useLocalization();
  const [open, setOpen] = useState(false);

  // Filter out current item and already selected dependencies
  const selectableItems = availableItems.filter(
    (item) => item.id !== currentItemId
  );

  const selectedItems = availableItems.filter((item) =>
    selectedDependencies.includes(item.id)
  );

  const handleSelect = (itemId: string) => {
    if (selectedDependencies.includes(itemId)) {
      onDependenciesChange(selectedDependencies.filter((id) => id !== itemId));
    } else {
      onDependenciesChange([...selectedDependencies, itemId]);
    }
  };

  const handleRemove = (itemId: string) => {
    onDependenciesChange(selectedDependencies.filter((id) => id !== itemId));
  };

  // Check for circular dependencies
  const wouldCreateCircular = (itemId: string): boolean => {
    const item = availableItems.find((i) => i.id === itemId);
    if (!item?.dependencies) return false;
    
    try {
      const deps = typeof item.dependencies === 'string' 
        ? JSON.parse(item.dependencies) 
        : item.dependencies;
      return Array.isArray(deps) && deps.includes(currentItemId);
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="justify-between"
            >
              Add dependency...
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0">
            <Command>
              <CommandInput placeholder={t("additionalPlaceholders.searchRoadmapItems")} />
              <CommandEmpty>No items found.</CommandEmpty>
              <CommandGroup className="max-h-64 overflow-y-auto">
                {selectableItems.map((item) => {
                  const isCircular = wouldCreateCircular(item.id);
                  const isSelected = selectedDependencies.includes(item.id);
                  
                  return (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => !isCircular && handleSelect(item.id)}
                      disabled={isCircular}
                      className={cn(isCircular && 'opacity-50 cursor-not-allowed')}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          isSelected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{item.title}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {item.status}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {item.category}
                          </Badge>
                        </div>
                      </div>
                      {isCircular && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Selected Dependencies */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedItems.map((item) => (
            <Badge
              key={item.id}
              variant="secondary"
              className="gap-1 pr-1"
            >
              <span className="truncate max-w-[200px]">{item.title}</span>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs ml-1",
                  item.status === 'done' && "bg-green-500/10 text-green-500"
                )}
              >
                {item.status}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleRemove(item.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
