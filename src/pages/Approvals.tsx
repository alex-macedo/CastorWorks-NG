import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/utils/formatters';
import { useLocalization } from '@/contexts/LocalizationContext';
import { logAdminEvent } from '@/lib/telemetry';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

const Approvals = () => {
  const { t, currency } = useLocalization();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [noClientLinked, setNoClientLinked] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const fetchScopedQuotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: payload, error: fnErr } = await (supabase as any).functions.invoke('get_pending_quotes_for_user');
      if (fnErr) throw fnErr;

      if (payload && payload.clientFound === false) {
        const { data: { user } } = await supabase.auth.getUser();
        logAdminEvent('approvals.no_client_linked', { userEmail: user?.email });
        setQuotes([]);
        setNoClientLinked(true);
        setIsLoading(false);
        return;
      }

      setQuotes(payload.quotes || []);
    } catch (err) {
      console.error('Failed to fetch scoped quotes (edge):', err);
      setQuotes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScopedQuotes();
  }, [fetchScopedQuotes]);

  const pendingQuotes = quotes.filter(q => q.status === 'pending');

  const approveMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      const { data, error } = await supabase
        .from('quotes')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', quoteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: (id: string) => {
      setApprovingId(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast({ title: t('common.success'), description: 'Quote approved' });
      setApprovingId(null);
      fetchScopedQuotes();
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message || 'Failed to approve', variant: 'destructive' });
      setApprovingId(null);
    },
  });

  if (isLoading) return <div className="p-6">{(t as any)("commonUI.loading") }</div>;

  if (noClientLinked) {
    return (
      <div className="p-6">
        <SidebarHeaderShell>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{t('procurement.pendingApprovals')}</h1>
            </div>
          </div>
        </SidebarHeaderShell>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded mt-6">
          <p className="text-sm text-yellow-800">
            {t('procurement.noClientLinked') || 'No client account linked. Please ask an administrator to link your account to a client profile to see approvals.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <SidebarHeaderShell>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-sidebar-primary-foreground">{t('procurement.pendingApprovals')}</h1>
          </div>
        </div>
      </SidebarHeaderShell>
      <div className="mt-6">
        {pendingQuotes.length === 0 ? (
          <p className="text-muted-foreground">{t('procurement.noQuotes')}</p>
        ) : (
          <div className="grid gap-4">
            {pendingQuotes.map((q: any) => (
              <Card key={q.id}>
                <CardContent className="flex justify-between items-center pt-6">
                  <div>
                    <div className="font-semibold">{q.purchase_request_items?.description || 'Item'}</div>
                    <div className="text-sm text-muted-foreground">{q.suppliers?.name || 'Supplier'}</div>
                    <div className="text-sm">{formatCurrency(q.total_price, currency)}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      className="bg-success hover:bg-success/90"
                      onClick={() => approveMutation.mutate(q.id)}
                      disabled={approvingId === q.id}
                    >
                      {t('procurement.approveQuote')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Approvals;
