/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useArchitectMeetings } from '@/hooks/useArchitectMeetings';
import { useProjects } from '@/hooks/useProjects';
import { useClients } from '@/hooks/useClients';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { MeetingFormDialogProps } from './types';
import { useState, useEffect, useMemo } from 'react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Plus, X } from 'lucide-react';

const meetingSchema = z.object({
  project_id: z.string().optional(),
  client_id: z.string().optional(),
  title: z.string().optional(),
  meeting_date: z.string().min(1, 'Meeting date is required'),
  meeting_link: z.union([z.string().url('Please enter a valid URL'), z.literal('')]).optional(),
  agenda: z.string().optional(),
  decisions: z.string().optional(),
  next_actions: z.string().optional(),
});

type MeetingFormData = z.infer<typeof meetingSchema>;

interface MeetingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting?: any;
  projectId?: string;
  mode?: 'create' | 'edit' | 'view';
}

export const MeetingFormDialog = ({
  open,
  onOpenChange,
  meeting,
  projectId,
}: MeetingFormDialogProps) => {
  const [currentMode, setCurrentMode] = useState<'create' | 'edit' | 'view'>(() =>
    !meeting ? 'create' : (meeting.mode === 'edit' ? 'edit' : 'view')
  );

  const actualMode = currentMode;
  const { t } = useLocalization();
  const { saveMeeting, deleteMeeting } = useArchitectMeetings(projectId);
  const { projects } = useProjects();
  const { clients } = useClients();
  const { data: userRoles } = useUserRoles();
  const userRoleNames = userRoles?.map(r => r.role) || [];
  const isAdmin = userRoleNames.includes('admin');

  // Check if Join Meeting button should be enabled based on meeting time
  const canJoinMeeting = (() => {
    if (!meeting?.meeting_date) return false;

    const meetingStart = new Date(meeting.meeting_date);
    const now = new Date();

    // Meeting is available 15 minutes before and during the meeting
    const fifteenMinutesBefore = new Date(meetingStart.getTime() - 15 * 60 * 1000);

    // Assume meeting lasts 1 hour by default (can be extended later if we add end_time)
    const meetingEnd = new Date(meetingStart.getTime() + 60 * 60 * 1000);

    return now >= fifteenMinutesBefore && now <= meetingEnd;
  })();

  const form = useForm<MeetingFormData>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      project_id: '',
      client_id: '',
      title: '',
      meeting_date: '',
      meeting_link: '',
      agenda: '',
      decisions: '',
      next_actions: '',
    },
  });

  const [participants, setParticipants] = useState<Array<{ name: string; role: string }>>(
    (meeting?.participants as any) || []
  );

  // Reset form and participants when meeting changes
  useEffect(() => {
    if (meeting) {
      setCurrentMode(meeting.mode === 'edit' ? 'edit' : 'view');
      setParticipants((meeting?.participants as any) || []);

      form.reset({
        project_id: meeting?.project_id || projectId || '',
        client_id: meeting?.client_id || '',
        title: meeting?.title || '',
        meeting_date: meeting?.meeting_date ? new Date(meeting.meeting_date).toISOString().slice(0, 16) : '',
        meeting_link: meeting?.meeting_link || '',
        agenda: meeting?.agenda || '',
        decisions: meeting?.decisions || '',
        next_actions: meeting?.next_actions || '',
      });
    } else {
      setCurrentMode('create');
      setParticipants([]);

      form.reset({
        project_id: projectId || '',
        client_id: '',
        title: '',
        meeting_date: '',
        meeting_link: '',
        agenda: '',
        decisions: '',
        next_actions: '',
      });
    }
  }, [meeting, projectId, form]);

  const onSubmit = async (data: MeetingFormData) => {
    if (actualMode === 'view') return;
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const meetingData = {
        ...data,
        meeting_date: new Date(data.meeting_date).toISOString(),
        meeting_link: data.meeting_link && data.meeting_link.trim() !== '' ? data.meeting_link.trim() : null,
        participants: participants as any,
        created_by: user?.id || null,
      };

      if (meeting) {
        meetingData.id = meeting.id;
      }

      await saveMeeting.mutateAsync(meetingData);
      onOpenChange(false);
      form.reset();
      setParticipants([]);
    } catch (error) {
      console.error('Error saving meeting:', error);
    }
  };

  const addParticipant = () => {
    setParticipants([...participants, { name: '', role: '' }]);
  };

  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const updateParticipant = (index: number, field: string, value: string) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], [field]: value };
    setParticipants(updated);
  };

  const handleDelete = async () => {
    if (meeting && confirm(t('architect.common.confirmDelete'))) {
      try {
        await deleteMeeting.mutateAsync(meeting.id);
        onOpenChange(false);
      } catch (error) {
        console.error('Error deleting meeting:', error);
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader className="text-right">
          <SheetTitle className="text-right">
            {meeting ? t('architect.meetings.edit') : t('architect.meetings.new')}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} onKeyDown={(e) => {
              if (e.key === 'Enter' && actualMode === 'view') {
                e.preventDefault();
              }
            }} className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Section 1: Meeting Details */}
                <div className="space-y-6">
                  <div className="border-b pb-2">
                    <h3 className="text-lg font-semibold text-right">{t('architect.meetings.meetingDetails')}</h3>
                  </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="project_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-right">{t('architect.meetings.project')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={actualMode === 'view'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('common.select')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {projects?.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="client_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-right">{t('architect.meetings.client')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={actualMode === 'view'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('common.select')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clients?.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-right">{t('architect.meetings.title')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('architect.meetings.titlePlaceholder')}
                          {...field}
                          disabled={actualMode === 'view'}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="meeting_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-right">{t('architect.meetings.meetingDate')}</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} disabled={actualMode === 'view'} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Participants */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-right">{t('architect.meetings.participants')}</FormLabel>
                    {actualMode !== 'view' && (
                      <Button type="button" size="sm" variant="outline" onClick={addParticipant}>
                        <Plus className="h-4 w-4 mr-1" />
                        {t('architect.meetings.addParticipant')}
                      </Button>
                    )}
                  </div>

                  {participants.map((participant, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder={t('architect.meetings.participantName')}
                        value={participant.name}
                        onChange={(e) => updateParticipant(index, 'name', e.target.value)}
                        disabled={actualMode === 'view'}
                      />
                      <Input
                        placeholder={t('architect.meetings.participantRole')}
                        value={participant.role}
                        onChange={(e) => updateParticipant(index, 'role', e.target.value)}
                        disabled={actualMode === 'view'}
                      />
                      {actualMode !== 'view' && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeParticipant(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <FormField
                  control={form.control}
                  name="agenda"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-right">{t('architect.meetings.agenda')}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={t('architect.meetings.agendaPlaceholder')}
                          rows={4}
                          disabled={actualMode === 'view'}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="meeting_link"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-right">{t('architect.meetings.meetingLink')}</FormLabel>
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Input
                              type="url"
                              placeholder={t("additionalPlaceholders.zoomGoogleMeetTeamsUrl")}
                              {...field}
                              disabled={actualMode === 'view'}
                              className="flex-1"
                            />
                          </FormControl>
                          {actualMode !== 'create' && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                const link = form.getValues('meeting_link');
                                if (link) {
                                  window.open(link, '_blank', 'noopener,noreferrer');
                                }
                              }}
                              disabled={!form.getValues('meeting_link') || !canJoinMeeting}
                            >
                              {t('architect.meetings.join')}
                            </Button>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Section 2: Meeting Outcomes */}
              <div className="space-y-6">
                <div className="border-b pb-2">
                  <h3 className="text-lg font-semibold text-right">{t('architect.meetings.meetingOutcomes')}</h3>
                </div>

                {/* Decisions and Next Actions - Only show for existing meetings */}
                {meeting && (
                  <>
                    <FormField
                      control={form.control}
                      name="decisions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-right">{t('architect.meetings.decisions')}</FormLabel>
                          <FormControl>
                            <RichTextEditor
                              value={field.value || ''}
                              onChange={field.onChange}
                              placeholder={t('architect.meetings.decisionsPlaceholder')}
                              height="min-h-[288px]"
                              disabled={actualMode === 'view'}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="next_actions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-right">{t('architect.meetings.nextActions')}</FormLabel>
                          <FormControl>
                            <RichTextEditor
                              value={field.value || ''}
                              onChange={field.onChange}
                              placeholder={t('architect.meetings.nextActionsPlaceholder')}
                              height="min-h-[320px]"
                              disabled={actualMode === 'view'}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div>
                  {meeting && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={!isAdmin}
                    >
                      {t('common.delete')}
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    {actualMode === 'view' ? t('common.close') : t('common.cancel')}
                  </Button>
                  {actualMode === 'view' ? (
                    <Button type="button" onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCurrentMode('edit');
                    }}>
                      {t('common.edit')}
                    </Button>
                  ) : (
                    <Button type="submit">
                      {t('common.save')}
                    </Button>
                  )}
                </div>
              </div>
          </form>
        </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
};
