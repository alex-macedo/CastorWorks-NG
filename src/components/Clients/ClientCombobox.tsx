import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useClients } from "@/hooks/useClients";
import { ClientForm } from "./ClientForm";
import { useLocalization } from "@/contexts/LocalizationContext";

interface ClientComboboxProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ClientCombobox({
  value,
  onValueChange,
  placeholder,
  disabled = false,
  className,
}: ClientComboboxProps) {
  const { t } = useLocalization();
  const [open, setOpen] = useState(false);
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const { clients, isLoading } = useClients();

  const selectedClient = clients?.find((client) => client.id === value);

  const handleCreateNew = () => {
    setOpen(false);
    setShowNewClientDialog(true);
  };

  const handleClientCreated = () => {
    setShowNewClientDialog(false);
    // The new client will be automatically available in the list after creation
    // due to the query invalidation in useClients
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between", className)}
            disabled={disabled || isLoading}
          >
            {selectedClient?.name || placeholder || t('clients.selectClient')}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder={t('clients.searchClients')}
              className="h-9"
            />
            <CommandList>
              <CommandEmpty>{t('clients.noClientsFound')}</CommandEmpty>
              <CommandGroup>
                {clients?.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={`${client.name} ${client.id}`}
                    onSelect={() => {
                      onValueChange(client.id === value ? "" : client.id);
                      setOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {client.avatar_initial && (
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                          {client.avatar_initial}
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="font-medium">{client.name}</span>
                        {client.email && (
                          <span className="text-xs text-muted-foreground">
                            {client.email}
                          </span>
                        )}
                      </div>
                    </div>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        value === client.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem onSelect={handleCreateNew} className="text-primary">
                  <Plus className="mr-2 h-4 w-4" />
                  {t('clients.createNewClient')}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <ClientForm
        open={showNewClientDialog}
        onOpenChange={(open) => {
          setShowNewClientDialog(open);
          if (!open) {
            handleClientCreated();
          }
        }}
      />
    </>
  );
}
