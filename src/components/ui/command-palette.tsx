import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Home,
  Building2,
  DollarSign,
  ShoppingCart,
  Users,
  Settings,
  Cloud,
  Sparkles,
  FileText,
  Package,
  Plus,
  Calendar,
  BarChart3,
  FolderKanban
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useHasRole } from "@/hooks/useUserRoles";

export interface Command {
  id: string;
  label: string;
  keywords?: string[];
  icon?: React.ComponentType<{ className?: string }>;
  action: () => void;
  category: 'navigation' | 'actions' | 'search';
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { t } = useLocalization();
  const isClient = useHasRole('client');
  const isGlobalAdmin = useHasRole('global_admin');

  const commands: Command[] = React.useMemo(() => [
    // Navigation Commands
    {
      id: 'nav-dashboard',
      label: t('navigation.dashboard') || 'Dashboard',
      keywords: ['home', 'overview'],
      icon: Home,
      action: () => {
        navigate('/');
        onOpenChange(false);
      },
      category: 'navigation',
    },
    {
      id: 'nav-projects',
      label: t('navigation.projects') || 'Projects',
      keywords: ['obras', 'construction'],
      icon: Building2,
      action: () => {
        navigate('/projects');
        onOpenChange(false);
      },
      category: 'navigation',
    },
    {
      id: 'nav-financial',
      label: t('navigation.financial') || 'Financial',
      keywords: ['money', 'finance', 'accounting'],
      icon: DollarSign,
      action: () => {
        navigate('/financial');
        onOpenChange(false);
      },
      category: 'navigation',
    },
    {
      id: 'nav-procurement',
      label: t('navigation.procurement') || 'Procurement',
      keywords: ['purchases', 'suppliers', 'quotes'],
      icon: ShoppingCart,
      action: () => {
        navigate('/procurement');
        onOpenChange(false);
      },
      category: 'navigation',
    },
    {
      id: 'nav-clients',
      label: t('navigation.clients') || 'Clients',
      keywords: ['customers', 'clientes'],
      icon: Users,
      action: () => {
        navigate('/clients');
        onOpenChange(false);
      },
      category: 'navigation',
    },
    {
      id: 'nav-weather',
      label: t('navigation.weather') || 'Weather',
      keywords: ['clima', 'forecast'],
      icon: Cloud,
      action: () => {
        navigate('/weather');
        onOpenChange(false);
      },
      category: 'navigation',
    },
    {
      id: 'nav-ai-insights',
      label: t('navigation.aiInsights') || 'AI Insights',
      keywords: ['artificial intelligence', 'analytics', 'predictions'],
      icon: Sparkles,
      action: () => {
        navigate('/ai-insights');
        onOpenChange(false);
      },
      category: 'navigation',
    },
    {
      id: 'nav-reports',
      label: t('navigation.reports') || 'Reports',
      keywords: ['analytics', 'data'],
      icon: BarChart3,
      action: () => {
        navigate('/reports');
        onOpenChange(false);
      },
      category: 'navigation',
    },
    ...(isGlobalAdmin
      ? [{
          id: 'nav-roadmap',
          label: t('navigation.roadmap') || 'Roadmap',
          keywords: ['timeline', 'schedule', 'gantt'],
          icon: Calendar,
          action: () => {
            navigate('/roadmap');
            onOpenChange(false);
          },
          category: 'navigation' as const,
        }]
      : []),
    {
      id: 'nav-materials',
      label: t('navigation.materials') || 'Materials & Labor',
      keywords: ['inventory', 'labour', 'labor'],
      icon: Package,
      action: () => {
        navigate('/materials-labor');
        onOpenChange(false);
      },
      category: 'navigation',
    },
    {
      id: 'nav-estimates',
      label: t('navigation.estimates') || 'Estimates',
      keywords: ['quotes', 'proposals'],
      icon: FileText,
      action: () => {
        navigate('/estimates');
        onOpenChange(false);
      },
      category: 'navigation',
    },
    {
      id: 'nav-settings',
      label: t('navigation.settings') || 'Settings',
      keywords: ['preferences', 'config'],
      icon: Settings,
      action: () => {
        navigate('/settings');
        onOpenChange(false);
      },
      category: 'navigation',
    },

    // Action Commands
    {
      id: 'action-new-project',
      label: t('projects:newProject') || 'New Project',
      keywords: ['create project', 'add project'],
      icon: Plus,
      action: () => {
        navigate('/projects', { state: { openNewProjectSheet: true } });
        onOpenChange(false);
      },
      category: 'actions',
    },
    {
      id: 'action-new-purchase-request',
      label: t('procurement.newRequest') || 'New Purchase Request',
      keywords: ['create request', 'add purchase'],
      icon: Plus,
      action: () => {
        navigate('/procurement/new');
        onOpenChange(false);
      },
      category: 'actions',
    },
    {
      id: 'action-new-estimate',
      label: 'New Estimate',
      keywords: ['create estimate', 'add estimate'],
      icon: Plus,
      action: () => {
        navigate('/estimates/wizard');
        onOpenChange(false);
      },
      category: 'actions',
    },
  ].filter(cmd => {
    if (isClient && cmd.category === 'actions') {
      return false;
    }
    return true;
  }), [navigate, onOpenChange, t, isClient, isGlobalAdmin]);

  const navigationCommands = commands.filter(cmd => cmd.category === 'navigation');
  const actionCommands = commands.filter(cmd => cmd.category === 'actions');

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t("additionalPlaceholders.typeCommandSearch")} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {navigationCommands.map((command) => {
            const Icon = command.icon;
            return (
              <CommandItem
                key={command.id}
                value={`${command.label} ${command.keywords?.join(' ')}`}
                onSelect={() => command.action()}
              >
                {Icon && <Icon className="mr-2 h-4 w-4" />}
                <span>{command.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          {actionCommands.map((command) => {
            const Icon = command.icon;
            return (
              <CommandItem
                key={command.id}
                value={`${command.label} ${command.keywords?.join(' ')}`}
                onSelect={() => command.action()}
              >
                {Icon && <Icon className="mr-2 h-4 w-4" />}
                <span>{command.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

/**
 * Hook to manage command palette state and keyboard shortcuts
 */
export function useCommandPalette() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return { open, setOpen };
}
