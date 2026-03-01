import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocalization } from "@/contexts/LocalizationContext";
import {
  Bell,
  Archive,
  Trash2,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  CheckCheck,
} from 'lucide-react';
import { useNotifications, type NotificationType } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

const NOTIFICATION_TYPES: Record<string, { icon: string; color: string; labelKey: string }> = {
  financial_alert: { icon: '💰', color: 'text-red-600 bg-red-50', labelKey: 'common.notificationCenter.notificationTypes.financialAlert' },
  project_update: { icon: '📋', color: 'text-blue-600 bg-blue-50', labelKey: 'common.notificationCenter.notificationTypes.projectUpdate' },
  schedule_change: { icon: '📅', color: 'text-yellow-600 bg-yellow-50', labelKey: 'common.notificationCenter.notificationTypes.scheduleChange' },
  material_delivery: { icon: '📦', color: 'text-green-600 bg-green-50', labelKey: 'common.notificationCenter.notificationTypes.materialDelivery' },
  system: { icon: '🔧', color: 'text-blue-600 bg-blue-50', labelKey: 'common.notificationCenter.notificationTypes.system' },
  budget_overrun: { icon: '💸', color: 'text-red-700 bg-red-100', labelKey: 'common.notificationCenter.notificationTypes.budgetOverrun' },
  milestone_delay: { icon: '⏰', color: 'text-orange-600 bg-orange-50', labelKey: 'common.notificationCenter.notificationTypes.milestoneDelay' },
};

