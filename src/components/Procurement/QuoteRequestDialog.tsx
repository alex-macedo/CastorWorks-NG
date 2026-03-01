import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateInput } from '@/components/ui/DateInput';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Mail, MessageCircle, Loader2, Eye, Search, Users, Copy } from 'lucide-react';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useSendQuoteRequests } from '@/hooks/useQuoteRequests';
import { usePurchaseRequest } from '@/hooks/usePurchaseRequests';
import { useLocalization } from '@/contexts/LocalizationContext';
import { generateEmailTemplate, generateWhatsAppTemplateWithLabels } from '@/utils/messageTemplates';
import { QuoteRequestFormSchema, type QuoteRequestFormData, type QuoteRequestFormInput } from '@/types/procurement.types';
import { useToast } from '@/hooks/use-toast';
import { SupplierContactBadge } from './SupplierContactBadge';
import { SelectedSuppliersChips } from './SelectedSuppliersChips';
import { SupplierSelector } from './SupplierSelector';

interface QuoteRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseRequestId: string;
}

const getDefaultResponseDeadline = () =>
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

const getTrackingCode = () =>
  `QR-${(globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
    ? globalThis.crypto.randomUUID()
    : String(Date.now())}`;

export function QuoteRequestDialog({
  open,
  onOpenChange,
  purchaseRequestId,
}: QuoteRequestDialogProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [mobileStep, setMobileStep] = useState<'suppliers' | 'preview'>('suppliers');
  const { t } = useLocalization();
  const { toast } = useToast();
  const { suppliers, isLoading: suppliersLoading } = useSuppliers();
  const { purchaseRequest, isLoading: purchaseRequestLoading } = usePurchaseRequest(purchaseRequestId);
  const sendQuoteRequests = useSendQuoteRequests();
  
  const form = useForm<QuoteRequestFormData>({
    resolver: zodResolver(QuoteRequestFormSchema),
    defaultValues: {
      purchase_request_id: purchaseRequestId,
      supplier_ids: [],
      response_deadline: getDefaultResponseDeadline(), // Default: 7 days from now
    },
  });

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');

  // Watch form values for reactive updates
  const watchedSupplierIds = useWatch({ control: form.control, name: 'supplier_ids' });
  const watchedDeadline = useWatch({ control: form.control, name: 'response_deadline' });

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  
  // Filter suppliers based on search query
  const filteredSuppliers = useMemo(() => {
    const activeSuppliers = suppliers?.filter(supplier => supplier.is_active !== false) || [];
    
    if (!searchQuery.trim()) {
      return activeSuppliers;
    }
    
    const query = searchQuery.toLowerCase();
    return activeSuppliers.filter(supplier =>
      supplier.name?.toLowerCase().includes(query) ||
      supplier.contact_email?.toLowerCase().includes(query) ||
      supplier.contact_phone?.toLowerCase().includes(query)
    );
  }, [suppliers, searchQuery]);

  // Get preferred suppliers for quick selection (high-rated suppliers)
  const preferredSuppliers = useMemo(() => {
    return filteredSuppliers.filter(supplier => 
      supplier.rating >= 4 && supplier.orders_completed > 0
    );
  }, [filteredSuppliers]);
  
  // Generate message previews when form data or purchase request changes
  const messagePreview = useMemo(() => {
    if (!purchaseRequest || !watchedDeadline) {
      return { emailHtml: '', whatsappText: '' };
    }

    const deadline = new Date(watchedDeadline);
    // For preview purposes we show a shortened tracking code (first 8 chars)
    const shortenForDisplay = (code: string) => {
      if (!code) return code;
      // If prefixed with QR- keep prefix and shorten the rest
      if (code.startsWith('QR-')) {
        return `QR-${code.slice(3, 11)}`;
      }
      return code.slice(0, 8);
    };

    const previewShortTracking = 'QR-XXXXXXXX';

    const templateData = {
      requestNumber: 'QR-2025-001', // This would be generated on send
      projectName: purchaseRequest.projects?.name || 'Project',
      clientName: purchaseRequest.projects?.client_name || '',
      location: purchaseRequest.projects?.location || '',
      requestedBy: purchaseRequest.requested_by || '',
      // Map priority value to localized label when available
      priority: (purchaseRequest.priority && t(`procurement.priorityLabels.${purchaseRequest.priority}`)) || t('procurement.priorityLabels.medium') || 'Medium',
      items: purchaseRequest.purchase_request_items?.map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        supplier: item.supplier,
      })) || [],
      deadline: deadline,
      // Use a short placeholder for previews so the UI remains readable
      trackingCode: previewShortTracking,
    };

    const labels = {
      project: t('procurement.project'),
      client: t('procurement.client') || t('procurement.client'),
      location: t('procurement.location') || t('procurement.location'),
      requestedBy: t('procurement.requestedBy'),
      priority: t('procurement.priority'),
      requiredItems: t('procurement.items'),
      description: t('procurement.description'),
      quantity: t('procurement.quantity'),
      unit: t('procurement.requestFields.unitPrice'),
      preferredSupplier: t('procurement.requestFields.supplier'),
      responseDeadline: t('procurement.responseDeadline'),
      trackingCode: t('procurement.trackingCode') || 'Tracking Code',
      howToRespond: t('procurement.howToRespond') || 'How to Respond',
      quoteRequestInstructions: t('procurement.quoteRequestInstructions') || '',
      footer: t('procurement.messagePreview') || '',
    };

    return {
      emailHtml: generateEmailTemplate(templateData, labels),
      whatsappText: generateWhatsAppTemplateWithLabels(templateData, labels),
    };
  }, [purchaseRequest, watchedDeadline, t]);

  // Use the same short placeholder when rendering the instruction above previews
  const quoteRequestInstructions = t('procurement.quoteRequestInstructions', { trackingCode: 'QR-XXXXXXXX' });

  const handleToggleSupplier = (supplierId: string) => {
    const currentSuppliers = form.getValues('supplier_ids');
    const newSuppliers = currentSuppliers.includes(supplierId)
      ? currentSuppliers.filter(id => id !== supplierId)
      : [...currentSuppliers, supplierId];
    form.setValue('supplier_ids', newSuppliers);
  };

  const handleSelectAllPreferred = (checked: boolean) => {
    if (checked) {
      const currentSuppliers = form.getValues('supplier_ids');
      const preferredIds = preferredSuppliers.map(s => s.id);
      const newSuppliers = [...new Set([...currentSuppliers, ...preferredIds])];
      form.setValue('supplier_ids', newSuppliers);
    } else {
      const currentSuppliers = form.getValues('supplier_ids');
      const preferredIds = new Set(preferredSuppliers.map(s => s.id));
      const newSuppliers = currentSuppliers.filter(id => !preferredIds.has(id));
      form.setValue('supplier_ids', newSuppliers);
    }
  };

  const handleRemoveSupplier = (supplierId: string) => {
    handleToggleSupplier(supplierId);
  };

  const handleClearAllSuppliers = () => {
    form.setValue('supplier_ids', []);
  };

  const isAllPreferredSelected = preferredSuppliers.length > 0 &&
    preferredSuppliers.every(supplier => watchedSupplierIds?.includes(supplier.id));

  // contact badges are rendered by SupplierContactBadge component which uses localization

  const handleSend = async (data: QuoteRequestFormData) => {
    try {
      // Ensure required fields are present
      // Generate a UUID-based tracking code (prefixed with QR-). Uses the Web Crypto API.
      const trackingCode = getTrackingCode();

      const formInput: QuoteRequestFormInput = {
        purchase_request_id: data.purchase_request_id || purchaseRequestId,
        supplier_ids: data.supplier_ids || [],
        response_deadline: data.response_deadline || '',
        tracking_code: trackingCode,
      };

      await sendQuoteRequests.mutateAsync(formInput);

      // Reset form
      form.reset({
        purchase_request_id: purchaseRequestId,
        supplier_ids: [],
        response_deadline: getDefaultResponseDeadline(),
      });
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleCopyEmail = async () => {
    try {
      // Create a temporary div to extract text from HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = messagePreview.emailHtml;
      const textContent = tempDiv.textContent || tempDiv.innerText || '';
      
      await navigator.clipboard.writeText(textContent);
      toast({
        title: t('procurement.copied') || 'Copied!',
        description: t('procurement.emailCopied') || 'Email message copied to clipboard',
      });
    } catch (error) {
      toast({
        title: t('procurement.error') || 'Error',
        description: t('procurement.copyFailed') || 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleCopyWhatsApp = async () => {
    try {
      await navigator.clipboard.writeText(messagePreview.whatsappText);
      toast({
        title: t('procurement.copied') || 'Copied!',
        description: t('procurement.whatsappCopied') || 'WhatsApp message copied to clipboard',
      });
    } catch (error) {
      toast({
        title: t('procurement.error') || 'Error',
        description: t('procurement.copyFailed') || 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const activeSuppliers = suppliers || [];

  return (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent
      className="max-w-4xl w-[95vw] lg:w-[800px] max-h-[90vh] overflow-y-auto bg-background p-0"
    >
        <DialogHeader className="p-6 pb-2 border-b">
          <DialogTitle className="text-2xl font-bold">{t('procurement.sendQuoteRequests')}</DialogTitle>
          <DialogDescription className="text-sm mt-1">
            {t('procurement.sendQuoteRequestsDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="quote-request-form"
            onSubmit={form.handleSubmit(handleSend)}
            className="flex flex-col gap-6 py-4 text-base h-full"
          >
            <div className={`grid gap-6 p-6 h-full ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
              {/* Suppliers Column */}
              {(!isMobile || mobileStep === 'suppliers') && (
                <div className="flex flex-col gap-4 h-full min-h-0">
                  <FormField
                    control={form.control}
                    name="supplier_ids"
                    render={({ field }) => (
                      <FormItem className="flex flex-col h-full">
                        <FormLabel>{t('procurement.selectSuppliers')}</FormLabel>
                        <FormControl>
                          <SupplierSelector
                            suppliers={suppliers || []}
                            isLoading={suppliersLoading}
                            selectedIds={field.value}
                            onToggleSupplier={(id) => handleToggleSupplier(id)}
                            onClearAll={handleClearAllSuppliers}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="response_deadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('procurement.responseDeadline')}</FormLabel>
                        <FormControl>
                          <DateInput
                            value={field.value || ''}
                            onChange={field.onChange}
                            placeholder={t('common.selectDate')}
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isMobile && (
                    <div className="flex justify-end gap-3 pt-2">
                      <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t('common.cancel')}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setMobileStep('preview')}
                        disabled={
                          !watchedSupplierIds?.length ||
                          !watchedDeadline ||
                          sendQuoteRequests.isPending
                        }
                      >
                        {t('common.next') || 'Next'}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Message Preview Section */}
              {(!isMobile || mobileStep === 'preview') && (
              <div className="flex flex-col gap-3 h-full min-h-0">
            {/* Message Preview Section */}
          <div className="space-y-3 flex-1 min-h-0">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <Label>{t('procurement.messagePreview')}</Label>
            </div>
            
            {purchaseRequestLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}

            {!purchaseRequestLoading && (
              <div className="space-y-3 h-full flex flex-col">
                <Tabs defaultValue="email" variant="pill" className="w-full h-full flex flex-col gap-3">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {t('procurement.email')}
                    </TabsTrigger>
                    <TabsTrigger value="whatsapp" className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      {t('procurement.whatsapp')}
                    </TabsTrigger>
                  </TabsList>
                  <div className="flex justify-end gap-3 pt-1">
                    {isMobile && (
                      <Button variant="outline" onClick={() => setMobileStep('suppliers')}>
                        {t('common.previous') || 'Previous'}
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                      {t('common.cancel')}
                    </Button>
                    <Button
                      type="submit"
                      form="quote-request-form"
                      disabled={
                        !watchedSupplierIds?.length ||
                        !watchedDeadline ||
                        sendQuoteRequests.isPending
                      }
                    >
                      {sendQuoteRequests.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('common.sending')}
                        </>
                      ) : (
                        t('common.send') || 'Send'
                      )}
                    </Button>
                  </div>

                  <TabsContent value="email" className="mt-1 flex-1 min-h-0">
                    <div className="relative h-full">
                      <div className="border rounded-md p-3 h-full overflow-y-auto bg-card text-base text-foreground email-preview-content relative">
                        <div className="sticky top-0 left-0 right-0 flex justify-end pb-2 bg-card/80 z-20">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleCopyEmail}
                            className="z-30"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            {t('procurement.copy') || 'Copy'}
                          </Button>
                        </div>
                        <div
                          className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground"
                          dangerouslySetInnerHTML={{ __html: messagePreview.emailHtml }}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="whatsapp" className="mt-1 flex-1 min-h-0">
                    <div className="relative h-full">
                      <div className="border rounded-md p-3 h-full overflow-y-auto bg-card font-mono text-base whitespace-pre-wrap text-foreground email-preview-content relative">
                        <div className="sticky top-0 left-0 right-0 flex justify-end pb-2 bg-card/80 z-20">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleCopyWhatsApp}
                            className="z-30"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            {t('procurement.copy') || 'Copy'}
                          </Button>
                        </div>
                        {messagePreview.whatsappText}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
            </div>
          </div>
              )}
            </div>
          </form>
        </Form>
    </DialogContent>
  </Dialog>
  );
}
