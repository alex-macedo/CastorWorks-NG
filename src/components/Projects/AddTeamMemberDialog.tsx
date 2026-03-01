import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useProjectTeamMembers } from '@/hooks/useProjectTeamMembers';
import { useUsers } from '@/hooks/useUsers';
import { useToast } from '@/hooks/use-toast';
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
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const teamMemberSchema = z.object({
  user_id: z.string().min(1, 'Please select a user'),
  role: z.string().min(1, 'Please select a role'),
  phone: z.string().optional(),
});

type TeamMemberFormData = z.infer<typeof teamMemberSchema>;

interface AddTeamMemberDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddTeamMemberDialog = ({
  projectId,
  open,
  onOpenChange,
}: AddTeamMemberDialogProps) => {
  const { t } = useLocalization();
  const { toast } = useToast();
  const { createTeamMember, teamMembers } = useProjectTeamMembers(projectId);
  const { data: users, isLoading: usersLoading } = useUsers();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TeamMemberFormData>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      user_id: '',
      role: '',
      phone: '',
    },
  });

  // Get list of users not already in the team
  const availableUsers = users?.filter(
    (user) => !teamMembers?.some((member) => member.user_id === user.id)
  ) || [];

  const roleOptions = [
    { value: 'project_manager', label: 'Project Manager' },
    { value: 'engineer', label: 'Engineer' },
    { value: 'contractor', label: 'Contractor' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'inspector', label: 'Inspector' },
    { value: 'team_member', label: 'Team Member' },
  ];

  const onSubmit = async (data: TeamMemberFormData) => {
    try {
      setIsSubmitting(true);

      // Get the selected user's details
      const selectedUser = users?.find((u) => u.id === data.user_id);
      if (!selectedUser) {
        toast({
          title: 'Error',
          description: 'User not found',
          variant: 'destructive',
        });
        return;
      }

      // Create the team member
      await createTeamMember.mutateAsync({
        project_id: projectId,
        user_id: data.user_id,
        role: data.role,
        phone: data.phone || null,
        email: selectedUser.email,
        user_name: selectedUser.display_name,
      } as any);

      // Reset form and close dialog
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to add team member:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('projects:addTeamMember') || 'Add Team Member'}</DialogTitle>
          <DialogDescription>
            {t('projects:addTeamMemberDescription') || 'Add a new team member to this project'}
          </DialogDescription>
        </DialogHeader>

        {availableUsers.length === 0 && !usersLoading && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('projects:noAvailableUsers') || 'All users are already team members of this project'}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* User Selection */}
            <FormField
              control={form.control}
              name="user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common.user') || 'User'}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={usersLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={usersLoading ? 'Loading users...' : 'Select a user'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex flex-col">
                            <span>{user.display_name}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                  onOpenChange(false);
                }}
                disabled={isSubmitting}
              >
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || availableUsers.length === 0}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('common.add') || 'Add Member'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
