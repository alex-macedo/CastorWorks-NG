import { useState } from 'react'
import { Calendar as CalendarIcon, Filter, X } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useTranslation } from 'react-i18next'

export interface BenchmarkFilterState {
  dateRange: {
    from: Date | null
    to: Date | null
  }
  costRange: {
    min: number
    max: number
  }
  areaRange: {
    min: number
    max: number
  }
  showFilters: boolean
}

interface BenchmarkFiltersProps {
  onFilterChange: (filters: BenchmarkFilterState) => void
  initialFilters?: BenchmarkFilterState
  maxCost: number
  maxArea: number
}

const DEFAULT_FILTERS: BenchmarkFilterState = {
  dateRange: { from: null, to: null },
  costRange: { min: 0, max: 0 },
  areaRange: { min: 0, max: 0 },
  showFilters: false,
}

export function BenchmarkFilters({
  onFilterChange,
  initialFilters,
  maxCost,
  maxArea,
}: BenchmarkFiltersProps) {
  const { t } = useTranslation()
  const [filters, setFilters] = useState<BenchmarkFilterState>({
    ...DEFAULT_FILTERS,
    costRange: { min: 0, max: maxCost },
    areaRange: { min: 0, max: maxArea },
    ...initialFilters,
  })

  const activeFilterCount = [
    filters.dateRange.from || filters.dateRange.to ? 1 : 0,
    filters.costRange.min > 0 || filters.costRange.max < maxCost ? 1 : 0,
    filters.areaRange.min > 0 || filters.areaRange.max < maxArea ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  const updateFilters = (newFilters: Partial<BenchmarkFilterState>) => {
    const updated = { ...filters, ...newFilters }
    setFilters(updated)
    onFilterChange(updated)
  }

  const clearAllFilters = () => {
    const cleared = {
      ...DEFAULT_FILTERS,
      costRange: { min: 0, max: maxCost },
      areaRange: { min: 0, max: maxArea },
      showFilters: filters.showFilters,
    }
    setFilters(cleared)
    onFilterChange(cleared)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="space-y-3">
      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateFilters({ showFilters: !filters.showFilters })}
            className={cn(
              'gap-2',
              filters.showFilters && 'bg-muted'
            )}
          >
            <Filter className="h-4 w-4" />
            {filters.showFilters
              ? t('timeline.benchmark.filters.hideFilters')
              : t('timeline.benchmark.filters.showFilters')}
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-8 gap-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              {t('timeline.benchmark.filters.clearAll')}
            </Button>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {filters.showFilters && (
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Date Range Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                {t('timeline.benchmark.filters.dateRange')}
              </Label>
              <div className="flex flex-col gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !filters.dateRange.from && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange.from
                        ? format(filters.dateRange.from, 'PP')
                        : t('timeline.benchmark.filters.from')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.from || undefined}
                      onSelect={(date) =>
                        updateFilters({
                          dateRange: { ...filters.dateRange, from: date || null },
                        })
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !filters.dateRange.to && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange.to
                        ? format(filters.dateRange.to, 'PP')
                        : t('timeline.benchmark.filters.to')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.to || undefined}
                      onSelect={(date) =>
                        updateFilters({
                          dateRange: { ...filters.dateRange, to: date || null },
                        })
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Cost Range Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                {t('timeline.benchmark.filters.costRange')}
              </Label>
              <div className="space-y-2">
                <Slider
                  value={[filters.costRange.min, filters.costRange.max]}
                  max={maxCost}
                  step={maxCost / 100}
                  minStepsBetweenThumbs={1}
                  onValueChange={([min, max]) =>
                    updateFilters({
                      costRange: { min, max },
                    })
                  }
                  className="w-full"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatCurrency(filters.costRange.min)}</span>
                  <span>{formatCurrency(filters.costRange.max)}</span>
                </div>
              </div>
            </div>

            {/* Area Range Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                {t('timeline.benchmark.filters.areaRange')}
              </Label>
              <div className="space-y-2">
                <Slider
                  value={[filters.areaRange.min, filters.areaRange.max]}
                  max={maxArea}
                  step={maxArea / 100}
                  minStepsBetweenThumbs={1}
                  onValueChange={([min, max]) =>
                    updateFilters({
                      areaRange: { min, max },
                    })
                  }
                  className="w-full"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{Math.round(filters.areaRange.min)} m²</span>
                  <span>{Math.round(filters.areaRange.max)} m²</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
