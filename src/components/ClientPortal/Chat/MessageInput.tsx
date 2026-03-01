import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Smile, Paperclip, Send } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';

interface MessageInputProps {
  onSend: (text: string, attachments: File[]) => Promise<void>;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const { t } = useLocalization();
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    if (!text.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSend(text, []);
      setText('');
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  return (
    <div className="p-4 border-t bg-background">
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <div className="flex gap-2 pb-2">
          <Button variant="ghost" size="icon" className="text-muted-foreground" disabled={disabled}>
            <Smile className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground" disabled={disabled}>
            <Paperclip className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={t("clientPortal.chat.typePlaceholder")}
            className="min-h-[44px] max-h-32 resize-none py-3 pr-12 rounded-2xl bg-muted/50 border-none focus-visible:ring-1"
            disabled={disabled || isSending}
            rows={1}
          />
        </div>

        <Button 
          onClick={handleSend} 
          disabled={!text.trim() || disabled || isSending}
          size="icon"
          className="h-11 w-11 rounded-full shrink-0"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
