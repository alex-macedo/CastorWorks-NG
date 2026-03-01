import { createContext, useContext, ReactNode } from 'react';
import { useChatAssistant } from '@/hooks/useChatAssistant';
import { useEffect } from 'react';
import { routeEmitter } from '@/lib/routeEmitter';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  created_at: string;
}

interface ChatContextType {
  messages: Message[];
  sendMessage: (message: string) => Promise<void>;
  isProcessing: boolean;
  sessionId: string;
  clearHistory: () => void;
  setCurrentPage?: (path: string) => void;
  unreadCount: number;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const chat = useChatAssistant();

  // Listen for route change events from components that have router access
  useEffect(() => {
    if (typeof chat.setCurrentPage !== 'function') return;
    const unsub = routeEmitter.on(({ path }) => {
      try {
        chat.setCurrentPage!(path);
      } catch (e) {
        // swallow
      }
    });
    return () => unsub();
  }, [chat]);

  // Calculate unread messages (messages since last opened)
  const unreadCount = 0; // TODO: Implement unread tracking if needed

  return (
    <ChatContext.Provider value={{ ...chat, unreadCount }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};
