import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface PrefabInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  supplier_name: string;
  total_value: number;
  item_category: 'prefab_eligible' | 'prefab_excluded' | 'other';
  verified: boolean;
}

interface PrefabInvoiceManagerProps {
  taxProjectId: string;
}

export function PrefabInvoiceManager({ taxProjectId }: PrefabInvoiceManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);

  // Fetch invoices
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['prefab_invoices', taxProjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_prefab_invoices')
        .select('*')
        .eq('tax_project_id', taxProjectId)
        .order('invoice_date', { ascending: false });

      if (error) throw error;
      return data as PrefabInvoice[];
    },
  });

  // Fetch summary
  const { data: summary } = useQuery({
    queryKey: ['prefab_invoices_summary', taxProjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_prefab_invoice_summary')
        .select('*')
        .eq('tax_project_id', taxProjectId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tax_prefab_invoices')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prefab_invoices', taxProjectId] });
      queryClient.invalidateQueries({ queryKey: ['prefab_invoices_summary', taxProjectId] });
      toast({ title: 'Invoice deleted' });
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Eligible Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {summary?.eligible_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Excluded Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              R$ {summary?.excluded_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Grand Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {summary?.grand_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Prefabricated Material Invoices</CardTitle>
            <CardDescription>Track invoices to qualify for the 70% INSS reduction</CardDescription>
          </div>
          <Button onClick={() => setIsAdding(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Invoice
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center">Loading...</TableCell></TableRow>
              ) : invoices?.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No invoices found</TableCell></TableRow>
              ) : (
                invoices?.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{format(new Date(inv.invoice_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="font-mono">{inv.invoice_number}</TableCell>
                    <TableCell>{inv.supplier_name}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        inv.item_category === 'prefab_eligible' ? 'bg-green-100 text-green-800' :
                        inv.item_category === 'prefab_excluded' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {inv.item_category === 'prefab_eligible' ? 'Eligible' : 'Excluded'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {inv.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {inv.verified ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(inv.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
