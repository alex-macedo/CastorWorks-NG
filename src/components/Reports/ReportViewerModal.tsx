import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Folder, Printer, Mail, MessageCircle, X, Loader2 } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useReportPDF, type ReportType } from './hooks/useReportPDF';
import { useStoreReportToFolder } from './hooks/useStoreReportToFolder';
import { ReportEmailDialog } from './ReportEmailDialog';
import { ReportWhatsAppDialog } from './ReportWhatsAppDialog';

interface INSSReportData {
  projectName: string;
  taxProject: any;
  calculation: any;
  projectId?: string;
  constructionMonths?: number;
}

interface ReportViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: ReportType;
  reportData: INSSReportData | any; // Type-specific report data
  projectId: string;
  reportTitle: string;
  clientEmail?: string;
  clientPhone?: string;
}

export function ReportViewerModal({
  isOpen,
  onClose,
  reportType,
  reportData,
  projectId,
  reportTitle,
  clientEmail,
  clientPhone,
}: ReportViewerModalProps) {
  const { t } = useLocalization();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);

  console.log('ReportViewerModal render', { isOpen, reportType, hasReportData: !!reportData });

  // Generate PDF as blob
  const { pdfBlob, pdfUrl, isGenerating, error: pdfError, clearPDF } = useReportPDF({
    reportType,
    reportData,
    t,
    enabled: isOpen,
  });

  // Cleanup PDF when modal closes
  const handleClose = () => {
    clearPDF();
    onClose();
  };

  // Store to folder mutation
  const storeToFolder = useStoreReportToFolder();

  // Generate filename based on report type
  const getFilename = () => {
    switch (reportType) {
      case 'inss':
        return `Proposta_INSS_${reportData.projectName?.replace(/\s+/g, '_') || 'report'}.pdf`;
      default:
        return `${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    }
  };

  const filename = getFilename();

  // Handle store to folder
  const handleStoreToFolder = async () => {
    if (!pdfBlob) {
      return;
    }

    try {
      await storeToFolder.mutateAsync({
        projectId,
        pdfBlob,
        filename,
        description: `Report: ${reportTitle}`,
      });
    } catch (error) {
      // Error is handled by mutation
    }
  };

  // Handle print
  const handlePrint = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      } else {
        // Fallback: use iframe print
        window.print();
      }
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        console.log('Dialog onOpenChange', { open, isOpen });
        if (!open) {
          handleClose();
        }
      }}>
        <DialogContent size="fullscreen" className="flex flex-col p-0">
          <DialogHeader className="flex-shrink-0 border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold">{reportTitle}</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Action Buttons Toolbar */}
          <div className="flex-shrink-0 border-b px-6 py-3 flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={handleStoreToFolder}
              disabled={!pdfBlob || storeToFolder.isPending}
              className="flex items-center gap-2"
            >
              {storeToFolder.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('reportViewer.storing', { defaultValue: 'Storing...' })}
                </>
              ) : (
                <>
                  <Folder className="h-4 w-4" />
                  {t('reportViewer.storeToFolder', { defaultValue: 'Store to Client Folder' })}
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handlePrint}
              disabled={!pdfUrl}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              {t('reportViewer.print', { defaultValue: 'Print' })}
            </Button>

            <Button
              variant="outline"
              onClick={() => setEmailDialogOpen(true)}
              disabled={!pdfBlob}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              {t('reportViewer.sendEmail', { defaultValue: 'Send Email' })}
            </Button>

            <Button
              variant="outline"
              onClick={() => setWhatsappDialogOpen(true)}
              disabled={!pdfBlob}
              className="flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              {t('reportViewer.sendWhatsApp', { defaultValue: 'Send WhatsApp' })}
            </Button>
          </div>

          {/* PDF Viewer */}
          <div className="flex-1 overflow-hidden relative">
            {isGenerating && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    {t('reportViewer.generating', { defaultValue: 'Generating report...' })}
                  </p>
                </div>
              </div>
            )}

            {pdfError && (
              <div className="absolute inset-0 flex items-center justify-center bg-background">
                <div className="text-center space-y-2">
                  <p className="text-destructive font-medium">
                    {t('reportViewer.error.generation', { defaultValue: 'Failed to generate report' })}
                  </p>
                  <p className="text-sm text-muted-foreground">{pdfError.message}</p>
                </div>
              </div>
            )}

            {pdfUrl && !isGenerating && !pdfError && (
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0 min-h-[600px]"
                title={reportTitle}
              />
            )}

            {!pdfUrl && !isGenerating && !pdfError && (
              <div className="absolute inset-0 flex items-center justify-center bg-background">
                <p className="text-muted-foreground">
                  {t('reportViewer.noPreview', { defaultValue: 'No preview available' })}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      {pdfBlob && (
        <ReportEmailDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          pdfBlob={pdfBlob}
          filename={filename}
          projectId={projectId}
          defaultRecipient={clientEmail}
          defaultSubject={`Report: ${reportTitle}`}
        />
      )}

      {/* WhatsApp Dialog */}
      {pdfBlob && (
        <ReportWhatsAppDialog
          open={whatsappDialogOpen}
          onOpenChange={setWhatsappDialogOpen}
          pdfBlob={pdfBlob}
          filename={filename}
          projectId={projectId}
          defaultPhone={clientPhone}
        />
      )}
    </>
  );
}
