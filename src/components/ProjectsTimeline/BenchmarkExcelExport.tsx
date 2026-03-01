import { useMemo } from 'react'
import { FileSpreadsheet, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useLocalization } from '@/contexts/LocalizationContext'
import { useConstructionCostBenchmarkAverages, useBenchmarkComparison } from '@/hooks/useConstructionCostBenchmarks'

interface BenchmarkExcelExportProps {
  projectName: string
  projectAreaM2: number
  projectTotalCost: number
  currentBudgetByCategory?: Record<string, number>
  className?: string
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
  }).format(value)
}

export function BenchmarkExcelExport({
  projectName,
  projectAreaM2,
  projectTotalCost,
  currentBudgetByCategory = {},
  className,
}: BenchmarkExcelExportProps) {
  const { t } = useLocalization()
  const { data: averages } = useConstructionCostBenchmarkAverages()
  const comparison = useBenchmarkComparison(projectAreaM2, projectTotalCost)

  const suggestions = useMemo(() => {
    if (!averages || projectAreaM2 <= 0) return []

    return averages.map((avg) => {
      const suggestedCost = avg.averageCostPerM2 * projectAreaM2
      const currentCost = currentBudgetByCategory[avg.materialCategory] || 0

      return {
        category: avg.materialCategory,
        suggestedCost,
        currentCost,
        benchmarkPerM2: avg.averageCostPerM2,
        sampleSize: avg.sampleSize,
      }
    })
  }, [averages, projectAreaM2, currentBudgetByCategory])

  const totalSuggested = useMemo(
    () => suggestions.reduce((sum, s) => sum + s.suggestedCost, 0),
    [suggestions]
  )

  const totalCurrent = useMemo(
    () => suggestions.reduce((sum, s) => sum + s.currentCost, 0),
    [suggestions]
  )

  const generateCSV = () => {
    const headers = [
      'Categoria',
      'Benchmark R$/m²',
      'Custo Sugerido (R$)',
      'Seu Custo (R$)',
      'Variação (%)',
      'Tamanho Amostra',
    ]

    const rows = suggestions.map((s) => [
      s.category,
      formatNumber(s.benchmarkPerM2),
      formatNumber(s.suggestedCost),
      s.currentCost > 0 ? formatNumber(s.currentCost) : '',
      s.currentCost > 0
        ? ((s.currentCost - s.suggestedCost) / s.suggestedCost * 100).toFixed(1)
        : '',
      s.sampleSize?.toString() || '',
    ])

    const summaryRows = [
      [],
      ['RESUMO DO PROJETO'],
      ['Nome do Projeto', projectName],
      ['Área Total (m²)', formatNumber(projectAreaM2)],
      ['Orçamento Atual', formatCurrency(projectTotalCost)],
      ['Custo por m²', formatCurrency(projectTotalCost / projectAreaM2)],
      [],
      ['ANÁLISE DE BENCHMARK'],
      ['Média de Benchmark (R$/m²)', formatNumber(comparison.benchmarkAverage)],
      ['Variação (%)', comparison.variancePercent.toFixed(1)],
      [],
      ['RESUMO FINANCEIRO'],
      ['Total Sugerido (Benchmark)', formatCurrency(totalSuggested)],
      ['Seu Orçamento', formatCurrency(totalCurrent || projectTotalCost)],
      ['Diferença', formatCurrency((totalCurrent || projectTotalCost) - totalSuggested)],
    ]

    const allRows = [headers, ...rows, ...summaryRows]

    const csvContent = allRows
      .map((row) => row.map((cell) => `"${cell}"`).join(';'))
      .join('\n')

    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `proposta-${projectName.toLowerCase().replace(/\s+/g, '-')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-green-600" />
          <CardTitle className="text-sm">
            {t('timeline.benchmark.exportExcel.title')}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          {t('timeline.benchmark.exportExcel.description')}
        </p>

        <div className="rounded-lg bg-muted/50 p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('timeline.benchmark.area')}:</span>
            <span className="font-medium">{projectAreaM2.toFixed(2)} m²</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('timeline.benchmark.totalCost')}:</span>
            <span className="font-medium">{formatCurrency(projectTotalCost)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('timeline.benchmark.exportExcel.categories')}:</span>
            <span className="font-medium">{suggestions.length}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={generateCSV} className="flex-1" size="sm" variant="outline">
            <Download className="mr-2 h-4 w-4" />
            {t('timeline.benchmark.exportExcel.download')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
