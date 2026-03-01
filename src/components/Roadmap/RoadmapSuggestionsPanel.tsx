import { useState } from 'react';
import { Sparkles, Import, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useRoadmapSuggestions, useImportSuggestions, useDeleteSuggestion } from '@/hooks/useRoadmapSuggestions';
import { useLocalization } from '@/contexts/LocalizationContext';
import { cn } from '@/lib/utils';

const CATEGORY_COLORS = {
  feature: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  bug_fix: 'bg-red-500/10 text-red-500 border-red-500/20',
  integration: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  refinement: 'bg-green-500/10 text-green-500 border-green-500/20',
};

const EFFORT_COLORS = {
  small: 'bg-green-500/10 text-green-500',
  medium: 'bg-yellow-500/10 text-yellow-500',
  large: 'bg-orange-500/10 text-orange-500',
  xlarge: 'bg-red-500/10 text-red-500',
};

export function RoadmapSuggestionsPanel() {
  const { t } = useLocalization();
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const { suggestions, isLoading } = useRoadmapSuggestions();
  const importSuggestions = useImportSuggestions();
  const deleteSuggestion = useDeleteSuggestion();

  if (isLoading || !suggestions || suggestions.length === 0) {
    return null;
  }

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === suggestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(suggestions.map(s => s.id)));
    }
  };

  const handleImport = async () => {
    if (selectedIds.size === 0) return;
    await importSuggestions.mutateAsync(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleDelete = async (id: string) => {
    await deleteSuggestion.mutateAsync(id);
    const newSelected = new Set(selectedIds);
    newSelected.delete(id);
    setSelectedIds(newSelected);
  };

  return (
    <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">
              AI Feature Suggestions
            </h3>
            <Badge variant="secondary">{suggestions.length}</Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Content */}
        {isExpanded && (
          <>
            <p className="text-sm text-muted-foreground">
              Select suggestions to import into your roadmap as Backlog items
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedIds.size === suggestions.length ? 'Deselect All' : 'Select All'}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleImport}
                disabled={selectedIds.size === 0 || importSuggestions.isPending}
              >
                <Import className="h-4 w-4 mr-2" />
                Import {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
              </Button>
            </div>

            {/* Suggestions List */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {suggestions.map((suggestion) => (
                <Card
                  key={suggestion.id}
                  className={cn(
                    "p-3 transition-all hover:shadow-md",
                    selectedIds.has(suggestion.id) && "ring-2 ring-primary"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedIds.has(suggestion.id)}
                      onCheckedChange={() => handleToggleSelect(suggestion.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-sm">{suggestion.title}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(suggestion.id)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {suggestion.description}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={CATEGORY_COLORS[suggestion.category as keyof typeof CATEGORY_COLORS]}
                        >
                          {suggestion.category}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={EFFORT_COLORS[suggestion.estimated_effort as keyof typeof EFFORT_COLORS]}
                        >
                          {suggestion.estimated_effort}
                        </Badge>
                        <Badge variant="outline">
                          {suggestion.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
