/**
 * TaxEstimator - Interactive INSS Calculator Component
 * Allows users to calculate estimated INSS based on project parameters
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Calculator, TrendingDown, Save } from 'lucide-react';
import {
  calculateINSS,
  checkFatorSocialBoundary,
  formatCurrency,
  formatPercentage,
  getStateOptions,
  getCategoryLabel,
  getConstructionTypeLabel,
  getDestinationLabel,
  VAU_BY_STATE,
} from '../utils/inssCalculator';
import { calculateINSSWithRefData } from '../utils/inssCalculatorV2';
import { useINSSReferenceData } from '../hooks/useINSSReferenceData';
import type {
  BrazilianState,
  TaxOwnerType,
  TaxWorkCategory,
  TaxConstructionType,
  TaxDestination,
  INSSCalculatorParams,
} from '../types/tax.types';

interface TaxEstimatorProps {
  /** Initial values from tax project (if exists) */
  initialValues?: Partial<INSSCalculatorParams>;
  /** Callback when user wants to save the estimate */
  onSaveEstimate?: (result: ReturnType<typeof calculateINSS>) => void;
  /** Whether save is in progress */
  isSaving?: boolean;
}

export function TaxEstimator({
  initialValues,
  onSaveEstimate,
  isSaving,
}: TaxEstimatorProps) {
  const { t } = useTranslation('tax');
  const refData = useINSSReferenceData();

  // Form state
  const [params, setParams] = useState<INSSCalculatorParams>({
    area: initialValues?.area ?? 0,
    state: initialValues?.state ?? 'SP',
    ownerType: initialValues?.ownerType ?? 'PF',
    category: initialValues?.category ?? 'OBRA_NOVA',
    constructionType: initialValues?.constructionType ?? 'ALVENARIA',
    destination: initialValues?.destination ?? 'RESIDENCIAL_UNIFAMILIAR',
    laborDeductions: initialValues?.laborDeductions ?? 0,
    usesUsinados: initialValues?.usesUsinados ?? false,
    usesPrefab: initialValues?.usesPrefab ?? false,
    prefabInvoiceValue: initialValues?.prefabInvoiceValue ?? 0,
    startDate: initialValues?.startDate ?? null,
    actualEndDate: initialValues?.actualEndDate ?? null,
    totalRemunerationPaid: initialValues?.totalRemunerationPaid ?? 0,
    constructionMonths: initialValues?.constructionMonths ?? 1,
    monthlyDCTFWebSubmissions: initialValues?.monthlyDCTFWebSubmissions ?? 0,
  });

  // Calculate result
  const result = useMemo(() => {
    if (params.area <= 0 || refData.isLoading) return null;
    return calculateINSSWithRefData(params, refData);
  }, [params, refData]);

  // Check for Fator Social boundary warning
  const boundaryWarning = useMemo(() => {
    if (params.area <= 0) return null;
    return checkFatorSocialBoundary(
      params.area,
      params.state,
      params.ownerType,
      params.category,
      params.constructionType
    );
  }, [params]);

  const updateParam = <K extends keyof INSSCalculatorParams>(
    key: K,
    value: INSSCalculatorParams[K]
  ) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (result && onSaveEstimate) {
      onSaveEstimate(result);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {t('estimator.title', 'Dados da Obra')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Area Input */}
          <div className="space-y-2">
            <Label htmlFor="area">
              {t('estimator.area', 'Área Total (m²)')}
            </Label>
            <Input
              id="area"
              type="number"
              min={0}
              step={0.01}
              value={params.area || ''}
              onChange={(e) => updateParam('area', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>

          {/* Fator Social Boundary Warning */}
          {boundaryWarning && (
            <Alert variant="default" className="border-yellow-500 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>{t('estimator.attention', 'Atenção!')}</strong>{' '}
                {boundaryWarning.recommendation}
              </AlertDescription>
            </Alert>
          )}

          {/* State Select */}
          <div className="space-y-2">
            <Label>{t('estimator.state', 'Estado')}</Label>
            <Select
              value={params.state}
              onValueChange={(v) => updateParam('state', v as BrazilianState)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getStateOptions().map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              VAU: {formatCurrency(VAU_BY_STATE[params.state])}/m²
            </p>
          </div>

          {/* Owner Type */}
          <div className="space-y-2">
            <Label>{t('estimator.ownerType', 'Tipo de Proprietário')}</Label>
            <Select
              value={params.ownerType}
              onValueChange={(v) => updateParam('ownerType', v as TaxOwnerType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PF">
                  {t('estimator.ownerPF', 'Pessoa Física (PF)')}
                </SelectItem>
                <SelectItem value="PJ">
                  {t('estimator.ownerPJ', 'Pessoa Jurídica (PJ)')}
                </SelectItem>
              </SelectContent>
            </Select>
            {params.ownerType === 'PF' && (
              <p className="text-xs text-green-600">
                {t('estimator.fatorSocialEligible', 'Elegível ao Fator Social')}
              </p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>{t('estimator.category', 'Categoria')}</Label>
            <Select
              value={params.category}
              onValueChange={(v) => updateParam('category', v as TaxWorkCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['OBRA_NOVA', 'ACRESCIMO', 'REFORMA', 'DEMOLICAO'] as const).map(
                  (cat) => (
                    <SelectItem key={cat} value={cat}>
                      {getCategoryLabel(cat)}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Construction Type */}
          <div className="space-y-2">
            <Label>{t('estimator.constructionType', 'Tipo de Construção')}</Label>
            <Select
              value={params.constructionType}
              onValueChange={(v) =>
                updateParam('constructionType', v as TaxConstructionType)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['ALVENARIA', 'MISTA', 'MADEIRA', 'PRE_MOLDADO', 'METALICA'] as const).map(
                  (type) => (
                    <SelectItem key={type} value={type}>
                      {getConstructionTypeLabel(type)}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Timeline */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">{t('estimator.startDate', 'Data de Início')}</Label>
              <Input
                id="startDate"
                type="date"
                value={params.startDate ? new Date(params.startDate).toISOString().split('T')[0] : ''}
                onChange={(e) => updateParam('startDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actualEndDate">{t('estimator.endDate', 'Data de Término')}</Label>
              <Input
                id="actualEndDate"
                type="date"
                value={params.actualEndDate ? new Date(params.actualEndDate).toISOString().split('T')[0] : ''}
                onChange={(e) => updateParam('actualEndDate', e.target.value)}
              />
            </div>
          </div>

          {/* Destination */}
          <div className="space-y-2">
            <Label>{t('estimator.destination', 'Destinação')}</Label>
            <Select
              value={params.destination}
              onValueChange={(v) => updateParam('destination', v as TaxDestination)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  [
                    'CASA_POPULAR',
                    'RESIDENCIAL_UNIFAMILIAR',
                    'RESIDENCIAL_MULTIFAMILIAR',
                    'COMERCIAL',
                    'CONJUNTO_HABITACIONAL',
                    'GALPAO_INDUSTRIAL',
                    'EDIFICIO_GARAGENS',
                  ] as const
                ).map((dest) => (
                  <SelectItem key={dest} value={dest}>
                    {getDestinationLabel(dest)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Reductions Section */}
          <h4 className="font-medium">
            {t('estimator.reductions', 'Reduções Aplicáveis')}
          </h4>

          {/* Labor Deductions */}
          <div className="space-y-2">
            <Label htmlFor="laborDeductions">
              {t('estimator.laborDeductions', 'Deduções de Mão de Obra (R$)')}
            </Label>
            <Input
              id="laborDeductions"
              type="number"
              min={0}
              step={100}
              value={params.laborDeductions || ''}
              onChange={(e) =>
                updateParam('laborDeductions', parseFloat(e.target.value) || 0)
              }
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              {t(
                'estimator.laborDeductionsHelp',
                'Valor documentado de mão de obra com recolhimento comprovado'
              )}
            </p>
          </div>

          {/* Usinados Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>
                {t('estimator.usesUsinados', 'Usa concreto/argamassa usinada')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('estimator.usinadosHelp', 'Dedução de 5% do COD')}
              </p>
            </div>
            <Switch
              checked={params.usesUsinados}
              onCheckedChange={(v) => updateParam('usesUsinados', v)}
            />
          </div>

          {/* Prefab Toggle & Value */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>
                  {t('estimator.usesPrefab', 'Usa pré-fabricados/pré-moldados')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('estimator.prefabHelp', 'Redução de 70% se NFs >= 40% do COD')}
                </p>
              </div>
              <Switch
                checked={params.usesPrefab}
                onCheckedChange={(v) => updateParam('usesPrefab', v)}
              />
            </div>
            
            {params.usesPrefab && (
              <div className="space-y-2 pl-6 border-l-2 border-primary/20">
                <Label htmlFor="prefabInvoiceValue">
                  {t('estimator.prefabValue', 'Valor Total das Notas (R$)')}
                </Label>
                <Input
                  id="prefabInvoiceValue"
                  type="number"
                  min={0}
                  step={100}
                  value={params.prefabInvoiceValue || ''}
                  onChange={(e) =>
                    updateParam('prefabInvoiceValue', parseFloat(e.target.value) || 0)
                  }
                  placeholder="0.00"
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Fator de Ajuste Inputs */}
          <h4 className="font-medium text-sm text-primary">
            {t('estimator.complianceData', 'Dados para Fator de Ajuste (Art. 33)')}
          </h4>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="totalRemunerationPaid">
                {t('estimator.remunerationPaid', 'Remuneração Total Paga (eSocial)')}
              </Label>
              <Input
                id="totalRemunerationPaid"
                type="number"
                min={0}
                value={params.totalRemunerationPaid || ''}
                onChange={(e) => updateParam('totalRemunerationPaid', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="constructionMonths">{t('estimator.months', 'Meses de Obra')}</Label>
                <Input
                  id="constructionMonths"
                  type="number"
                  min={1}
                  value={params.constructionMonths || ''}
                  onChange={(e) => updateParam('constructionMonths', parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthlyDCTFWebSubmissions">{t('estimator.submissions', 'Envios DCTFWeb')}</Label>
                <Input
                  id="monthlyDCTFWebSubmissions"
                  type="number"
                  min={0}
                  value={params.monthlyDCTFWebSubmissions || ''}
                  onChange={(e) => updateParam('monthlyDCTFWebSubmissions', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            {t('estimator.results', 'Estimativa de INSS')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="space-y-4">
              {/* Calculation Breakdown */}
              <div className="space-y-2">
                <ResultRow
                  label={t('estimator.cod', 'COD (Custo da Obra)')}
                  value={formatCurrency(result.cod)}
                />
                 <ResultRow
                  label={t('estimator.rmtBase', 'RMT Base')}
                  value={formatCurrency(result.rmtBase)}
                />

                {result.fatorSocial && (
                  <ResultRow
                    label={t('estimator.fatorSocial', 'Fator Social')}
                    value={formatPercentage(result.fatorSocial * 100)}
                    highlight
                  />
                )}
                {result.categoryReduction > 0 && (
                  <ResultRow
                    label={t('estimator.categoryReduction', 'Redução Categoria')}
                    value={formatPercentage(result.categoryReduction * 100)}
                    highlight
                  />
                )}
                {result.prefabReduction > 0 && (
                  <ResultRow
                    label={t('estimator.prefabReduction', 'Redução Pré-moldado')}
                    value={formatPercentage(result.prefabReduction * 100)}
                    highlight
                  />
                )}
                {result.fatorAjusteReduction > 0 && (
                  <ResultRow
                    label={t('estimator.fatorAjuste', 'Fator de Ajuste')}
                    value={t('estimator.applied', 'Aplicado')}
                    highlight
                  />
                )}
                {result.decadenciaReduction > 0 && (
                  <ResultRow
                    label={t('estimator.decadencia', 'Decadência')}
                    value={formatPercentage(result.decadenciaReduction * 100)}
                    highlight
                  />
                )}
              </div>

              <Separator />

              {/* Final Results */}
              <div className="space-y-3">
                <ResultRow
                  label={t('estimator.inssEstimate', 'INSS Estimado')}
                  value={formatCurrency(result.inssEstimate)}
                  size="lg"
                  variant="primary"
                />
                <ResultRow
                  label={t('estimator.withoutStrategy', 'Sem estratégia')}
                  value={formatCurrency(result.inssWithoutStrategy)}
                  variant="muted"
                  strikethrough
                />
              </div>

              {/* Savings Display */}
              {result.savings > 0 && (
                <div className="rounded-lg bg-green-50 p-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <span className="text-green-800 font-medium">
                      {t('estimator.savings', 'Economia Potencial')}
                    </span>
                    <span className="text-green-700 text-xl font-bold">
                      {formatCurrency(result.savings)}
                    </span>
                  </div>
                  <p className="text-green-600 text-sm mt-1">
                    {formatPercentage(result.savingsPercentage)}{' '}
                    {t('estimator.reduction', 'de redução')}
                  </p>
                  {result.plannedScenario && result.fatorAjusteReduction === 0 && (
                    <p className="text-xs text-blue-600 mt-2">
                      💡 {result.plannedScenario.recommendation}
                    </p>
                  )}
                </div>
              )}

              {/* Disclaimer */}
              <p className="text-xs text-muted-foreground italic">
                {t(
                  'estimator.disclaimer',
                  'Esta é uma estimativa. O valor oficial será determinado pelo SERO/DCTFWeb.'
                )}
              </p>

              {/* Save Button */}
              {onSaveEstimate && (
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving
                    ? t('estimator.saving', 'Salvando...')
                    : t('estimator.save', 'Salvar Estimativa')}
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('estimator.enterArea', 'Informe a área para calcular')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper component for result rows
interface ResultRowProps {
  label: string;
  value: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'muted';
  highlight?: boolean;
  strikethrough?: boolean;
}

function ResultRow({
  label,
  value,
  size = 'md',
  variant = 'default',
  highlight,
  strikethrough,
}: ResultRowProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-semibold',
  };

  const variantClasses = {
    default: '',
    primary: 'text-primary',
    muted: 'text-muted-foreground',
  };

  return (
    <div className="flex items-center justify-between">
      <span className={`${highlight ? 'text-green-600' : ''}`}>{label}</span>
      <span
        className={`
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${strikethrough ? 'line-through' : ''}
        `}
      >
        {value}
      </span>
    </div>
  );
}

export default TaxEstimator;
