import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmailNotificationDialog } from "@/components/Notifications/EmailNotificationDialog";
import { WhatsAppDialog } from "@/components/Notifications/WhatsAppDialog";
import { Mail, MessageCircle, Calendar, Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useDateFormat } from "@/hooks/useDateFormat";
import { AICommunicationAssistant } from "@/components/Notifications/AICommunicationAssistant";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

export default function Notifications() {
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const { t } = useLocalization();
  const { formatDateTime } = useDateFormat();

  const { data: emailNotifications = [] } = useQuery({
    queryKey: ['email-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    }
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      sent: 'default',
      pending: 'secondary',
      failed: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <SidebarHeaderShell>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bell className="h-8 w-8" />
              {t('notifications.title')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t('notifications.subtitle')}
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setEmailDialogOpen(true)}>
              <Mail className="h-4 w-4 mr-2" />
              {t('notifications.sendEmail')}
            </Button>
            <Button onClick={() => setWhatsappDialogOpen(true)} variant="outline">
              <MessageCircle className="h-4 w-4 mr-2" />
              {t('notifications.sendWhatsApp')}
            </Button>
          </div>
        </div>
      </SidebarHeaderShell>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('notifications.totalSent')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {emailNotifications.filter(n => n.status === 'sent').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('notifications.pending')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {emailNotifications.filter(n => n.status === 'pending').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('notifications.failed')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {emailNotifications.filter(n => n.status === 'failed').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('notifications.thisWeek')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {emailNotifications.filter(n => {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return new Date(n.created_at) > weekAgo;
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <AICommunicationAssistant />

      {/* Notifications History */}
      <Tabs defaultValue="email" variant="pill" className="space-y-4">
        <TabsList>
          <TabsTrigger value="email">{t('notifications.tabs.email')}</TabsTrigger>
          <TabsTrigger value="whatsapp">{t('notifications.tabs.whatsapp')}</TabsTrigger>
          <TabsTrigger value="calendar">{t('notifications.tabs.calendar')}</TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('notifications.emailHistory.title')}</CardTitle>
              <CardDescription>{t('notifications.emailHistory.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {emailNotifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {t('notifications.emailHistory.noNotifications')}
                  </p>
                ) : (
                  emailNotifications.map((notification) => (
                    <div key={notification.id} className="flex items-start justify-between border-b pb-4 last:border-0">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{notification.subject}</p>
                          {getStatusBadge(notification.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {t('notifications.emailHistory.to')} {notification.recipient_email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(new Date(notification.created_at))}
                        </p>
                        {notification.error_message && (
                          <p className="text-xs text-red-600">
                            {t('notifications.emailHistory.error')} {notification.error_message}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <CardTitle>{t('notifications.whatsappHistory.title')}</CardTitle>
              <CardDescription>{t('notifications.whatsappHistory.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-8">
                {t('notifications.whatsappHistory.comingSoon')}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle>{t('notifications.calendarHistory.title')}</CardTitle>
              <CardDescription>{t('notifications.calendarHistory.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-8">
                {t('notifications.calendarHistory.comingSoon')}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <EmailNotificationDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
      />
      <WhatsAppDialog
        open={whatsappDialogOpen}
        onOpenChange={setWhatsappDialogOpen}
      />
    </div>
  );
}
