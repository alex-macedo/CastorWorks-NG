import { useEpicDocumentation } from "@/hooks/useEpicDocumentation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

interface EpicDocumentationViewerProps {
  epicNumber: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EpicDocumentationViewer({
  epicNumber,
  open,
  onOpenChange,
}: EpicDocumentationViewerProps) {
  const { documentation, isLoading, error } = useEpicDocumentation(epicNumber);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isLoading ? (
              <Skeleton className="h-8 w-96" />
            ) : (
              documentation?.title || `Epic ${epicNumber}`
            )}
          </DialogTitle>
          {!isLoading && documentation && (
            <DialogDescription className="flex items-center gap-2 flex-wrap mt-2">
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {documentation.summary.totalStories} Stories
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {documentation.summary.estimatedEffort}
              </Badge>
            </DialogDescription>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          )}

          {!isLoading && !error && documentation && (
            <div className="space-y-6">
              {/* Expanded Goal */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Expanded Goal</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {documentation.expandedGoal}
                </p>
              </div>

              <Separator />

              {/* Value Delivered */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Value Delivered</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {documentation.summary.valueDelivered}
                </p>
              </div>

              <Separator />

              {/* Stories */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Stories</h3>
                <div className="space-y-6">
                  {documentation.stories.map((story) => (
                    <div
                      key={story.number}
                      className="border rounded-lg p-4 bg-card hover:bg-primary/5 transition-colors"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <Badge variant="secondary" className="mt-0.5">
                          Story {story.number}
                        </Badge>
                        <div className="flex-1">
                          <h4 className="font-semibold text-base mb-2">
                            {story.title}
                          </h4>
                          <p className="text-sm text-muted-foreground italic">
                            {story.userStory}
                          </p>
                        </div>
                      </div>

                      {/* Acceptance Criteria */}
                      <div className="mt-3">
                        <p className="text-sm font-medium mb-2">
                          Acceptance Criteria:
                        </p>
                        <ul className="space-y-1.5 ml-4">
                          {story.acceptanceCriteria.map((criteria, idx) => (
                            <li
                              key={idx}
                              className="text-sm text-muted-foreground list-disc"
                            >
                              {criteria}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Prerequisites */}
                      <div className="mt-3 flex items-start gap-2 text-sm">
                        <span className="font-medium text-muted-foreground">
                          Prerequisites:
                        </span>
                        <span className="text-muted-foreground">
                          {story.prerequisites}
                        </span>
                      </div>

                      {/* Estimated Effort (if available) */}
                      {story.estimatedEffort && (
                        <div className="mt-2 flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {story.estimatedEffort}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
