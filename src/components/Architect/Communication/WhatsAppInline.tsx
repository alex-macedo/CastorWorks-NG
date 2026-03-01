import { useState } from 'react'
import { useLocalization } from '@/contexts/LocalizationContext'
import { Send, Sparkles, Clock, User, Phone, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSendWhatsAppMessage, MessageTemplateType, resolveTemplateMessage } from '@/hooks/useArchitectWhatsApp'
import { WhatsAppTemplateSelector } from './WhatsAppTemplateSelector'
import { AIDraftMessage } from './AIDraftMessage'
import { WhatsAppQuickAction } from './WhatsAppQuickAction'
import { formatPhoneNumber, validatePhoneNumber } from '@/hooks/useArchitectWhatsApp'
import { useToast } from '@/hooks/use-toast'
import { useProjects } from '@/hooks/useProjects'
import { useClients } from '@/hooks/useClients'

interface WhatsAppInlineProps {
  projectId?: string
  clientId?: string
  initialPhoneNumber?: string
}

export const WhatsAppInline = ({
  projectId: propProjectId,
  clientId: propClientId,
  initialPhoneNumber
}: WhatsAppInlineProps) => {
  const { t } = useLocalization()
  const [message, setMessage] = useState('')
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber || '')
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplateType | null>(null)
  const [activeTab, setActiveTab] = useState<'compose' | 'templates' | 'history'>('compose')
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(propProjectId)
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(propClientId)

  const { mutate: sendMessage, isPending: isSending } = useSendWhatsAppMessage()
  const { projects = [] } = useProjects()
  const { clients = [] } = useClients()
  const { toast } = useToast()

  const handleSendMessage = () => {
    const validation = validatePhoneNumber(phoneNumber)
    if (!validation.valid) {
      toast({
        title: t('architect.whatsapp.validation.error'),
        description: t(validation.error || 'architect.whatsapp.validation.invalidFormat'),
        variant: 'destructive'
      })
      return
    }

    if (!message.trim()) {
      toast({
        title: t('architect.whatsapp.validation.messageRequired'),
        variant: 'destructive'
      })
      return
    }

    sendMessage(
      {
        phoneNumber,
        message,
        projectId: selectedProjectId,
      },
      {
        onSuccess: () => {
          setMessage('')
          toast({
            title: t('architect.whatsapp.messages.sentSuccess'),
            description: t('architect.whatsapp.messages.sentSuccessDesc'),
          })
        }
      }
    )
  }

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId)
    
    const project = projects.find(p => p.id === projectId)
    if (project && (project as any).clients && Array.isArray((project as any).clients) && (project as any).clients[0]) {
      const clientId = (project as any).clients[0].id
      setSelectedClientId(clientId)
      const client = clients.find(c => c.id === clientId)
      if (client?.phone) {
        setPhoneNumber(client.phone)
      }
    }
  }

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId)
    const client = clients.find(c => c.id === clientId)
    if (client?.phone) {
      setPhoneNumber(client.phone)
    }

    // Filter projects for this client
    const clientProjects = projects.filter(p => 
      (Array.isArray((p as any).clients) && (p as any).clients?.some((c: any) => c.id === clientId)) || 
      p.client_name === client?.name
    )

    if (clientProjects.length === 1) {
      setSelectedProjectId(clientProjects[0].id)
    } else {
      setSelectedProjectId(undefined)
    }
  }

  const handleAIMessageGenerated = (generatedMessage: string) => {
    setMessage(generatedMessage)
    setActiveTab('compose')
  }

  const handleTemplateSelect = (templateType: MessageTemplateType) => {
    setSelectedTemplate(templateType)
    const project = projects.find(p => p.id === selectedProjectId)
    const client = clients.find(c => c.id === selectedClientId)
    const templateMessage = resolveTemplateMessage(templateType, {
      projectName: project?.name || project?.client_name,
      clientName: client?.name,
    })
    setMessage(templateMessage)
    setActiveTab('compose')
  }

  const remainingChars = 1600 - message.length
  const charColor = remainingChars < 100 ? 'text-red-500' : remainingChars < 300 ? 'text-yellow-500' : 'text-muted-foreground'

  return (
    <Card className="w-full">


      <CardContent className="p-0">
        <ScrollArea className="h-auto">
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} variant="pill" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="compose">
                  <Send className="h-4 w-4 mr-2" />
                  {t('architect.whatsapp.tabs.compose')}
                </TabsTrigger>
                <TabsTrigger value="templates">
                  <Sparkles className="h-4 w-4 mr-2" />
                  {t('architect.whatsapp.tabs.templates')}
                </TabsTrigger>
                <TabsTrigger value="history">
                  <Clock className="h-4 w-4 mr-2" />
                  {t('architect.whatsapp.tabs.history')}
                </TabsTrigger>
              </TabsList>

              {/* Compose Tab */}
              <TabsContent value="compose" className="space-y-4 mt-4">


                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Client Selector */}
                  <div className="space-y-2">
                    <Label htmlFor="client">{t('architect.whatsapp.labels.client')}</Label>
                    <select
                      id="client"
                      value={selectedClientId || ''}
                      onChange={(e) => handleClientChange(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">{t('architect.whatsapp.labels.selectClient')}</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Project Selector */}
                  <div className="space-y-2">
                    <Label htmlFor="project">{t('architect.whatsapp.labels.project')}</Label>
                    <select
                      id="project"
                      value={selectedProjectId || ''}
                      onChange={(e) => handleProjectChange(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">{t('architect.whatsapp.labels.selectProject')}</option>
                      {projects
                        .filter(p => !selectedClientId || (Array.isArray((p as any).clients) && (p as any).clients?.some((c: any) => c.id === selectedClientId)) || p.client_name === clients.find(c => c.id === selectedClientId)?.name)
                        .map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('architect.whatsapp.labels.phoneNumber')}</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder={t('architect.whatsapp.labels.phonePlaceholder')}
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <WhatsAppQuickAction
                        phoneNumber={phoneNumber}
                        projectId={selectedProjectId}
                        variant="icon"
                        className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                      />
                    </div>
                    {phoneNumber && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {t('architect.whatsapp.labels.formattedNumber')}: {formatPhoneNumber(phoneNumber)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="message">{t('architect.whatsapp.labels.message')}</Label>
                      {selectedTemplate && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                          {t(`architect.whatsapp.templates.${selectedTemplate === 'project_update' ? 'projectUpdate' : selectedTemplate === 'milestone_reached' ? 'milestoneReached' : selectedTemplate === 'payment_reminder' ? 'paymentReminder' : selectedTemplate === 'meeting_scheduled' ? 'meetingScheduled' : 'diaryShared'}.title`)}
                        </span>
                      )}
                    </div>
                    <AIDraftMessage
                      projectId={selectedProjectId}
                      clientId={selectedClientId}
                      templateType={selectedTemplate}
                      onMessageGenerated={handleAIMessageGenerated}
                    />
                  </div>
                  <Textarea
                    id="message"
                    placeholder={t('architect.whatsapp.labels.messagePlaceholder')}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    maxLength={1600}
                    className="resize-none"
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className={charColor}>
                      {t('architect.whatsapp.labels.charactersLeft', { count: remainingChars })}
                    </span>
                    <span className="text-muted-foreground">
                      {t('architect.whatsapp.labels.maxChars')}: 1600
                    </span>
                  </div>
                </div>

                {/* Send Button */}
                {/* Send Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleSendMessage}
                    disabled={isSending || !message.trim() || !phoneNumber}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isSending ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        {t('architect.whatsapp.messages.sending')}
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        {t('architect.whatsapp.messages.sendMessage')}
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              {/* Templates Tab */}
              <TabsContent value="templates" className="mt-4">
                <WhatsAppTemplateSelector
                  selectedTemplate={selectedTemplate}
                  onSelectTemplate={handleTemplateSelect}
                />
              </TabsContent>

              {/* History Tab - Placeholder */}
              <TabsContent value="history" className="mt-4">
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {t('architect.whatsapp.history.title')}
                    </h3>
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      {t('architect.whatsapp.history.description')}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
