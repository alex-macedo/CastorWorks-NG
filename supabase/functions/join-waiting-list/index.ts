import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

import { sendWaitlistConfirmationEmail } from "../_shared/sendWaitlistConfirmationEmail.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const submissionSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  companyName: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(255),
  cellPhone: z.string().trim().min(8).max(40),
  moreInfoRequest: z.string().trim().max(500).optional().or(z.literal("")),
  source: z.string().trim().min(2).max(80),
  locale: z.string().trim().default('en').transform((v: string) =>
    v === 'pt-BR' ? 'pt-BR' : 'en'
  ),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase service credentials are not configured')
    }

    const payload = submissionSchema.parse(await req.json())
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const normalizedEmail = payload.email.trim().toLowerCase()
    const normalizedPhone = payload.cellPhone.trim()
    const moreInfoRequest = payload.moreInfoRequest?.trim() || null

    const { data: existingEntry, error: selectError } = await supabase
      .from('waiting_list')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (selectError) {
      throw selectError
    }

    const record = {
      full_name: payload.fullName.trim(),
      company_name: payload.companyName.trim(),
      email: normalizedEmail,
      cell_phone: normalizedPhone,
      more_info_request: moreInfoRequest,
      source: payload.source.trim(),
      locale: payload.locale,
      status: 'new',
    }

    let entryId = existingEntry?.id ?? null
    let alreadyJoined = Boolean(existingEntry)

    if (existingEntry) {
      const { error: updateError } = await supabase
        .from('waiting_list')
        .update(record)
        .eq('id', existingEntry.id)

      if (updateError) {
        throw updateError
      }
    } else {
      const { data: insertedEntry, error: insertError } = await supabase
        .from('waiting_list')
        .insert(record)
        .select('id')
        .single()

      if (insertError) {
        if (insertError.code === '23505') {
          alreadyJoined = true
          const { data: duplicateEntry, error: duplicateSelectError } = await supabase
            .from('waiting_list')
            .select('id')
            .eq('email', normalizedEmail)
            .maybeSingle()

          if (duplicateSelectError) {
            throw duplicateSelectError
          }

          if (duplicateEntry?.id) {
            entryId = duplicateEntry.id
            const { error: updateDuplicateError } = await supabase
              .from('waiting_list')
              .update(record)
              .eq('id', duplicateEntry.id)

            if (updateDuplicateError) {
              throw updateDuplicateError
            }
          }
        } else {
          throw insertError
        }
      } else {
        entryId = insertedEntry.id
      }
    }

    let emailDeliveryStatus: 'sent' | 'failed' = 'sent'

    try {
      const emailResult = await sendWaitlistConfirmationEmail({
        companyName: payload.companyName.trim(),
        locale: payload.locale,
        userEmail: normalizedEmail,
        userName: payload.fullName.trim(),
      })

      try {
        await supabase.from('email_notifications').insert({
          recipient_email: normalizedEmail,
          subject: emailResult.subject,
          body: emailResult.body,
          notification_type: alreadyJoined ? 'waiting_list_repeat_confirmation' : 'waiting_list_confirmation',
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
      } catch (notifErr) {
        console.warn('[join-waiting-list] email_notifications sent-insert failed', notifErr)
      }
    } catch (emailError) {
      const emailMessage = emailError instanceof Error ? emailError.message : 'Unknown email error'
      emailDeliveryStatus = 'failed'

      try {
        await supabase.from('email_notifications').insert({
          recipient_email: normalizedEmail,
          subject: payload.locale === 'pt-BR'
            ? 'Voce entrou na lista de espera da CastorWorks'
            : 'You joined the CastorWorks waiting list',
          body: '',
          notification_type: alreadyJoined ? 'waiting_list_repeat_confirmation' : 'waiting_list_confirmation',
          status: 'failed',
          error_message: emailMessage,
        })
      } catch (notifErr) {
        console.warn('[join-waiting-list] email_notifications failed-insert error', notifErr)
      }
      console.error('[join-waiting-list] confirmation email failed', emailError)
    }

    return jsonResponse(
      {
        success: true,
        alreadyJoined,
        emailDeliveryStatus,
        id: entryId,
        message: alreadyJoined
          ? 'This email is already on the waiting list'
          : 'Added to the waiting list',
      },
      200,
    )
  } catch (error) {
    console.error('[join-waiting-list] error', error)

    const message = error instanceof z.ZodError
      ? error.issues[0]?.message || 'Invalid request'
      : error instanceof Error
        ? error.message
        : 'Unknown error'

    return jsonResponse({ error: message }, error instanceof z.ZodError ? 400 : 500)
  }
})

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}
