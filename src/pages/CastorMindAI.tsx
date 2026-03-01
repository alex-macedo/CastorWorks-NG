import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MessageSquare, Search, Sparkles, Trash2 } from 'lucide-react'
import { ChatInput } from '@/components/AIChat/ChatInput'
import { ChatMessageList } from '@/components/AIChat/ChatMessageList'
import { useLocalization } from '@/contexts/LocalizationContext'
import { useToast } from '@/hooks/use-toast'
import { useSuperBotAssistant } from '@/hooks/useSuperBotAssistant'
import castorMindMascot from '../../images/CastorMind-AI.png'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'

type PromptTemplate = {
  id: string
  title: string
  prompt_text: string
}

export default function CastorMindAI() {
  const navigate = useNavigate()
  const { messages, sendMessage, isProcessing, clearHistory } = useSuperBotAssistant()
  const { t } = useLocalization()
  const { toast } = useToast()
  const currentHour = new Date().getHours()
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  const greeting =
    currentHour < 12
      ? t('ai.superBot.greetings.morning') || 'Good Morning'
      : currentHour < 18
        ? t('ai.superBot.greetings.afternoon') || 'Good Afternoon'
        : currentHour < 22
          ? t('ai.superBot.greetings.evening') || 'Good Evening'
          : t('ai.superBot.greetings.night') || 'Good Night'

  const quickPrompts = [
    t('ai.superBot.prompts.delayedProjects') ||
      'Show me all projects that are delayed and their tasks.',
    t('ai.superBot.prompts.duePayments') || 'What clients have due payments?',
    t('ai.superBot.prompts.updateTasks') ||
      'Update all the tasks in the schedule for project X until today.',
    t('ai.superBot.prompts.vendorQuotes') ||
      'Show me all quotes where vendors did not return a proposal.',
  ]

  const groupedMessages = messages.reduce<Record<string, typeof messages>>((acc, item) => {
    const dayKey = new Date(item.created_at).toDateString()
    if (!acc[dayKey]) acc[dayKey] = []
    acc[dayKey].push(item)
    return acc
  }, {})

  const groupLabels = Object.keys(groupedMessages)

  const handleClearHistory = () => {
    clearHistory()
    toast({
      title: t('ai.superBot.historyCleared') || 'CastorMind-AI history cleared',
      description:
        t('ai.superBot.historyClearedDesc') || 'CastorMind-AI chat history has been cleared.',
    })
  }

  useEffect(() => {
    const loadTemplates = async () => {
      setLoadingTemplates(true)
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) return

        const locale = (navigator.language || 'en-US').slice(0, 5)
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/castormind-prompt-templates?locale=${encodeURIComponent(locale)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        )

        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'Failed to load templates')
        setTemplates((json?.items || []) as PromptTemplate[])
      } catch (e) {
        console.error('Failed to load prompt templates', e)
      } finally {
        setLoadingTemplates(false)
      }
    }
    loadTemplates()
  }, [])

  return (
    <Card className="h-[calc(100vh-8.5rem)] w-full flex overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-sm">
      <aside className="hidden md:flex md:w-[300px] border-r border-border bg-background/80 dark:bg-slate-950/60 flex-col">
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              readOnly
              value={t('ai.superBot.searchPlaceholder') || 'Search chats...'}
              className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2 text-sm text-muted-foreground"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          {groupLabels.length === 0 ? (
            <div className="text-sm text-muted-foreground p-2">
              {t('ai.superBot.noHistory') || 'No conversations yet'}
            </div>
          ) : (
            groupLabels.map(label => (
              <div key={label} className="space-y-2">
                <p className="px-2 text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                <div className="space-y-1">
                  {groupedMessages[label]
                    .filter(msg => msg.role === 'user')
                    .slice(-8)
                    .map(msg => (
                      <button
                        key={msg.id}
                        type="button"
                        onClick={() => sendMessage(msg.message)}
                        className="w-full rounded-lg px-2.5 py-2 text-left text-sm text-foreground hover:bg-accent transition-colors truncate"
                      >
                        {msg.message}
                      </button>
                    ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t border-border">
          <Button
            variant="outline"
            className="w-full !rounded-full"
            onClick={handleClearHistory}
            disabled={messages.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('ai.superBot.clearConversation') || 'Clear conversation'}
          </Button>
        </div>
      </aside>

      <section className="flex-1 flex flex-col">
        <div className="flex items-center gap-3 p-4 border-b border-border bg-background/80 dark:bg-slate-950/45">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-rose-200 via-purple-300 to-indigo-300 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-slate-900" />
          </div>
          <div>
            <h3 className="font-semibold text-base">{t('navigation.superBot') || 'CastorMind-AI'}</h3>
            <p className="text-xs text-muted-foreground">
              {t('ai.superBot.subheadline') ||
                'Natural-language operations across projects, finance, and procurement.'}
            </p>
          </div>
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={() => navigate('/castormind-ai/analytics')}>
              Analytics
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          {messages.length === 0 && !isProcessing ? (
            <div className="max-w-4xl mx-auto h-full flex flex-col justify-center">
              <div className="mx-auto relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-300/45 via-violet-300/35 to-indigo-300/45 blur-2xl scale-90" />
                <div className="relative h-36 w-36 md:h-40 md:w-40 rounded-full bg-background/95 ring-1 ring-border shadow-[0_18px_50px_rgba(15,23,42,0.18)] flex items-center justify-center overflow-hidden dark:shadow-[0_18px_50px_rgba(2,6,23,0.65)]">
                  <img
                    src={castorMindMascot}
                    alt="CastorMind-AI mascot"
                    className="h-[88%] w-[88%] object-contain drop-shadow-[0_10px_20px_rgba(15,23,42,0.25)]"
                    loading="lazy"
                  />
                </div>
              </div>
              <h2 className="mt-8 text-center text-3xl md:text-5xl font-semibold tracking-tight text-foreground">
                {greeting}
                <br />
                <span className="text-foreground">
                  {t('ai.superBot.greetingQuestion') || 'How can I assist you today?'}
                </span>
              </h2>

              <div className="mt-8 rounded-2xl border border-border bg-card p-3 md:p-4 shadow-sm">
                <p className="text-xs text-muted-foreground mb-2">
                  {t('ai.superBot.helperText') ||
                    'Use natural language to fetch and automate backend tasks.'}
                </p>
                <ChatInput
                  onSend={sendMessage}
                  disabled={isProcessing}
                  placeholder={t('ai.superBot.placeholder') || 'Ask CastorMind-AI...'}
                  inputTestId="superbot-input"
                  sendButtonTestId="superbot-send"
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {quickPrompts.map((prompt, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="!rounded-full bg-background text-foreground text-xs hover:bg-accent dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                    onClick={() => sendMessage(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
                {!loadingTemplates && templates.slice(0, 4).map((tpl) => (
                  <Button
                    key={tpl.id}
                    variant="outline"
                    size="sm"
                    className="!rounded-full bg-background text-foreground text-xs hover:bg-accent dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                    onClick={() => sendMessage(tpl.prompt_text)}
                  >
                    {tpl.title}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full">
              <ChatMessageList messages={messages} onQuickAction={sendMessage} isProcessing={isProcessing} />
            </div>
          )}
        </div>

        {(messages.length > 0 || isProcessing) && (
          <div className="border-t border-border p-4 bg-background/80 dark:bg-slate-950/40">
            <div className="max-w-4xl mx-auto space-y-3">
              <div className="rounded-2xl border border-border bg-card p-3 md:p-4 shadow-sm">
                <ChatInput
                  onSend={sendMessage}
                  disabled={isProcessing}
                  placeholder={t('ai.superBot.placeholder') || 'Ask CastorMind-AI...'}
                  inputTestId="superbot-input"
                  sendButtonTestId="superbot-send"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {t('ai.superBot.suggestions') || 'Suggestions'}
                </span>
                {quickPrompts.map((prompt, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="!rounded-full text-xs whitespace-nowrap bg-background text-foreground hover:bg-accent dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                    onClick={() => sendMessage(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </Card>
  )
}
