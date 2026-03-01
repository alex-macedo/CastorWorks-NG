import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTaxProject } from '@/features/tax/hooks/useTaxProject';
import { useTaxGuide } from '@/features/tax/hooks/useTaxGuide';
import { useTaxAlerts } from '@/features/tax/hooks/useTaxAlerts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Clock, Calculator, AlertTriangle, Save, Loader2 } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { BrazilianState } from '@/features/tax/types/tax.types';

import { Switch } from '@/components/ui/switch';

interface TaxManagementTabProps {
  projectId: string;
}

export function TaxManagementTab({ projectId }: TaxManagementTabProps) {
  const { t } = useLocalization();
  const { taxProject, isLoading, createTaxProject, updateTaxProject } = useTaxProject(projectId);
  const { steps, updateStep } = useTaxGuide(taxProject?.id);
  const { alerts, resolveAlert } = useTaxAlerts(taxProject?.id);
  
  const [formData, setFormData] = useState({
    area_main: 0,
    state_code: 'SP' as BrazilianState,
    owner_type: 'PF' as 'PF' | 'PJ',
    construction_type: 'ALVENARIA' as any,
    category: 'OBRA_NOVA' as any,
    has_strategy_service: false,
  });

  // Sync local state when data arrives
  React.useEffect(() => {
    if (taxProject) {
      setFormData({
        area_main: taxProject.area_main,
        state_code: taxProject.state_code as BrazilianState,
        owner_type: taxProject.owner_type,
        construction_type: taxProject.construction_type,
        category: taxProject.category,
        has_strategy_service: taxProject.has_strategy_service,
      });
    }
  }, [taxProject]);

  const handleCreate = () => {
    createTaxProject.mutate({
      project_id: projectId,
      ...formData,
      area_complementary: 0,
      destination: 'RESIDENCIAL_UNIFAMILIAR',
    });
  };

  const handleUpdate = () => {
    if (!taxProject) return;
    updateTaxProject.mutate({
      id: taxProject.id,
      ...formData,
    });
  };

  if (isLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin inline mr-2" /> {t('common.loading')}</div>;

  return (
    <div className="space-y-6">
      {!taxProject ? (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/10">
          <CardHeader>
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              <CardTitle>Configuração Fiscal Pendente</CardTitle>
            </div>
            <CardDescription>
              Este projeto ainda não possui uma estratégia de INSS configurada. Inicialize agora para gerenciar o ciclo de vida.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Área Principal (m²)</Label>
                <Input 
                  type="number" 
                  value={formData.area_main} 
                  onChange={(e) => setFormData({...formData, area_main: Number(e.target.value)})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Estado (UF)</Label>
                <Input 
                  value={formData.state_code} 
                  onChange={(e) => setFormData({...formData, state_code: e.target.value.toUpperCase() as BrazilianState})} 
                />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={createTaxProject.isPending}>
              {createTaxProject.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
              Inicializar Estratégia INSS
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" variant="pill" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Configuração</TabsTrigger>
            <TabsTrigger value="lifecycle">Ciclo de Vida (Lifecycle)</TabsTrigger>
            {alerts && alerts.length > 0 && (
              <TabsTrigger value="alerts" className="relative">
                Alertas/Solicitações
                {alerts.some(a => !a.resolved) && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Parâmetros do Projeto</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo de Construção</Label>
                    <Select 
                      value={formData.construction_type} 
                      onValueChange={(val) => setFormData({...formData, construction_type: val as any})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALVENARIA">Alvenaria</SelectItem>
                        <SelectItem value="METALICA">Metálica (Steel Frame)</SelectItem>
                        <SelectItem value="MADEIRA">Madeira</SelectItem>
                        <SelectItem value="PRE_MOLDADO">Pré-moldado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Área Principal</Label>
                    <Input 
                      type="number" 
                      value={formData.area_main} 
                      onChange={(e) => setFormData({...formData, area_main: Number(e.target.value)})} 
                    />
                  </div>
                </div>
                <div className="space-y-4">
                   <div className="space-y-2">
                    <Label>Proprietário</Label>
                    <Select 
                      value={formData.owner_type} 
                      onValueChange={(val) => setFormData({...formData, owner_type: val as any})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PF">Pessoa Física</SelectItem>
                        <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg bg-primary/5 border-primary/20">
                    <div className="space-y-0.5">
                      <Label className="text-base">Serviço de Estratégia Ativo</Label>
                      <p className="text-sm text-muted-foreground italic">
                        Habilita a visualização detalhada da lógica no Portal do Cliente.
                      </p>
                    </div>
                    <Switch
                      checked={formData.has_strategy_service}
                      onCheckedChange={(checked) => setFormData({ ...formData, has_strategy_service: checked })}
                    />
                  </div>

                  <Button className="w-full" onClick={handleUpdate} disabled={updateTaxProject.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Alterações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lifecycle" className="mt-4 space-y-4">
             <div className="grid gap-4">
               {steps.map((step) => (
                 <div key={step.id} className="flex items-center justify-between p-4 border rounded-lg bg-card shadow-sm">
                   <div className="flex items-center gap-4">
                     <div className={cn(
                       "h-10 w-10 rounded-full flex items-center justify-center font-bold border-2",
                       step.status === 'COMPLETED' ? "bg-green-100 border-green-500 text-green-700" : "bg-muted border-muted-foreground/30"
                     )}>
                       {step.status === 'COMPLETED' ? <CheckCircle2 className="h-6 w-6" /> : step.step_order}
                     </div>
                     <div>
                       <h4 className="font-bold">{step.summary}</h4>
                       <p className="text-sm text-muted-foreground">{step.description}</p>
                     </div>
                   </div>
                   <div className="flex gap-2">
                     {step.status !== 'COMPLETED' ? (
                       <Button size="sm" onClick={() => updateStep.mutate({ id: step.id, updates: { status: 'COMPLETED', completed_at: new Date().toISOString() } })}>
                         Marcar Concluído
                       </Button>
                     ) : (
                        <Badge variant="success">Concluído</Badge>
                     )}
                   </div>
                 </div>
               ))}
              </div>
           </TabsContent>

           <TabsContent value="alerts" className="mt-4 space-y-4">
             <div className="grid gap-4">
               {alerts?.map((alert) => (
                 <Card key={alert.id} className={cn(
                   "border-l-4",
                   alert.resolved ? "border-l-muted opacity-60" : 
                   alert.alert_type === 'ACTIVATION_REQUEST' ? "border-l-blue-500 bg-blue-50/10" : "border-l-red-500"
                 )}>
                   <CardContent className="p-4 flex items-center justify-between">
                     <div className="space-y-1">
                       <div className="flex items-center gap-2">
                         <span className="font-bold text-sm uppercase tracking-wider">{alert.alert_type}</span>
                         {!alert.resolved && <Badge variant="destructive" className="h-4 text-[10px]">Pendente</Badge>}
                       </div>
                       <p className="text-sm">{alert.message}</p>
                       <p className="text-[10px] text-muted-foreground">{new Date(alert.created_at).toLocaleString('pt-BR')}</p>
                     </div>
                     {!alert.resolved && (
                       <Button size="sm" variant="outline" onClick={() => resolveAlert.mutate(alert.id)}>
                         Resolver
                       </Button>
                     )}
                   </CardContent>
                 </Card>
               ))}
             </div>
           </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
