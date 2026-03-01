import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProjectTeamMembers } from '@/hooks/useProjectTeamMembers';
import { useLocalization } from '@/contexts/LocalizationContext';
import { ProjectTeamMember } from '@/types/contacts';
import { Loader2 } from 'lucide-react';

interface EditTeamMemberSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  member: ProjectTeamMember | null;
  onSuccess?: () => void;
}

const roleOptions = [
  { value: 'project_manager', labelKey: 'architect.tasks.roles.projectManager' },
  { value: 'engineer', labelKey: 'architect.tasks.roles.engineer' },
  { value: 'contractor', labelKey: 'architect.tasks.roles.contractor' },
  { value: 'supervisor', labelKey: 'architect.tasks.roles.supervisor' },
  { value: 'inspector', labelKey: 'architect.tasks.roles.inspector' },
  { value: 'team_member', labelKey: 'architect.tasks.roles.teamMember' },
];

export const EditTeamMemberSheet = ({
  open,
  onOpenChange,
  projectId,
  member,
  onSuccess,
}: EditTeamMemberSheetProps) => {
  const { t } = useLocalization();
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [isVisible, setIsVisible] = useState(true);

  const { updateTeamMember } = useProjectTeamMembers(projectId);

  // Initialize form when member changes
  useEffect(() => {
    if (member) {
      setTitle(member.title || '');
      setPhone(member.phone || '');
      setRole(member.role || '');
      setIsVisible(member.is_visible_to_client ?? true);
    }
  }, [member]);

  const handleSubmit = async () => {
    if (!member || !projectId) {
      return;
    }

    try {
      await updateTeamMember.mutateAsync({
        id: member.id,
        title: title || null,
        phone: phone || null,
        role: role,
        is_visible_to_client: isVisible,
      } as any);

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error updating team member:', error);
    }
  };

  const isLoading = updateTeamMember.isPending;

  if (!member) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('architect.tasks.editTeamMember')}</SheetTitle>
          <SheetDescription>
            {t('architect.tasks.editTeamMemberDescription')}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {/* Member Info Display */}
          <div className="p-3 bg-primary/10 rounded-lg">
            <p className="font-medium text-sm">{member.user_name}</p>
            <p className="text-xs text-muted-foreground">{member.email}</p>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role">{t('common.role')} *</Label>
            <Select value={role} onValueChange={setRole} disabled={isLoading}>
              <SelectTrigger id="role">
                <SelectValue placeholder={t('additionalPlaceholders.selectRole')} />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t('common.title')}</Label>
            <Input
              id="title"
              placeholder={t('additionalPlaceholders.jobTitle')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">{t('contacts.phone')}</Label>
            <Input
              id="phone"
              placeholder={t('settings.phonePlaceholder')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Visibility Toggle */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Label htmlFor="visibility" className="cursor-pointer">
              {t('architect.tasks.visibleToClient')}
            </Label>
            <Switch
              id="visibility"
              checked={isVisible}
              onCheckedChange={setIsVisible}
              disabled={isLoading}
            />
          </div>
        </div>

        <SheetFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!role || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('common.saving')}
              </>
            ) : (
              t('common.save')
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
