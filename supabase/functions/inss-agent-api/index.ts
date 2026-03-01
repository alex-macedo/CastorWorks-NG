import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { calculateBasicINSS } from '../_shared/inss-logic.ts'

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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const body = await req.json();
    const { action, params } = body;

    let result;

    switch (action) {
      case 'compute_forecast':
        result = await computeForecast(supabaseClient, params);
        break;
      case 'generate_sero_checklist':
        result = await generateSeroChecklist(supabaseClient, params);
        break;
      case 'close_work_compliance':
        result = await closeWorkCompliance(supabaseClient, params);
        break;
      case 'get_compliance_journey':
        result = await getComplianceJourney(supabaseClient, params);
        break;
      case 'update_step_status':
        result = await updateStepStatus(supabaseClient, params);
        break;
      case 'get_tax_alerts':
        result = await getTaxAlerts(supabaseClient, params);
        break;
      case 'resolve_tax_alert':
        result = await resolveTaxAlert(supabaseClient, params);
        break;
      case 'simulate_inss':
        result = await simulateINSS(supabaseClient, params);
        break;
      case 'get_vau_references':
        result = await getVauReferences(supabaseClient, params);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function computeForecast(supabase: any, params: any) {
  const { work_id } = params;
  
  const { data: work, error: workError } = await supabase
    .from('tax_projects')
    .select('*')
    .eq('id', work_id)
    .single();
    
  if (workError) throw workError;

  const { data: estimate, error: estError } = await supabase
    .from('tax_estimates')
    .select('*')
    .eq('tax_project_id', work_id)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (estError) throw estError;

  return { 
    success: true, 
    forecast: {
      work_id,
      current_status: work.status,
      standard_estimate: estimate?.inss_estimate || 0,
      planned_estimate: estimate?.assumptions?.plannedScenario?.totalINSS || 0,
      potential_savings: estimate?.potential_savings || 0,
      planned_monthly_payment: estimate?.assumptions?.plannedScenario?.monthlyPayment || 0,
      installments_60x: estimate?.assumptions?.installments?.monthlyValue || 0
    }
  };
}

async function generateSeroChecklist(supabase: any, params: any) {
  const { work_id } = params;

  const { data, error } = await supabase
    .rpc('check_tax_project_evidence', { p_tax_project_id: work_id });

  if (error) throw error;

  const { valid, missing_docs } = data[0];

  return { 
    success: true, 
    ready: valid,
    missing_items: missing_docs || [],
    recommendations: valid ? ["Ready for SERO submission in e-CAC."] : ["Upload missing evidence to unlock SERO submission."]
  };
}

async function closeWorkCompliance(supabase: any, params: any) {
  const { work_id, cnd_number } = params;

  // 1. Update project status
  const { data: project, error: updateError } = await supabase
    .from('tax_projects')
    .update({ 
      status: 'CLOSED',
      notes: `Closed via Agent API. CND: ${cnd_number}` 
    })
    .eq('id', work_id)
    .select()
    .single();

  if (updateError) throw updateError;

  // 2. Add an audit entry
  await supabase
    .from('tax_alerts')
    .insert({
      tax_project_id: work_id,
      alert_type: 'COMPLIANCE_CLOSURE',
      severity: 'success',
      message: `Project closed successfully. CND number: ${cnd_number}`,
      metadata: { closed_at: new Date().toISOString(), cnd_number }
    });

  return { success: true, project };
}

async function getComplianceJourney(supabase: any, params: any) {
  const { tax_project_id } = params;
  const { data, error } = await supabase
    .from('tax_guide_process')
    .select('*')
    .eq('tax_project_id', tax_project_id)
    .order('step_order', { ascending: true });

  if (error) throw error;
  return { success: true, steps: data };
}

async function updateStepStatus(supabase: any, params: any) {
  const { step_id, status } = params;
  const updateData: any = { status, updated_at: new Date().toISOString() };
  if (status === 'COMPLETED') {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('tax_guide_process')
    .update(updateData)
    .eq('id', step_id)
    .select()
    .single();

  if (error) throw error;
  return { success: true, step: data };
}

async function getTaxAlerts(supabase: any, params: any) {
  const { tax_project_id, active_only = true } = params;
  let query = supabase
    .from('tax_alerts')
    .select('*')
    .eq('tax_project_id', tax_project_id);

  if (active_only) {
    query = query.eq('resolved', false);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return { success: true, alerts: data };
}

async function resolveTaxAlert(supabase: any, params: any) {
  const { alert_id, resolved_by } = params;
  const { data, error } = await supabase
    .from('tax_alerts')
    .update({ 
      resolved: true, 
      resolved_at: new Date().toISOString(),
      acknowledged_by: resolved_by 
    })
    .eq('id', alert_id)
    .select()
    .single();

  if (error) throw error;
  return { success: true, alert: data };
}

function simulateINSS(_supabase: any, params: any) {
  const { area, state, construction_type } = params;
  
  if (!area || !state || !construction_type) {
    throw new Error("Missing parameters for simulation (area, state, construction_type required)");
  }

  const estimatedINSS = calculateBasicINSS(area, state, construction_type);
  
  return { 
    success: true, 
    simulation: {
      params: { area, state, construction_type },
      estimated_inss: estimatedINSS,
      currency: 'BRL',
      calculation_date: new Date().toISOString()
    }
  };
}

async function getVauReferences(supabase: any, params: any) {
  const { state_code, ref_month } = params;
  let query = supabase.from('tax_vau_reference').select('*');
  
  if (state_code) query = query.eq('state_code', state_code);
  if (ref_month) query = query.eq('ref_month', ref_month);

  const { data, error } = await query.order('ref_month', { ascending: false });
  if (error) throw error;
  return { success: true, references: data };
}
