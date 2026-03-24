import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { authenticateRequest, createServiceRoleClient } from '../_shared/authorization.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const isAdminRole = (role: string) => ['admin', 'global_admin'].includes(role)
const defaultLocale = 'en-US'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user } = await authenticateRequest(req)
    const supabase = createServiceRoleClient()
    const body = req.method === 'GET' ? {} : await req.json().catch(() => ({}))

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .limit(1)

    const role = String(roles?.[0]?.role || 'viewer')

    if (req.method === 'GET') {
      const locale = String(new URL(req.url).searchParams.get('locale') || defaultLocale)
      const { data, error } = await supabase
        .from('castormind_prompt_templates')
        .select('*')
        .eq('is_active', true)
        .or(`locale.eq.${locale},locale.eq.${defaultLocale}`)
        .order('updated_at', { ascending: false })

      if (error) throw error
      const prioritizedItems = (data || [])
        .sort((a, b) => {
          const aPriority = a.locale === locale ? 0 : 1
          const bPriority = b.locale === locale ? 0 : 1
          return aPriority - bPriority
        })
        .filter((item, index, items) => index === items.findIndex(candidate => candidate.intent === item.intent))

      return new Response(JSON.stringify({ items: prioritizedItems }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!isAdminRole(role)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const action = String(body?.action || 'create')

    if (action === 'create') {
      const payload = {
        template_key: String(body?.template_key || '').trim(),
        title: String(body?.title || '').trim(),
        locale: String(body?.locale || 'en-US').trim(),
        intent: String(body?.intent || '').trim(),
        prompt_text: String(body?.prompt_text || '').trim(),
        variable_schema: body?.variable_schema || [],
        role_visibility: body?.role_visibility || [],
        safety_hints: body?.safety_hints || [],
        is_active: Boolean(body?.is_active ?? true),
        created_by: user.id,
        updated_by: user.id,
      }

      if (!payload.template_key || !payload.title || !payload.intent || !payload.prompt_text) {
        return new Response(
          JSON.stringify({ error: 'template_key, title, intent, prompt_text are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      const { data, error } = await supabase
        .from('castormind_prompt_templates')
        .insert(payload)
        .select('*')
        .single()

      if (error) throw error
      return new Response(JSON.stringify({ item: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'update') {
      const id = String(body?.id || '').trim()
      if (!id) {
        return new Response(JSON.stringify({ error: 'id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const updates: Record<string, unknown> = {
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }
      for (const key of ['title', 'locale', 'intent', 'prompt_text', 'variable_schema', 'role_visibility', 'safety_hints', 'is_active']) {
        if (body?.[key] !== undefined) updates[key] = body[key]
      }

      const { data, error } = await supabase
        .from('castormind_prompt_templates')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw error
      return new Response(JSON.stringify({ item: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'delete') {
      const id = String(body?.id || '').trim()
      if (!id) {
        return new Response(JSON.stringify({ error: 'id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { error } = await supabase
        .from('castormind_prompt_templates')
        .update({ is_active: false, updated_by: user.id, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: `Unsupported action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
