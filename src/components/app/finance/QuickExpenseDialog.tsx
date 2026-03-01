import React from 'react'
import { useLocalization } from '@/contexts/LocalizationContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface QuickExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId?: string
  onSubmit: (data: { amount: number; category: string; description: string }) => void
  isSubmitting?: boolean
}

const EXPENSE_CATEGORIES = [
  { value: 'labor', labelKey: 'app:finance.categories.labor' },
  { value: 'materials', labelKey: 'app:finance.categories.materials' },
  { value: 'equipment', labelKey: 'app:finance.categories.equipment' },
  { value: 'permits', labelKey: 'app:finance.categories.permits' },
  { value: 'consulting', labelKey: 'app:finance.categories.consulting' },
  { value: 'overhead', labelKey: 'app:finance.categories.overhead' },
  { value: 'other', labelKey: 'app:finance.categories.other' },
]

export function QuickExpenseDialog({
  open,
  onOpenChange,
  projectId,
  onSubmit,
  isSubmitting = false,
}: QuickExpenseDialogProps) {
  const { t } = useLocalization()
  const [amount, setAmount] = React.useState('')
  const [category, setCategory] = React.useState('')
  const [description, setDescription] = React.useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0 || !category) {
      return
    }
    onSubmit({
      amount: numAmount,
      category,
      description: description || `${category} expense`,
    })
    // Reset form
    setAmount('')
    setCategory('')
    setDescription('')
  }

  const isValid = parseFloat(amount) > 0 && category

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {t('app:finance.addExpense')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-slate-300">
              {t('app:finance.amount')}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                $
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="pl-7 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category" className="text-slate-300">
              {t('app:finance.category')}
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder={t('app:finance.selectCategory')} />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {EXPENSE_CATEGORIES.map((cat) => (
                  <SelectItem
                    key={cat.value}
                    value={cat.value}
                    className="text-white hover:bg-slate-700"
                  >
                    {t(cat.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-slate-300">
              {t('app:finance.description')}
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('app:finance.descriptionPlaceholder')}
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              {t('common:cancel')}
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="flex-1 bg-app-gold text-black hover:bg-app-gold/90"
            >
              {isSubmitting ? t('common:saving') : t('common:save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
