/**
 * AI Cache Manager
 *
 * Handles caching of AI insights to reduce API costs and improve response times
 * - Checks for cached insights before calling AI
 * - Stores new insights with configurable TTL
 * - Invalidates cache on data changes
 * - Manages cache expiration
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface CacheOptions {
  ttlHours?: number; // Time-to-live in hours (default: 6)
  forceRefresh?: boolean; // Skip cache and regenerate
}

export interface CachedInsight {
  id: string;
  content: any;
  confidence_level: number;
  generated_at: string;
  expires_at: string;
  is_active: boolean;
}

export interface GetCachedInsightOptions {
  promptVersion?: string; // Hash/variant for cache differentiation (e.g. photo URLs hash)
}

/**
 * Check if a cached insight exists and is still valid
 */
export async function getCachedInsight(
  supabase: SupabaseClient,
  insightType: string,
  domain: string,
  projectId?: string,
  userId?: string,
  options?: GetCachedInsightOptions
): Promise<CachedInsight | null> {
  try {
    let query = supabase
      .from('ai_insights')
      .select('id, content, confidence_level, generated_at, expires_at, is_active')
      .eq('insight_type', insightType)
      .eq('domain', domain)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('generated_at', { ascending: false })
      .limit(1);

    // Add optional filters
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (options?.promptVersion) {
      query = query.eq('prompt_version', options.promptVersion);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found - cache miss
        return null;
      }
      throw error;
    }

    console.log(`✅ Cache HIT for ${insightType} (${domain})`);
    return data;
  } catch (error) {
    console.error('Error checking cache:', error);
    return null; // On error, return null to trigger fresh generation
  }
}

/**
 * Store a new AI insight in cache
 */
export async function cacheInsight(
  supabase: SupabaseClient,
  params: {
    insightType: string;
    domain: string;
    title: string;
    summary?: string;
    content: any;
    confidenceLevel: number;
    projectId?: string;
    userId?: string;
    promptVersion?: string;
    modelUsed?: string;
    tokensUsed?: number;
    processingTimeMs?: number;
    ttlHours?: number;
  }
): Promise<{ id: string; success: boolean }> {
  try {
    const ttlHours = params.ttlHours || 6;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ttlHours);

    const { data, error } = await supabase
      .from('ai_insights')
      .insert({
        insight_type: params.insightType,
        domain: params.domain,
        project_id: params.projectId || null,
        user_id: params.userId || null,
        title: params.title,
        summary: params.summary || null,
        content: params.content,
        confidence_level: params.confidenceLevel,
        prompt_version: params.promptVersion || null,
        model_used: params.modelUsed || 'openai/gpt-4o-mini',
        tokens_used: params.tokensUsed || null,
        processing_time_ms: params.processingTimeMs || null,
        expires_at: expiresAt.toISOString(),
        is_active: true,
      })
      .select('id')
      .single();

    if (error) throw error;

    console.log(`💾 Cached insight: ${params.insightType} (expires in ${ttlHours}h)`);

    return {
      id: data.id,
      success: true,
    };
  } catch (error) {
    console.error('Error caching insight:', error);
    return {
      id: '',
      success: false,
    };
  }
}

/**
 * Invalidate cached insights for a specific project/domain
 */
export async function invalidateCache(
  supabase: SupabaseClient,
  params: {
    domain?: string;
    insightType?: string;
    projectId?: string;
    userId?: string;
  }
): Promise<number> {
  try {
    const query = supabase
      .from('ai_insights')
      .update({ is_active: false })
      .eq('is_active', true);

    if (params.domain) {
      query.eq('domain', params.domain);
    }
    if (params.insightType) {
      query.eq('insight_type', params.insightType);
    }
    if (params.projectId) {
      query.eq('project_id', params.projectId);
    }
    if (params.userId) {
      query.eq('user_id', params.userId);
    }

    const { data, error } = await query.select('id');

    if (error) throw error;

    const count = data?.length || 0;
    console.log(`🗑️  Invalidated ${count} cached insights`);

    return count;
  } catch (error) {
    console.error('Error invalidating cache:', error);
    return 0;
  }
}

