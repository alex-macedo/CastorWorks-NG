import { useLocalization } from "@/contexts/LocalizationContext";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { formatDate } from "@/utils/reportFormatters";

interface ExportButtonProps {
  entries: Array<any>;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "glass-style-white" | "glass-style-dark" | "glass-style-destructive";
  className?: string;
}

export function ExportButton({ entries, variant = "outline", className }: ExportButtonProps) {
  const { t, currency } = useLocalization();

  const handleExport = () => {
    // Prepare CSV headers
    const headers = [
      t('financial.ledger.columns.date'),
      t('financial.ledger.columns.reference'),
      t('financial.ledger.columns.description'),
      t('financial.ledger.columns.project'),
      t('financial.ledger.columns.category'),
      t('financial.ledger.columns.type'),
      t('financial.ledger.columns.paymentMethod'),
      t('financial.ledger.columns.recipientPayer'),
      t('financial.ledger.columns.debit'),
      t('financial.ledger.columns.credit'),
      t('financial.ledger.columns.balance'),
    ].join(',');

    // Prepare CSV rows
    const rows = entries.map(entry => {
      const dateStr = formatDate(entry.date);
      const debit = entry.entry_type === 'expense' ? Number(entry.amount) : 0;
      const credit = entry.entry_type === 'income' ? Number(entry.amount) : 0;

      return [
        dateStr,
        `"${entry.reference || ''}"`,
        `"${entry.description || ''}"`,
        `"${entry.projects?.name || ''}"`,
        `"${entry.category || ''}"`,
        entry.entry_type === 'income' ? t('financial.income') : t('financial.expense'),
        `"${entry.payment_method || ''}"`,
        `"${entry.recipient_payer || ''}"`,
        debit,
        credit,
        entry.balance,
      ].join(',');
    });

    // Combine headers and rows
    const csv = [headers, ...rows].join('\n');

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `financial-ledger-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button variant={variant} onClick={handleExport} disabled={entries.length === 0} className={className}>
      <Download className="mr-2 h-4 w-4" />
      {t('financial.ledger.export')}
    </Button>
  );
}
