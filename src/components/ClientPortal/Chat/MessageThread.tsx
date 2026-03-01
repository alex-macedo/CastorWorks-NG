import { useRef, useEffect } from 'react';
import { AvatarResolved } from '@/components/ui/AvatarResolved';
import { useChatMessages } from '@/hooks/clientPortal/useChatMessages';
import { useClientPortalAuth } from '@/hooks/clientPortal/useClientPortalAuth';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Phone, Video, MoreVertical, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import { MessageInput } from './MessageInput';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useLocalization } from "@/contexts/LocalizationContext";
import { useAppProject } from '@/contexts/AppProjectContext';

interface MessageThreadProps {
  conversationId: string;
  mode?: 'portal' | 'app';
}

export function MessageThread({ conversationId, mode = 'portal' }: MessageThreadProps) {
  const { messages, isLoading, error, sendMessage } = useChatMessages(conversationId, mode);
  const portalAuth = useClientPortalAuth();
  const { user: currentUser } = useAuth();
  const appProject = useAppProject();
  const { t } = useLocalization();
  const { clientId } = portalAuth;
  // In app mode, clientId is empty; use currentUser.id for "isMe" check
  const currentUserId = mode === 'app' ? currentUser?.id : clientId;
  const scrollRef = useRef<HTMLDivElement>(null);
  const { formatLongDate } = useDateFormat();

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const formatMessageDate = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return formatLongDate(d);
  };

  // Group messages by date
  const groupedMessages = messages.reduce((acc, msg) => {
    const dateKey = formatMessageDate(msg.created_at);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(msg);
    return acc;
  }, {} as Record<string, typeof messages>);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col gap-4 p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t("clientPortal.chat.errorLoadingMessages") || "Erro ao carregar mensagens. Verifique o console do navegador para mais detalhes."}
          </AlertDescription>
        </Alert>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : String(error)}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-16 border-b flex items-center justify-between px-6 bg-card">
        <div className="flex items-center gap-3">
          <AvatarResolved
            src={null}
            alt="Project Manager"
            fallback="PM"
            className="h-10 w-10"
          />
          <div>
            <h3 className="font-semibold">{t("clientPortal.projectManager")}</h3>
            <p className="text-xs text-muted-foreground">{t("clientPortal.online")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Phone className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon">
            <Video className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-muted/10"
      >
        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date} className="space-y-6">
            <div className="flex items-center justify-center">
              <span className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                {date}
              </span>
            </div>

            {msgs.map((msg) => {
              // Determine if message is from current user
              const isMe = msg.sender_id === 'me' || (currentUserId && msg.sender_id === currentUserId);

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3 max-w-[80%]",
                    isMe ? "ml-auto flex-row-reverse" : ""
                  )}
                >
                  {!isMe && (
                    <AvatarResolved
                      src={msg.sender?.avatar_url}
                      alt={msg.sender?.name || 'User'}
                      fallback={msg.sender?.name?.charAt(0).toUpperCase() || 'U'}
                      className="h-8 w-8 mt-1"
                    />
                  )}

                  <div className={cn("flex flex-col gap-1", isMe ? "items-end" : "items-start")}>
                    <div
                      className={cn(
                        "px-4 py-2 rounded-2xl text-sm",
                        isMe
                          ? "bg-primary text-primary-foreground rounded-tr-none"
                          : "bg-muted rounded-tl-none"
                      )}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-muted-foreground px-1">
                      {format(new Date(msg.created_at), 'h:mm a')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Input Area */}
      <MessageInput onSend={async (text, attachments) => {
        await sendMessage({ text, attachments });
      }} />
    </div>
  );
}
