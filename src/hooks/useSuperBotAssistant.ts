import { useEffect, useState } from 'react'
import { aiClient, formatAIError } from '@/lib/ai/client'
import { supabase } from '@/integrations/supabase/client'
import { useLocalization } from '@/contexts/LocalizationContext'

interface Message {
  id: string
  role: 'user' | 'assistant'
  message: string
  created_at: string
}

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export const useSuperBotAssistant = () => {
  const { language, t } = useLocalization()
  const [messages, setMessages] = useState<Message[]>([])
  const [sessionId] = useState(() => {
    const existing = localStorage.getItem('super_bot_session_id')
    if (existing) return existing

    const newId = generateUUID()
    localStorage.setItem('super_bot_session_id', newId)
    return newId
  })
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const loadHistory = async () => {
      const { data } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(50)

      if (data) {
        setMessages(data)
      }
    }

    loadHistory()
  }, [sessionId])

  const sendMessage = async (message: string) => {
    const userMessage: Message = {
      id: generateUUID(),
      role: 'user',
      message,
      created_at: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setIsProcessing(true)

    try {
      const data = await aiClient.superBot({
        message,
        sessionId,
        language,
      }) as { message?: string }

      const assistantText = data?.message || 'No response from Super Bot'
      const assistantMessage: Message = {
        id: generateUUID(),
        role: 'assistant',
        message: assistantText,
        created_at: new Date().toISOString(),
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      const errorMessage = formatAIError(err)
      setMessages(prev => [
        ...prev,
        {
          id: generateUUID(),
          role: 'assistant',
          message: `${t('ai.superBot.errorPrefix') || 'Super Bot error'}: ${errorMessage}`,
          created_at: new Date().toISOString(),
        },
      ])
    } finally {
      setIsProcessing(false)
    }
  }

  const clearHistory = () => {
    setMessages([])
    localStorage.removeItem('super_bot_session_id')
  }

  return {
    messages,
    sendMessage,
    isProcessing,
    sessionId,
    clearHistory,
  }
}
