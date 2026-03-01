import React, { useRef, useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppProject } from '@/contexts/AppProjectContext'
import { MobileAppLayout } from '@/components/app/MobileAppLayout'
import { useProjectMessages, useMessageThread } from '@/hooks/useProjectMessages'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'
import { supabase } from '@/integrations/supabase/client'

export default function AppProjectChat() {
  const { t } = useTranslation('app')
  const navigate = useNavigate()
  const { selectedProject } = useAppProject()
  const { user } = useAuth()
  const [newMessage, setNewMessage] = useState('')
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false)
  const [openThreadId, setOpenThreadId] = useState<string | null>(null)
  const [threadReplyInput, setThreadReplyInput] = useState('')
  const [attachedPhotos, setAttachedPhotos] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const MOCK_MESSAGES = useMemo(() => [
    {
      id: 'mock-1',
      user_id: 'client-1',
      content: 'Hi Julian, any updates on the marble delivery for the kitchen island?',
      created_at: '2026-02-01T10:24:00Z',
      status: 'read',
      user: { display_name: 'Sarah Jenkins', avatar_url: null },
    },
    {
      id: 'mock-2',
      user_id: 'current-user',
      content: 'Checking with the supplier now. They mentioned a minor delay at the port.',
      created_at: '2026-02-01T10:45:00Z',
      status: 'seen',
      user: { display_name: t('projectChat.you' as any, 'You'), avatar_url: null },
    },
    {
      id: 'mock-3',
      user_id: 'client-1',
      content: "Okay, please let me know. I'm worried it might push back the floor installation.",
      created_at: '2026-02-01T11:02:00Z',
      status: 'read',
      user: { display_name: 'Sarah Jenkins', avatar_url: null },
    },
  ], [t])

  const {
    messages: realMessages,
    sendMessage,
    isSending,
    isLoading,
    addReaction,
    removeReaction,
  } = useProjectMessages(selectedProject?.id)

  const messages = realMessages && realMessages.length > 0 ? realMessages : MOCK_MESSAGES

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProject?.id || (!newMessage.trim() && attachedPhotos.length === 0)) return

    sendMessage({
      project_id: selectedProject.id,
      content: newMessage.trim() || `[${attachedPhotos.length} photo(s)]`,
    })

    setNewMessage('')
    setAttachedPhotos([])
  }

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    setIsUploadingPhotos(true)
    try {
      for (const file of files) {
        setAttachedPhotos(prev => [...prev, file])
      }
    } finally {
      setIsUploadingPhotos(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeAttachedPhoto = (index: number) => {
    setAttachedPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isOwnMessage = (userId: string) => userId === 'current-user' || user?.id === userId

  const getMessageStatus = (msg: any) => {
    if (msg.status === 'seen') return t('projectChat.seen' as any, 'SEEN')
    if (msg.status === 'read') return t('projectChat.read' as any, 'READ')
    return ''
  }

  const QUICK_REACTIONS = ['👍', '❤️', '😊', '😮', '😢', '🔥', '✨', '👏']

  const handleReaction = (messageId: string, emoji: string) => {
    const message = (messages as any[]).find(m => m.id === messageId)
    const userReacted = message?.reactions?.some(
      (r: any) => r.emoji === emoji && r.user_id === (user?.id || 'current-user')
    )

    if (userReacted) {
      removeReaction?.({ messageId, emoji })
    } else {
      addReaction?.({ messageId, emoji })
    }
    setShowReactionPicker(null)
  }

  const groupReactions = (reactions: any[] = []) => {
    const grouped = reactions.reduce((acc, r) => {
      if (!acc[r.emoji]) acc[r.emoji] = []
      acc[r.emoji].push(r)
      return acc
    }, {} as Record<string, any[]>)
    return Object.entries(grouped).map(([emoji, reacts]) => ({
      emoji,
      count: (reacts as any[]).length,
      userReacted: (reacts as any[]).some(r => r.user_id === (user?.id || 'current-user'))
    }))
  }

  const handleGetAISuggestions = async () => {
    if (!selectedProject?.id || messages.length === 0) return

    try {
      setIsGeneratingSuggestions(true)
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) return

      const response = await fetch(
        new URL('/functions/v1/ai-suggest-reply', import.meta.env.VITE_SUPABASE_URL).toString(),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            projectId: selectedProject.id,
            messageId: messages[messages.length - 1].id,
            conversationLength: 10
          })
        }
      )

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const result = await response.json()
      setSuggestions(result.suggestions || [])
      setShowSuggestions(result.suggestions && result.suggestions.length > 0)
    } catch (error) {
      console.error('Failed to get suggestions:', error)
      setSuggestions([])
    } finally {
      setIsGeneratingSuggestions(false)
    }
  }

  const applySuggestion = (suggestion: string) => {
    setNewMessage(suggestion)
    setShowSuggestions(false)
    setSuggestions([])
  }

  const ThreadViewModal = ({ parentMessage }: { parentMessage: any }) => {
    const { data: replies = [], isLoading: isLoadingReplies } = useMessageThread(parentMessage.id)

    const handleSendThreadReply = (e: React.FormEvent) => {
      e.preventDefault()
      if (!threadReplyInput.trim() || !selectedProject?.id) return

      sendMessage({
        project_id: selectedProject.id,
        content: threadReplyInput.trim(),
        parent_message_id: parentMessage.id,
      })

      setThreadReplyInput('')
    }

    return (
      <Dialog open={openThreadId === parentMessage.id} onOpenChange={(open) => {
        if (!open) setOpenThreadId(null)
      }}>
        <DialogContent className="w-full max-w-2xl bg-[#0a0e12] border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{t('projectChat.thread' as any, 'Thread')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="bg-[#1a2632] border-l-4 border-cyan-500 p-4 rounded">
              <div className="flex gap-2">
                <div className="size-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 text-xs text-cyan-400 font-bold">
                  {parentMessage.user?.display_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-400 mb-1">
                    {parentMessage.user?.display_name || 'Unknown'}
                  </p>
                  <p className="text-sm text-white break-words">{parentMessage.content}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 pl-4 border-l border-white/5">
              {isLoadingReplies ? (
                <div className="text-center py-4">
                  <div className="size-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : replies.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-4">
                  {t('projectChat.noReplies' as any, 'No replies yet')}
                </p>
              ) : (
                replies.map((reply: any) => (
                  <div key={reply.id} className="bg-[#1a2632]/50 p-3 rounded border border-white/5">
                    <div className="flex gap-2">
                      <div className="size-6 rounded-full bg-slate-500/20 flex items-center justify-center flex-shrink-0 text-[10px]">
                        {reply.user?.display_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-slate-400">
                          {reply.user?.display_name || 'Unknown'}
                        </p>
                        <p className="text-sm text-white mt-1 break-words">{reply.content}</p>
                        <p className="text-[9px] text-slate-500 mt-1">
                          {new Date(reply.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/5">
            <form onSubmit={handleSendThreadReply} className="flex gap-2">
              <input
                value={threadReplyInput}
                onChange={(e) => setThreadReplyInput(e.target.value)}
                placeholder={t('projectChat.replyInThread' as any, 'Reply in thread...')}
                className="flex-1 px-3 py-2 rounded-lg bg-[#1a2632] border border-white/10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-cyan-500/30"
              />
              <Button
                type="submit"
                disabled={!threadReplyInput.trim()}
                className="bg-cyan-500 hover:bg-cyan-600 text-black px-4 font-bold"
              >
                {t('projectChat.send' as any, 'Send')}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <MobileAppLayout showProjectSelector disableMainScroll>
      <div className="flex flex-col h-full w-full min-w-0 overflow-hidden bg-[#0a0e12]">
        <div className="shrink-0 px-4 py-3 bg-black/60 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-amber-400 !text-base">trending_up</span>
            </div>
            <div className="flex-1">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('projectChat.projectStatus', 'Project Status')}</p>
              <p className="text-xs font-semibold text-white">85% {t('tasks.complete', 'Complete')} • {t('tasks.onTrack', 'On Track')}</p>
            </div>
            <span className="material-symbols-outlined text-slate-600 !text-lg">push_pin</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-6 pb-32 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="size-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center py-2">
                <div className="bg-slate-800/60 px-4 py-1.5 rounded-full border border-white/5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {t('projectChat.today', 'Today')}
                  </span>
                </div>
              </div>

              {messages.map((message: any) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex flex-col',
                    isOwnMessage(message.user_id) ? 'items-end' : 'items-start'
                  )}
                >
                  <div className={cn(
                    'relative group',
                    isOwnMessage(message.user_id) ? 'items-end' : 'items-start'
                  )}>
                    <div
                      className={cn(
                        'max-w-[85vw] sm:max-w-[80%] rounded-2xl px-4 py-3 shadow-xl',
                        isOwnMessage(message.user_id)
                          ? 'bg-cyan-500 text-black rounded-br-sm'
                          : 'bg-[#1a2632] text-white rounded-bl-sm border border-white/5'
                      )}
                    >
                      <p className="text-[14px] leading-relaxed break-words">{message.content}</p>
                    </div>

                    <div className={cn(
                      'flex gap-1 mt-1 opacity-60 hover:opacity-100 transition-opacity',
                      isOwnMessage(message.user_id) ? 'flex-row-reverse' : 'flex-row'
                    )}>
                      <Popover open={showReactionPicker === message.id} onOpenChange={(open) => {
                        if (!open) setShowReactionPicker(null)
                        else setShowReactionPicker(message.id)
                      }}>
                        <PopoverTrigger asChild>
                          <button
                            className="h-7 w-7 rounded-full bg-[#1a2632] border border-white/10 flex items-center justify-center hover:bg-white/10"
                            title="React"
                          >
                            <span className="text-xs">😊</span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2 bg-[#1a2632] border border-white/10 flex gap-1">
                          {QUICK_REACTIONS.map(emoji => (
                            <button
                              key={emoji}
                              className="size-10 rounded-lg hover:bg-white/10 flex items-center justify-center text-xl"
                              onClick={() => handleReaction(message.id, emoji)}
                            >
                              {emoji}
                            </button>
                          ))}
                        </PopoverContent>
                      </Popover>

                      <button
                        className="h-7 w-7 rounded-full bg-[#1a2632] border border-white/10 flex items-center justify-center hover:bg-white/10"
                        onClick={() => setOpenThreadId(message.id)}
                      >
                        <span className="material-symbols-outlined !text-sm">reply</span>
                      </button>
                    </div>
                  </div>

                  {message.reactions && message.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {groupReactions(message.reactions).map(({ emoji, count, userReacted }) => (
                        <button
                          key={emoji}
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1',
                            userReacted
                              ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400'
                              : 'bg-white/5 border-white/10 text-slate-400'
                          )}
                          onClick={() => handleReaction(message.id, emoji)}
                        >
                          {emoji} {count}
                        </button>
                      ))}
                    </div>
                  )}

                  {message.thread_count > 0 && (
                    <button
                      className="mt-1 text-[10px] font-bold text-cyan-400 flex items-center gap-1 hover:underline"
                      onClick={() => setOpenThreadId(message.id)}
                    >
                      <span className="material-symbols-outlined !text-xs">comment</span>
                      {message.thread_count} {message.thread_count === 1 ? 'reply' : 'replies'}
                    </button>
                  )}

                  <div className={cn(
                    'flex items-center gap-1.5 mt-1 px-1',
                    isOwnMessage(message.user_id) ? 'flex-row-reverse' : 'flex-row'
                  )}>
                    <span className="text-[9px] font-bold text-slate-500">
                      {formatTime(message.created_at)}
                    </span>
                    {isOwnMessage(message.user_id) && (
                      <span className="material-symbols-outlined text-cyan-500 !text-xs">done_all</span>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </main>

        <div className="fixed bottom-[4rem] inset-x-0 bg-[#0a0e12] border-t border-white/5 p-4 z-40">
          <div className="max-w-screen-sm mx-auto space-y-3">
            {attachedPhotos.length > 0 && (
              <div className="flex gap-2 mb-2">
                {attachedPhotos.map((photo, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={URL.createObjectURL(photo)}
                      className="size-12 rounded-lg object-cover border border-white/10"
                      alt=""
                    />
                    <button
                      onClick={() => removeAttachedPhoto(idx)}
                      className="absolute -top-2 -right-2 size-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px]"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              <button
                onClick={handleGetAISuggestions}
                className="shrink-0 h-9 px-4 rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-2"
              >
                <span className="material-symbols-outlined !text-sm">auto_awesome</span>
                AI Reply
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 h-9 px-4 rounded-full border border-white/10 bg-white/5 text-slate-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-2"
              >
                <span className="material-symbols-outlined !text-sm">photo_camera</span>
                Site Photo
              </button>
              <input 
                ref={fileInputRef} 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={handlePhotoSelect} 
                className="hidden" 
                title="Select Site Photos"
                aria-label="Select Site Photos"
              />
            </div>

            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Message architect..."
                className="flex-1 h-12 px-4 rounded-2xl bg-[#1a2632] border border-white/10 text-white placeholder:text-slate-500 text-sm focus:outline-none"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() && attachedPhotos.length === 0}
                className={cn(
                  "size-12 rounded-full flex items-center justify-center transition-all",
                  newMessage.trim() ? "bg-white text-black" : "bg-white/10 text-slate-500"
                )}
              >
                <span className="material-symbols-outlined">arrow_upward</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {openThreadId && messages.find((m: any) => m.id === openThreadId) && (
        <ThreadViewModal parentMessage={messages.find((m: any) => m.id === openThreadId)} />
      )}
    </MobileAppLayout>
  )
}
