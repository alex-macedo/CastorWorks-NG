import { useMemo } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { FileText, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useLocalization } from '@/contexts/LocalizationContext'
import { useConstructionCostBenchmarkAverages, useBenchmarkComparison } from '@/hooks/useConstructionCostBenchmarks'

interface BenchmarkProposalGeneratorProps {
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

const formatDate = (date: Date) => {
  return date.toLocaleDateString('pt-BR')
}

export function BenchmarkProposalGenerator({
  projectName,
  projectAreaM2,
  projectTotalCost,
  currentBudgetByCategory = {},
  className,
}: BenchmarkProposalGeneratorProps) {
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

  const generatePDF = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    let yPos = 20

    doc.setFontSize(20)
    doc.setTextColor(40, 40, 40)
    doc.text('Proposta de Orçamento', pageWidth / 2, yPos, { align: 'center' })
    yPos += 10

    doc.setFontSize(14)
    doc.text(projectName, pageWidth / 2, yPos, { align: 'center' })
    yPos += 15

    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Data: ${formatDate(new Date())}`, pageWidth / 2, yPos, { align: 'center' })
    yPos += 10

    doc.setDrawColor(200, 200, 200)
    doc.line(20, yPos, pageWidth - 20, yPos)
    yPos += 15

    doc.setFontSize(12)
    doc.setTextColor(40, 40, 40)
    doc.text('Resumo do Projeto', 20, yPos)
    yPos += 8

    doc.setFontSize(10)
    doc.text(`Área Total: ${projectAreaM2.toFixed(2)} m²`, 20, yPos)
    yPos += 6
    doc.text(`Orçamento Atual: ${formatCurrency(projectTotalCost)}`, 20, yPos)
    yPos += 6
    doc.text(`Custo por m²: ${formatCurrency(projectTotalCost / projectAreaM2)}`, 20, yPos)
    yPos += 15

    if (comparison.benchmarkAverage > 0) {
      doc.setFontSize(12)
      doc.text('Análise de Benchmark', 20, yPos)
      yPos += 8

      doc.setFontSize(10)
      doc.text(
        `Média de Benchmark: ${formatCurrency(comparison.benchmarkAverage)}/m²`,
        20,
        yPos
      )
      yPos += 6

      const varianceColor =
        comparison.variancePercent > 0 ? [220, 53, 69] : comparison.variancePercent < 0 ? [25, 135, 84] : [0, 0, 0]
      doc.setTextColor(varianceColor[0], varianceColor[1], varianceColor[2])
      doc.text(
        `Variação: ${comparison.variancePercent > 0 ? '+' : ''}${comparison.variancePercent.toFixed(1)}%`,
        20,
        yPos
      )
      yPos += 15
    }

    doc.setTextColor(40, 40, 40)
    doc.setFontSize(12)
    doc.text('Detalhamento por Categoria', 20, yPos)
    yPos += 5

    const tableData = suggestions.map((s) => [
      s.category,
      formatCurrency(s.benchmarkPerM2) + '/m²',
      formatCurrency(s.suggestedCost),
      s.currentCost > 0 ? formatCurrency(s.currentCost) : '-',
      s.currentCost > 0
        ? `${((s.currentCost - s.suggestedCost) / s.suggestedCost * 100).toFixed(1)}%`
        : '-',
      s.sampleSize?.toString() || '-',
    ])

    autoTable(doc, {
      startY: yPos,
      head: [
        [
          'Categoria',
          'Benchmark/m²',
          'Custo Sugerido',
          'Seu Custo',
          'Variação',
          'Amostra',
        ],
      ],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 25, halign: 'right' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 20, halign: 'center' },
      },
    })

    yPos = (doc as any).lastAutoTable.finalY + 15

    if (yPos > 250) {
      doc.addPage()
      yPos = 20
    }

    doc.setFontSize(12)
    doc.text('Resumo Financeiro', 20, yPos)
    yPos += 8

    autoTable(doc, {
      startY: yPos,
      body: [
        ['Total Sugerido (Benchmark)', formatCurrency(totalSuggested)],
        ['Seu Orçamento', formatCurrency(totalCurrent || projectTotalCost)],
        [
          'Diferença',
          formatCurrency((totalCurrent || projectTotalCost) - totalSuggested),
        ],
      ],
      theme: 'plain',
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 40, halign: 'right' },
      },
    })

    yPos = (doc as any).lastAutoTable.finalY + 15

    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      'Este relatório foi gerado automaticamente com base em dados de benchmark de projetos similares.',
      pageWidth / 2,
      yPos,
      { align: 'center' }
    )
    doc.text(
      'CastorWorks - Sistema de Gestão de Projetos',
      pageWidth / 2,
      yPos + 5,
      { align: 'center' }
    )

    doc.save(`proposta-${projectName.toLowerCase().replace(/\s+/g, '-')}.pdf`)
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-500" />
          <CardTitle className="text-sm">
            {t('timeline.benchmark.proposal.title')}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          {t('timeline.benchmark.proposal.description')}
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
          {comparison.benchmarkAverage > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('timeline.benchmark.benchmarkAvg')}:</span>
              <span className="font-medium">
                {formatCurrency(comparison.benchmarkAverage)}/m²
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={generatePDF} className="flex-1" size="sm">
            <Download className="mr-2 h-4 w-4" />
            {t('timeline.benchmark.proposal.download')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
