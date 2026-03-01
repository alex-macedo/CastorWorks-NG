import { useState } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useLocalization } from '@/contexts/LocalizationContext'
import { useToast } from '@/hooks/use-toast'
import { Settings2, Plus, Trash2, Save } from 'lucide-react'

interface CollectionsSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CollectionStep {
  step_number: number
  trigger: 'due_date' | 'days_overdue'
  trigger_value: number
  action: 'email' | 'whatsapp' | 'sms' | 'task'
  template: string
  delay_hours: number
  subject?: string
  body?: string
  message?: string
}

interface CollectionSequence {
  name: string
  description: string
  steps: CollectionStep[]
  applies_to_customer_types: string[]
  minimum_amount?: number
  maximum_amount?: number
  is_active: boolean
}

export function CollectionsSettingsDialog({
  open,
  onOpenChange
}: CollectionsSettingsDialogProps) {
  const { t } = useLocalization()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [sequences, setSequences] = useState<CollectionSequence[]>([
    {
      name: t('financial:collections.defaultSequenceName'),
      description: t('financial:collections.defaultSequenceDescription'),
      steps: [
        {
          step_number: 1,
          trigger: 'due_date',
          trigger_value: 0,
          action: 'email',
          template: 'friendly_reminder',
          delay_hours: 0,
          subject: t('financial:collections.defaultEmailSubject'),
          body: t('financial:collections.defaultEmailBody')
        },
        {
          step_number: 2,
          trigger: 'days_overdue',
          trigger_value: 3,
          action: 'whatsapp',
          template: 'payment_reminder',
          delay_hours: 24,
          message: t('financial:collections.defaultWhatsAppMessage')
        }
      ],
      applies_to_customer_types: ['all'],
      is_active: true
    }
  ])

  const addStep = (sequenceIndex: number) => {
    const newStep: CollectionStep = {
      step_number: sequences[sequenceIndex].steps.length + 1,
      trigger: 'days_overdue',
      trigger_value: 7,
      action: 'email',
      template: 'formal_collection',
      delay_hours: 0,
      subject: t('financial:collections.formalCollectionSubject'),
      body: t('financial:collections.formalCollectionBody')
    }

    const updatedSequences = [...sequences]
    updatedSequences[sequenceIndex].steps.push(newStep)
    setSequences(updatedSequences)
  }

  const removeStep = (sequenceIndex: number, stepIndex: number) => {
    const updatedSequences = [...sequences]
    updatedSequences[sequenceIndex].steps.splice(stepIndex, 1)
    // Renumber steps
    updatedSequences[sequenceIndex].steps = updatedSequences[sequenceIndex].steps.map((step, index) => ({
      ...step,
      step_number: index + 1
    }))
    setSequences(updatedSequences)
  }

  const updateStep = (sequenceIndex: number, stepIndex: number, field: keyof CollectionStep, value: any) => {
    const updatedSequences = [...sequences]
    updatedSequences[sequenceIndex].steps[stepIndex] = {
      ...updatedSequences[sequenceIndex].steps[stepIndex],
      [field]: value
    }
    setSequences(updatedSequences)
  }

  const updateSequence = (index: number, field: keyof CollectionSequence, value: any) => {
    const updatedSequences = [...sequences]
    updatedSequences[index] = {
      ...updatedSequences[index],
      [field]: value
    }
    setSequences(updatedSequences)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // TODO: Save to database via API
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      
      toast({
        title: t('financial:collections.settingsSaved'),
        description: t('financial:collections.settingsUpdated')
      })
      onOpenChange(false)
    } catch (error) {
      toast({
        title: t('common:error'),
        description: t('financial:collections.settingsSaveError'),
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[48rem] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            <DialogTitle className="text-xl font-semibold">
              {t('financial:collections.settings')}
            </DialogTitle>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* Global Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('financial:collections.globalSettings')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('financial:collections.enableAutomatedCollections')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('financial:collections.enableAutomatedCollectionsDesc')}
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('financial:collections.sendWeekendReminders')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('financial:collections.sendWeekendRemindersDesc')}
                    </p>
                  </div>
                  <Switch />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('financial:collections.defaultRemittanceEmail')}</Label>
                    <Input placeholder="financeiro@empresa.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('financial:collections.defaultRemittancePhone')}</Label>
                    <Input placeholder="+55 11 99999-9999" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Collection Sequences */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{t('financial:collections.collectionSequences')}</h3>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('financial:collections.addSequence')}
                </Button>
              </div>

              {sequences.map((sequence, seqIndex) => (
                <Card key={seqIndex}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 flex-1 min-w-0">
                        <Input
                          value={sequence.name}
                          onChange={(e) => updateSequence(seqIndex, 'name', e.target.value)}
                          className="text-lg font-semibold border-0 p-0 h-auto w-full"
                        />
                        <Textarea
                          value={sequence.description}
                          onChange={(e) => updateSequence(seqIndex, 'description', e.target.value)}
                          className="text-sm text-muted-foreground border-0 p-0 resize-none overflow-hidden w-full"
                          rows={1}
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Switch
                          checked={sequence.is_active}
                          onCheckedChange={(checked) => updateSequence(seqIndex, 'is_active', checked)}
                        />
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Sequence Settings */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>{t('financial:collections.customerTypes')}</Label>
                        <Select defaultValue="all">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t('financial:collections.allCustomers')}</SelectItem>
                            <SelectItem value="corporate">{t('financial:collections.corporateOnly')}</SelectItem>
                            <SelectItem value="individual">{t('financial:collections.individualOnly')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('financial:collections.minAmount')}</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={sequence.minimum_amount || ''}
                          onChange={(e) => updateSequence(seqIndex, 'minimum_amount', e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('financial:collections.maxAmount')}</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={sequence.maximum_amount || ''}
                          onChange={(e) => updateSequence(seqIndex, 'maximum_amount', e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </div>
                    </div>

                    {/* Steps */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-medium">{t('financial:collections.steps')}</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addStep(seqIndex)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {t('financial:collections.addStep')}
                        </Button>
                      </div>

                      {sequence.steps.map((step, stepIndex) => (
                        <Card key={stepIndex} className="bg-muted/30">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-medium">
                                {t('financial:collections.step')} {step.step_number}
                              </h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeStep(seqIndex, stepIndex)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>{t('financial:collections.trigger')}</Label>
                                <Select
                                  value={step.trigger}
                                  onValueChange={(value: 'due_date' | 'days_overdue') => 
                                    updateStep(seqIndex, stepIndex, 'trigger', value)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="due_date">{t('financial:collections.onDueDate')}</SelectItem>
                                    <SelectItem value="days_overdue">{t('financial:collections.daysAfterDue')}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label>{t('financial:collections.triggerValue')}</Label>
                                <Input
                                  type="number"
                                  value={step.trigger_value}
                                  onChange={(e) => updateStep(seqIndex, stepIndex, 'trigger_value', Number(e.target.value))}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>{t('financial:collections.action')}</Label>
                                <Select
                                  value={step.action}
                                  onValueChange={(value: 'email' | 'whatsapp' | 'sms' | 'task') => 
                                    updateStep(seqIndex, stepIndex, 'action', value)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="email">{t('financial:collections.email')}</SelectItem>
                                    <SelectItem value="whatsapp">{t('financial:collections.whatsapp')}</SelectItem>
                                    <SelectItem value="sms">{t('financial:collections.sms')}</SelectItem>
                                    <SelectItem value="task">{t('financial:collections.createTask')}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label>{t('financial:collections.delayHours')}</Label>
                                <Input
                                  type="number"
                                  value={step.delay_hours}
                                  onChange={(e) => updateStep(seqIndex, stepIndex, 'delay_hours', Number(e.target.value))}
                                />
                              </div>

                              {step.action === 'email' && (
                                <>
                                  <div className="space-y-2 col-span-2">
                                    <Label>{t('financial:collections.subject')}</Label>
                                    <Input
                                      value={step.subject || ''}
                                      onChange={(e) => updateStep(seqIndex, stepIndex, 'subject', e.target.value)}
                                      placeholder={t('financial:collections.emailSubjectPlaceholder')}
                                    />
                                  </div>
                                  <div className="space-y-2 col-span-2">
                                    <Label>{t('financial:collections.body')}</Label>
                                    <Textarea
                                      value={step.body || ''}
                                      onChange={(e) => updateStep(seqIndex, stepIndex, 'body', e.target.value)}
                                      placeholder={t('financial:collections.emailBodyPlaceholder')}
                                      rows={4}
                                    />
                                  </div>
                                </>
                              )}

                              {step.action === 'whatsapp' && (
                                <div className="space-y-2 col-span-2">
                                  <Label>{t('financial:collections.message')}</Label>
                                  <Textarea
                                    value={step.message || ''}
                                    onChange={(e) => updateStep(seqIndex, stepIndex, 'message', e.target.value)}
                                    placeholder={t('financial:collections.whatsappMessagePlaceholder')}
                                    rows={3}
                                  />
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? t('common:saving') : t('common:save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
