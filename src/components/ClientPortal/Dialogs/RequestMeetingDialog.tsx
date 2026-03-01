import { useState } from 'react';
import { useParams } from 'react-router-dom';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { CalendarIcon, Clock } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useClientPortalAuth } from '@/hooks/clientPortal/useClientPortalAuth';
import { useCreateMeetingRequest } from '@/hooks/clientPortal/useCreateMeetingRequest';
import { toast } from 'sonner';

interface RequestMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMeetingRequested?: (meetingData: any) => void;
  teamMembers?: Array<{ id: string; name: string; avatar_url?: string }>;
}

export function RequestMeetingDialog({
  open,
  onOpenChange,
  onMeetingRequested,
  teamMembers = [],
}: RequestMeetingDialogProps) {
  const { projectId } = useClientPortalAuth();
  const { t } = useLocalization();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requestedWith: [] as string[],
    allMembers: false,
    date: undefined as Date | undefined,
    time: '10:00',
    duration: '60',
    meetingType: 'virtual' as 'in-person' | 'virtual' | 'hybrid',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mutation = useCreateMeetingRequest();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = t('clientPortal.meetings.dialog.titleRequired');
    }

    if (!formData.date) {
      newErrors.date = t('clientPortal.meetings.dialog.dateRequired');
    }

    if (!formData.allMembers && formData.requestedWith.length === 0) {
      newErrors.requestedWith = t('clientPortal.meetings.dialog.membersRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const meetingDateTime = new Date(formData.date!);
      const [hours, minutes] = formData.time.split(':');
      meetingDateTime.setHours(parseInt(hours), parseInt(minutes));

      const meetingData = {
        title: formData.title,
        description: formData.description,
        meeting_date: meetingDateTime.toISOString(),
        duration: parseInt(formData.duration),
        meeting_type: formData.meetingType,
        requested_with: formData.allMembers
          ? teamMembers.map((m) => m.id)
          : formData.requestedWith,
      };

      const result = await mutation.mutateAsync(meetingData);

      toast.success(t('clientPortal.meetings.dialog.success'));
      onMeetingRequested?.(result || meetingData);
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      requestedWith: [],
      allMembers: false,
      date: undefined,
      time: '10:00',
      duration: '60',
      meetingType: 'virtual',
    });
    setErrors({});
    onOpenChange(false);
  };

  const toggleMember = (memberId: string) => {
    setFormData({
      ...formData,
      requestedWith: formData.requestedWith.includes(memberId)
        ? formData.requestedWith.filter((id) => id !== memberId)
        : [...formData.requestedWith, memberId],
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('clientPortal.meetings.dialog.title')}</SheetTitle>
          <SheetDescription>
            {t('clientPortal.meetings.dialog.description')}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Meeting Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              {t('clientPortal.meetings.dialog.meetingTitleLabel')}
            </Label>
            <Input
              id="title"
              placeholder={t(
                'clientPortal.meetings.dialog.meetingTitlePlaceholder'
              )}
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className={errors.title ? 'border-red-500' : ''}
              disabled={isSubmitting}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              {t('clientPortal.meetings.dialog.descriptionLabel')}
            </Label>
            <Textarea
              id="description"
              placeholder={t(
                'clientPortal.meetings.dialog.descriptionPlaceholder'
              )}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              disabled={isSubmitting}
              className="resize-none"
              rows={2}
            />
          </div>

          {/* Team Members Selection */}
          <div className="space-y-2">
            <Label>{t('clientPortal.meetings.dialog.requestWithLabel')}</Label>

            {/* All Members Checkbox */}
            <div className="flex items-center space-x-2 p-2 border rounded-md">
              <Checkbox
                id="all-members"
                checked={formData.allMembers}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    allMembers: checked as boolean,
                    requestedWith: checked ? [] : formData.requestedWith,
                  })
                }
                disabled={isSubmitting}
              />
              <label
                htmlFor="all-members"
                className="text-sm font-medium cursor-pointer"
              >
                {t('clientPortal.meetings.dialog.allMembers')}
              </label>
            </div>

            {/* Individual Members */}
            {!formData.allMembers && (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center space-x-2 p-2 border rounded-md"
                  >
                    <Checkbox
                      id={`member-${member.id}`}
                      checked={formData.requestedWith.includes(member.id)}
                      onCheckedChange={() => toggleMember(member.id)}
                      disabled={isSubmitting}
                    />
                    <label
                      htmlFor={`member-${member.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {member.name}
                    </label>
                  </div>
                ))}
              </div>
            )}

            {errors.requestedWith && (
              <p className="text-sm text-red-500">{errors.requestedWith}</p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>{t('clientPortal.meetings.dialog.dateLabel')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  disabled={isSubmitting}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date
                    ? format(formData.date, 'MMM d, yyyy')
                    : t('clientPortal.meetings.dialog.datePlaceholder')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => setFormData({ ...formData, date })}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.date && (
              <p className="text-sm text-red-500">{errors.date}</p>
            )}
          </div>

          {/* Time and Duration Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Time */}
            <div className="space-y-2">
              <Label htmlFor="time">{t('clientPortal.meetings.dialog.timeLabel')}</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) =>
                  setFormData({ ...formData, time: e.target.value })
                }
                disabled={isSubmitting}
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">
                {t('clientPortal.meetings.dialog.durationLabel')}
              </Label>
              <Select
                value={formData.duration}
                onValueChange={(value) =>
                  setFormData({ ...formData, duration: value })
                }
                disabled={isSubmitting}
              >
                <SelectTrigger id="duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">
                    {t('clientPortal.meetings.dialog.duration30')}
                  </SelectItem>
                  <SelectItem value="60">
                    {t('clientPortal.meetings.dialog.duration60')}
                  </SelectItem>
                  <SelectItem value="90">
                    {t('clientPortal.meetings.dialog.duration90')}
                  </SelectItem>
                  <SelectItem value="120">
                    {t('clientPortal.meetings.dialog.duration120')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Meeting Type */}
          <div className="space-y-2">
            <Label htmlFor="meeting-type">
              {t('clientPortal.meetings.dialog.meetingTypeLabel')}
            </Label>
            <Select
              value={formData.meetingType}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  meetingType: value as 'in-person' | 'virtual' | 'hybrid',
                })
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="meeting-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="virtual">
                  {t('clientPortal.meetings.dialog.meetingTypeVirtual')}
                </SelectItem>
                <SelectItem value="in-person">
                  {t('clientPortal.meetings.dialog.meetingTypeInPerson')}
                </SelectItem>
                <SelectItem value="hybrid">
                  {t('clientPortal.meetings.dialog.meetingTypeHybrid')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Buttons */}
          <SheetFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {t('clientPortal.meetings.dialog.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? t('clientPortal.meetings.dialog.submitting')
                : t('clientPortal.meetings.dialog.submit')}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
