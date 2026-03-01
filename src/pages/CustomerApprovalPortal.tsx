import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDateFormat } from '@/hooks/useDateFormat';
import { QuoteComparisonCards } from '@/components/CustomerPortal/QuoteComparisonCards';
import { QuoteDetailView } from '@/components/CustomerPortal/QuoteDetailView';
import { ApprovalActionBar } from '@/components/CustomerPortal/ApprovalActionBar';
import { ApprovalSuccessScreen } from '@/components/CustomerPortal/ApprovalSuccessScreen';
import { DesktopQuoteComparison } from '@/components/CustomerPortal/DesktopQuoteComparison';
import { useLocalization } from "@/contexts/LocalizationContext";

interface TokenValidation {
  valid: boolean;
  error?: string;
  expired?: boolean;
  approved?: boolean;
  token?: {
    id: string;
    customer_email: string;
    customer_phone?: string;
    expires_at: string;
    accessed_at: string;
  };
  purchase_request?: {
    id: string;
    status: string;
    description?: string;
    priority?: string;
    delivery_date?: string;
    projects?: {
      id: string;
      name: string;
      description?: string;
    };
    purchase_request_items?: Array<{
      id: string;
      description: string;
      quantity: number;
      unit?: string;
      estimated_price?: number;
    }>;
    quote_count: number;
  };
  quotes?: Array<any>;
}

import { logError } from '@/lib/logger-migration';

export default function CustomerApprovalPortal() {
  const { formatDate } = useDateFormat();
  const { t } = useLocalization();
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [validation, setValidation] = useState<TokenValidation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [approvalSelectedQuoteId, setApprovalSelectedQuoteId] = useState<string | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approved' | 'rejected' | null>(null);

  // Detect desktop screen size (>= 1024px)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const validateToken = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Call validate-approval-token edge function
      const { data, error: functionError } = await supabase.functions.invoke(
        'validate-approval-token',
        {
          body: { token },
        }
      );

      if (functionError) {
        throw functionError;
      }

      if (!data.valid) {
        setError(data.error || 'Invalid or expired approval link');
        setValidation(data);
      } else {
        setValidation(data);
      }
    } catch (err) {
      logError('Token validation error', err);
      setError('Failed to validate approval link. Please try again or contact support.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setError('No approval token provided');
      setLoading(false);
      return;
    }

    validateToken();
  }, [token, validateToken]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Validating approval link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state - Invalid/Expired token
  if (error || !validation?.valid) {
    const isExpired = validation?.expired;
    const isApproved = validation?.approved;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              {isExpired && <Clock className="h-6 w-6 text-warning" />}
              {isApproved && <CheckCircle className="h-6 w-6 text-success" />}
              {!isExpired && !isApproved && <XCircle className="h-6 w-6 text-destructive" />}
              <CardTitle>
                {isExpired ? 'Link Expired' : isApproved ? 'Already Approved' : 'Invalid Link'}
              </CardTitle>
            </div>
            <CardDescription>
              {error || 'This approval link cannot be used'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {isExpired && 'This approval link has expired. Please contact your project manager for a new link.'}
                {isApproved && 'A quote has already been approved for this request. No further action is needed.'}
                {!isExpired && !isApproved && 'This approval link is invalid or has been revoked. Please contact your project manager.'}
              </AlertDescription>
            </Alert>
            <div className="mt-6 flex flex-col gap-2">
              <Button variant="outline" onClick={validateToken}>
                Try Again
              </Button>
              <Link to="/">
                <Button variant="ghost" className="w-full">
                  Go to Homepage
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid token - Show approval portal
  const { purchase_request, quotes } = validation;

  // Show success screen after approval/rejection
  if (approvalAction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
        <ApprovalSuccessScreen action={approvalAction} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4 pb-32">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-6 w-6 text-success" />
              <CardTitle className="text-2xl">Quote Approval</CardTitle>
            </div>
            <CardDescription>
              Review and approve quotes for your project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("commonUI.project") }</span>
                <span className="font-medium">{purchase_request?.projects?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-medium">{validation.token?.customer_email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quotes Available:</span>
                <span className="font-medium">{quotes?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Link Expires:</span>
                <span className="font-medium">
                  {validation.token?.expires_at
                    ? formatDate(validation.token.expires_at)
                    : 'N/A'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Request Details */}
        {purchase_request && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t('customerApprovalPortal.requestDetails')}</CardTitle>
              <CardDescription>{t('customerApprovalPortal.itemsRequested')}</CardDescription>
            </CardHeader>
            <CardContent>
              {purchase_request.description && (
                <p className="text-sm text-muted-foreground mb-4">
                  {purchase_request.description}
                </p>
              )}
              
              {purchase_request.purchase_request_items && purchase_request.purchase_request_items.length > 0 ? (
                <div className="space-y-2">
                  {purchase_request.purchase_request_items.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex justify-between items-center p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm text-muted-foreground">
                          Quantity: {item.quantity} {item.unit || 'units'}
                        </p>
                      </div>
                      {item.estimated_price && (
                        <span className="text-sm text-muted-foreground">
                          Est: ${item.estimated_price.toLocaleString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('toast.noItemsListed')}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quotes Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t('customerApprovalPortal.supplierQuotes')}</CardTitle>
            <CardDescription>
              {quotes && quotes.length > 0
                ? 'Compare quotes and select the best option for your project'
                : 'No quotes available yet'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {quotes && quotes.length > 0 ? (
              <>
                {!selectedQuoteId ? (
                  // Show quote comparison - desktop or mobile view
                  isDesktop ? (
                    <DesktopQuoteComparison
                      quotes={quotes}
                      onQuoteSelect={(quoteId) => setSelectedQuoteId(quoteId)}
                      selectedQuoteId={approvalSelectedQuoteId}
                      approvedQuoteId={approvalSelectedQuoteId}
                    />
                  ) : (
                    <QuoteComparisonCards
                      quotes={quotes}
                      onViewDetails={(quoteId) => setSelectedQuoteId(quoteId)}
                    />
                  )
                ) : (
                  // Show detailed view of selected quote
                  <>
                    {(() => {
                      const selectedQuote = quotes.find(q => q.id === selectedQuoteId);
                      if (!selectedQuote) {
                        setSelectedQuoteId(null);
                        return null;
                      }

                      // Determine if this quote is recommended (lowest price)
                      const lowestPrice = Math.min(...quotes.map(q => q.total_amount));
                      const isRecommended = selectedQuote.total_amount === lowestPrice;

                      return (
                        <QuoteDetailView
                          quote={selectedQuote}
                          onClose={() => setSelectedQuoteId(null)}
                          onSelectForApproval={(quoteId) => {
                            setApprovalSelectedQuoteId(quoteId);
                            setSelectedQuoteId(null); // Close detail view
                          }}
                          isRecommended={isRecommended}
                        />
                      );
                    })()}
                  </>
                )}
              </>
            ) : (
              <Alert>
                <AlertDescription>
                  No quotes have been received yet. Your project manager will notify you when quotes are available.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Approval Action Bar - Fixed at bottom */}
      {quotes && quotes.length > 0 && token && (
        <ApprovalActionBar
          selectedQuote={approvalSelectedQuoteId ? quotes.find(q => q.id === approvalSelectedQuoteId) : null}
          token={token}
          onSuccess={(action) => setApprovalAction(action)}
        />
      )}
    </div>
  );
}
