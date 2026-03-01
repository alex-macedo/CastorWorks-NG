import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MessageSquare, X, Minimize2, Trash2 } from 'lucide-react';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import { useChatAssistant } from '@/hooks/useChatAssistant';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useToast } from '@/hooks/use-toast';

interface ChatWidgetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ChatWidget = ({ isOpen, onOpenChange }: ChatWidgetProps) => {
  const { messages, sendMessage, isProcessing, clearHistory } = useChatAssistant();
  const { t } = useLocalization();
  const { toast } = useToast();

  const handleQuickAction = (action: string) => {
    sendMessage(action);
  };

  const handleClearHistory = () => {
    clearHistory();
    toast({
      title: t('ai.assistant.historyCleared') || 'Conversation cleared',
      description: t('ai.assistant.historyClearedDesc') || 'Your chat history has been cleared.',
    });
  };

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-0 left-0 sm:bottom-6 sm:left-6 w-full sm:w-96 h-full sm:h-[600px] z-50">
          <Card className="h-full flex flex-col shadow-2xl rounded-none sm:rounded-lg">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">
                  {t('ai.assistant.title') || 'AI Assistant'}
                </h3>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="glass-style-dark"
                  size="icon"
                  onClick={handleClearHistory}
                  className="h-8 w-8 !rounded-full"
                  title={t('ai.assistant.clearConversation') || 'Clear conversation'}
                  disabled={messages.length === 0}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="glass-style-dark"
                  size="icon"
                  className="h-8 w-8 !rounded-full"
                  onClick={() => onOpenChange(false)}
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="glass-style-dark"
                  size="icon"
                  className="h-8 w-8 !rounded-full"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
              <ChatMessageList 
                messages={messages} 
                onQuickAction={handleQuickAction} 
                isProcessing={isProcessing}
              />
            </div>

            {/* Input */}
            <div className="border-t p-4">
              <ChatInput
                onSend={sendMessage}
                disabled={isProcessing}
                placeholder={t('ai.assistant.placeholder') || 'Ask me anything...'}
              />
            </div>
          </Card>
        </div>
      )}
    </>
  );
};
