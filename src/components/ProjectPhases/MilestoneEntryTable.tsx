import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileText, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { format as formatDateFn, parseISO } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useLocalization } from '@/contexts/LocalizationContext'
import type { CreateMilestoneInput, Milestone } from '@/hooks/useMilestones'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface MilestonePhaseOption {
  id: string
  phase_name: string
  description?: string | null
  start_date?: string | null
  end_date?: string | null
  progress_percentage?: number | null
}

interface MilestoneEntryTableProps {
  projectId: string
  phases: MilestonePhaseOption[]
  milestones: Milestone[]
  onCreateMilestone: (payload: CreateMilestoneInput) => Promise<void>
  onUpdateMilestone: (payload: Partial<Milestone> & { id: string }) => Promise<unknown>
  onDeleteMilestone: (id: string) => Promise<unknown>
  isCreating?: boolean
}

interface TargetRow {
  key: string
  phaseId: string
  name: string
  description: string
  startDate: string | null
  endDate: string | null
  progress: number
}

type EntryErrors = Partial<Record<'due_date' | 'notify_days_before' | 'achieved_date', string>> & { root?: string }

interface MilestoneEntryState {
  due_date: string
  achieved_date: string
  notify_days_before: number
  description: string
  isSaving: boolean
  errors: EntryErrors
}

const NOTIFICATION_OPTIONS = [1, 3, 7, 14, 30] as const

const createEmptyEntry = (): MilestoneEntryState => ({
  due_date: '',
  achieved_date: '',
  notify_days_before: 7,
  description: '',
  isSaving: false,
  errors: {},
})

const normalizeDateOnly = (value: string | null | undefined): string => {
  if (!value) return ''
  return value.slice(0, 10)
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(value)
  return !Number.isNaN(parsed.getTime())
}

function formatDateDisplay(value: string | null | undefined): string {
  if (!value) return '--'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '--'
  return new Intl.DateTimeFormat('en-GB').format(parsed)
}

