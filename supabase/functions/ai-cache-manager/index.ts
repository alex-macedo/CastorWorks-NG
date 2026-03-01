/**
 * AI Cache Manager Edge Function
 *
 * Manages AI insight caching operations:
 * - Check cache validity
 * - Invalidate specific caches
 * - Clean up expired insights
 * - Get cache statistics
 *
 * This is a utility function called by other edge functions or scheduled tasks
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import {
  authenticateRequest,
  createServiceRoleClient,
  verifyAdminRole,
} from '../_shared/authorization.ts';
import { createErrorResponse } from '../_shared/errorHandler.ts';
import {
  getCachedInsight,
  invalidateCache,
  cleanupExpiredInsights,
  getCacheStats,
  getUserAIConfig,
} from '../_shared/aiCache.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Request schema
const cacheRequestSchema = z.object({
  action: z.enum(['check', 'invalidate', 'cleanup', 'stats', 'config']),
  params: z
    .object({
      // For 'check' action
      insightType: z.string().optional(),
      domain: z.string().optional(),
      projectId: z.string().uuid().optional(),
      userId: z.string().uuid().optional(),
      // For 'invalidate' action (same as check)
      // For 'stats' action
      // projectId is optional
    })
    .optional(),
});

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();

    // Validate input
    const { action, params } = cacheRequestSchema.parse(requestBody);

    // Authenticate user (only for non-cleanup actions)
    const { user } = await authenticateRequest(req);
    const supabase = createServiceRoleClient();

    // Handle different actions
    switch (action) {
      case 'check': {
        // Check if a cached insight exists
        if (!params?.insightType || !params?.domain) {
          throw new Error('insightType and domain are required for check action');
        }

        const cached = await getCachedInsight(
          supabase,
          params.insightType,
          params.domain,
          params.projectId,
          params.userId || user.id
        );

        return new Response(
          JSON.stringify({
            success: true,
            cached: cached !== null,
            data: cached,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      case 'invalidate': {
        // Invalidate cache for specific criteria
        const count = await invalidateCache(supabase, {
          domain: params?.domain,
          insightType: params?.insightType,
          projectId: params?.projectId,
          userId: params?.userId || user.id,
        });

        return new Response(
          JSON.stringify({
            success: true,
            invalidated: count,
            message: `Invalidated ${count} cached insights`,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      case 'cleanup': {
        // Clean up expired insights (admin only or service role)
        await verifyAdminRole(user.id, supabase);

        const count = await cleanupExpiredInsights(supabase);

        return new Response(
          JSON.stringify({
            success: true,
            cleaned: count,
            message: `Cleaned up ${count} expired insights`,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      case 'stats': {
        // Get cache statistics
        const stats = await getCacheStats(supabase, params?.projectId);

        return new Response(
          JSON.stringify({
            success: true,
            stats,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      case 'config': {
        // Get user's AI configuration
        const config = await getUserAIConfig(
          supabase,
          params?.userId || user.id,
          params?.projectId
        );

        return new Response(
          JSON.stringify({
            success: true,
            config,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      default: {
        throw new Error(`Unknown action: ${action}`);
      }
    }
  } catch (error) {
    console.error('AI Cache Manager error:', error);

    return createErrorResponse(error, corsHeaders);
  }
});
