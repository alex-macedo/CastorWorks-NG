import { useState } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, UserPlus } from 'lucide-react';
import {
  useProjectAccessGrants,
  useGrantProjectAccess,
  useRevokeProjectAccess,
  useGrantableUsers,
  useArchitectOwnedProjects,
} from '@/hooks/useProjectAccessGrants';
import { toast } from 'sonner';

interface GrantAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string; // If provided, pre-select this project
}

export const GrantAccessDialog = ({
  open,
  onOpenChange,
  projectId: initialProjectId,
}: GrantAccessDialogProps) => {
  const { t } = useLocalization();
  const [selectedProject, setSelectedProject] = useState<string>(initialProjectId || '');
  const [selectedUser, setSelectedUser] = useState<string>('');

  const { data: ownedProjects, isLoading: projectsLoading } = useArchitectOwnedProjects();
  const { data: grantableUsers, isLoading: usersLoading } = useGrantableUsers();
  const { data: grants, isLoading: grantsLoading } = useProjectAccessGrants(selectedProject);
  const grantAccess = useGrantProjectAccess();
  const revokeAccess = useRevokeProjectAccess();

  const handleGrant = async () => {
    if (!selectedProject) {
      toast.error('Please select a project');
      return;
    }

    if (!selectedUser) {
      toast.error('Please select a user to grant access to');
      return;
    }

    try {
      await grantAccess.mutateAsync({
        projectId: selectedProject,
        grantedToUserId: selectedUser,
      });
      setSelectedUser(''); // Reset selection after successful grant
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleRevoke = async (grantId: string) => {
    if (confirm('Are you sure you want to revoke access?')) {
      try {
        await revokeAccess.mutateAsync(grantId);
      } catch (error) {
        // Error is handled by the mutation
      }
    }
  };

  const selectedProjectName = ownedProjects?.find(p => p.id === selectedProject)?.name || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Grant Project Access</DialogTitle>
          <DialogDescription>
            Grant administrators or project managers access to your projects. They will be able to view and manage the selected project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Project Selection */}
          <div className="space-y-2">
            <Label htmlFor="project">Select Project *</Label>
            <Select
              value={selectedProject}
              onValueChange={setSelectedProject}
              disabled={projectsLoading}
            >
              <SelectTrigger id="project">
                <SelectValue placeholder="Choose a project you own" />
              </SelectTrigger>
              <SelectContent>
                {projectsLoading ? (
                  <div className="p-2 text-sm text-muted-foreground">Loading projects...</div>
                ) : !ownedProjects || ownedProjects.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    You don't own any projects yet. Create a project first.
                  </div>
                ) : (
                  ownedProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Only projects you own can have access granted
            </p>
          </div>

          {selectedProject && (
            <>
              {/* User Selection */}
              <div className="space-y-2">
                <Label htmlFor="user">Grant Access To *</Label>
                <Select
                  value={selectedUser}
                  onValueChange={setSelectedUser}
                  disabled={usersLoading || grantAccess.isPending}
                >
                  <SelectTrigger id="user">
                    <SelectValue placeholder="Select an administrator or project manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {usersLoading ? (
                      <div className="p-2 text-sm text-muted-foreground">Loading users...</div>
                    ) : !grantableUsers || grantableUsers.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No administrators or project managers found
                      </div>
                    ) : (
                      grantableUsers.map((user) => {
                        // Check if access is already granted
                        const hasAccess = grants?.some(
                          (g: any) => g.granted_to_user_id === user.id
                        );
                        return (
                          <SelectItem
                            key={user.id}
                            value={user.id}
                            disabled={hasAccess}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>
                                {user.display_name} ({user.email})
                              </span>
                              {hasAccess && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  Already granted
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Select an administrator or project manager to grant access to this project
                </p>
              </div>

              {/* Grant Button */}
              <Button
                onClick={handleGrant}
                disabled={!selectedUser || grantAccess.isPending}
                className="w-full"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {grantAccess.isPending ? 'Granting Access...' : 'Grant Access'}
              </Button>

              {/* Current Grants List */}
              <div className="space-y-2 pt-4 border-t">
                <h4 className="font-medium">Current Access Grants</h4>
                {grantsLoading ? (
                  <div className="text-sm text-muted-foreground py-4">Loading grants...</div>
                ) : !grants || grants.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4">
                    No access has been granted yet. Use the form above to grant access.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Roles</TableHead>
                        <TableHead>Granted On</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grants.map((grant: any) => {
                        // Handle both direct user object and nested structure
                        const user = grant.granted_to_user || grant.granted_to_user_id;
                        const userName = typeof user === 'object' 
                          ? (user?.display_name || user?.email)
                          : grant.granted_to_user_id;
                        const userEmail = typeof user === 'object' ? user?.email : null;
                        
                        return (
                          <TableRow key={grant.id}>
                            <TableCell className="font-medium">
                              {userName || 'Unknown User'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {userEmail && (
                                  <Badge variant="outline" className="text-xs">
                                    {userEmail}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {grant.created_at
                                ? new Date(grant.created_at).toLocaleDateString()
                                : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRevoke(grant.id)}
                                disabled={revokeAccess.isPending}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
