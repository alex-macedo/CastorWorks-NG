import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinancialEntries } from '@/hooks/useFinancialEntries';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useDateFormat } from '@/hooks/useDateFormat';
import { formatCurrency } from '@/utils/formatters';
import { CalendarClock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function InstallmentsDue() {
  const { t, currency } = useLocalization();
  const { formatDate } = useDateFormat();
  const { financialEntries } = useFinancialEntries();
  const { settings } = useAppSettings();
  const navigate = useNavigate();

  const dueDays = settings?.installments_due_days || 3;

  const dueInstallments = financialEntries?.filter(entry => {
    if (entry.entry_type !== 'income' && entry.entry_type !== 'expense') return false;
    if (!entry.date) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const entryDate = new Date(entry.date);
    entryDate.setHours(0, 0, 0, 0);
    
    const diffTime = entryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays >= 0 && diffDays <= dueDays;
  }) || [];

  if (dueInstallments.length === 0) return null;

  return (
    <Card className="rounded-tl-0 rounded-tr-xl rounded-br-xl rounded-bl-xl border-border/50 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
           <CalendarClock className="h-5 w-5 text-warning" />
           {t('dashboard.installmentsDue', { days: dueDays })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {dueInstallments.map(entry => (
             <div key={entry.id} className="flex justify-between items-center p-2 rounded hover:bg-muted/50 cursor-pointer" onClick={() => navigate('/financial')}>
                <div>
                  <p className="font-medium text-base">{entry.description}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(entry.date)}</p>
                </div>
                <div className={entry.entry_type === 'income' ? 'text-success' : 'text-destructive'}>
                  {entry.entry_type === 'income' ? '+' : '-'} {formatCurrency(entry.amount, currency)}
                </div>
             </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
