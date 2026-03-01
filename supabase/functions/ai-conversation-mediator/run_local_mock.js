// Local mock runner for ai-conversation-mediator
// Run with: `node supabase/functions/ai-conversation-mediator/run_local_mock.js`

import process from "node:process";

function callAnthropicMock(prompt) {
  return `Mocked Anthropic response for prompt: ${prompt.slice(0, 120)}...`;
}

function callOpenAIMock(prompt) {
  return `Mocked OpenAI response for prompt: ${prompt.slice(0, 120)}...`;
}

// Minimal mock of Supabase client used by the mediator
function createSupabaseMock() {
  return {
    from(table) {
      return {
        insert: (payload) => {
          console.log(`\n[DB MOCK] insert into ${table}:`, JSON.stringify(payload, null, 2));
          // Simulate returning inserted row with id
          const row = Array.isArray(payload) ? payload[0] : payload;
          return { data: { id: row.id || 'mock-id' }, error: null };
        },
        select: () => {
          return { data: [], error: null };
        },
        update: () => ({ data: null, error: null }),
        eq: function () { return this; },
        single: () => ({ data: null, error: null }),
      };
    }
  };
}

async function run() {
  const supabase = createSupabaseMock();

  // Test payload: invoice_id + conversation_id + minimal invoice data
  const invoice = {
    id: 'inv-123',
    invoice_number: 'INV-2025-001',
    amount_due: 1250.5,
    due_date: '2025-12-01',
    client_name: 'ACME Co',
    client_email: 'billing@acme.example',
  };

  const conversationId = 'conv-456';

  // Compose user prompt (same structure as mediator)
  const userPrompt = `Invoice ${invoice.invoice_number} is due ${invoice.due_date}. Amount: ${invoice.amount_due}. Please write a polite reminder message to the client (${invoice.client_name}) asking to pay or propose a payment plan.`;

  // Choose mocked model based on available mocks (prefer Anthropic)
  let assistantText;
  try {
    assistantText = await callAnthropicMock(userPrompt);
  } catch (_e) {
    assistantText = await callOpenAIMock(userPrompt);
  }

  // Insert assistant message into chat_messages (mock)
  const messageRow = {
    conversation_id: conversationId,
    sender_type: 'bot',
    content: assistantText,
    metadata: { trigger: 'reminder-mediator-local-mock', invoice_id: invoice.id },
    created_at: new Date().toISOString(),
  };

  const insertMsgRes = await supabase.from('chat_messages').insert(messageRow);
  console.log('[RUNNER] insert chat_messages result:', insertMsgRes);

  // Attempt to log ai_usage (mock)
  const aiUsageRow = {
    provider: 'mock',
    model: 'mock-model',
    prompt: userPrompt,
    response: assistantText,
    invoice_id: invoice.id,
    conversation_id: conversationId,
    created_at: new Date().toISOString(),
  };

  const insertUsageRes = await supabase.from('ai_usage').insert(aiUsageRow);
  console.log('[RUNNER] insert ai_usage result:', insertUsageRes);

  console.log('\n=== MOCK RUN COMPLETE ===');
  console.log('Assistant message preview:', assistantText.slice(0, 300));
}

run().catch((err) => {
  console.error('Runner error:', err);
  process.exit(1);
});
