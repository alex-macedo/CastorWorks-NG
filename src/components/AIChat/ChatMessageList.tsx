import { useRef, useEffect, useState } from 'react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Bot, User, Copy, Check } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  created_at: string;
}

interface Props {
  messages: Message[];
  onQuickAction?: (action: string) => void;
  isProcessing?: boolean;
}

export const ChatMessageList = ({ messages, onQuickAction, isProcessing }: Props) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { t } = useLocalization();
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const handleCopy = async (message: string, id: string) => {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedId(id);
      toast({
        title: t('ai.assistant.copied') || 'Copied!',
        description: t('ai.assistant.copiedDesc') || 'Message copied to clipboard.',
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast({
        title: t('ai.assistant.copyFailed') || 'Copy failed',
        description: t('ai.assistant.copyFailedDesc') || 'Failed to copy message.',
        variant: 'destructive',
      });
    }
  };

  if (messages.length === 0 && !isProcessing) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center text-muted-foreground">
          <Bot className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="font-medium text-foreground">
            {t('ai.assistant.headline') || 'How can I help you today?'}
          </p>
          <p className="text-sm mt-1 text-muted-foreground">
            {t('ai.assistant.subheadline') || 'I can help you create estimates, search data, and get insights.'}
          </p>
        </div>

        {/* Quick Action Buttons */}
        {onQuickAction && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">
              {t('ai.assistant.tryAsking') || 'Try asking:'}
            </p>
            {[
              t('ai.assistant.prompts.estimate') || 'Create an estimate for a bathroom remodel',
              t('ai.assistant.prompts.recentEstimates') || 'Show me my recent estimates',
              t('ai.assistant.prompts.conversion') || "What's my conversion rate this month?",
              t('ai.assistant.prompts.count') || 'How many estimates do I have?',
            ].map((prompt, index) => (
              <Button
                key={index}
                variant="glass-style-dark"
                size="sm"
                className="w-full text-left justify-start h-auto py-2 px-3 border border-border bg-card hover:bg-accent text-foreground dark:border-slate-700/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:text-slate-100"
                onClick={() => onQuickAction(prompt)}
              >
                <span className="text-xs">{prompt}</span>
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {messages.map(msg => (
        <div
          key={msg.id}
          className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'items-start'}`}
        >
          <Avatar className="h-8 w-8 flex-shrink-0 border border-border dark:border-slate-700/80">
            <AvatarFallback className="bg-card text-foreground dark:bg-slate-800 dark:text-slate-200">
              {msg.role === 'user' ? (
                <User className="h-4 w-4" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-2 max-w-[85%]">
            <div className={`text-[11px] text-muted-foreground ${msg.role === 'user' ? 'text-right' : ''}`}>
              {msg.role === 'user'
                ? t('ai.assistant.you') || 'You'
                : t('navigation.superBot') || 'CastorMind-AI'}
              {' · '}
              {format(new Date(msg.created_at), 'h:mm a')}
            </div>
            <div
              className={`rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-muted text-foreground rounded-2xl rounded-tr-md'
                  : 'bg-card border border-border text-foreground rounded-2xl rounded-tl-md dark:bg-slate-800/75 dark:border-slate-700/80 dark:text-slate-100'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-em:text-muted-foreground prose-li:text-foreground max-w-none">
                  <ReactMarkdown>{msg.message}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm">{msg.message}</p>
              )}
            </div>
            {msg.role === 'assistant' && (
              <Button
                variant="glass-style-dark"
                size="sm"
                className="self-start h-7 px-2.5 text-xs border border-border bg-card hover:bg-accent dark:border-slate-700/80 dark:bg-slate-800/60 dark:hover:bg-slate-800"
                onClick={() => handleCopy(msg.message, msg.id)}
              >
                {copiedId === msg.id ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    {t('ai.assistant.copied') || 'Copied'}
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    {t('ai.assistant.copy') || 'Copy'}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      ))}

      {isProcessing && (
        <div className="flex gap-3 items-start">
          <Avatar className="h-8 w-8 flex-shrink-0 border border-border dark:border-slate-700/80">
            <AvatarFallback className="bg-card text-foreground dark:bg-slate-800 dark:text-slate-200">
              <Bot className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="rounded-2xl rounded-tl-md border border-border bg-card p-3.5 flex items-center gap-1.5 dark:border-slate-700/80 dark:bg-slate-800/75">
            <div className="w-1.5 h-1.5 bg-muted-foreground/70 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-1.5 h-1.5 bg-muted-foreground/70 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-1.5 h-1.5 bg-muted-foreground/70 rounded-full animate-bounce" />
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
};
