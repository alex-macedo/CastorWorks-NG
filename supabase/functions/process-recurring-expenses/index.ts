import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Fetch active patterns that are due for processing
    const { data: patterns, error: fetchError } = await supabaseClient
      .from('recurring_expense_patterns')
      .select('*')
      .lte('start_date', new Date().toISOString().split('T')[0])
      .or(`end_date.is.null,end_date.gte.${new Date().toISOString().split('T')[0]}`)

    if (fetchError) throw fetchError

    const results = []

    for (const pattern of patterns) {
      const today = new Date()
      let shouldProcess = false
      const lastProcessed = pattern.last_processed_at ? new Date(pattern.last_processed_at) : null

      if (!lastProcessed) {
        shouldProcess = true
      } else {
        // Simple logic for monthly/weekly
        if (pattern.frequency === 'monthly') {
          const nextDueDate = new Date(lastProcessed)
          nextDueDate.setMonth(nextDueDate.getMonth() + 1)
          if (today >= nextDueDate) shouldProcess = true
        } else if (pattern.frequency === 'bi-weekly') {
          const nextDueDate = new Date(lastProcessed)
          nextDueDate.setDate(nextDueDate.getDate() + 14)
          if (today >= nextDueDate) shouldProcess = true
        } else if (pattern.frequency === 'weekly') {
          const nextDueDate = new Date(lastProcessed)
          nextDueDate.setDate(nextDueDate.getDate() + 7)
          if (today >= nextDueDate) shouldProcess = true
        } else if (pattern.frequency === 'daily') {
            const nextDueDate = new Date(lastProcessed)
            nextDueDate.setDate(nextDueDate.getDate() + 1)
            if (today >= nextDueDate) shouldProcess = true
        }
      }

      if (shouldProcess) {
        // 2. Insert financial entry
        const { data: entry, error: insertError } = await supabaseClient
          .from('project_financial_entries')
          .insert({
            project_id: pattern.project_id,
            description: `[Recurring] ${pattern.description}`,
            amount: pattern.amount,
            type: 'expense',
            entry_date: today.toISOString().split('T')[0],
            wbs_node_id: pattern.wbs_node_id,
            recurring_pattern_id: pattern.id,
            category: 'Other', // Default
            status: 'pending'
          })
          .select()
          .single()

        if (insertError) {
          console.error(`Error inserting entry for pattern ${pattern.id}:`, insertError)
          continue
        }

        // 3. Update last_processed_at
        await supabaseClient
          .from('recurring_expense_patterns')
          .update({ last_processed_at: today.toISOString() })
          .eq('id', pattern.id)

        results.push({ patternId: pattern.id, entryId: entry.id })
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, details: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
