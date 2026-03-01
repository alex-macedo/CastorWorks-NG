import { useMemo } from 'react'
import { useConstructionCostBenchmarkAverages } from './useConstructionCostBenchmarks'

export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface BenchmarkAlert {
  id: string
  category: string
  severity: AlertSeverity
  message: string
  projectCostPerM2: number
  benchmarkCostPerM2: number
  variance: number
  suggestedAction?: string
}

interface UseBenchmarkAlertsOptions {
  projectAreaM2?: number
  projectTotalCost?: number
  currentBudgetByCategory?: Record<string, number>
  criticalThreshold?: number
  warningThreshold?: number
}

export const useBenchmarkAlerts = ({
  projectAreaM2,
  projectTotalCost,
  currentBudgetByCategory = {},
  criticalThreshold = 20,
  warningThreshold = 10,
}: UseBenchmarkAlertsOptions): { alerts: BenchmarkAlert[]; hasAlerts: boolean } => {
  const { data: averages } = useConstructionCostBenchmarkAverages()

  const alerts = useMemo(() => {
    const result: BenchmarkAlert[] = []

    if (!projectAreaM2 || !projectTotalCost || !averages?.length) {
      return result
    }

    const projectCostPerM2 = projectTotalCost / projectAreaM2

    // Calculate overall benchmark average
    const totalAverage = averages.reduce((sum, avg) => sum + avg.averageCostPerM2, 0)
    const benchmarkAverage = totalAverage / averages.length
    const overallVariance =
      ((projectCostPerM2 - benchmarkAverage) / benchmarkAverage) * 100

    // Overall project alert
    if (Math.abs(overallVariance) >= criticalThreshold) {
      result.push({
        id: 'overall-cost',
        category: 'Geral',
        severity: overallVariance > 0 ? 'critical' : 'info',
        message:
          overallVariance > 0
            ? `Custo total do projeto está ${overallVariance.toFixed(1)}% acima do benchmark`
            : `Custo total do projeto está ${Math.abs(overallVariance).toFixed(1)}% abaixo do benchmark`,
        projectCostPerM2,
        benchmarkCostPerM2: benchmarkAverage,
        variance: overallVariance,
        suggestedAction:
          overallVariance > 0
            ? 'Revisar custos em categorias com maior variância'
            : 'Manter controle de custos para preservar margem',
      })
    } else if (Math.abs(overallVariance) >= warningThreshold) {
      result.push({
        id: 'overall-cost-warning',
        category: 'Geral',
        severity: 'warning',
        message:
          overallVariance > 0
            ? `Custo total do projeto está ${overallVariance.toFixed(1)}% acima do benchmark`
            : `Custo total do projeto está ${Math.abs(overallVariance).toFixed(1)}% abaixo do benchmark`,
        projectCostPerM2,
        benchmarkCostPerM2: benchmarkAverage,
        variance: overallVariance,
        suggestedAction: 'Monitorar custos nas próximas etapas',
      })
    }

    // Category-specific alerts
    Object.entries(currentBudgetByCategory).forEach(([category, cost]) => {
      const benchmark = averages.find((avg) => avg.materialCategory === category)
      if (!benchmark) return

      const categoryCostPerM2 = cost / projectAreaM2
      const categoryVariance =
        ((categoryCostPerM2 - benchmark.averageCostPerM2) / benchmark.averageCostPerM2) * 100

      if (categoryVariance >= criticalThreshold) {
        result.push({
          id: `category-${category}-critical`,
          category,
          severity: 'critical',
          message: `${category}: Custo está ${categoryVariance.toFixed(1)}% acima do benchmark`,
          projectCostPerM2: categoryCostPerM2,
          benchmarkCostPerM2: benchmark.averageCostPerM2,
          variance: categoryVariance,
          suggestedAction: `Revisar custos de ${category} - considerar renegociação ou substituição`,
        })
      } else if (categoryVariance >= warningThreshold) {
        result.push({
          id: `category-${category}-warning`,
          category,
          severity: 'warning',
          message: `${category}: Custo está ${categoryVariance.toFixed(1)}% acima do benchmark`,
          projectCostPerM2: categoryCostPerM2,
          benchmarkCostPerM2: benchmark.averageCostPerM2,
          variance: categoryVariance,
          suggestedAction: `Monitorar custos de ${category}`,
        })
      } else if (categoryVariance <= -criticalThreshold) {
        result.push({
          id: `category-${category}-info`,
          category,
          severity: 'info',
          message: `${category}: Custo está ${Math.abs(categoryVariance).toFixed(1)}% abaixo do benchmark`,
          projectCostPerM2: categoryCostPerM2,
          benchmarkCostPerM2: benchmark.averageCostPerM2,
          variance: categoryVariance,
        })
      }
    })

    // Sort by severity (critical first)
    const severityOrder = { critical: 0, warning: 1, info: 2 }
    result.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    return result
  }, [
    projectAreaM2,
    projectTotalCost,
    currentBudgetByCategory,
    averages,
    criticalThreshold,
    warningThreshold,
  ])

  return {
    alerts,
    hasAlerts: alerts.length > 0,
  }
}
