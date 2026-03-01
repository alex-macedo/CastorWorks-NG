import { serve } from 'https://deno.land/std@0.180.0/http/server.ts';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') || '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function callAnthropic(prompt: string) {
  const url = 'https://api.anthropic.com/v1/complete';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
    },
    body: JSON.stringify({
      model: 'claude-2.1',
      prompt,
      max_tokens: 300,
      temperature: 0.2,
    }),
  });
  return res.json().catch(() => null);
}

async function callOpenAI(prompt: string) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an assistant composing a concise payment reminder message.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 400,
      temperature: 0.2,
    }),
  });
  return res.json().catch(() => null);
}

serve(async (req: Request) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { invoice_id, conversation_id, _trigger = 'reminder', custom_message } = body;

    if (!invoice_id || !conversation_id) {
      return new Response(JSON.stringify({ error: 'invoice_id and conversation_id required' }), { status: 400 });
    }

    // Fetch invoice and minimal context
    const { data: invoiceData, error: invErr } = await supabase.from('invoices').select('*').eq('id', invoice_id).single();
    if (invErr) {
      console.error('Invoice fetch error', invErr);
      return new Response(JSON.stringify({ error: 'invoice fetch error' }), { status: 500 });
    }

    const invoiceNumber = invoiceData?.number ?? invoiceData?.id;
    const amount = invoiceData?.amount;
    const due = invoiceData?.due_date;

    const userPrompt = `Invoice ${invoiceNumber} amount ${amount}, due ${due}. Please compose a polite, concise reminder message for the client about payment due. Include contact info and next steps.`;

    let assistantText = custom_message;
    let aiResponseRaw = null;

    if (!assistantText) {
      if (ANTHROPIC_API_KEY) {
        aiResponseRaw = await callAnthropic(userPrompt);
        assistantText = aiResponseRaw?.completion ?? aiResponseRaw?.text ?? null;
      } else if (OPENAI_API_KEY) {
        aiResponseRaw = await callOpenAI(userPrompt);
        assistantText = aiResponseRaw?.choices?.[0]?.message?.content ?? null;
      } else {
        assistantText = `Reminder: your invoice ${invoiceNumber} for ${amount} is due on ${due}. Please contact us if you need assistance.`;
      }
    }

    if (!assistantText) assistantText = `Reminder: your invoice ${invoiceNumber} for ${amount} is due on ${due}.`;

    // Insert assistant message into existing chat_messages table
    const nowIso = new Date().toISOString();
    const { data: inserted, error: insErr } = await supabase.from('chat_messages').insert({
      conversation_id,
      sender_id: null,
      text: assistantText,
      read: false,
      created_at: nowIso,
      updated_at: nowIso,
    }).select('*').single();

    if (insErr) {
      console.error('Error inserting assistant message', insErr);
      return new Response(JSON.stringify({ error: insErr.message }), { status: 500 });
    }

    // Log AI usage in ai_usage table if exists
    try {
      await supabase.from('ai_usage').insert({
        invoice_id,
        conversation_id,
        provider: ANTHROPIC_API_KEY ? 'anthropic' : (OPENAI_API_KEY ? 'openai' : 'none'),
        prompt: userPrompt,
        response: aiResponseRaw ?? { text: assistantText },
        created_at: new Date().toISOString(),
      });
    } catch (logErr) {
      console.warn('ai_usage logging failed (table may not exist)', logErr);
    }

    return new Response(JSON.stringify({ message: assistantText, inserted }), { status: 200 });
  } catch (err) {
    console.error('Unexpected mediator error', err);
    return new Response(JSON.stringify({ error: 'unexpected' }), { status: 500 });
  }
});
