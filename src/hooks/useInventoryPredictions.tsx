import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface InventoryPrediction {
  material_name: string
  action: string
  needed_by: string
  predicted_shortfall: string
  priority: 'high' | 'medium' | 'low'
}

interface UseInventoryPredictionsResult {
  predictions: InventoryPrediction[]
  cached?: boolean
  generatedAt?: string | null
  isLoading: boolean
  error: string | null
  fetchPredictions: (forceRefresh?: boolean) => Promise<void>
  refresh: () => Promise<void>
}

export const useInventoryPredictions = (projectId: string): UseInventoryPredictionsResult => {
  const [predictions, setPredictions] = useState<InventoryPrediction[]>([])
  const [cached, setCached] = useState<boolean>(false)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchPredictions = useCallback(
    async (forceRefresh = false) => {
      if (!projectId) return
      setIsLoading(true)
      setError(null)

      try {
        const { data, err } = await supabase.functions.invoke('predict-inventory-needs', {
          body: { project_id: projectId, force_refresh: forceRefresh },
        })

        if (err) throw err
        if (data?.error) throw new Error(data.error)

        setPredictions(data.predictions ?? [])
        setCached(data.cached ?? false)
        setGeneratedAt(data.generatedAt ?? data.last_updated ?? null)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to fetch predictions'
        setError(msg)
        toast({ title: 'Error', description: msg, variant: 'destructive' })
      } finally {
        setIsLoading(false)
      }
    },
    [projectId, toast]
  )

  const refresh = useCallback(() => fetchPredictions(true), [fetchPredictions])

  useEffect(() => {
    if (projectId) fetchPredictions(false)
  }, [projectId, fetchPredictions])

  return {
    predictions,
    cached,
    generatedAt,
    isLoading,
    error,
    fetchPredictions,
    refresh,
  }
}
