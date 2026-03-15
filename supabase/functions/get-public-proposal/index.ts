import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  token?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token }: RequestBody = await req.json()
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'A proposal token is required.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select('*')
      .eq('public_token', token)
      .maybeSingle()

    if (proposalError) {
      throw proposalError
    }

    if (!proposal) {
      return new Response(
        JSON.stringify({ success: true, proposal: null, estimate: null, companyInfo: null }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    let estimate = null
    if (proposal.estimate_id) {
      const { data: estimateData, error: estimateError } = await supabase
        .from('estimates')
        .select('*')
        .eq('id', proposal.estimate_id)
        .maybeSingle()

      if (estimateError) {
        throw estimateError
      }

      if (estimateData) {
        let client = null

        if (estimateData.client_id) {
          const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('name, email, phone')
            .eq('id', estimateData.client_id)
            .maybeSingle()

          if (clientError) {
            throw clientError
          }

          client = clientData
        }

        estimate = {
          ...estimateData,
          clients: client,
        }
      }
    }

    let tenantId = proposal.tenant_id ?? estimate?.tenant_id ?? null

    if (!tenantId && proposal.user_id) {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('user_id', proposal.user_id)
        .maybeSingle()

      if (profileError) {
        throw profileError
      }

      if (profile?.company_id) {
        const { data: companyProfile, error: companyProfileError } = await supabase
          .from('company_profiles')
          .select('tenant_id')
          .eq('id', profile.company_id)
          .maybeSingle()

        if (companyProfileError) {
          throw companyProfileError
        }

        tenantId = companyProfile?.tenant_id ?? null
      }
    }

    let companyInfo = null
    if (tenantId) {
      const { data: settings, error: settingsError } = await supabase
        .from('company_settings')
        .select('company_name, company_logo_url, email, phone, website, address')
        .eq('tenant_id', tenantId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (settingsError) {
        throw settingsError
      }

      companyInfo = settings
        ? {
            name: settings.company_name,
            logo: settings.company_logo_url,
            email: settings.email,
            phone: settings.phone,
            website: settings.website,
            address: settings.address,
          }
        : null
    }

    return new Response(
      JSON.stringify({
        success: true,
        proposal,
        estimate,
        companyInfo,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    console.error('get-public-proposal failed:', error)

    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
