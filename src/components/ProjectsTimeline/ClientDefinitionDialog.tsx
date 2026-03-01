import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useLocalization } from '@/contexts/LocalizationContext'
import {
  useCreateDefinition,
  useUpdateDefinition,
  useDeleteDefinition,
  useClientDefinitions,
} from '@/hooks/useClientDefinitions'
import type { ClientDefinitionStatus, ClientDefinitionType } from '@/types/timeline'

const formSchema = z.object({
  definitionItem: z.string().min(1, 'Item name is required'),
  definitionType: z.enum(['material_selection', 'design_approval', 'other']),
  description: z.string().optional().default(''),
  requiredByDate: z.string().min(1, 'Required date is required'),
  status: z.enum(['pending', 'in_progress', 'completed', 'overdue', 'blocking']),
  assignedClientContact: z.string().optional().default(''),
  impactScore: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().optional().default(''),
  milestoneId: z.string().optional().nullable(),
})

type FormValues = z.infer<typeof formSchema>

interface ClientDefinitionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  definitionId?: string
}

export function ClientDefinitionDialog({
  open,
  onOpenChange,
  projectId,
  definitionId,
}: ClientDefinitionDialogProps) {
  const { t } = useLocalization()
  const { data: definitions } = useClientDefinitions(projectId)
  const createMutation = useCreateDefinition()
  const updateMutation = useUpdateDefinition()
  const deleteMutation = useDeleteDefinition()

  const definition = definitions?.find((d) => d.id === definitionId)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      definitionItem: '',
      definitionType: 'other' as ClientDefinitionType,
      description: '',
      requiredByDate: new Date().toISOString().split('T')[0],
      status: 'pending' as ClientDefinitionStatus,
      assignedClientContact: '',
      impactScore: 0,
      notes: '',
      milestoneId: null,
    },
  })

  useEffect(() => {
    if (open && definition) {
      form.reset({
        definitionItem: definition.definitionItem,
        definitionType: definition.definitionType ?? 'other',
        description: definition.description || '',
        requiredByDate: definition.requiredByDate.toISOString().split('T')[0],
        status: definition.status,
        assignedClientContact: definition.assignedClientContact || '',
        impactScore: definition.impactScore,
        notes: definition.notes || '',
        milestoneId: definition.milestoneId || null,
      })
    } else if (open && !definitionId) {
      form.reset({
        definitionItem: '',
        definitionType: 'other',
        description: '',
        requiredByDate: new Date().toISOString().split('T')[0],
        status: 'pending',
        assignedClientContact: '',
        impactScore: 0,
        notes: '',
        milestoneId: null,
      })
    }
  }, [open, definition, definitionId, form])

  const onDelete = () => {
    if (!definitionId || !window.confirm(t('timeline.clientDefinitions.deleteConfirm'))) return

    deleteMutation.mutate(
      { definitionId, projectId },
      {
        onSuccess: () => onOpenChange(false),
      }
    )
  }

  const onSubmit = (values: FormValues) => {
    const { definitionType, ...rest } = values
    if (definitionId) {
      updateMutation.mutate(
        {
          definitionId,
          definitionType,
          ...rest,
        },
        {
          onSuccess: () => onOpenChange(false),
        }
      )
    } else {
      createMutation.mutate(
        {
          projectId,
          definitionType,
          ...rest,
        },
        {
          onSuccess: () => onOpenChange(false),
        }
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>
            {definitionId
              ? t('timeline.clientDefinitions.editDefinition')
              : t('timeline.clientDefinitions.addDefinition')}
          </DialogTitle>
          <DialogDescription>
            {t('timeline.clientDefinitions.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <Form {...(form as any)}>
          <form onSubmit={form.handleSubmit(onSubmit as any)} className='space-y-4'>
            <FormField
              control={form.control as any}
              name='definitionItem'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('timeline.clientDefinitions.form.itemLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('timeline.clientDefinitions.form.itemPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('timeline.clientDefinitions.form.descriptionLabel')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('timeline.clientDefinitions.form.descriptionPlaceholder')}
                      className='resize-none'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control as any}
                name='requiredByDate'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('timeline.clientDefinitions.form.dateLabel')}</FormLabel>
                    <FormControl>
                      <Input type='date' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name='status'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('timeline.clientDefinitions.form.statusLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select status' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='pending'>{t('timeline.clientDefinitions.statuses.pending')}</SelectItem>
                        <SelectItem value='in_progress'>{t('timeline.clientDefinitions.statuses.in_progress')}</SelectItem>
                        <SelectItem value='completed'>{t('timeline.clientDefinitions.statuses.completed')}</SelectItem>
                        <SelectItem value='overdue'>{t('timeline.clientDefinitions.statuses.overdue')}</SelectItem>
                        <SelectItem value='blocking'>{t('timeline.clientDefinitions.statuses.blocking')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control as any}
                name='assignedClientContact'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('timeline.clientDefinitions.form.contactLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('timeline.clientDefinitions.assignedToPlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name='impactScore'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('timeline.clientDefinitions.form.impactLabel')} (0-100)</FormLabel>
                    <FormControl>
                      <Input type='number' min={0} max={100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control as any}
              name='notes'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('timeline.clientDefinitions.notes')}</FormLabel>
                  <FormControl>
                    <Textarea
                      className='h-20 resize-none'
                      placeholder={t('timeline.clientDefinitions.notesPlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className='gap-2 sm:gap-0'>
              {definitionId && (
                <Button
                  type='button'
                  variant='destructive'
                  className='mr-auto'
                  onClick={onDelete}
                  isLoading={deleteMutation.isPending}
                >
                  {t('timeline.clientDefinitions.deleteDefinition')}
                </Button>
              )}
              <div className='flex items-center gap-2'>
                <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type='submit' isLoading={createMutation.isPending || updateMutation.isPending}>
                  {definitionId ? t('common.save') : t('common.create')}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
