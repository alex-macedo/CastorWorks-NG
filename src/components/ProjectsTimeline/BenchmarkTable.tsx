import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Download, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  useConstructionCostBenchmarksWithMaterials,
  useConstructionCostBenchmarkMaterials,
  useBenchmarkComparison,
} from '@/hooks/useConstructionCostBenchmarks'
import { BenchmarkFilters, type BenchmarkFilterState } from './BenchmarkFilters'
import { BenchmarkCharts } from './BenchmarkCharts'
import { useLocalization } from '@/contexts/LocalizationContext'
import { cn } from '@/lib/utils'
import type { ConstructionCostBenchmarkProject } from '@/types/timeline'

interface BenchmarkTableProps {
  /**
   * Optional: Current project area for comparison
   */
  currentProjectAreaM2?: number
  /**
   * Optional: Current project total cost for comparison
   */
  currentProjectTotalCost?: number
  /**
   * Show comparison mode highlighting
   */
  showComparison?: boolean
}

export const BenchmarkTable = ({
  currentProjectAreaM2,
  currentProjectTotalCost,
  showComparison: initialShowComparison = false,
}: BenchmarkTableProps) => {
  const { t } = useLocalization()
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [sortColumn, setSortColumn] = useState<'name' | 'area' | 'cost' | 'costPerM2'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [showComparison, setShowComparison] = useState(initialShowComparison)
  const [showCharts, setShowCharts] = useState(false)
  const [filters, setFilters] = useState<BenchmarkFilterState>({
    dateRange: { from: null, to: null },
    costRange: { min: 0, max: Infinity },
    areaRange: { min: 0, max: Infinity },
    showFilters: false,
  })

  const { projects, averages, isLoading, error } =
    useConstructionCostBenchmarksWithMaterials()

  const comparison = useBenchmarkComparison(currentProjectAreaM2, currentProjectTotalCost)

  // Calculate max values for filters
  const maxCost = useMemo(() => {
    return Math.max(...projects.map((p) => p.totalCost), 1000000)
  }, [projects])

  const maxArea = useMemo(() => {
    return Math.max(...projects.map((p) => p.totalAreaM2), 1000)
  }, [projects])

  // Filter projects based on active filters
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Date range filter
      if (filters.dateRange.from && project.benchmarkDate < filters.dateRange.from) {
        return false
      }
      if (filters.dateRange.to && project.benchmarkDate > filters.dateRange.to) {
        return false
      }

      // Cost range filter
      if (
        project.totalCost < filters.costRange.min ||
        project.totalCost > filters.costRange.max
      ) {
        return false
      }

      // Area range filter
      if (
        project.totalAreaM2 < filters.areaRange.min ||
        project.totalAreaM2 > filters.areaRange.max
      ) {
        return false
      }

      return true
    })
  }, [projects, filters])

  // Get selected project materials for charts
  const selectedProjectId = useMemo(() => {
    const expandedArray = Array.from(expandedRows)
    return expandedArray.length === 1 ? expandedArray[0] : undefined
  }, [expandedRows])

  // Toggle row expansion
  const toggleRow = (projectId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId)
    } else {
      // Single selection for charts - clear others
      newExpanded.clear()
      newExpanded.add(projectId)
    }
    setExpandedRows(newExpanded)
  }

  // Sort projects
  const sortedProjects = useMemo(() => {
    return [...filteredProjects].sort((a, b) => {
      let aValue: number | string = 0
      let bValue: number | string = 0

      switch (sortColumn) {
        case 'name':
          aValue = a.projectName
          bValue = b.projectName
          break
        case 'area':
          aValue = a.totalAreaM2
          bValue = b.totalAreaM2
          break
        case 'cost':
          aValue = a.totalCost
          bValue = b.totalCost
          break
        case 'costPerM2':
          aValue = a.costPerM2
          bValue = b.costPerM2
          break
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      return sortDirection === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number)
    })
  }, [filteredProjects, sortColumn, sortDirection])

  // Export to CSV
  const handleExport = () => {
    const csvHeader = ['Project Name', 'Area (m²)', 'Total Cost', 'Cost/m²', 'Date'].join(',')
    const csvRows = filteredProjects.map((p) =>
      [
        p.projectName,
        p.totalAreaM2,
        p.totalCost.toFixed(2),
        p.costPerM2.toFixed(2),
        p.benchmarkDate.toISOString().split('T')[0],
      ].join(',')
    )

    const csvContent = [csvHeader, ...csvRows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `construction-cost-benchmarks-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Handle sorting
  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
        {t('timeline.benchmark.errorLoading')}
      </div>
    )
  }

  const expandAll = () => setExpandedRows(new Set(filteredProjects.map((p) => p.id)))
  const collapseAll = () => setExpandedRows(new Set())

  const activeFilterCount = [
    filters.dateRange.from || filters.dateRange.to ? 1 : 0,
    filters.costRange.min > 0 || filters.costRange.max < maxCost ? 1 : 0,
    filters.areaRange.min > 0 || filters.areaRange.max < maxArea ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-4">
      {/* Header with title, filter results, and controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold">{t('timeline.benchmark.title')}</h3>
            <p className="text-sm text-muted-foreground">
              {activeFilterCount > 0
                ? t('timeline.benchmark.filters.resultsCount', {
                    filtered: filteredProjects.length,
                    total: projects.length,
                  })
                : t('timeline.benchmark.subtitle', { count: projects.length })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {currentProjectAreaM2 && currentProjectTotalCost && (
              <div className="flex items-center gap-2 mr-4">
                <Switch
                  id="comparison-mode"
                  checked={showComparison}
                  onCheckedChange={setShowComparison}
                />
                <Label htmlFor="comparison-mode" className="text-sm cursor-pointer">
                  {t('timeline.benchmark.comparison.toggle')}
                </Label>
              </div>
            )}
            <Button
              variant={showCharts ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowCharts(!showCharts)}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              {showCharts
                ? t('timeline.benchmark.charts.hideCharts')
                : t('timeline.benchmark.charts.showCharts')}
            </Button>
            <Button variant="outline" size="sm" onClick={expandAll}>
              {t('timeline.benchmark.expandAll')}
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              {t('timeline.benchmark.collapseAll')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              {t('timeline.benchmark.export')}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <BenchmarkFilters
          onFilterChange={setFilters}
          initialFilters={filters}
          maxCost={maxCost}
          maxArea={maxArea}
        />
      </div>

      {/* Charts */}
      {showCharts && (
        <BenchmarkCharts
          averages={averages}
          selectedProjectId={selectedProjectId}
          showComparison={showComparison}
        />
      )}

      {/* Comparison summary */}
      {showComparison && currentProjectAreaM2 && currentProjectTotalCost && (
        <div className="rounded-lg border bg-card p-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('timeline.benchmark.yourProject')}
              </p>
              <p className="text-2xl font-bold">R$ {comparison.costPerM2.toFixed(2)}/m²</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('timeline.benchmark.benchmarkAvg')}
              </p>
              <p className="text-2xl font-bold">R$ {comparison.benchmarkAverage.toFixed(2)}/m²</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('timeline.benchmark.variance')}
              </p>
              <div className="flex items-center gap-2">
                {comparison.isAboveBenchmark && (
                  <TrendingUp className="h-5 w-5 text-yellow-600" />
                )}
                {comparison.isBelowBenchmark && (
                  <TrendingDown className="h-5 w-5 text-green-600" />
                )}
                <p
                  className={cn(
                    'text-2xl font-bold',
                    comparison.isAboveBenchmark && 'text-yellow-600',
                    comparison.isBelowBenchmark && 'text-green-600'
                  )}
                >
                  {comparison.variancePercent > 0 ? '+' : ''}
                  {comparison.variancePercent.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Benchmark table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted"
                onClick={() => handleSort('name')}
              >
                {t('timeline.benchmark.projectName')}
                {sortColumn === 'name' && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted"
                onClick={() => handleSort('area')}
              >
                {t('timeline.benchmark.area')}
                {sortColumn === 'area' && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted"
                onClick={() => handleSort('cost')}
              >
                {t('timeline.benchmark.totalCost')}
                {sortColumn === 'cost' && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted"
                onClick={() => handleSort('costPerM2')}
              >
                {t('timeline.benchmark.costPerM2')}
                {sortColumn === 'costPerM2' && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
              </TableHead>
              <TableHead>{t('timeline.benchmark.date')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedProjects.map((project) => (
              <BenchmarkProjectRow
                key={project.id}
                project={project}
                isExpanded={expandedRows.has(project.id)}
                onToggle={() => toggleRow(project.id)}
                benchmarkAverage={comparison.benchmarkAverage}
                showComparison={showComparison}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Average summary */}
      {averages.length > 0 && (
        <div className="rounded-lg border bg-muted/50 p-4">
          <h4 className="mb-2 font-semibold">{t('timeline.benchmark.averageByCategory')}</h4>
          <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            {averages.map((avg) => (
              <div key={avg.id}>
                <span className="font-medium">{avg.materialCategory}:</span>{' '}
                <span className="text-muted-foreground">
                  R$ {avg.averageCostPerM2.toFixed(2)}/m²
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Individual project row with expandable materials
 */
interface BenchmarkProjectRowProps {
  project: ConstructionCostBenchmarkProject
  isExpanded: boolean
  onToggle: () => void
  benchmarkAverage: number
  showComparison: boolean
}

const BenchmarkProjectRow = ({
  project,
  isExpanded,
  onToggle,
  benchmarkAverage,
  showComparison,
}: BenchmarkProjectRowProps) => {
  const { t } = useLocalization()
  const { data: materials, isLoading: materialsLoading } =
    useConstructionCostBenchmarkMaterials(isExpanded ? project.id : undefined)

  const variance = benchmarkAverage > 0
    ? ((project.costPerM2 - benchmarkAverage) / benchmarkAverage) * 100
    : 0
  const isHigherThanAvg = variance > 5
  const isLowerThanAvg = variance < -5

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={onToggle}>
        <TableCell>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </TableCell>
        <TableCell className="font-medium">{project.projectName}</TableCell>
        <TableCell>{project.totalAreaM2.toFixed(2)} m²</TableCell>
        <TableCell>R$ {project.totalCost.toLocaleString('pt-BR')}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            R$ {project.costPerM2.toFixed(2)}/m²
            {showComparison && benchmarkAverage > 0 && (
              <>
                {isHigherThanAvg && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    +{variance.toFixed(1)}%
                  </Badge>
                )}
                {isLowerThanAvg && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {variance.toFixed(1)}%
                  </Badge>
                )}
                {!isHigherThanAvg && !isLowerThanAvg && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {variance.toFixed(1)}%
                  </Badge>
                )}
              </>
            )}
          </div>
        </TableCell>
        <TableCell>{project.benchmarkDate.toLocaleDateString('pt-BR')}</TableCell>
      </TableRow>

      {/* Expanded material breakdown */}
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/30 p-4">
            {materialsLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-semibold">
                  {t('timeline.benchmark.materialBreakdown')}
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
                  {materials?.map((material) => (
                    <div key={material.id} className="flex justify-between rounded bg-background p-2">
                      <span className="font-medium">{material.materialCategory}</span>
                      <span className="text-muted-foreground">
                        R$ {material.costPerM2.toFixed(2)}/m²
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
