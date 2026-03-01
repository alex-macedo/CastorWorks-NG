import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Bell, MessageSquare, Mail, Loader2 } from 'lucide-react';

interface ReminderSetting {
  id: string;
  entity_type: 'task' | 'payment';
  reminder_days: number[];
  channels: string[];
  enabled: boolean;
}

export function NotificationReminderSettings() {
  const { t } = useTranslation('notifications');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [taskSettings, setTaskSettings] = useState<ReminderSetting | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<ReminderSetting | null>(null);

  // Fetch reminder settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['notification-reminder-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_reminder_settings')
        .select('*');

      if (error) throw error;
      return data as ReminderSetting[];
    },
  });

  useEffect(() => {
    if (settings) {
      const task = settings.find(s => s.entity_type === 'task');
      const payment = settings.find(s => s.entity_type === 'payment');
      setTaskSettings(task || null);
      setPaymentSettings(payment || null);
    }
  }, [settings]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (updatedSettings: ReminderSetting[]) => {
      const promises = updatedSettings.map(setting => {
        return supabase
          .from('notification_reminder_settings')
          .upsert({
            id: setting.id,
            entity_type: setting.entity_type,
            reminder_days: setting.reminder_days,
            channels: setting.channels,
            enabled: setting.enabled,
          }, {
            onConflict: 'entity_type'
          });
      });

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw errors[0].error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-reminder-settings'] });
      toast({
        title: t('reminderSettings.saveSuccess'),
        variant: 'default',
      });
    },
    onError: (error) => {
      console.error('Error saving settings:', error);
      toast({
        title: t('reminderSettings.saveFailed'),
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    const settingsToSave = [];
    if (taskSettings) settingsToSave.push(taskSettings);
    if (paymentSettings) settingsToSave.push(paymentSettings);
    saveMutation.mutate(settingsToSave);
  };

  const toggleReminderDay = (
    setting: ReminderSetting | null,
    setSetting: (s: ReminderSetting | null) => void,
    day: number
  ) => {
    if (!setting) return;

    const newDays = setting.reminder_days.includes(day)
      ? setting.reminder_days.filter(d => d !== day)
      : [...setting.reminder_days, day].sort((a, b) => b - a);

    setSetting({ ...setting, reminder_days: newDays });
  };

  const toggleChannel = (
    setting: ReminderSetting | null,
    setSetting: (s: ReminderSetting | null) => void,
    channel: string
  ) => {
    if (!setting) return;

    const newChannels = setting.channels.includes(channel)
      ? setting.channels.filter(c => c !== channel)
      : [...setting.channels, channel];

    setSetting({ ...setting, channels: newChannels });
  };

  const toggleEnabled = (
    setting: ReminderSetting | null,
    setSetting: (s: ReminderSetting | null) => void
  ) => {
    if (!setting) return;
    setSetting({ ...setting, enabled: !setting.enabled });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const reminderDayOptions = [7, 3, 1, 0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('reminderSettings.title')}</h2>
        <p className="text-muted-foreground">{t('reminderSettings.description')}</p>
      </div>

      {/* Task Reminders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('reminderSettings.taskReminders')}</CardTitle>
              <CardDescription>
                {t('reminderSettings.reminderDays')}
              </CardDescription>
            </div>
            <Switch
              checked={taskSettings?.enabled ?? false}
              onCheckedChange={() => toggleEnabled(taskSettings, setTaskSettings)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Reminder Days */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              {t('reminderSettings.reminderDays')}
            </Label>
            <div className="flex flex-wrap gap-2">
              {reminderDayOptions.map(day => (
                <Badge
                  key={day}
                  variant={taskSettings?.reminder_days.includes(day) ? 'default' : 'outline'}
                  className="cursor-pointer px-4 py-2"
                  onClick={() => toggleReminderDay(taskSettings, setTaskSettings, day)}
                >
                  {day === 0 ? t('reminderSettings.dueDay', { defaultValue: 'Due Day' }) : `${day} ${t('reminderSettings.daysBefore', { defaultValue: 'days before' })}`}
                </Badge>
              ))}
            </div>
          </div>

          {/* Channels */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              {t('reminderSettings.channels')}
            </Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <span>{t('reminderSettings.bellNotification')}</span>
                </div>
                <Switch
                  checked={taskSettings?.channels.includes('bell') ?? false}
                  onCheckedChange={() => toggleChannel(taskSettings, setTaskSettings, 'bell')}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <span>{t('reminderSettings.whatsappNotification')}</span>
                </div>
                <Switch
                  checked={taskSettings?.channels.includes('whatsapp') ?? false}
                  onCheckedChange={() => toggleChannel(taskSettings, setTaskSettings, 'whatsapp')}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Reminders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('reminderSettings.paymentReminders')}</CardTitle>
              <CardDescription>
                {t('reminderSettings.reminderDays')}
              </CardDescription>
            </div>
            <Switch
              checked={paymentSettings?.enabled ?? false}
              onCheckedChange={() => toggleEnabled(paymentSettings, setPaymentSettings)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Reminder Days */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              {t('reminderSettings.reminderDays')}
            </Label>
            <div className="flex flex-wrap gap-2">
              {reminderDayOptions.map(day => (
                <Badge
                  key={day}
                  variant={paymentSettings?.reminder_days.includes(day) ? 'default' : 'outline'}
                  className="cursor-pointer px-4 py-2"
                  onClick={() => toggleReminderDay(paymentSettings, setPaymentSettings, day)}
                >
                  {day === 0 ? t('reminderSettings.dueDay', { defaultValue: 'Due Day' }) : `${day} ${t('reminderSettings.daysBefore', { defaultValue: 'days before' })}`}
                </Badge>
              ))}
            </div>
          </div>

          {/* Channels */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              {t('reminderSettings.channels')}
            </Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <span>{t('reminderSettings.bellNotification')}</span>
                </div>
                <Switch
                  checked={paymentSettings?.channels.includes('bell') ?? false}
                  onCheckedChange={() => toggleChannel(paymentSettings, setPaymentSettings, 'bell')}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <span>{t('reminderSettings.whatsappNotification')}</span>
                </div>
                <Switch
                  checked={paymentSettings?.channels.includes('whatsapp') ?? false}
                  onCheckedChange={() => toggleChannel(paymentSettings, setPaymentSettings, 'whatsapp')}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('reminderSettings.save')}
        </Button>
      </div>
    </div>
  );
}
