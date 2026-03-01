import { useSprints } from '@/hooks/useSprints';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Download, FileText } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const SprintHistory = () => {
  const { data: sprints, isLoading } = useSprints();
  const [selectedSprint, setSelectedSprint] = useState<any>(null);

  if (isLoading) {
    return <div className="text-muted-foreground">Loading sprint history...</div>;
  }

  const closedSprints = sprints?.filter(s => s.status === 'closed') || [];

  if (closedSprints.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Closed Sprints</CardTitle>
          <CardDescription>Close your first sprint to see release notes here</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const downloadReleaseNotes = (sprint: any) => {
    const blob = new Blob([sprint.release_notes], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sprint-${sprint.sprint_identifier}-release-notes.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="space-y-4">
        {closedSprints.map(sprint => (
          <Card key={sprint.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl">Sprint {sprint.sprint_identifier}</CardTitle>
                    <Badge variant="secondary">Closed</Badge>
                  </div>
                  <CardDescription>{sprint.title}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedSprint(sprint)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Notes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadReleaseNotes(sprint)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">Period</div>
                  <div className="font-medium">
                    {format(new Date(sprint.start_date), 'MMM dd')} - {format(new Date(sprint.end_date), 'MMM dd, yyyy')}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Closed</div>
                  <div className="font-medium">
                    {sprint.closed_at ? format(new Date(sprint.closed_at), 'MMM dd, yyyy') : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Completion</div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="font-medium">
                      {sprint.total_items > 0 
                        ? Math.round((sprint.completed_items / sprint.total_items) * 100) 
                        : 0}%
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Items</div>
                  <div className="font-medium">
                    {sprint.completed_items}/{sprint.total_items}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedSprint} onOpenChange={() => setSelectedSprint(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sprint {selectedSprint?.sprint_identifier} - Release Notes</DialogTitle>
            <DialogDescription>
              {selectedSprint?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm prose-headings:text-card-foreground prose-p:text-card-foreground prose-strong:text-card-foreground prose-em:text-card-foreground prose-li:text-card-foreground dark:prose-invert max-w-none">
            {selectedSprint?.release_notes && (
              <ReactMarkdown>{selectedSprint.release_notes}</ReactMarkdown>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
