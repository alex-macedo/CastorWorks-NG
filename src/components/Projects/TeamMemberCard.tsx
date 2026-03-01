import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useProjectTeamMembers } from '@/hooks/useProjectTeamMembers';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Loader2, Trash2, Edit2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const editTeamMemberSchema = z.object({
  role: z.string().min(1, 'Please select a role'),
  phone: z.string().optional(),
});

type EditTeamMemberFormData = z.infer<typeof editTeamMemberSchema>;

interface TeamMember {
  id: string;
  user_id: string;
  project_id: string;
  user_name: string;
  email: string;
  phone?: string;
  role: string;
}

interface TeamMemberCardProps {
  member: TeamMember;
  projectId: string;
  accordionState: 'expanded' | 'collapsed';
}

const roleOptions = [
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'inspector', label: 'Inspector' },
  { value: 'team_member', label: 'Team Member' },
];

export const TeamMemberCard = ({
  member,
  projectId,
  accordionState,
}: TeamMemberCardProps) => {
  const { t } = useLocalization();
  const { updateTeamMember, deleteTeamMember } = useProjectTeamMembers(projectId);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<EditTeamMemberFormData>({
    resolver: zodResolver(editTeamMemberSchema),
    defaultValues: {
      role: member.role,
      phone: member.phone || '',
    },
  });

  const onEditSubmit = async (data: EditTeamMemberFormData) => {
    try {
      setIsUpdating(true);
      await updateTeamMember.mutateAsync({
        id: member.id,
        role: data.role,
        phone: data.phone || null,
      } as any);
      setEditOpen(false);
      form.reset();
    } catch (error) {
      console.error('Failed to update team member:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const onDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteTeamMember.mutateAsync(member.id);
      setDeleteOpen(false);
    } catch (error) {
      console.error('Failed to delete team member:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <details
        className="p-4 rounded-lg border bg-card/60"
        open={accordionState === 'expanded'}
      >
        <summary className="flex items-center gap-4 cursor-pointer">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-white font-bold text-lg">
            {member.user_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{member.user_name || 'Unknown'}</h3>
            <p className="text-sm text-muted-foreground">{member.role}</p>
          </div>
          <div className="flex gap-2" onClick={(e) => e.preventDefault()}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditOpen(true)}
              title={t('common.edit') || 'Edit'}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              className="text-destructive hover:text-destructive"
              title={t('common.delete') || 'Delete'}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </summary>
        <div className="mt-2 text-sm text-muted-foreground space-y-1">
          {member.email && <p>{member.email}</p>}
          {member.phone && <p>{member.phone}</p>}
        </div>
      </details>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t('projects:editTeamMember') || 'Edit Team Member'}</DialogTitle>
            <DialogDescription>
              {t('projects:editTeamMemberDescription') || 'Update the role and contact information'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
              {/* Member Info Display */}
              <div className="bg-muted p-3 rounded-lg">
                <p className="font-semibold">{member.user_name}</p>
                <p className="text-sm text-muted-foreground">{member.email}</p>
              </div>

              {/* Role Selection */}
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.role') || 'Role'}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("additionalPlaceholders.selectRole")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roleOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Phone Number (Optional) */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.phone') || 'Phone'} (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("additionalPlaceholders.enterPhoneNumber")} type="tel" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset();
                    setEditOpen(false);
                  }}
                  disabled={isUpdating}
                >
                  {t('common.cancel') || 'Cancel'}
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('common.save') || 'Save'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('projects:removeTeamMember') || 'Remove Team Member'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('projects:removeTeamMemberWarning') ||
                `Are you sure you want to remove ${member.user_name} from this project? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-destructive/10 border border-destructive/20 rounded p-3 mb-4">
            <p className="text-sm font-medium">{member.user_name}</p>
            <p className="text-xs text-muted-foreground">{member.email}</p>
          </div>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel disabled={isDeleting}>
              {t('common.cancel') || 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.remove') || 'Remove'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