/**
 * Get user's AI configuration for cache duration and preferences
 */
export async function getUserAIConfig(
  supabase: SupabaseClient,
  userId: string,
  projectId?: string
): Promise<{
  cacheDurationHours: number;
  autoRefresh: boolean;
  enabledFeatures: Record<string, boolean>;
  preferences: Record<string, any>;
}> {
  try {
    // Try to get project-specific config first, then user config, then defaults
    let query = supabase
      .from('ai_configurations')
      .select('*')
      .eq('user_id', userId);

    if (projectId) {
      query = query.eq('project_id', projectId).eq('scope', 'project');
    } else {
      query = query.eq('scope', 'user').is('project_id', null);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      // Return defaults if no config found
      return {
        cacheDurationHours: 6,
        autoRefresh: true,
        enabledFeatures: {},
        preferences: {
          confidence_threshold: 70,
          notification_frequency: 'daily',
        },
      };
    }

    return {
      cacheDurationHours: data.cache_duration_hours || 6,
      autoRefresh: data.auto_refresh ?? true,
      enabledFeatures: data.enabled_features || {},
      preferences: data.preferences || {},
    };
  } catch (error) {
    console.error('Error getting user AI config:', error);
    // Return defaults on error
    return {
      cacheDurationHours: 6,
      autoRefresh: true,
      enabledFeatures: {},
      preferences: {},
    };
  }
}

/**
 * Check if a specific AI feature is enabled for user/project
 */
export async function isFeatureEnabled(
  supabase: SupabaseClient,
  userId: string,
  featureName: string,
  projectId?: string
): Promise<boolean> {
  try {
    const config = await getUserAIConfig(supabase, userId, projectId);

    // Feature is enabled if:
    // 1. It's explicitly set to true in enabledFeatures
    // 2. OR it's not in enabledFeatures (default to enabled)
    const enabledFeatures = config.enabledFeatures;

    if (featureName in enabledFeatures) {
      return enabledFeatures[featureName] === true;
    }

    // Default: enabled
    return true;
  } catch (error) {
    console.error('Error checking feature enabled:', error);
    // Default to enabled on error
    return true;
  }
}

/**
 * Clean up expired insights (should be run via cron job)
 */
export async function cleanupExpiredInsights(
  supabase: SupabaseClient
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('ai_insights')
      .update({ is_active: false })
      .eq('is_active', true)
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) throw error;

    const count = data?.length || 0;
    console.log(`🧹 Cleaned up ${count} expired insights`);

    return count;
  } catch (error) {
    console.error('Error cleaning up expired insights:', error);
    return 0;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(
  supabase: SupabaseClient,
  projectId?: string
): Promise<{
  totalCached: number;
  activeCache: number;
  expiredCache: number;
  cacheByDomain: Record<string, number>;
  avgConfidence: number;
}> {
  try {
    let query = supabase
      .from('ai_insights')
      .select('domain, confidence_level, is_active, expires_at');

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const now = new Date();
    const insights = data || [];

    const stats = {
      totalCached: insights.length,
      activeCache: insights.filter(i => i.is_active && new Date(i.expires_at) > now).length,
      expiredCache: insights.filter(i => i.is_active && new Date(i.expires_at) <= now).length,
      cacheByDomain: {} as Record<string, number>,
      avgConfidence: 0,
    };

    // Group by domain
    insights.forEach(insight => {
      stats.cacheByDomain[insight.domain] = (stats.cacheByDomain[insight.domain] || 0) + 1;
    });

    // Calculate average confidence
    const confidences = insights
      .filter(i => i.confidence_level != null)
      .map(i => i.confidence_level);

    if (confidences.length > 0) {
      stats.avgConfidence = Math.round(
        confidences.reduce((sum, c) => sum + c, 0) / confidences.length
      );
    }

    return stats;
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return {
      totalCached: 0,
      activeCache: 0,
      expiredCache: 0,
      cacheByDomain: {},
      avgConfidence: 0,
    };
  }
}
