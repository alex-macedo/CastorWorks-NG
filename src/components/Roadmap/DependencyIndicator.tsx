import { Link2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useLocalization } from '@/contexts/LocalizationContext';
import type { RoadmapItem } from '@/hooks/useRoadmapItems';

interface DependencyIndicatorProps {
  dependencies: string[];
  allItems: RoadmapItem[];
}

export function DependencyIndicator({ dependencies, allItems }: DependencyIndicatorProps) {
  const { t } = useLocalization();
  if (!dependencies || dependencies.length === 0) return null;

  const parsedDeps = typeof dependencies === 'string' 
    ? JSON.parse(dependencies) 
    : dependencies;

  if (!Array.isArray(parsedDeps) || parsedDeps.length === 0) return null;

  const dependencyItems = allItems.filter((item) => parsedDeps.includes(item.id));
  const incompleteDeps = dependencyItems.filter((item) => item.status !== 'done');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className="gap-1 text-xs"
          >
            {incompleteDeps.length > 0 ? (
              <AlertCircle className="h-3 w-3 text-warning" />
            ) : (
              <Link2 className="h-3 w-3" />
            )}
            {parsedDeps.length}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <div className="space-y-1">
            <p className="font-semibold text-xs">Dependencies:</p>
            {dependencyItems.length > 0 ? (
              dependencyItems.map((dep) => (
                <div key={dep.id} className="flex items-center gap-2 text-xs">
                  <Badge 
                    variant={dep.status === 'done' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {dep.status}
                  </Badge>
                  <span>{dep.title}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">{t("messages.someDependenciesDeleted")}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
