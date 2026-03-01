import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type {
  ConstructionCostBenchmarkProject,
  ConstructionCostBenchmarkMaterial,
  ConstructionCostBenchmarkAverage,
} from '@/types/timeline'

/**
 * Hook to fetch all construction cost benchmark projects
 * Returns projects with total cost and cost per m²
 */
export const useConstructionCostBenchmarkProjects = () => {
  return useQuery({
    queryKey: ['construction-cost-benchmarks', 'projects'],
    queryFn: async (): Promise<ConstructionCostBenchmarkProject[]> => {
      const { data, error } = await supabase
        .from('construction_cost_benchmark_projects')
        .select('*')
        .order('benchmark_date', { ascending: false })

      if (error) throw error

      return (data || []).map((row) => ({
        id: row.id,
        projectName: row.project_name,
        totalAreaM2: row.total_area_m2,
        totalCost: row.total_cost,
        costPerM2: row.cost_per_m2,
        benchmarkDate: new Date(row.benchmark_date),
        source: row.source || '',
        notes: row.notes || null,
      }))
    },
    staleTime: 1000 * 60 * 60, // 1 hour - benchmark data changes infrequently
  })
}

/**
 * Hook to fetch material cost breakdown for a specific benchmark project
 * @param projectId - Benchmark project UUID
 */
export const useConstructionCostBenchmarkMaterials = (projectId?: string) => {
  return useQuery({
    queryKey: ['construction-cost-benchmarks', 'materials', projectId],
    queryFn: async (): Promise<ConstructionCostBenchmarkMaterial[]> => {
      if (!projectId) return []

      const { data, error } = await supabase
        .from('construction_cost_benchmark_materials')
        .select('*')
        .eq('benchmark_project_id', projectId)
        .order('material_category')

      if (error) throw error

      return (data || []).map((row) => ({
        id: row.id,
        benchmarkProjectId: row.benchmark_project_id,
        materialCategory: row.material_category,
        totalCost: row.total_cost,
        costPerM2: row.cost_per_m2,
      }))
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

/**
 * Hook to fetch average costs per material category across all benchmarks
 * Useful for comparing current project costs to industry averages
 */
export const useConstructionCostBenchmarkAverages = () => {
  return useQuery({
    queryKey: ['construction-cost-benchmarks', 'averages'],
    queryFn: async (): Promise<ConstructionCostBenchmarkAverage[]> => {
      const { data, error } = await supabase
        .from('construction_cost_benchmark_averages')
        .select('*')
        .order('material_category')

      if (error) throw error

      return (data || []).map((row) => ({
        id: row.id,
        benchmarkGroup: row.benchmark_group,
        materialCategory: row.material_category,
        averageTotalCost: row.average_total_cost,
        averageCostPerM2: row.average_cost_per_m2,
        sampleSize: row.sample_size,
        benchmarkDate: new Date(row.benchmark_date),
      }))
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

/**
 * Combined hook that fetches projects with their material breakdowns
 * Returns enriched data for benchmark comparison table
 */
export const useConstructionCostBenchmarksWithMaterials = () => {
  const projectsQuery = useConstructionCostBenchmarkProjects()
  const averagesQuery = useConstructionCostBenchmarkAverages()

  return {
    projects: projectsQuery.data || [],
    averages: averagesQuery.data || [],
    isLoading: projectsQuery.isLoading || averagesQuery.isLoading,
    error: projectsQuery.error || averagesQuery.error,
  }
}

/**
 * Hook to calculate cost variance between a project and benchmarks
 * @param projectAreaM2 - Current project area
 * @param projectTotalCost - Current project total cost
 * @returns Variance percentage and comparison data
 */
export const useBenchmarkComparison = (
  projectAreaM2?: number,
  projectTotalCost?: number
) => {
  const { data: averages } = useConstructionCostBenchmarkAverages()

  if (!projectAreaM2 || !projectTotalCost || !averages?.length) {
    return {
      costPerM2: 0,
      benchmarkAverage: 0,
      variancePercent: 0,
      isAboveBenchmark: false,
      isBelowBenchmark: false,
      isSignificantlyAbove: false,
    }
  }

  const projectCostPerM2 = projectTotalCost / projectAreaM2

  // Calculate overall benchmark average
  const totalAverage = averages.reduce((sum, avg) => sum + avg.averageCostPerM2, 0)
  const benchmarkAverage = totalAverage / averages.length

  const variance = ((projectCostPerM2 - benchmarkAverage) / benchmarkAverage) * 100

  return {
    costPerM2: projectCostPerM2,
    benchmarkAverage,
    variancePercent: variance,
    isAboveBenchmark: variance > 5, // More than 5% above average
    isBelowBenchmark: variance < -5, // More than 5% below average
    isSignificantlyAbove: variance > 20, // More than 20% above average
  }
}

/**
 * Hook to compare material costs between project and benchmarks
 * @param projectMaterials - Array of project material costs
 * @param projectAreaM2 - Project area for per-m² calculations
 * @returns Material-level variance comparisons
 */
export const useMaterialCostComparison = (
  projectMaterials?: Array<{ category: string; cost: number }>,
  projectAreaM2?: number
) => {
  const { data: averages } = useConstructionCostBenchmarkAverages()

  if (!projectMaterials || !projectAreaM2 || !averages?.length) {
    return {
      comparisons: [],
      hasData: false,
    }
  }

  const comparisons = projectMaterials.map((material) => {
    const benchmark = averages.find((avg) => avg.materialCategory === material.category)

    if (!benchmark) {
      return {
        category: material.category,
        projectCostPerM2: material.cost / projectAreaM2,
        benchmarkCostPerM2: 0,
        variance: 0,
        isAbove: false,
        isBelow: false,
      }
    }

    const projectCostPerM2 = material.cost / projectAreaM2
    const variance =
      ((projectCostPerM2 - benchmark.averageCostPerM2) / benchmark.averageCostPerM2) * 100

    return {
      category: material.category,
      projectCostPerM2,
      benchmarkCostPerM2: benchmark.averageCostPerM2,
      variance,
      isAbove: variance > 10,
      isBelow: variance < -10,
    }
  })

  return {
    comparisons,
    hasData: true,
  }
}
