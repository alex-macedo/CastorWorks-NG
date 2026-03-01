import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface MultiSelectOption {
  id: string;
  name: string;
  color?: string;
}

interface MultiSelectDropdownProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
  withColors?: boolean;
}

export function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder,
  withColors = false,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);

  const toggleOption = (optionId: string) => {
    if (selected.includes(optionId)) {
      onChange(selected.filter((id) => id !== optionId));
    } else {
      onChange([...selected, optionId]);
    }
  };

  const clearAll = () => {
    onChange([]);
  };

  const getDisplayText = () => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) {
      const option = options.find((opt) => opt.id === selected[0]);
      return option?.name || placeholder;
    }
    return `${selected.length} selected`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{getDisplayText()}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">
            {selected.length > 0 ? `${selected.length} selected` : "Select options"}
          </span>
          {selected.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-auto p-1 text-xs"
            >
              Clear all
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[300px]">
          <div className="p-2">
            {options.map((option) => (
              <div
                key={option.id}
                className="flex items-center space-x-2 rounded-sm px-2 py-2 hover:bg-primary/10 cursor-pointer"
                onClick={() => toggleOption(option.id)}
              >
                <Checkbox
                  checked={selected.includes(option.id)}
                  onCheckedChange={() => toggleOption(option.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                {withColors && option.color && (
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: option.color }}
                  />
                )}
                <span className="text-sm flex-1">{option.name}</span>
                {selected.includes(option.id) && (
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
