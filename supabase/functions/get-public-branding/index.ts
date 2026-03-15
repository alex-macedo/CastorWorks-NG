import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  proposalToken?: string
  formShareToken?: string
}

interface BrandingPayload {
  companyName: string | null
  companyLogoUrl: string | null
  email: string | null
  phone: string | null
  website: string | null
  address: string | null
}

const emptyBranding = (): BrandingPayload => ({
  companyName: null,
  companyLogoUrl: null,
  email: null,
  phone: null,
  website: null,
  address: null,
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { proposalToken, formShareToken }: RequestBody = await req.json()

    let tenantId: string | null = null

    if (proposalToken) {
      const { data: proposal, error: proposalError } = await supabase
        .from('proposals')
        .select('user_id, estimate_id')
        .eq('public_token', proposalToken)
        .maybeSingle()

      if (proposalError) {
        throw proposalError
      }

      if (proposal?.estimate_id) {
        const { data: estimate, error: estimateError } = await supabase
          .from('estimates')
          .select('project_id')
          .eq('id', proposal.estimate_id)
          .maybeSingle()

        if (estimateError) {
          throw estimateError
        }

        if (estimate?.project_id) {
          const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('tenant_id')
            .eq('id', estimate.project_id)
            .maybeSingle()

          if (projectError) {
            throw projectError
          }

          tenantId = project?.tenant_id ?? null
        }
      }

      if (!tenantId && proposal?.user_id) {
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
    } else if (formShareToken) {
      const { data: form, error: formError } = await supabase
        .from('forms')
        .select('tenant_id')
        .eq('share_token', formShareToken)
        .maybeSingle()

      if (formError) {
        throw formError
      }

      tenantId = form?.tenant_id ?? null
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'A proposalToken or formShareToken is required.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (!tenantId) {
      return new Response(
        JSON.stringify({
          success: true,
          branding: emptyBranding(),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

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

    return new Response(
      JSON.stringify({
        success: true,
        branding: {
          companyName: settings?.company_name ?? null,
          companyLogoUrl: settings?.company_logo_url ?? null,
          email: settings?.email ?? null,
          phone: settings?.phone ?? null,
          website: settings?.website ?? null,
          address: settings?.address ?? null,
        } satisfies BrandingPayload,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    console.error('get-public-branding failed:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
