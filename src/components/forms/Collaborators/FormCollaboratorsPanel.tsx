import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users } from 'lucide-react';

interface FormCollaboratorsPanelProps {
  formId: string;
}

/**
 * FormCollaboratorsPanel Component
 * 
 * Manages form collaborators:
 * - View current collaborators
 * - Add new collaborators by email
 * - Set permission levels (viewer, editor, admin)
 * - Real-time presence indicators
 * 
 * TODO: Integrate with useFormRealtime for live presence
 * TODO: Add collaborator invitation flow
 * TODO: Add permission level management
 */
export function FormCollaboratorsPanel({ formId }: FormCollaboratorsPanelProps) {
  // TODO: Fetch collaborators from form_collaborators table
  // TODO: Integrate real-time presence from useFormRealtime hook

  return (
    <Card>
      <CardHeader>
        <CardTitle>Collaborators</CardTitle>
        <CardDescription>
          Manage who can view and edit this form
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <div className="text-center space-y-2">
            <Users className="h-12 w-12 mx-auto opacity-50" />
            <p>Collaborator management coming soon</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
