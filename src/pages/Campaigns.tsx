/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useState } from "react";
import { Plus, Send, Eye, Trash2, PlayCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useCampaigns } from "@/hooks/useCampaigns";
import { CampaignCreateDialog } from "@/components/Campaigns/CampaignCreateDialog";
import type { CampaignStatus } from "@/types/campaign.types";
import { useLocalization } from "@/contexts/LocalizationContext";
import { formatDate } from "@/utils/reportFormatters";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

const Campaigns = () => {
  const navigate = useNavigate();
  const { t, dateFormat } = useLocalization();
  const {
    campaigns,
    isLoading,
    deleteCampaign,
    executeCampaign,
    cancelCampaign,
  } = useCampaigns();

  const [dialogOpen, setDialogOpen] = useState(false);

  const handleViewCampaign = (campaignId: string) => {
    navigate(`/campaigns/${campaignId}`);
  };

  const handleExecuteCampaign = (campaignId: string) => {
    if (!confirm(t('campaigns.confirm.sendNow'))) return;

    executeCampaign.mutate({
      campaign_id: campaignId,
      send_now: true,
    });
  };

  const handleCancelCampaign = (campaignId: string) => {
    if (!confirm(t('campaigns.confirm.cancel'))) return;
    cancelCampaign.mutate(campaignId);
  };

  const handleDeleteCampaign = (campaignId: string) => {
    if (!confirm(t('campaigns.confirm.delete'))) return;
    deleteCampaign.mutate(campaignId);
  };

  const getStatusBadge = (status: CampaignStatus) => {
    const variants: Record<CampaignStatus, { variant: any; label: string }> = {
      draft: { variant: 'secondary', label: t('campaigns.status.draft') },
      scheduled: { variant: 'default', label: t('campaigns.status.scheduled') },
      sending: { variant: 'default', label: t('campaigns.status.sending') },
      completed: { variant: 'default', label: t('campaigns.status.completed') },
      cancelled: { variant: 'destructive', label: t('campaigns.status.cancelled') },
      failed: { variant: 'destructive', label: t('campaigns.status.failed') },
    };

    const config = variants[status];
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const getSuccessRate = (campaign: any) => {
    if (campaign.total_recipients === 0) return 0;
    return Math.round((campaign.messages_delivered / campaign.total_recipients) * 100);
  };

  // formatDate is imported from reportFormatters and uses dateFormat from useLocalization

  return (
    <div className="space-y-6">
      <SidebarHeaderShell variant="auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('campaigns.title')}</h1>
            <p className="text-sm text-sidebar-primary-foreground/80 mt-1">
              {t('campaigns.subtitle')}
            </p>
          </div>
          <Button
            variant="glass-style-white"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('campaigns.new')}
          </Button>
        </div>
      </SidebarHeaderShell>

      {isLoading ? (
        <Card>
          <CardContent className="p-8">
            <EmptyState
              icon={Send}
              title={t('campaigns.loadingTitle')}
              description=""
              primaryAction={{ label: "", onClick: () => {} }}
            />
          </CardContent>
        </Card>
      ) : !campaigns || campaigns.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <EmptyState
              icon={Send}
              title={t('campaigns.emptyTitle')}
              description={t('campaigns.emptyDescription')}
              primaryAction={{
                label: t('campaigns.emptyAction'),
                onClick: () => setDialogOpen(true),
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('campaigns.table.name')}</TableHead>
                  <TableHead>{t('campaigns.table.status')}</TableHead>
                  <TableHead>{t('campaigns.table.recipients')}</TableHead>
                  <TableHead>{t('campaigns.table.sent')}</TableHead>
                  <TableHead>{t('campaigns.table.successRate')}</TableHead>
                  <TableHead>{t('campaigns.table.scheduled')}</TableHead>
                  <TableHead>{t('campaigns.table.created')}</TableHead>
                  <TableHead className="w-48">{t('campaigns.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell
                      className="font-medium"
                      onClick={() => handleViewCampaign(campaign.id)}
                    >
                      <div>
                        <div className="font-semibold">{campaign.name}</div>
                        {campaign.description && (
                          <div className="text-sm text-muted-foreground">
                            {campaign.description.slice(0, 50)}
                            {campaign.description.length > 50 ? '...' : ''}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{campaign.total_recipients}</span>
                        {campaign.voice_messages_sent > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            🎙️ {campaign.voice_messages_sent}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{campaign.messages_sent} {t('campaigns.counts.sent')}</div>
                        {campaign.messages_failed > 0 && (
                          <div className="text-destructive">{campaign.messages_failed} {t('campaigns.counts.failed')}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {campaign.status === 'completed' ? (
                        <span className="font-semibold">{getSuccessRate(campaign)}%</span>
                      ) : (
                        <span className="text-muted-foreground">{t('campaigns.notAvailable')}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {campaign.scheduled_at ? formatDate(campaign.scheduled_at, dateFormat) : t('campaigns.notAvailable')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(campaign.created_at, dateFormat)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewCampaign(campaign.id)}
                          title={t('campaigns.actions.view')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExecuteCampaign(campaign.id)}
                            title={t('campaigns.actions.sendNow')}
                          >
                            <PlayCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}

                        {campaign.status === 'scheduled' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelCampaign(campaign.id)}
                            title={t('campaigns.actions.cancel')}
                          >
                            <XCircle className="h-4 w-4 text-orange-600" />
                          </Button>
                        )}

                        {(campaign.status === 'draft' || campaign.status === 'cancelled') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCampaign(campaign.id)}
                            title={t('campaigns.actions.delete')}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <CampaignCreateDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
};

export default Campaigns;