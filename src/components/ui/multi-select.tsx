import * as React from "react";
import { Check, ChevronsUpDown, X, Search, Command } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export interface MultiSelectOption {
  id: string;
  name: string;
  color?: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  withColors?: boolean;
  className?: string;
  maxDisplayed?: number;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select options...",
  searchPlaceholder = "Search...",
  withColors = false,
  className,
  maxDisplayed = 2,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const parentRef = React.useRef<HTMLDivElement>(null);

  const filteredOptions = React.useMemo(() => {
    return options.filter((option) =>
      option.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const getScrollElement = React.useCallback(() => parentRef.current, []);

  const rowVirtualizer = useVirtualizer({
    count: filteredOptions.length,
    getScrollElement,
    estimateSize: () => 35,
    overscan: 5,
  });

  const toggleOption = (optionId: string) => {
    const newSelected = selected.includes(optionId)
      ? selected.filter((id) => id !== optionId)
      : [...selected, optionId];
    onChange(newSelected);
  };

  const handleSelectAll = () => {
    const visibleIds = filteredOptions.map((opt) => opt.id);
    const otherSelected = selected.filter(
      (id) => !options.find((opt) => opt.id === id) || !visibleIds.includes(id)
    );
    // If all visible are already selected, we don't need to do anything or we could deselect all visible
    // But usually "Select All" means making sure all currently filtered are selected
    const allVisibleSelected = visibleIds.every((id) => selected.includes(id));
    
    if (allVisibleSelected) {
      // Optional: could deselect all visible if they are all selected
      // For now, let's just make sure they are selected
    } else {
      const combined = Array.from(new Set([...selected, ...visibleIds]));
      onChange(combined);
    }
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "a") {
      e.preventDefault();
      handleSelectAll();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between min-h-10 h-auto", className)}
        >
          <div className="flex flex-wrap gap-1 items-center">
            {selected.length === 0 && (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            {selected.length > 0 && selected.length <= maxDisplayed && (
              selected.map((id) => {
                const option = options.find((o) => o.id === id);
                return option ? (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="mr-1 mb-1 font-normal"
                  >
                    {option.name}
                    <X
                      className="ml-1 h-3 w-3 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleOption(id);
                      }}
                    />
                  </Badge>
                ) : null;
              })
            )}
            {selected.length > maxDisplayed && (
              <Badge variant="secondary" className="mr-1 mb-1 font-normal">
                {selected.length} selected
                <X
                  className="ml-1 h-3 w-3 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearAll();
                  }}
                />
              </Badge>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <div className="flex items-center justify-between p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            className="text-xs h-8"
          >
            Select All
            <span className="ml-2 text-[10px] text-muted-foreground hidden sm:inline">
              (⌘A)
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-xs h-8"
            disabled={selected.length === 0}
          >
            Clear All
          </Button>
        </div>
        <Separator />
        <div
          ref={parentRef}
          className="max-h-[300px] overflow-auto p-1"
          style={{
            height: filteredOptions.length > 0 ? `${Math.min(filteredOptions.length * 35, 300)}px` : '40px',
          }}
        >
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No options found.
            </div>
          ) : (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const option = filteredOptions[virtualRow.index];
                const isSelected = selected.includes(option.id);
                return (
                  <div
                    key={option.id}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    className={cn(
                      "flex items-center space-x-2 rounded-sm px-2 py-1.5 hover:bg-accent hover:text-accent-foreground cursor-pointer absolute top-0 left-0 w-full",
                      isSelected && "bg-accent/50"
                    )}
                    style={{
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    onClick={() => toggleOption(option.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOption(option.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {withColors && option.color && (
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    <span className="text-sm flex-1 truncate">{option.name}</span>
                    {isSelected && (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
