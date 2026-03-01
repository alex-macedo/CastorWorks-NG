import { useState, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2 } from 'lucide-react';

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  inputTestId?: string;
  sendButtonTestId?: string;
}

export const ChatInput = ({ onSend, disabled, placeholder, inputTestId, sendButtonTestId }: Props) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        data-testid={inputTestId}
        value={message}
        onChange={e => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="bg-background text-foreground placeholder:text-muted-foreground border-border dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700"
      />
      <Button 
        data-testid={sendButtonTestId}
        onClick={handleSend} 
        disabled={disabled || !message.trim()}
        variant="glass-style-dark"
        className="dark:border-slate-700"
      >
        {disabled ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
};
