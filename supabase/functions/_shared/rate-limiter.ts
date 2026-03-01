/**
 * Rate Limiter for WhatsApp Cloud API
 * 
 * Implements rate limiting based on WhatsApp API tiers:
 * - Tier 1: 1,000 unique contacts per 24 hours
 * - Tier 2: 10,000 unique contacts per 24 hours
 * - Tier 3: 100,000 unique contacts per 24 hours
 * 
 * Uses PostgreSQL to track rate limit usage per phone number.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  tier: number;
  currentCount: number;
  limit: number;
}

/**
 * Get rate limit for a phone number
 */
function getRateLimitForTier(tier: number): number {
  switch (tier) {
    case 1:
      return 1000; // 1,000 contacts per 24 hours
    case 2:
      return 10000; // 10,000 contacts per 24 hours
    case 3:
      return 100000; // 100,000 contacts per 24 hours
    default:
      return 1000; // Default to Tier 1
  }
}

/**
 * Check if a phone number can send a message (rate limit check)
 */
export async function checkRateLimit(
  phoneNumber: string,
  tier: number = 1
): Promise<RateLimitResult> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Normalize phone number (E.164 format)
  const normalizedPhone = phoneNumber.replace(/\D/g, '');
  const phoneWithPlus = normalizedPhone.startsWith('+') ? normalizedPhone : `+${normalizedPhone}`;

  // Get current 24-hour window
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setHours(0, 0, 0, 0); // Start of today
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + 1); // End of today

  // Get or create rate limit record
  const { data: rateLimit, error: fetchError } = await supabase
    .from('whatsapp_rate_limits')
    .select('*')
    .eq('phone_number', phoneWithPlus)
    .gte('window_end', windowStart.toISOString())
    .lte('window_start', windowEnd.toISOString())
    .order('window_start', { ascending: false })
    .limit(1)
    .single();

  const limit = getRateLimitForTier(tier);
  let currentCount = 0;
  let resetAt = windowEnd;

  if (rateLimit && !fetchError) {
    // Existing record found
    currentCount = rateLimit.contact_count;
    resetAt = new Date(rateLimit.window_end);
  } else {
    // Create new rate limit record for this window
    const { error: insertError } = await supabase
      .from('whatsapp_rate_limits')
      .insert({
        phone_number: phoneWithPlus,
        contact_count: 0,
        window_start: windowStart.toISOString(),
        window_end: windowEnd.toISOString(),
        tier,
      });

    if (insertError) {
      console.error('Failed to create rate limit record:', insertError);
      // Continue with count = 0
    }
  }

  const allowed = currentCount < limit;
  const remaining = Math.max(0, limit - currentCount);

  return {
    allowed,
    remaining,
    resetAt,
    tier,
    currentCount,
    limit,
  };
}

/**
 * Increment rate limit counter for a phone number
 */
export async function incrementRateLimit(phoneNumber: string, tier: number = 1): Promise<void> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Normalize phone number
  const normalizedPhone = phoneNumber.replace(/\D/g, '');
  const phoneWithPlus = normalizedPhone.startsWith('+') ? normalizedPhone : `+${normalizedPhone}`;

  // Get current 24-hour window
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setHours(0, 0, 0, 0);
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + 1);

  // Get existing record
  const { data: rateLimit } = await supabase
    .from('whatsapp_rate_limits')
    .select('*')
    .eq('phone_number', phoneWithPlus)
    .gte('window_end', windowStart.toISOString())
    .lte('window_start', windowEnd.toISOString())
    .order('window_start', { ascending: false })
    .limit(1)
    .single();

  if (rateLimit) {
    // Update existing record
    const { error } = await supabase
      .from('whatsapp_rate_limits')
      .update({
        contact_count: rateLimit.contact_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rateLimit.id);

    if (error) {
      console.error('Failed to increment rate limit:', error);
    }
  } else {
    // Create new record
    const { error } = await supabase
      .from('whatsapp_rate_limits')
      .insert({
        phone_number: phoneWithPlus,
        contact_count: 1,
        window_start: windowStart.toISOString(),
        window_end: windowEnd.toISOString(),
        tier,
      });

    if (error) {
      console.error('Failed to create rate limit record:', error);
    }
  }
}

/**
 * Check if a recipient phone number has opted in
 */
export async function checkOptIn(phoneNumber: string): Promise<boolean> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Normalize phone number
  const normalizedPhone = phoneNumber.replace(/\D/g, '');
  const phoneWithPlus = normalizedPhone.startsWith('+') ? normalizedPhone : `+${normalizedPhone}`;

  const { data: optIn, error } = await supabase
    .from('whatsapp_opt_ins')
    .select('opted_in')
    .eq('phone_number', phoneWithPlus)
    .single();

  if (error || !optIn) {
    // If not found, default to false (opt-in required)
    return false;
  }

  return optIn.opted_in === true;
}

/**
 * Record opt-in for a phone number
 */
export async function recordOptIn(
  phoneNumber: string,
  source: 'manual' | 'webhook' | 'api' | 'form' = 'manual',
  notes?: string
): Promise<void> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Normalize phone number
  const normalizedPhone = phoneNumber.replace(/\D/g, '');
  const phoneWithPlus = normalizedPhone.startsWith('+') ? normalizedPhone : `+${normalizedPhone}`;

  // Check if record exists
  const { data: existing } = await supabase
    .from('whatsapp_opt_ins')
    .select('id')
    .eq('phone_number', phoneWithPlus)
    .single();

  if (existing) {
    // Update existing record
    await supabase
      .from('whatsapp_opt_ins')
      .update({
        opted_in: true,
        opted_in_at: new Date().toISOString(),
        opted_out_at: null,
        source,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    // Create new record
    await supabase.from('whatsapp_opt_ins').insert({
      phone_number: phoneWithPlus,
      opted_in: true,
      opted_in_at: new Date().toISOString(),
      source,
      notes,
    });
  }
}

/**
 * Record opt-out for a phone number
 */
export async function recordOptOut(
  phoneNumber: string,
  source: 'manual' | 'webhook' | 'api' | 'form' = 'webhook',
  notes?: string
): Promise<void> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Normalize phone number
  const normalizedPhone = phoneNumber.replace(/\D/g, '');
  const phoneWithPlus = normalizedPhone.startsWith('+') ? normalizedPhone : `+${normalizedPhone}`;

  // Check if record exists
  const { data: existing } = await supabase
    .from('whatsapp_opt_ins')
    .select('id')
    .eq('phone_number', phoneWithPlus)
    .single();

  if (existing) {
    // Update existing record
    await supabase
      .from('whatsapp_opt_ins')
      .update({
        opted_in: false,
        opted_out_at: new Date().toISOString(),
        source,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    // Create new record
    await supabase.from('whatsapp_opt_ins').insert({
      phone_number: phoneWithPlus,
      opted_in: false,
      opted_out_at: new Date().toISOString(),
      source,
      notes,
    });
  }
}
