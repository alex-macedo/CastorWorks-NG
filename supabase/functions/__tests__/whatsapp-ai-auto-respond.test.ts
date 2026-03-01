/**
 * Tests for WA-8.1: WhatsApp AI Auto-Responder
 */
import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts'
import { handleAiAutoRespond } from '../_shared/whatsappAiAutoRespond.ts'

Deno.test('handleAiAutoRespond returns sent:false when WhatsApp integration disabled', async () => {
  const mockSupabase = {
    from: (_table: string) => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: {
              is_enabled: false,
              configuration: { ai_auto_responder_enabled: true },
            },
            error: null,
          }),
        }),
      }),
    }),
  }
  // deno-lint-ignore no-explicit-any
  const result = await handleAiAutoRespond(mockSupabase as any, {
    fromPhone: '+5511999999999',
    text: 'What is the project status?',
  })
  assertEquals(result.sent, false)
})

Deno.test('handleAiAutoRespond returns sent:false when AI auto-responder disabled', async () => {
  const mockSupabase = {
    from: (_table: string) => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: {
              is_enabled: true,
              configuration: { ai_auto_responder_enabled: false },
            },
            error: null,
          }),
        }),
      }),
    }),
  }
  // deno-lint-ignore no-explicit-any
  const result = await handleAiAutoRespond(mockSupabase as any, {
    fromPhone: '+5511999999999',
    text: 'What is the project status?',
  })
  assertEquals(result.sent, false)
})

Deno.test('handleAiAutoRespond returns sent:false for very short messages', async () => {
  const mockSupabase = {
    from: (_table: string) => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: {
              is_enabled: true,
              configuration: { ai_auto_responder_enabled: true },
            },
            error: null,
          }),
        }),
      }),
    }),
  }
  // deno-lint-ignore no-explicit-any
  const result = await handleAiAutoRespond(mockSupabase as any, {
    fromPhone: '+5511999999999',
    text: 'x',
  })
  assertEquals(result.sent, false)
})

Deno.test('handleAiAutoRespond returns sent:false when integration_settings row missing', async () => {
  const mockSupabase = {
    from: (_table: string) => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: null,
            error: { message: 'Row not found' },
          }),
        }),
      }),
    }),
  }
  // deno-lint-ignore no-explicit-any
  const result = await handleAiAutoRespond(mockSupabase as any, {
    fromPhone: '+5511999999999',
    text: 'What is the project status?',
  })
  assertEquals(result.sent, false)
})

Deno.test('handleAiAutoRespond returns sent:false when user opted out', async () => {
  const mockSupabase = {
    from: (table: string) => {
      const link = {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: {
                is_enabled: true,
                configuration: { ai_auto_responder_enabled: true },
              },
              error: null,
            }),
            maybeSingle: () => Promise.resolve(
              table === 'whatsapp_opt_ins'
                ? { data: { opted_in: false }, error: null }
                : { data: null, error: null }
            ),
          }),
        }),
      }
      return link
    },
  }
  // deno-lint-ignore no-explicit-any
  const result = await handleAiAutoRespond(mockSupabase as any, {
    fromPhone: '+5511999999999',
    text: 'What is the project status?',
  })
  assertEquals(result.sent, false)
})
