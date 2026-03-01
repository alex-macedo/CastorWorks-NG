import { Input } from '@/components/ui/input';
import { AvatarResolved } from '@/components/ui/AvatarResolved';
import { Badge } from '@/components/ui/badge';
import { useChatConversations } from '@/hooks/clientPortal/useChatConversations';
import { Search, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useLocalization } from '@/contexts/LocalizationContext';

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  mode?: 'portal' | 'app';
}

export function ConversationList({ selectedId, onSelect, mode = 'portal' }: ConversationListProps) {
  const { t } = useLocalization();
  const { conversations, isLoading } = useChatConversations(mode);

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border-r bg-card w-full md:w-80 lg:w-96">
      <div className="p-4 border-b space-y-4">
        <h2 className="font-semibold text-lg">{t("clientPortal.chat.conversations")}</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t("clientPortal.chat.searchMessages")} className="pl-9" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length > 0 ? (
          conversations.map((conv) => {
            // Determine display name/avatar (usually the other participant)
            // For now, using a placeholder logic or the conversation title
            const displayName = conv.title || t("clientPortal.chat.projectChat");
            const lastMessage = conv.lastMessage;
            
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={cn(
                  "w-full flex items-start gap-3 p-4 text-left hover:bg-muted/50 transition-colors border-b",
                  selectedId === conv.id && "bg-muted"
                )}
              >
                <div className="relative">
                  <AvatarResolved
                    src={null}
                    alt={displayName}
                    fallback={displayName.charAt(0).toUpperCase()}
                    className="h-10 w-10"
                  />
                  {/* Online indicator - hardcoded for now */}
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium truncate">{displayName}</span>
                    {lastMessage && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {formatDistanceToNow(new Date(lastMessage.created_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground truncate pr-2">
                      {lastMessage ? lastMessage.text : t("clientPortal.chat.noMessages")}
                    </p>
                    {conv.unreadCount > 0 && (
                      <Badge variant="default" className="h-5 w-5 rounded-full p-0 flex items-center justify-center">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            {t("clientPortal.chat.noConversations")}
          </div>
        )}
      </div>
    </div>
  );
}
