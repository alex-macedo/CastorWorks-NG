import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useQuoteApprovalLogs } from '@/hooks/useQuoteApprovalLogs';
import { useLocalization } from '@/contexts/LocalizationContext';
import { formatDate } from '@/utils/formatters';
import { CheckCircle, XCircle, User, Mail, Calendar, FileText } from 'lucide-react';

interface QuoteApprovalHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  quoteName: string;
  supplierName: string;
}

export function QuoteApprovalHistoryDialog({
  open,
  onOpenChange,
  quoteId,
  quoteName,
  supplierName,
}: QuoteApprovalHistoryDialogProps) {
  const { t, dateFormat } = useLocalization();
  const { approvalLogs, isLoading } = useQuoteApprovalLogs(quoteId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('procurement.approvalHistory')}</DialogTitle>
          <DialogDescription>
            <div className="mt-2 space-y-1">
              <p className="font-medium text-foreground">{quoteName}</p>
              <p className="text-sm">{t('procurement.requestFields.supplier')}: {supplierName}</p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            <p className="text-center text-muted-foreground">{t('common.loading')}</p>
          ) : approvalLogs && approvalLogs.length > 0 ? (
            <div className="space-y-3">
              {approvalLogs.map((log, index) => (
                <Card key={log.id} className={index === 0 ? 'border-2 border-primary' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {log.action === 'approved' ? (
                          <CheckCircle className="h-5 w-5 text-success" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                        <Badge
                          variant={log.action === 'approved' ? 'default' : 'destructive'}
                          className={
                            log.action === 'approved'
                              ? 'bg-success hover:bg-success/90'
                              : ''
                          }
                        >
                          {log.action === 'approved'
                            ? t('procurement.approved')
                            : t('procurement.rejected')}
                        </Badge>
                      </div>
                      {index === 0 && (
                        <Badge variant="outline" className="text-xs">
                          {t('procurement.mostRecent')}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium">{t('procurement.dateTime')}:</span>
                         <span>{formatDate(log.created_at)} {new Date(log.created_at).toLocaleTimeString()}</span>
                      </div>

                      {log.notes && (
                        <div className="pt-2 border-t">
                          <div className="flex items-start gap-2">
                            <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                            <div className="flex-1">
                              <span className="font-medium">{t('procurement.notes')}:</span>
                              <p className="mt-1 text-foreground whitespace-pre-wrap">{log.notes}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t('procurement.noApprovalHistory')}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
