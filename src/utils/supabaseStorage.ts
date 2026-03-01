// Centralized Supabase storage helpers
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

export const DEFAULT_TTLS = {
  short: 60 * 60, // 1 hour
  medium: 60 * 60 * 24 * 7, // 7 days
  long: 60 * 60 * 24 * 365, // 1 year
}

export async function getSignedUrl(
  supabaseClient: SupabaseClient,
  bucket: string,
  path: string,
  ttl = DEFAULT_TTLS.short
): Promise<{ signedUrl?: string; error?: any }> {
  try {
    const { data, error } = await supabaseClient.storage.from(bucket).createSignedUrl(path, ttl)
    if (error) return { error }
    return { signedUrl: data.signedUrl }
  } catch (err) {
    return { error: err }
  }
}

export default { getSignedUrl, DEFAULT_TTLS }