export function MilestoneEntryTable({
  projectId,
  phases,
  milestones,
  onCreateMilestone,
  onUpdateMilestone,
  onDeleteMilestone,
  isCreating = false,
}: MilestoneEntryTableProps) {
  const { t, dateFormat } = useLocalization()
  const [entries, setEntries] = useState<Record<string, MilestoneEntryState>>({})
  const [dateDrafts, setDateDrafts] = useState<Record<string, string>>({})
  const [descriptionDialog, setDescriptionDialog] = useState<{
    open: boolean
    rowKey: string | null
    draft: string
  }>({ open: false, rowKey: null, draft: '' })

  const targetRows = useMemo<TargetRow[]>(() => {
    return phases.map((phase) => ({
      key: `phase:${phase.id}`,
      phaseId: phase.id,
      name: phase.phase_name,
      description: phase.description || '',
      startDate: phase.start_date || null,
      endDate: phase.end_date || null,
      progress: Number(phase.progress_percentage || 0),
    }))
  }, [phases])

  const existingMilestoneByRow = useMemo(() => {
    const normalized = (value: string | null | undefined) => (value || '').trim().toLowerCase()
    const map = new Map<string, Milestone>()

    targetRows.forEach((row) => {
      const exact = milestones.find(
        (milestone) =>
          milestone.phase_id === row.phaseId &&
          normalized(milestone.name) === normalized(row.name)
      )

      if (exact) {
        map.set(row.key, exact)
        return
      }

      const fallback = milestones
        .filter((milestone) => milestone.phase_id === row.phaseId)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]

      if (fallback) {
        map.set(row.key, fallback)
      }
    })

    return map
  }, [milestones, targetRows])

  const getDefaultEntry = (row: TargetRow): MilestoneEntryState => ({
    ...createEmptyEntry(),
    due_date: normalizeDateOnly(existingMilestoneByRow.get(row.key)?.due_date || row.endDate),
    achieved_date: normalizeDateOnly(existingMilestoneByRow.get(row.key)?.achieved_date || row.endDate),
    notify_days_before: existingMilestoneByRow.get(row.key)?.notify_days_before || 7,
    description: existingMilestoneByRow.get(row.key)?.description || '',
  })

  const getEntry = (row: TargetRow): MilestoneEntryState => {
    const defaults = getDefaultEntry(row)
    const current = entries[row.key]
    if (!current) return defaults

    return {
      ...defaults,
      ...current,
      due_date: current.due_date || defaults.due_date,
      achieved_date: current.achieved_date || defaults.achieved_date,
      notify_days_before: current.notify_days_before || defaults.notify_days_before,
      description: current.description || defaults.description,
    }
  }

  const updateEntry = (rowKey: string, updater: (current: MilestoneEntryState) => MilestoneEntryState) => {
    setEntries((previous) => {
      const current = previous[rowKey] || createEmptyEntry()
      return { ...previous, [rowKey]: updater(current) }
    })
  }

  const getDisplayPattern = () => {
    if (dateFormat === 'MM/DD/YYYY') return 'MM/DD/YYYY'
    if (dateFormat === 'YYYY-MM-DD') return 'YYYY-MM-DD'
    return 'DD/MM/YYYY'
  }

  const formatIsoForDisplay = (isoValue: string): string => {
    if (!isoValue) return ''
    const parsed = parseISO(isoValue)
    if (Number.isNaN(parsed.getTime())) return ''

    const pattern = getDisplayPattern()
    if (pattern === 'MM/DD/YYYY') return formatDateFn(parsed, 'MM/dd/yyyy')
    if (pattern === 'YYYY-MM-DD') return formatDateFn(parsed, 'yyyy-MM-dd')
    return formatDateFn(parsed, 'dd/MM/yyyy')
  }

  const parseDisplayToIso = (displayValue: string): string | null => {
    const value = displayValue.trim()
    if (!value) return ''

    const pattern = getDisplayPattern()
    const normalized = value.replace(/\./g, '/').replace(/-/g, '/')

    let year = 0
    let month = 0
    let day = 0

    if (pattern === 'YYYY-MM-DD') {
      const parts = value.split('-')
      if (parts.length !== 3) return null
      year = Number(parts[0])
      month = Number(parts[1])
      day = Number(parts[2])
    } else {
      const parts = normalized.split('/')
      if (parts.length !== 3) return null
      if (pattern === 'MM/DD/YYYY') {
        month = Number(parts[0])
        day = Number(parts[1])
        year = Number(parts[2])
      } else {
        day = Number(parts[0])
        month = Number(parts[1])
        year = Number(parts[2])
      }
    }

    const parsed = new Date(year, month - 1, day)
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getFullYear() !== year ||
      parsed.getMonth() + 1 !== month ||
      parsed.getDate() !== day
    ) {
      return null
    }

    return formatDateFn(parsed, 'yyyy-MM-dd')
  }

  const getDateInputValue = (key: string, isoValue: string) => dateDrafts[key] ?? formatIsoForDisplay(isoValue)

  const handleDateDraftChange = (key: string, value: string) => {
    setDateDrafts((previous) => ({ ...previous, [key]: value }))
  }

  const commitDateDraft = (
    key: string,
    rowKey: string,
    field: 'due_date' | 'achieved_date',
    invalidMessageKey: 'dueDateInvalid' | 'achievedDateInvalid'
  ) => {
    const currentDraft = dateDrafts[key] ?? ''
    const parsedIso = parseDisplayToIso(currentDraft)

    if (parsedIso === null) {
      updateEntry(rowKey, (current) => ({
        ...current,
        errors: {
          ...current.errors,
          [field]: t(`projectPhases.milestoneTable.validation.${invalidMessageKey}`),
        },
      }))
      return
    }

    updateEntry(rowKey, (current) => ({
      ...current,
      [field]: parsedIso,
      errors: {
        ...current.errors,
        [field]: undefined,
        root: field === 'achieved_date' ? undefined : current.errors.root,
      },
    }))

    setDateDrafts((previous) => {
      const next = { ...previous }
      delete next[key]
      return next
    })
  }

  const validateEntry = (entry: MilestoneEntryState): EntryErrors => {
    const errors: EntryErrors = {}

    if (!entry.due_date) {
      errors.due_date = t('projectPhases.milestoneTable.validation.dueDateRequired')
    } else if (!isValidIsoDate(entry.due_date)) {
      errors.due_date = t('projectPhases.milestoneTable.validation.dueDateInvalid')
    }

    if (!NOTIFICATION_OPTIONS.includes(entry.notify_days_before as (typeof NOTIFICATION_OPTIONS)[number])) {
      errors.notify_days_before = t('projectPhases.milestoneTable.validation.notificationInvalid')
    }

    return errors
  }

  const openDescriptionModal = (rowKey: string) => {
    const row = targetRows.find((candidate) => candidate.key === rowKey)
    if (!row) return
    const entry = getEntry(row)
    setDescriptionDialog({
      open: true,
      rowKey,
      draft: entry.description,
    })
  }

  const saveDescription = () => {
    if (!descriptionDialog.rowKey) return
    updateEntry(descriptionDialog.rowKey, (current) => ({
      ...current,
      description: descriptionDialog.draft,
      errors: { ...current.errors, root: undefined },
    }))
    setDescriptionDialog({ open: false, rowKey: null, draft: '' })
  }

  const handleSaveRow = async (row: TargetRow) => {
    const existingEntry = getEntry(row)
    const entry: MilestoneEntryState = existingEntry.due_date
      ? existingEntry
      : { ...existingEntry, due_date: normalizeDateOnly(row.endDate) }
    const errors = validateEntry(entry)

    if (Object.keys(errors).length > 0) {
      updateEntry(row.key, (current) => ({ ...current, errors }))
      return
    }

    updateEntry(row.key, (current) => ({ ...current, isSaving: true, errors: {} }))

    try {
      const existing = existingMilestoneByRow.get(row.key)
      if (existing) {
        await onUpdateMilestone({
          id: existing.id,
          due_date: entry.due_date,
          notify_days_before: entry.notify_days_before,
          description: entry.description.trim() || null,
        })
      } else {
        await onCreateMilestone({
          project_id: projectId,
          phase_id: row.phaseId,
          name: row.name,
          description: entry.description.trim() || null,
          due_date: entry.due_date,
          notify_days_before: entry.notify_days_before,
          status: 'pending',
        })
      }

      toast.success(t('projectPhases.milestoneTable.successCreated'))
      updateEntry(row.key, (current) => ({ ...current, isSaving: false, errors: {} }))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('projectPhases.milestoneTable.validation.saveFailed')
      updateEntry(row.key, (current) => ({
        ...current,
        isSaving: false,
        errors: { ...current.errors, root: message },
      }))
    }
  }

  const handleMarkAchievedRow = async (row: TargetRow) => {
    const existingEntry = getEntry(row)
    const entry: MilestoneEntryState = existingEntry.due_date
      ? existingEntry
      : { ...existingEntry, due_date: normalizeDateOnly(row.endDate) }
    const errors = validateEntry(entry)

    if (!entry.achieved_date) {
      errors.root = t('projectPhases.milestoneTable.validation.achievedDateRequired')
    } else if (!isValidIsoDate(entry.achieved_date)) {
      errors.root = t('projectPhases.milestoneTable.validation.achievedDateInvalid')
    }

    if (Object.keys(errors).length > 0) {
      updateEntry(row.key, (current) => ({ ...current, errors }))
      return
    }

    updateEntry(row.key, (current) => ({ ...current, isSaving: true, errors: {} }))

    try {
      const existing = existingMilestoneByRow.get(row.key)
      if (existing) {
        await onUpdateMilestone({
          id: existing.id,
          status: 'achieved',
          achieved_date: entry.achieved_date,
          due_date: entry.due_date,
          notify_days_before: entry.notify_days_before,
          description: entry.description.trim() || null,
        })
      } else {
        await onCreateMilestone({
          project_id: projectId,
          phase_id: row.phaseId,
          name: row.name,
          description: entry.description.trim() || null,
          due_date: entry.due_date,
          notify_days_before: entry.notify_days_before,
          status: 'achieved',
          achieved_date: entry.achieved_date,
        })
      }

      toast.success(t('projectPhases.milestoneTable.successCreated'))
      updateEntry(row.key, (current) => ({ ...current, isSaving: false, errors: {} }))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('projectPhases.milestoneTable.validation.saveFailed')
      updateEntry(row.key, (current) => ({
        ...current,
        isSaving: false,
        errors: { ...current.errors, root: message },
      }))
    }
  }

  const handleDeleteRowMilestone = async (row: TargetRow) => {
    const existing = existingMilestoneByRow.get(row.key)
    if (!existing) return

    updateEntry(row.key, (current) => ({ ...current, isSaving: true, errors: {} }))

    try {
      await onDeleteMilestone(existing.id)
      toast.success(t('common.success'))
      setEntries((previous) => {
        const next = { ...previous }
        delete next[row.key]
        return next
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('projectPhases.milestoneTable.validation.saveFailed')
      updateEntry(row.key, (current) => ({
        ...current,
        isSaving: false,
        errors: { ...current.errors, root: message },
      }))
    }
  }

  return (
    <>
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle>{t('projectPhases.milestoneTable.title')}</CardTitle>
          <CardDescription>{t('projectPhases.milestoneTable.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='overflow-x-hidden'>
            <Table className='table-fixed w-full'>
              <TableHeader>
                <TableRow>
                  <TableHead className='h-8 w-[29%] px-0.5 py-0.5'>{t('projectPhases.columns.name')}</TableHead>
                  <TableHead className='h-8 w-[8%] px-0.5 py-0.5'>{t('projectPhases.columns.startDate')}</TableHead>
                  <TableHead className='h-8 w-[8%] px-0.5 py-0.5'>{t('projectPhases.columns.endDate')}</TableHead>
                  <TableHead className='h-8 w-[7%] px-0.5 py-0.5'>{t('projectPhases.columns.progress')}</TableHead>
                  <TableHead className='h-8 w-[10%] px-0.5 py-0.5'>
                    {t('projectPhases.milestoneTable.columns.dueDate')}
                  </TableHead>
                  <TableHead className='h-8 w-[8%] px-0.5 py-0.5'>
                    {t('projectPhases.milestoneTable.columns.notification')}
                  </TableHead>
                  <TableHead className='h-8 w-[10%] px-0.5 py-0.5'>
                    {t('projectPhases.milestoneTable.columns.achievedDate')}
                  </TableHead>
                  <TableHead className='h-8 w-[2%] px-0.5 py-0.5 text-center' />
                  <TableHead className='h-8 w-[18%] px-0.5 py-0.5'>{t('projectPhases.columns.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {targetRows.map((row) => {
                  const entry = getEntry(row)
                  return (
                    <TableRow key={row.key} className='h-10'>
                      <TableCell className='pl-0.5 pr-0 py-0.5 align-middle min-w-0'>
                        <div className='flex flex-col gap-0.5 leading-tight'>
                          <span className='font-medium truncate'>{row.name}</span>
                          {row.description ? (
                            <span className='text-xs text-muted-foreground/80 whitespace-normal break-words'>
                              {row.description}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>

                      <TableCell className='px-0.5 py-0.5 text-sm whitespace-nowrap'>
                        {formatDateDisplay(row.startDate)}
                      </TableCell>
                      <TableCell className='px-0.5 py-0.5 text-sm whitespace-nowrap'>
                        {formatDateDisplay(row.endDate)}
                      </TableCell>

                      <TableCell className='px-0.5 py-0.5'>
                        <div className='flex items-center gap-1'>
                          <div className='h-1.5 w-14 rounded-full bg-muted'>
                            <div
                              className='h-1.5 rounded-full bg-primary'
                              style={{ width: `${Math.max(0, Math.min(100, row.progress))}%` }}
                            />
                          </div>
                          <span className='text-xs text-muted-foreground'>{Math.round(row.progress)}%</span>
                        </div>
                      </TableCell>

                      <TableCell className='px-0.5 py-0.5'>
                        <Input
                          value={getDateInputValue(`${row.key}:due`, entry.due_date)}
                          onChange={(event) => handleDateDraftChange(`${row.key}:due`, event.target.value)}
                          onBlur={() =>
                            commitDateDraft(`${row.key}:due`, row.key, 'due_date', 'dueDateInvalid')
                          }
                          placeholder={getDisplayPattern()}
                          className='h-7 text-xs'
                        />
                        {entry.errors.due_date && (
                          <p className='mt-1 text-xs text-destructive'>{entry.errors.due_date}</p>
                        )}
                      </TableCell>

                      <TableCell className='px-0.5 py-0.5'>
                        <Select
                          value={String(entry.notify_days_before)}
                          onValueChange={(value) =>
                            updateEntry(row.key, (current) => ({
                              ...current,
                              notify_days_before: Number(value),
                              errors: {
                                ...current.errors,
                                notify_days_before: undefined,
                                root: undefined,
                              },
                            }))
                          }
                        >
                          <SelectTrigger className='h-7 text-xs'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {NOTIFICATION_OPTIONS.map((days) => (
                              <SelectItem key={days} value={String(days)}>
                                {t('projectPhases.milestoneTable.notificationOption', { days })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {entry.errors.notify_days_before && (
                          <p className='mt-1 text-xs text-destructive'>{entry.errors.notify_days_before}</p>
                        )}
                      </TableCell>

                      <TableCell className='px-0.5 py-0.5'>
                        <Input
                          value={getDateInputValue(`${row.key}:achieved`, entry.achieved_date)}
                          onChange={(event) =>
                            handleDateDraftChange(`${row.key}:achieved`, event.target.value)
                          }
                          onBlur={() =>
                            commitDateDraft(
                              `${row.key}:achieved`,
                              row.key,
                              'achieved_date',
                              'achievedDateInvalid'
                            )
                          }
                          placeholder={getDisplayPattern()}
                          className='h-7 text-xs'
                        />
                        {entry.errors.achieved_date && (
                          <p className='mt-1 text-xs text-destructive'>{entry.errors.achieved_date}</p>
                        )}
                      </TableCell>

                      <TableCell className='px-0.5 py-0.5 text-center'>
                        {existingMilestoneByRow.get(row.key)?.status === 'achieved' ? (
                          <CheckCircle2 className='mx-auto h-4 w-4 text-green-500' />
                        ) : (
                          <AlertTriangle className='mx-auto h-4 w-4 text-amber-400' />
                        )}
                      </TableCell>

                      <TableCell className='px-0.5 py-0.5'>
                        <div className='flex items-center gap-0.5'>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => handleDeleteRowMilestone(row)}
                            disabled={isCreating || entry.isSaving || !existingMilestoneByRow.get(row.key)}
                            className='h-7 w-7 px-0 text-xs text-destructive hover:text-destructive'
                            title={t('common.delete')}
                          >
                            <Trash2 className='h-3.5 w-3.5' />
                          </Button>

                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => openDescriptionModal(row.key)}
                            title={t('projectPhases.milestoneTable.actions.description')}
                            className='h-7 w-7 px-0 text-xs'
                          >
                            <FileText className='h-3.5 w-3.5' />
                          </Button>

                          <Button
                            size='sm'
                            variant='glass-style-dark'
                            onClick={() => handleSaveRow(row)}
                            disabled={isCreating || entry.isSaving}
                            className='h-7 px-1.5 text-xs'
                            title={t('projectPhases.milestoneTable.actions.saveRow')}
                          >
                            {t('projectPhases.milestoneTable.actions.saveRow')}
                          </Button>

                          <Button
                            size='sm'
                            variant='glass-style-dark'
                            onClick={() => handleMarkAchievedRow(row)}
                            disabled={isCreating || entry.isSaving}
                            className='h-7 px-1.5 text-xs'
                          >
                            {t('projectPhases.milestoneTable.actions.achieved')}
                          </Button>
                        </div>
                        {entry.errors.root && <p className='mt-1 text-xs text-destructive'>{entry.errors.root}</p>}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={descriptionDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setDescriptionDialog({ open: false, rowKey: null, draft: '' })
          }
        }}
      >
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>{t('projectPhases.milestoneTable.actions.description')}</DialogTitle>
          </DialogHeader>
          <div className='space-y-2'>
            <Label>{t('projectPhases.milestoneTable.columns.description')}</Label>
            <Textarea
              rows={6}
              value={descriptionDialog.draft}
              placeholder={t('projectPhases.milestoneDialog.descriptionPlaceholder')}
              onChange={(event) =>
                setDescriptionDialog((previous) => ({
                  ...previous,
                  draft: event.target.value,
                }))
              }
            />
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setDescriptionDialog({ open: false, rowKey: null, draft: '' })}
            >
              {t('common.cancel')}
            </Button>
            <Button onClick={saveDescription}>{t('projectPhases.milestoneTable.actions.saveDescription')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
