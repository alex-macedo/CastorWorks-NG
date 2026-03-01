import { useCallback } from 'react';
import { 
  Bell, 
  Archive, 
  Trash2, 
  Settings, 
  ExternalLink,
  DollarSign,
  FileText,
  Calendar,
  Package,
  Wrench,
  TrendingDown,
  Clock,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications, type NotificationType } from '@/hooks/useNotifications';
import { useLocalization } from "@/contexts/LocalizationContext";
import { cn } from '@/lib/utils';

const NOTIFICATION_TYPES: Record<string, { 
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  labelKey: string;
}> = {
  financial_alert: {
    icon: DollarSign,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    labelKey: 'notifications.types.financial_alert',
  },
  project_update: {
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    labelKey: 'notifications.types.project_update',
  },
  schedule_change: {
    icon: Calendar,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    labelKey: 'notifications.types.schedule_change',
  },
  material_delivery: {
    icon: Package,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    labelKey: 'notifications.types.material_delivery',
  },
  system: {
    icon: Wrench,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    labelKey: 'notifications.types.system',
  },
  budget_overrun: {
    icon: TrendingDown,
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    labelKey: 'notifications.types.budget_overrun',
  },
  milestone_delay: {
    icon: Clock,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    labelKey: 'notifications.types.milestone_delay',
  },
  task_due: {
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    labelKey: 'notifications.types.task_due',
  },
  task_due_soon: {
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    labelKey: 'notifications.types.task_due_soon',
  },
  payment_due: {
    icon: DollarSign,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    labelKey: 'notifications.types.payment_due',
  },
  payment_due_soon: {
    icon: DollarSign,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    labelKey: 'notifications.types.payment_due_soon',
  },
  chat_message: {
    icon: MessageSquare,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    labelKey: 'notifications.types.chat_message',
  },
};

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const { t } = useLocalization();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    recentNotifications,
    unreadCount,
    markAsRead,
    markAsArchived,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const handleNotificationClick = useCallback((notification: any) => {
    markAsRead(notification.id);

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

    if (targetUrl) {
      navigate(targetUrl);
    } else {
      toast({
        title: notification.title,
        description: notification.message,
      });
    }
  }, [markAsRead, navigate, toast]);

  const handleArchive = useCallback((e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    markAsArchived(notificationId);
    toast({
      title: t('notifications.bell.archived'),
      description: t('notifications.bell.archivedDescription'),
    });
  }, [markAsArchived, toast, t]);

  const handleDelete = useCallback((e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    deleteNotification(notificationId);
    toast({
      title: t('notifications.bell.deleted'),
      description: t('notifications.bell.deletedDescription'),
    });
  }, [deleteNotification, toast, t]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative h-9 w-9 ${className}`}
          aria-label={t("ariaLabels.notifications")}
        >
          <Bell className="h-[1.2rem] w-[1.2rem]" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px] max-h-[600px] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <h3 className="font-semibold text-sm">{t('notifications.bell.title')}</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                markAllAsRead();
              }}
              className="h-7 text-xs font-medium text-primary hover:text-primary"
            >
              {t('notifications.bell.markAllRead')}
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto flex-1">
          {recentNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="rounded-full bg-muted p-3 mb-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                {t('notifications.bell.noNotifications')}
              </p>
              <p className="text-xs text-muted-foreground text-center">
                {t('notifications.bell.noNotificationsDescription')}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {recentNotifications.map((notification) => {
                const typeInfo = NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.system;
                const IconComponent = typeInfo.icon;
                const isUnread = !notification.read;

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors",
                      "hover:bg-muted/50 active:bg-muted",
                      isUnread && "bg-primary/5"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {/* Unread indicator */}
                    {isUnread && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                    )}

                    {/* Icon */}
                    <div className={cn(
                      "flex-shrink-0 rounded-lg p-2",
                      typeInfo.bgColor,
                      isUnread && "ring-2 ring-primary/20"
                    )}>
                      <IconComponent className={cn("h-4 w-4", typeInfo.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="text-sm font-semibold text-foreground truncate">
                              {notification.title}
                            </h4>
                            {isUnread && (
                              <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0 mt-0.5" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {notification.message}
                          </p>
                        </div>

                        {/* Action buttons - always visible but subtle */}
                        <div className="flex items-center gap-0.5 flex-shrink-0 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleArchive(e, notification.id)}
                            className="h-7 w-7 p-0 opacity-60 hover:opacity-100 hover:bg-muted"
                            aria-label={t('notifications.bell.archive')}
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDelete(e, notification.id)}
                            className="h-7 w-7 p-0 text-destructive opacity-60 hover:opacity-100 hover:bg-destructive/10"
                            aria-label={t('notifications.bell.delete')}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Footer with timestamp and badge */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs font-normal h-5 px-2",
                            typeInfo.color,
                            typeInfo.bgColor,
                            "border-transparent"
                          )}
                        >
                          {t(typeInfo.labelKey)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {recentNotifications.length > 0 && (
          <>
            <div className="border-t bg-muted/30">
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer py-2.5"
                onClick={() => navigate('/notifications')}
              >
                <ExternalLink className="h-4 w-4" />
                <span className="text-sm">{t('notifications.bell.viewAll')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer py-2.5"
                onClick={() => navigate('/settings')}
              >
                <Settings className="h-4 w-4" />
                <span className="text-sm">{t('notifications.bell.settings')}</span>
              </DropdownMenuItem>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
