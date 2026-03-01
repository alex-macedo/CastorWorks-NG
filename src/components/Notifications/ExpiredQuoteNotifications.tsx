import { Bell, Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useExpiredQuoteNotifications } from "@/hooks/useExpiredQuoteNotifications";
import { useLocalization } from "@/contexts/LocalizationContext";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

export function ExpiredQuoteNotifications() {
  const { notifications, unreadCount, isLoading } = useExpiredQuoteNotifications();
  const { t } = useLocalization();
  const navigate = useNavigate();

  const handleNotificationClick = (notification: any) => {
    // Navigate to procurement page
    navigate('/procurement');
  };

  if (isLoading) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">{t("notifications:title") || "Notifications"}</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary">{unreadCount}</Badge>
          )}
        </div>
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">{t("notifications:noNotifications") || "No notifications"}</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {t("notifications:quoteExpired") || "Quote Request Expired"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {notification.request_number} - {notification.supplier_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {notification.project_name}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(notification.response_deadline), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

