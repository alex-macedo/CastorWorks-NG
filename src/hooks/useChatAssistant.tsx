import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { aiClient, formatAIError } from '@/lib/ai/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  created_at: string;
}

// Generate UUID using crypto API
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const useChatAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId] = useState(() => {
    // Get or create session ID from localStorage
    const existing = localStorage.getItem('chat_session_id');
    if (existing) return existing;
    const newId = generateUUID();
    localStorage.setItem('chat_session_id', newId);
    return newId;
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState<string>(() =>
    typeof window !== 'undefined' && window.location ? window.location.pathname : '/'
  );

  // Load history on mount
  useEffect(() => {
    const loadHistory = async () => {
      const { data } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (data) setMessages(data);
    };

    loadHistory();
  }, [sessionId]);

  const sendMessage = async (message: string) => {
    // Optimistically add user message
    const userMessage: Message = {
      id: generateUUID(),
      role: 'user',
      message,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    setIsProcessing(true);
    try {
      const data = await aiClient.chat({
        message,
        sessionId,
        context: {
          currentPage,
        },
      }) as { message?: string };

      if (!data?.message) {
        console.error('Invalid response from chat function:', data);
        throw new Error('Invalid response from chat assistant');
      }

      const assistantMessage: Message = {
        id: generateUUID(),
        role: 'assistant',
        message: data.message,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage = formatAIError(err);
      setMessages(prev => [
        ...prev,
        {
          id: generateUUID(),
          role: 'assistant',
          message: `Sorry, I encountered an error: ${errorMessage}. Please try again or contact support if this persists.`,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem('chat_session_id');
  };

  return {
    messages,
    sendMessage,
    isProcessing,
    sessionId,
    setCurrentPage,
    clearHistory,
  };
};
