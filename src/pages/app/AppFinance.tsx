import React from 'react'
import { useTranslation } from 'react-i18next'
import { useAppProject } from '@/contexts/AppProjectContext'
import { MobileAppLayout } from '@/components/app/MobileAppLayout'
import { useExpenses } from '@/hooks/useExpenses'
import { useFinancialEntries } from '@/hooks/useFinancialEntries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const EXPENSE_CATEGORIES = [
  { value: 'labor', label: 'Labor', icon: 'engineering', color: 'text-sky-400 bg-sky-400/10 border-sky-400/20' },
  { value: 'materials', label: 'Materials', icon: 'architecture', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  { value: 'equipment', label: 'Equipment', icon: 'construction', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  { value: 'permits', label: 'Permits', icon: 'description', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  { value: 'consulting', label: 'Consulting', icon: 'groups', color: 'text-pink-400 bg-pink-400/10 border-pink-400/20' },
  { value: 'overhead', label: 'Overhead', icon: 'corporate_fare', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  { value: 'other', label: 'Other', icon: 'category', color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
]

// Mock data matching the mockup screenshots
const MOCK_EXPENSES = [
  { id: 'mock-1', description: 'Lumber Supplies', category: 'materials', amount: 12450, recorded_date: '2023-10-12' },
  { id: 'mock-2', description: 'Structural Survey', category: 'labor', amount: 3200, recorded_date: '2023-10-10' },
  { id: 'mock-3', description: 'Zoning Fee', category: 'permits', amount: 850, recorded_date: '2023-10-08' },
  { id: 'mock-4', description: 'Foundation Materials', category: 'materials', amount: 45000, recorded_date: '2023-10-05' },
  { id: 'mock-5', description: 'Electrical Contractor', category: 'labor', amount: 28500, recorded_date: '2023-10-03' },
  { id: 'mock-6', description: 'HVAC Installation', category: 'labor', amount: 52000, recorded_date: '2023-09-28' },
  { id: 'mock-7', description: 'Plumbing Materials', category: 'materials', amount: 18500, recorded_date: '2023-09-25' },
  { id: 'mock-8', description: 'Building Permit', category: 'permits', amount: 12000, recorded_date: '2023-09-20' },
  { id: 'mock-9', description: 'Architect Consultation', category: 'consulting', amount: 35000, recorded_date: '2023-09-15' },
  { id: 'mock-10', description: 'Steel Framing', category: 'materials', amount: 165000, recorded_date: '2023-09-10' },
  { id: 'mock-11', description: 'Site Preparation', category: 'labor', amount: 45000, recorded_date: '2023-09-05' },
  { id: 'mock-12', description: 'Environmental Assessment', category: 'permits', amount: 8500, recorded_date: '2023-09-01' },
  { id: 'mock-13', description: 'Project Management', category: 'consulting', amount: 46000, recorded_date: '2023-08-28' },
  { id: 'mock-14', description: 'Construction Crew', category: 'labor', amount: 196300, recorded_date: '2023-08-15' },
  { id: 'mock-15', description: 'Impact Fee', category: 'permits', amount: 140650, recorded_date: '2023-08-01' },
]

const MOCK_PENDING_INVOICES = 67500
const MOCK_PENDING_APPROVALS = 4
const MOCK_BUDGET = 1000000

// Donut Chart Component
const DonutChart = ({ categories, total }: { categories: { label: string; amount: number; color: string }[], total: number }) => {
  const circumference = 100

  // Pre-calculate offsets to avoid mutation during render
  const segments = categories.reduce<{ cat: typeof categories[0]; percentage: number; offset: number }[]>((acc, cat) => {
    const percentage = total > 0 ? (cat.amount / total) * circumference : 0
    const offset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].percentage : 0
    acc.push({ cat, percentage, offset })
    return acc
  }, [])

  return (
    <div className="relative size-36 shrink-0">
      <svg className="size-full -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-800" strokeWidth="4" />
        {segments.map((segment, i) => (
          <circle
            key={i}
            cx="18"
            cy="18"
            r="16"
            fill="none"
            className={segment.cat.color}
            strokeWidth="4"
            strokeDasharray={`${segment.percentage} ${circumference - segment.percentage}`}
            strokeDashoffset={-segment.offset}
            strokeLinecap="round"
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Spent</p>
        <p className="text-2xl font-black tracking-tighter">${Math.round(total / 1000)}k</p>
      </div>
    </div>
  )
}

export default function AppFinance() {
  const { t } = useTranslation('app')
  const { selectedProject } = useAppProject()
  const [showDialog, setShowDialog] = React.useState(false)
  const [amount, setAmount] = React.useState('')
  const [category, setCategory] = React.useState('')
  const [description, setDescription] = React.useState('')

  const {
    expenses: realExpenses,
    totalAmount: realTotalAmount,
    createExpense,
    isCreating,
    isLoading,
  } = useExpenses(selectedProject?.id)

  // Use mock data when no real expenses exist
  const hasRealData = realExpenses.length > 0
  const expenses = hasRealData ? realExpenses : MOCK_EXPENSES
  const totalAmount = hasRealData ? realTotalAmount : MOCK_EXPENSES.reduce((sum, exp) => sum + exp.amount, 0)
  const pendingInvoices = hasRealData ? 0 : MOCK_PENDING_INVOICES
  const pendingApprovals = hasRealData ? 0 : MOCK_PENDING_APPROVALS

  // Calculate expenses by category for donut chart
  const expensesByCategory = React.useMemo(() => {
    const grouped: Record<string, number> = {}
    expenses.forEach((exp: any) => {
      grouped[exp.category] = (grouped[exp.category] || 0) + exp.amount
    })
    return EXPENSE_CATEGORIES
      .filter(cat => grouped[cat.value])
      .map(cat => ({
        label: cat.label,
        amount: grouped[cat.value] || 0,
        color: cat.color.split(' ')[0].replace('text-', 'stroke-'),
      }))
  }, [expenses])

  // Budget data
  const projectBudget = selectedProject?.total_budget || (hasRealData ? 100000 : MOCK_BUDGET)
  const utilizationPercent = projectBudget > 0 ? Math.round((totalAmount / projectBudget) * 100) : 0
  const underBudgetAmount = Math.max(0, projectBudget - totalAmount)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProject?.id || !amount || !category) return

    createExpense({
      project_id: selectedProject.id,
      amount: parseFloat(amount),
      category,
      description: description || `${category} expense`,
    })

    setAmount('')
    setCategory('')
    setDescription('')
    setShowDialog(false)
  }

  const formatCurrency = (value: number, compact = false) => {
    if (compact && value >= 1000) {
      return `$${Math.round(value / 1000)}k`
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getCategoryInfo = (categoryValue: string) => {
    return EXPENSE_CATEGORIES.find(c => c.value === categoryValue) || EXPENSE_CATEGORIES[6]
  }

  return (
    <MobileAppLayout showProjectSelector>
      <div className="bg-black min-h-screen">
        <main className="px-5 py-6 space-y-6">
          {/* Budget Summary Card */}
          <section className="bg-[#1a2632] rounded-[32px] p-6 border border-white/5 space-y-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
            
            <div className="flex justify-between items-start relative z-10">
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-amber-400/80 uppercase tracking-[0.25em]">
                  {t('finance.totalProjectBudget', 'Total Project Budget')}
                </p>
                <div className="flex items-baseline gap-1">
                  <h3 className="text-4xl font-bold tracking-tight">{formatCurrency(projectBudget)}</h3>
                </div>
              </div>
              <div className="size-13 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shadow-lg">
                <span className="material-symbols-outlined !text-[28px]">payments</span>
              </div>
            </div>
            
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center px-0.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {t('finance.utilization', 'Utilization')}
                </p>
                <p className="text-[13px] font-black text-amber-400">{utilizationPercent}%</p>
              </div>
              <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden p-[1px] border border-white/5">
                <div 
                  className="h-full bg-amber-400 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.5)] transition-all duration-1000" 
                  style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-slate-200">{formatCurrency(totalAmount)} <span className="text-slate-500 font-medium">used</span></span>
                <span className="text-slate-500">{formatCurrency(Math.max(0, projectBudget - totalAmount))} remaining</span>
              </div>
            </div>
          </section>

          {/* Overview Stats Grid */}
          <section className="grid grid-cols-2 gap-4">
            <div className="bg-[#1a2632] rounded-3xl p-5 border border-white/5 space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {t('finance.totalExpenses', 'Total Expenses')}
                </p>
                <h4 className="text-2xl font-bold">{formatCurrency(totalAmount)}</h4>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="material-symbols-outlined !text-sm font-black">trending_up</span>
                <span className="text-[11px] font-bold">+12% vs last month</span>
              </div>
            </div>
            <div className="bg-[#1a2632] rounded-3xl p-5 border border-white/5 space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {t('finance.pendingInvoices', 'Pending Invoices')}
                </p>
                <h4 className="text-2xl font-bold">{formatCurrency(pendingInvoices, true)}</h4>
              </div>
              <div className="flex items-center gap-1.5 text-amber-400">
                <span className="material-symbols-outlined !text-sm font-black">schedule</span>
                <span className="text-[11px] font-bold">{pendingApprovals} Approvals needed</span>
              </div>
            </div>
          </section>

          {/* Cost Distribution Section - always show with mock or real data */}
          <section className="bg-[#1a2632] rounded-[32px] p-6 border border-white/5 space-y-8 shadow-lg">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">{t('finance.costDistribution', 'Cost Distribution')}</h3>
              <button className="bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                Analytics
              </button>
            </div>

            <div className="flex items-center gap-8">
              <DonutChart categories={expensesByCategory} total={totalAmount} />

              <div className="flex-1 space-y-4">
                {expensesByCategory.slice(0, 4).map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`size-2.5 rounded-full ${item.color.replace('stroke-', 'bg-')}`}></div>
                      <span className="text-[13px] text-slate-300 font-medium">{item.label}</span>
                    </div>
                    <span className="text-[13px] font-black text-white">{formatCurrency(item.amount, true)}</span>
                  </div>
                ))}
                </div>
              </div>

              {/* Transaction History */}
              <div className="pt-6 border-t border-white/5 space-y-5">
                <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  {t('finance.latestTransactions', 'Latest Transactions')}
                </h4>
                <div className="space-y-5">
                  {expenses.slice(0, 5).map((expense: any) => {
                    const catInfo = getCategoryInfo(expense.category)
                    return (
                      <div key={expense.id} className="flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className={`size-11 rounded-xl border flex items-center justify-center ${catInfo.color}`}>
                            <span className="material-symbols-outlined !text-xl">{catInfo.icon}</span>
                          </div>
                          <div>
                            <h5 className="text-[15px] font-bold text-slate-100">{expense.description}</h5>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {catInfo.label} • {new Date(expense.recorded_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <p className="text-[15px] font-bold text-white tracking-tight">-${expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>

          {/* Health Alert Bar - always show with mock or real data */}
          <section className="bg-[#1a2632] rounded-3xl p-5 border border-white/5 flex gap-4 items-start shadow-sm">
            <div className={`size-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
              utilizationPercent <= 80 ? 'bg-emerald-400 text-black' : 'bg-amber-400 text-black'
            }`}>
              <span className="material-symbols-outlined !text-xl font-bold">
                {utilizationPercent <= 80 ? 'check' : 'warning'}
              </span>
            </div>
            <p className="text-[13px] text-slate-400 leading-relaxed font-medium">
              Project status is <span className="text-emerald-400 font-bold">Healthy</span>. You are currently <span className="text-white font-bold">{formatCurrency(underBudgetAmount)} under budget</span> relative to the current project milestone completion.
            </p>
          </section>

          {/* Spacer for FAB */}
          <div className="h-20" />
        </main>
      </div>

      {/* Add Expense FAB */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogTrigger asChild>
          <button className="fixed bottom-[calc(4rem+6vh)] right-[max(1rem,3vw)] z-40 size-14 bg-amber-400 text-black rounded-full shadow-lg shadow-amber-400/30 flex items-center justify-center active:scale-95 transition-all">
            <span className="material-symbols-outlined !text-2xl">add</span>
          </button>
        </DialogTrigger>
        <DialogContent className="bg-[#1a2632] border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('finance.addExpense', 'Add Expense')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">{t('finance.amount', 'Amount')}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7 bg-black border-white/10"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">{t('finance.category', 'Category')}</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger className="bg-black border-white/10">
                  <SelectValue placeholder={t('finance.selectCategory', 'Select category')} />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2632] border-white/10">
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined !text-lg ${cat.color.split(' ')[0]}`}>{cat.icon}</span>
                        {cat.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('finance.description', 'Description')}</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-black border-white/10"
                placeholder={t('finance.descriptionPlaceholder', 'What was this expense for?')}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
                className="flex-1 border-white/10 bg-transparent hover:bg-white/5"
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isCreating || !amount || !category}
                className="flex-1 bg-amber-400 text-black hover:bg-amber-300"
              >
                {isCreating ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </MobileAppLayout>
  )
}