function NotificationCenter() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLocalization();
  const {
    notifications,
    markAsRead,
    markAsArchived,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'archived'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all');

  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      // Tab filter
      if (activeTab === 'unread' && (notification.read || notification.archived)) return false;
      if (activeTab === 'archived' && !notification.archived) return false;
      if (activeTab === 'all' && notification.archived) return false;

      // Type filter
      if (typeFilter !== 'all' && notification.type !== typeFilter) return false;

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          notification.title.toLowerCase().includes(searchLower) ||
          notification.message.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [notifications, activeTab, searchTerm, typeFilter]);

  const handleMarkAsRead = (id: string) => {
    markAsRead(id);
    toast({
      title: 'Marked as read',
      description: 'Notification marked as read',
    });
  };

  const handleArchive = (id: string) => {
    markAsArchived(id);
    toast({
      title: 'Archived',
      description: 'Notification moved to archive',
    });
  };

  const handleDelete = (id: string) => {
    deleteNotification(id);
    toast({
      title: 'Deleted',
      description: 'Notification permanently removed',
    });
  };

  const handleBulkAction = (action: 'read' | 'archive' | 'delete') => {
    const selectedIds = filteredNotifications
      .filter(n => !n.archived || action !== 'archive')
      .map(n => n.id);

    if (selectedIds.length === 0) {
      toast({
        title: 'No notifications selected',
        description: 'Please select notifications to perform this action',
        variant: 'destructive',
      });
      return;
    }

    selectedIds.forEach(id => {
      switch (action) {
        case 'read':
          markAsRead(id);
          break;
        case 'archive':
          markAsArchived(id);
          break;
        case 'delete':
          deleteNotification(id);
          break;
      }
    });

    toast({
      title: 'Bulk action completed',
      description: `${selectedIds.length} notifications ${action === 'read' ? 'marked as read' : action === 'archive' ? 'archived' : 'deleted'}`,
    });
  };

  const unreadCount = notifications.filter(n => !n.read && !n.archived).length;
  const archivedCount = notifications.filter(n => n.archived).length;

  return (
    <div className="flex-1 space-y-6">
      <SidebarHeaderShell>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Bell className="h-6 w-6" />
              {t('common.notificationCenter.title')}
            </h1>
            <p className="text-sm text-sidebar-primary-foreground/80">
              {t('common.notificationCenter.subtitle')}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="text-sm">
              {unreadCount} unread
            </Badge>
            <Badge variant="outline" className="text-sm">
              {archivedCount} archived
            </Badge>
          </div>
        </div>
      </SidebarHeaderShell>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder={t("additionalPlaceholders.searchNotifications")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as NotificationType | 'all')}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={t("additionalPlaceholders.filterByType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.notificationCenter.allTypes')}</SelectItem>
                {Object.entries(NOTIFICATION_TYPES).map(([key, type]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <span>{type.icon}</span>
                      {t(type.labelKey)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} variant="pill">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            {t('common.all')} ({notifications.filter(n => !n.archived).length})
          </TabsTrigger>
          <TabsTrigger value="unread" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {t('common.unread')} ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="archived" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            {t('common.archived')} ({archivedCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {/* Bulk Actions */}
          {filteredNotifications.length > 0 && (
            <div className="flex items-center gap-2 mb-4 p-4 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">{t('common.notificationCenter.bulkActions')}</span>
              {activeTab !== 'unread' && (
                <Button variant="outline" size="sm" onClick={() => handleBulkAction('read')}>
                  <CheckCheck className="h-4 w-4 mr-2" />
                  {t('common.notificationCenter.markAsRead')}
                </Button>
              )}
              {activeTab !== 'archived' && (
                <Button variant="outline" size="sm" onClick={() => handleBulkAction('archive')}>
                  <Archive className="h-4 w-4 mr-2" />
                  {t('common.notificationCenter.archive')}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => handleBulkAction('delete')}>
                <Trash2 className="h-4 w-4 mr-2" />
                {t('common.notificationCenter.delete')}
              </Button>
            </div>
          )}

          {/* Notifications List */}
          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('notificationCenter.noNotificationsFound')}</h3>
                <p className="text-muted-foreground text-center">
                  {activeTab === 'unread' && t('common.notificationCenter.allCaughtUp')}
                  {activeTab === 'archived' && t('common.notificationCenter.noArchivedNotifications')}
                  {activeTab === 'all' && t('common.notificationCenter.noNotificationsYet')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => {
                const typeInfo = NOTIFICATION_TYPES[notification.type];
                return (
                  <Card key={notification.id} className={`transition-all hover:shadow-md ${!notification.read ? 'bg-blue-50/30 border-blue-200' : ''}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={`text-2xl ${!notification.read ? 'animate-pulse' : ''}`}>
                          {typeInfo.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-lg">{notification.title}</h3>
                              {!notification.read && (
                                <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0" />
                              )}
                              <Badge variant="outline" className={typeInfo.color}>
                                {t(typeInfo.labelKey)}
                              </Badge>
                              {notification.priority === 'high' && (
                                <Badge variant="destructive" className="text-xs">
                                  {t('common.notificationCenter.highPriority')}
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {!notification.read && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleMarkAsRead(notification.id)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  {t('common.notificationCenter.markRead')}
                                </Button>
                              )}

                              {!notification.archived && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleArchive(notification.id)}
                                >
                                  <Archive className="h-4 w-4 mr-2" />
                                  {t('common.notificationCenter.archive')}
                                </Button>
                              )}

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(notification.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <p className="text-muted-foreground mb-4 leading-relaxed">
                            {notification.message}
                          </p>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                              </span>
                              <span>
                                {format(notification.createdAt, 'MMM dd, yyyy hh:mm a')}
                              </span>
                            </div>

                            {(() => {
                              let targetUrl = notification.actionUrl;

                              // Dynamically generate URL based on notification type and data
                              if (!targetUrl && notification.data) {
                                switch (notification.type) {
                                  case 'budget_overrun':
                                  case 'milestone_delay':
                                  case 'project_update':
                                  case 'schedule_change':
                                  case 'material_delivery':
                                    if (notification.data.projectId) {
                                      targetUrl = `/projects/${notification.data.projectId}`;
                                      if (notification.type === 'budget_overrun') {
                                        targetUrl += '/financial';
                                      } else if (notification.type === 'milestone_delay' || notification.type === 'schedule_change') {
                                        targetUrl += '/schedule';
                                      } else if (notification.type === 'material_delivery') {
                                        targetUrl += '/materials';
                                      }
                                    }
                                    break;
                                  case 'financial_alert':
                                    targetUrl = '/financial';
                                    if (notification.data?.invoiceId) {
                                      targetUrl += `/invoices/${notification.data.invoiceId}`;
                                    }
                                    break;
                                  case 'system':
                                    targetUrl = '/dashboard';
                                    break;
                                }
                              }

                              return targetUrl ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(targetUrl)}
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  {t('common.notificationCenter.viewDetails')}
                                </Button>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default NotificationCenter;
