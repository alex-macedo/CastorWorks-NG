import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Calendar, Users, MessageCircle, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useCampaigns, useCampaignRecipients, useCampaignLogs } from '@/hooks/useCampaigns';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useLocalization } from '@/contexts/LocalizationContext';
import type { CampaignStatus, RecipientStatus, LogLevel } from '@/types/campaign.types';
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

const CampaignDetail = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { formatDateTime } = useDateFormat();
  const { t } = useLocalization();
  const { useCampaign, executeCampaign } = useCampaigns();
  const { data: campaign, isLoading: campaignLoading } = useCampaign(campaignId);
  const { recipients, isLoading: recipientsLoading } = useCampaignRecipients(campaignId);
  const { logs, isLoading: logsLoading } = useCampaignLogs(campaignId);

  if (campaignLoading) {
    return <div className="p-8 text-center">{t('campaignDetail.loadingCampaign')}</div>;
  }

  if (!campaign) {
    return <div className="p-8 text-center">{t('campaignDetail.campaignNotFound')}</div>;
  }

  const handleExecute = () => {
    if (!campaignId) return;
    if (!confirm(t('campaignDetail.confirmSend'))) return;

    executeCampaign.mutate({
      campaign_id: campaignId,
      send_now: true,
    });
  };

  const getStatusBadge = (status: CampaignStatus) => {
    const config: Record<CampaignStatus, { variant: any; label: string; icon: any }> = {
      draft: { variant: 'secondary', label: t('campaignDetail.status.draft'), icon: Clock },
      scheduled: { variant: 'default', label: t('campaignDetail.status.scheduled'), icon: Calendar },
      sending: { variant: 'default', label: t('campaignDetail.status.sending'), icon: Send },
      completed: { variant: 'default', label: t('campaignDetail.status.completed'), icon: CheckCircle },
      cancelled: { variant: 'destructive', label: t('campaignDetail.status.cancelled'), icon: XCircle },
      failed: { variant: 'destructive', label: t('campaignDetail.status.failed'), icon: AlertCircle },
    };

    const { variant, label, icon: Icon } = config[status];
    return (
      <Badge variant={variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const getRecipientStatusBadge = (status: RecipientStatus) => {
    const config: Record<RecipientStatus, { variant: any; label: string }> = {
      pending: { variant: 'secondary', label: t('campaignDetail.recipientStatus.pending') },
      personalizing: { variant: 'default', label: t('campaignDetail.recipientStatus.personalizing') },
      sending: { variant: 'default', label: t('campaignDetail.recipientStatus.sending') },
      sent: { variant: 'default', label: t('campaignDetail.recipientStatus.sent') },
      delivered: { variant: 'default', label: t('campaignDetail.recipientStatus.delivered') },
      failed: { variant: 'destructive', label: t('campaignDetail.recipientStatus.failed') },
    };

    const { variant, label } = config[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getLogLevelBadge = (level: LogLevel) => {
    const config: Record<LogLevel, { variant: any }> = {
      info: { variant: 'secondary' },
      success: { variant: 'default' },
      warning: { variant: 'default' },
      error: { variant: 'destructive' },
    };

    return <Badge variant={config[level].variant}>{t(`campaignDetail.logLevel.${level}`)}</Badge>;
  };

  const successRate =
    campaign.total_recipients > 0
      ? Math.round((campaign.messages_delivered / campaign.total_recipients) * 100)
      : 0;

  const sentRate =
    campaign.total_recipients > 0
      ? Math.round((campaign.messages_sent / campaign.total_recipients) * 100)
      : 0;

  const formatDateLocal = (dateString: string | null) => {
    if (!dateString) return t('campaignDetail.never');
    return formatDateTime(dateString);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/campaigns')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('campaignDetail.backToCampaigns')}
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <SidebarHeaderShell>
<div className="space-y-1">
          <h1 className="text-3xl font-bold">{campaign.name}</h1>
          {campaign.description && (
            <p className="text-muted-foreground">{campaign.description}</p>
          )}
          <div className="flex items-center gap-2 pt-2">
            {getStatusBadge(campaign.status)}
            {campaign.include_voice_for_vip && (
              <Badge variant="secondary">{t('campaignDetail.voiceForVip')}</Badge>
            )}
          </div>
        </div>
</SidebarHeaderShell>
        {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
          <Button onClick={handleExecute}>
            <Send className="h-4 w-4 mr-2" />
            {t('campaignDetail.sendCampaignNow')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('campaignDetail.metrics.totalRecipients')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.total_recipients}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('campaignDetail.metrics.messagesSent')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.messages_sent}</div>
            <Progress value={sentRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">{t('campaignDetail.metrics.percentSent', { percent: sentRate })}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('campaignDetail.metrics.delivered')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.messages_delivered}</div>
            <Progress value={successRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">{t('campaignDetail.metrics.percentSuccess', { percent: successRate })}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('campaignDetail.metrics.failed')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {campaign.messages_failed}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="recipients" variant="pill" className="w-full">
        <TabsList>
          <TabsTrigger value="recipients">
            <Users className="h-4 w-4 mr-2" />
            {t('campaignDetail.tabs.recipients')} ({recipients?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="details">
            <MessageCircle className="h-4 w-4 mr-2" />
            {t('campaignDetail.tabs.details')}
          </TabsTrigger>
          <TabsTrigger value="logs">
            <AlertCircle className="h-4 w-4 mr-2" />
            {t('campaignDetail.tabs.logs')} ({logs?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recipients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('campaignDetail.recipients')}</CardTitle>
              <CardDescription>
                {t('campaignDetail.allContactsIncluded')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {recipientsLoading ? (
                <div className="p-8 text-center text-muted-foreground">
                  {t('campaignDetail.loadingRecipients')}
                </div>
              ) : !recipients || recipients.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {t('campaignDetail.noRecipientsFound')}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('campaignDetail.tableHeaders.name')}</TableHead>
                      <TableHead>{t('campaignDetail.tableHeaders.type')}</TableHead>
                      <TableHead>{t('campaignDetail.tableHeaders.phone')}</TableHead>
                      <TableHead>{t('campaignDetail.tableHeaders.status')}</TableHead>
                      <TableHead>{t('campaignDetail.tableHeaders.vip')}</TableHead>
                      <TableHead>{t('campaignDetail.tableHeaders.voice')}</TableHead>
                      <TableHead>{t('campaignDetail.tableHeaders.sentAt')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recipients.map((recipient) => (
                      <TableRow key={recipient.id}>
                        <TableCell className="font-medium">
                          {recipient.contact_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{recipient.contact_type}</Badge>
                        </TableCell>
                        <TableCell>{recipient.contact_phone}</TableCell>
                        <TableCell>{getRecipientStatusBadge(recipient.status)}</TableCell>
                        <TableCell>
                          {recipient.is_vip && (
                            <Badge variant="secondary">{t('campaignDetail.vipBadge')}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {recipient.voice_message_url && (
                            <Badge variant="secondary">{t('campaignDetail.voiceBadge')}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateLocal(recipient.sent_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('campaignDetail.campaignDetails')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    {t('campaignDetail.details.audienceType')}
                  </div>
                  <div className="font-medium capitalize">{campaign.audience_type}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    {t('campaignDetail.details.companyName')}
                  </div>
                  <div className="font-medium">{campaign.company_name || '-'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    {t('campaignDetail.details.scheduledAt')}
                  </div>
                  <div className="font-medium">{formatDateLocal(campaign.scheduled_at)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    {t('campaignDetail.details.startedAt')}
                  </div>
                  <div className="font-medium">{formatDateLocal(campaign.started_at)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    {t('campaignDetail.details.completedAt')}
                  </div>
                  <div className="font-medium">{formatDateLocal(campaign.completed_at)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    {t('campaignDetail.details.voiceMessages')}
                  </div>
                  <div className="font-medium">{campaign.voice_messages_sent}</div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  {t('campaignDetail.details.messageTemplate')}
                </div>
                <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap">
                  {campaign.message_template || t('campaignDetail.details.noTemplate')}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('campaignDetail.campaignLogs')}</CardTitle>
              <CardDescription>{t('campaignDetail.activityHistory')}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {logsLoading ? (
                <div className="p-8 text-center text-muted-foreground">
                  {t('campaignDetail.loadingLogs')}
                </div>
              ) : !logs || logs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {t('campaignDetail.noLogsAvailable')}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('campaignDetail.tableHeaders.time')}</TableHead>
                      <TableHead>{t('campaignDetail.tableHeaders.level')}</TableHead>
                      <TableHead>{t('campaignDetail.tableHeaders.event')}</TableHead>
                      <TableHead>{t('campaignDetail.tableHeaders.message')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateLocal(log.created_at)}
                        </TableCell>
                        <TableCell>{getLogLevelBadge(log.log_level)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.event_type}</Badge>
                        </TableCell>
                        <TableCell>{log.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CampaignDetail;
