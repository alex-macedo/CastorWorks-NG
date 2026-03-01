import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useLocalization } from '@/contexts/LocalizationContext'
import { useCreateDelay } from '@/hooks/useDelayDocumentation'
import type {
  DelayImpactType,
  DelayResponsibleParty,
  DelayRootCause,
} from '@/types/timeline'

const ROOT_CAUSES: DelayRootCause[] = [
  'client_definition',
  'financial',
  'labor',
  'material',
  'weather',
  'design_change',
  'regulatory',
  'quality_rework',
]

const RESPONSIBLE_PARTIES: DelayResponsibleParty[] = [
  'client',
  'general_contractor',
  'subcontractor',
  'supplier',
  'regulatory_authority',
  'force_majeure',
]

const IMPACT_TYPES: DelayImpactType[] = ['isolated', 'cascading', 'critical_path']

function createDelaySchema(t: (key: string) => string) {
  return z.object({
    delayDays: z.number().int().positive(t('timeline.delays.validation.delayDaysMin')),
    rootCause: z.enum([
      'client_definition',
      'financial',
      'labor',
      'material',
      'weather',
      'design_change',
      'regulatory',
      'quality_rework',
    ]),
    responsibleParty: z.enum([
      'client',
      'general_contractor',
      'subcontractor',
      'supplier',
      'regulatory_authority',
      'force_majeure',
    ]),
    impactType: z.enum(['isolated', 'cascading', 'critical_path']),
    description: z.string().min(10, t('timeline.delays.validation.descriptionMinLength')),
    correctiveActions: z.string().optional(),
    subcontractorTrade: z.string().optional(),
  })
}

type DelayFormData = z.infer<ReturnType<typeof createDelaySchema>>

interface DelayDocumentationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  milestoneId: string
  milestoneName: string
  projectId: string
}

export function DelayDocumentationDialog({
  open,
  onOpenChange,
  milestoneId,
  milestoneName,
  projectId,
}: DelayDocumentationDialogProps) {
  const { t } = useLocalization()
  const createDelay = useCreateDelay()
  const delaySchema = createDelaySchema(t)

  const form = useForm<DelayFormData>({
    resolver: zodResolver(delaySchema),
    defaultValues: {
      delayDays: 1,
      rootCause: 'material',
      responsibleParty: 'general_contractor',
      impactType: 'isolated',
      description: '',
      correctiveActions: '',
      subcontractorTrade: '',
    },
  })

  const watchResponsibleParty = form.watch('responsibleParty')

  useEffect(() => {
    if (open) {
      form.reset({
        delayDays: 1,
        rootCause: 'material',
        responsibleParty: 'general_contractor',
        impactType: 'isolated',
        description: '',
        correctiveActions: '',
        subcontractorTrade: '',
      })
    }
  }, [open, form])

  const canSubmit = Boolean(milestoneId && projectId)

  const onSubmit = async (data: DelayFormData) => {
    if (!canSubmit) return
    await createDelay.mutateAsync({
      milestoneId,
      projectId,
      delayDays: data.delayDays,
      rootCause: data.rootCause,
      responsibleParty: data.responsibleParty,
      impactType: data.impactType,
      description: data.description,
      correctiveActions: data.correctiveActions || undefined,
      subcontractorTrade: data.subcontractorTrade || undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" data-testid="delay-documentation-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {t('timeline.delays.title')}
          </DialogTitle>
          <DialogDescription>
            {milestoneName}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Delay Days */}
            <FormField
              control={form.control}
              name="delayDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('timeline.delays.delayDays')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value) || 1)}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      name={field.name}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Root Cause + Responsible Party side by side */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rootCause"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('timeline.delays.rootCause')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ROOT_CAUSES.map((cause) => (
                          <SelectItem key={cause} value={cause}>
                            {t(`timeline.delays.causes.${cause}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="responsibleParty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('timeline.delays.responsibleParty')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RESPONSIBLE_PARTIES.map((party) => (
                          <SelectItem key={party} value={party}>
                            {t(`timeline.delays.parties.${party}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Subcontractor Trade (conditional) */}
            {watchResponsibleParty === 'subcontractor' && (
              <FormField
                control={form.control}
                name="subcontractorTrade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('timeline.delays.subcontractorTrade')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('timeline.delays.subcontractorTradePlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Impact Type */}
            <FormField
              control={form.control}
              name="impactType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('timeline.delays.impactType')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {IMPACT_TYPES.map((impact) => (
                        <SelectItem key={impact} value={impact}>
                          {t(`timeline.delays.impacts.${impact}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('timeline.delays.description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('timeline.delays.descriptionPlaceholder')}
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Corrective Actions */}
            <FormField
              control={form.control}
              name="correctiveActions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('timeline.delays.correctiveActions')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('timeline.delays.correctiveActionsPlaceholder')}
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={createDelay.isPending || !canSubmit}
                className="bg-amber-600 hover:bg-amber-700"
                data-testid="delay-submit-button"
              >
                {createDelay.isPending
                  ? t('common.saving')
                  : t('timeline.delays.addDelay')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
