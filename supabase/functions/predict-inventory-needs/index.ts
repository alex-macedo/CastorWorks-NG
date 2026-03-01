/**
 * Inventory Prediction Engine - Edge Function
 * 
 * Predicts material needs based on:
 * - Construction schedule (office_phases start dates)
 * - Material requirements linked to phases
 * - Current stock levels
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createServiceRoleClient, authenticateRequest, verifyProjectAccess } from '../_shared/authorization.ts'
import { getAICompletion } from '../_shared/aiProviderClient.ts'
import { getCachedInsight, cacheInsight } from '../_shared/aiCache.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  let user
  try {
    const auth = await authenticateRequest(req)
    user = auth.user
  } catch (_error) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabase = createServiceRoleClient()
    const body = await req.json()
    const { project_id, force_refresh: forceRefresh } = body

    if (!project_id) {
      return new Response(JSON.stringify({ error: 'project_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify project access
    try {
      await verifyProjectAccess(user.id, project_id, supabase)
    } catch (_error) {
      return new Response(
        JSON.stringify({ error: 'Access denied to this project' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!forceRefresh) {
      const cached = await getCachedInsight(
        supabase,
        'predict-inventory-needs',
        'logistics',
        project_id,
        undefined
      )
      if (cached && cached.content) {
        const content = cached.content as { predictions?: unknown }
        if (content.predictions !== undefined) {
          console.log('✅ Returning cached inventory prediction for', project_id)
          return new Response(
            JSON.stringify({
              success: true,
              predictions: content.predictions,
              cached: true,
              generatedAt: cached.generated_at,
              last_updated: cached.generated_at,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          )
        }
      }
    }

    console.log(`[Inventory Predictor] Calculating needs for project: ${project_id}`)

    // 1. Fetch current inventory
    const { data: inventory } = await supabase
      .from('project_inventory')
      .select('*')
      .eq('project_id', project_id)

    // 2. Fetch project schedule and linked materials
    const { data: phases } = await supabase
      .from('office_phases')
      .select(`
        id, 
        phase_name, 
        start_date, 
        status,
        project_materials (
          id,
          description,
          quantity,
          unit
        )
      `)
      .eq('project_id', project_id)
      .not('start_date', 'is', null)
      .order('start_date', { ascending: true })

    if (!phases || phases.length === 0) {
      return new Response(JSON.stringify({ success: true, predictions: [], message: 'No schedule found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Map requirements by Date
    const dailyNeeds: Record<string, any[]> = {}
    
    for (const phase of (phases as any[])) {
      const date = phase.start_date
      if (!dailyNeeds[date]) dailyNeeds[date] = []
      
      if (phase.project_materials) {
        for (const mat of (phase.project_materials as any[])) {
          dailyNeeds[date].push({
            name: mat.description,
            quantity: mat.quantity,
            unit: mat.unit
          })
        }
      }
    }

    // 4. Use AI to synthesize the prediction narrative
    const prompt = `
      Project Inventory: ${JSON.stringify(inventory?.map((i: any) => ({ name: i.item_name, stock: i.current_stock, unit: i.unit })))}
      
      Construction Schedule Requirements:
      ${JSON.stringify(dailyNeeds)}
      
      Based on this data, predict which materials will be missing and when. 
      Consider a 7-day lead time for procurement.
      Return a JSON list of predictions with:
      {
        "material_name": "string",
        "needed_by": "YYYY-MM-DD",
        "predicted_shortfall": number,
        "action": "string (e.g. Purchase by MM-DD)",
        "priority": "low" | "medium" | "high"
      }
    `

    const aiResponse = await getAICompletion({
      prompt,
      systemMessage: "You are CastorMind AI, a logistics and supply chain expert for construction projects. Return ONLY raw JSON array.",
      maxTokens: 1000,
      temperature: 0.1
    })

    const predictions = JSON.parse(aiResponse.content.replace(/```json/g, '').replace(/```/g, '').trim())

    const result = { success: true, predictions, last_updated: new Date().toISOString() }

    await cacheInsight(supabase, {
      insightType: 'predict-inventory-needs',
      domain: 'logistics',
      title: 'Inventory Needs Prediction',
      content: result,
      confidenceLevel: 80,
      projectId: project_id,
      ttlHours: 6,
    })

    return new Response(
      JSON.stringify({ ...result, cached: false, generatedAt: result.last_updated }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('[Inventory Predictor] Error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
