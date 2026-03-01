import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTranslation } from 'react-i18next'
import { useConstructionCostBenchmarkMaterials } from '@/hooks/useConstructionCostBenchmarks'
import type { ConstructionCostBenchmarkAverage } from '@/types/timeline'

interface BenchmarkChartsProps {
  averages: ConstructionCostBenchmarkAverage[]
  selectedProjectId?: string
  showComparison?: boolean
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
  '#82CA9D', '#FFC658', '#8DD1E1', '#A4DE6C', '#D0ED57',
  '#FFB347', '#87CEEB', '#98FB98', '#F0E68C'
]

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

interface BarTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: { sampleSize?: number } }>
  label?: string
}

function BarTooltip({ active, payload, label }: BarTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">
          {formatCurrency(payload[0].value)}/m²
        </p>
        {payload[0].payload.sampleSize && (
          <p className="text-xs text-muted-foreground">
            {payload[0].payload.sampleSize} projects
          </p>
        )}
      </div>
    )
  }
  return null
}

interface PieTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: { costPerM2: number } }>
}

function PieTooltip({ active, payload }: PieTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0]
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <p className="font-medium">{data.name}</p>
        <p className="text-sm text-muted-foreground">
          {formatCurrency(data.value)} total
        </p>
        <p className="text-xs text-muted-foreground">
          {formatCurrency(data.payload.costPerM2)}/m²
        </p>
      </div>
    )
  }
  return null
}

export function BenchmarkCharts({
  averages,
  selectedProjectId,
  showComparison = false,
}: BenchmarkChartsProps) {
  const { t } = useTranslation()
  const { data: selectedMaterials } = useConstructionCostBenchmarkMaterials(selectedProjectId)

  // Prepare data for bar chart (average cost by material)
  const barChartData = useMemo(() => {
    return averages
      .sort((a, b) => b.averageCostPerM2 - a.averageCostPerM2)
      .map((avg) => ({
        name: avg.materialCategory,
        value: avg.averageCostPerM2,
        sampleSize: avg.sampleSize,
      }))
  }, [averages])

  // Prepare data for pie chart (material distribution)
  const pieChartData = useMemo(() => {
    if (!selectedMaterials || selectedMaterials.length === 0) return []
    
    return selectedMaterials.map((material, index) => ({
      name: material.materialCategory,
      value: material.totalCost,
      costPerM2: material.costPerM2,
      color: COLORS[index % COLORS.length],
    }))
  }, [selectedMaterials])

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Bar Chart - Average Cost by Material */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">
                {t('timeline.benchmark.charts.averageCostByMaterial')}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {t('timeline.benchmark.charts.averageCostDescription')}
              </p>
            </div>
            <Badge variant="outline">
              {averages.length} {t('timeline.benchmark.charts.categories')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barChartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(value) => `R$${value}`}
                  fontSize={11}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={75}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip content={<BarTooltip />} />
                <Bar
                  dataKey="value"
                  fill="#3b82f6"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Pie Chart - Material Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">
                {t('timeline.benchmark.charts.materialDistribution')}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {selectedMaterials
                  ? t('timeline.benchmark.charts.selectedProjectDescription')
                  : t('timeline.benchmark.charts.selectProjectDescription')}
              </p>
            </div>
            {selectedMaterials && (
              <Badge variant="outline">
                {selectedMaterials.length} {t('timeline.benchmark.charts.materials')}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <p className="text-sm">
                  {t('timeline.benchmark.charts.selectProjectToView')}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
