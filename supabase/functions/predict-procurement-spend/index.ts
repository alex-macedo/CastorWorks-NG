import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { authenticateRequest, createServiceRoleClient, verifyProjectAccess, verifyAdminRole as _verifyAdminRole } from "../_shared/authorization.ts";
import { createErrorResponse } from "../_shared/errorHandler.ts";
import { getCachedInsight, cacheInsight } from "../_shared/aiCache.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  projectId: z.string().uuid().optional(),
  timeframe: z.enum(['30', '60', '90']).default('30'),
  forceRefresh: z.boolean().optional(),
});


interface Supplier {
  id: string;
  name: string;
  // deno-lint-ignore no-explicit-any
  [key: string]: any;
}

interface QuoteRequest {
  supplier_id: string;
  // deno-lint-ignore no-explicit-any
  [key: string]: any;
}

// Calculate supplier performance scores
const calculateSupplierScores = (suppliers: Supplier[], quoteRequests: QuoteRequest[]) => {
  // deno-lint-ignore no-explicit-any
  const scores: Array<{ supplierId: string; name: string; score: number; rank: number; metrics: any }> = [];

  for (const supplier of suppliers) {
    const supplierQuotes = quoteRequests.filter((q) => q.supplier_id === supplier.id);
    const responseCount = supplierQuotes.length;

    if (responseCount === 0) continue;

    // Calculate metrics
    const avgResponseTime = 2; // Placeholder - would calculate from actual response timestamps
    const priceScore = 75; // Placeholder - would compare to market average
    const reliabilityScore = 85; // Placeholder - would calculate from delivery confirmations

    // Weighted score: Price (40%) + Response Time (30%) + Reliability (30%)
    const score = Math.round(priceScore * 0.4 + (100 - avgResponseTime * 10) * 0.3 + reliabilityScore * 0.3);

    scores.push({
      supplierId: supplier.id,
      name: supplier.name,
      score,
      rank: 0,
      metrics: { avgResponseTime, priceScore, reliabilityScore, quoteCount: responseCount }
    });
  }

  // Assign ranks
  scores.sort((a, b) => b.score - a.score);
  scores.forEach((s, i) => s.rank = i + 1);

  return scores;
};

// Calculate spend forecast
const calculateSpendForecast = (
  // deno-lint-ignore no-explicit-any
  purchaseRequests: any[],

  _quotes: any[],
  timeframeDays: number
) => {
  // Simple forecasting based on historical average
  const totalHistoricalSpend = purchaseRequests.reduce((sum: number, pr: any) => sum + (pr.estimated_cost || 0), 0);
  const daysOfData = 90; // Assume 90 days of historical data
  const dailyAverage = totalHistoricalSpend / daysOfData;
  const forecastedSpend = Math.round(dailyAverage * timeframeDays);

  // Breakdown by category (simplified)
  const materialsRatio = 0.7;
  const servicesRatio = 0.3;

  return {
    forecastedSpend,
    confidenceLevel: purchaseRequests.length > 10 ? 75 : purchaseRequests.length > 5 ? 60 : 45,
    breakdown: {
      materials: Math.round(forecastedSpend * materialsRatio),
      services: Math.round(forecastedSpend * servicesRatio)
    }
  };
};

// Identify optimal purchase windows
const findOptimalWindows = (timeframeDays: number) => {
  const windows = [];
  const now = new Date();

  // Suggest windows based on typical patterns
  if (timeframeDays >= 30) {
    windows.push({
      startDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      savings: 5,
      reason: 'Week 2 - Optimal for bulk orders'
    });
  }

  if (timeframeDays >= 60) {
    windows.push({
      startDate: new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date(now.getTime() + 42 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      savings: 8,
      reason: 'Month-end supplier discounts'
    });
  }

  return windows;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { projectId, timeframe, forceRefresh } = requestSchema.parse(requestBody);

    const { user } = await authenticateRequest(req);
    const supabaseClient = createServiceRoleClient();

    if (projectId) {
      try {
        await verifyProjectAccess(user.id, projectId, supabaseClient);
      } catch (_error) {
        return new Response(
          JSON.stringify({ error: 'Access denied to this project' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const cacheKey = `${projectId || 'all'}:${timeframe}`;

    if (!forceRefresh) {
      const cached = await getCachedInsight(
        supabaseClient,
        'predict-procurement-spend',
        'procurement',
        projectId ?? undefined,
        user.id,
        { promptVersion: cacheKey }
      );
      if (cached && cached.content) {
        console.log('✅ Returning cached procurement prediction for', cacheKey);
        return new Response(
          JSON.stringify({
            ...(cached.content as object),
            cached: true,
            generatedAt: cached.generated_at,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`Generating procurement predictions for ${projectId || 'all projects'}, timeframe: ${timeframe} days`);

    // Fetch data
    // deno-lint-ignore no-explicit-any
    let purchaseRequests: any[] = [];
    // deno-lint-ignore no-explicit-any
    let suppliers: any[] = [];
    // deno-lint-ignore no-explicit-any
    let quoteRequests: any[] = [];

    if (projectId) {
      const { data: pr } = await supabaseClient.from('project_purchase_requests').select('*').eq('project_id', projectId);
      purchaseRequests = pr || [];
    } else {
      const { data: pr } = await supabaseClient.from('project_purchase_requests').select('*').limit(100);
      purchaseRequests = pr || [];
    }

    const { data: supps } = await supabaseClient.from('suppliers').select('*');
    suppliers = supps || [];

    const { data: quotes } = await supabaseClient.from('quote_requests').select('*').limit(200);
    quoteRequests = quotes || [];

    // Generate predictions
    const timeframeDays = parseInt(timeframe);
    const forecast = calculateSpendForecast(purchaseRequests, quoteRequests, timeframeDays);
    const supplierScores = calculateSupplierScores(suppliers, quoteRequests);
    const optimalWindows = findOptimalWindows(timeframeDays);

    // Generate recommendations
    const recommendations: string[] = [];
    if (supplierScores.length > 0) {
      recommendations.push(`Top supplier: ${supplierScores[0].name} (Score: ${supplierScores[0].score}/100)`);
    }
    if (optimalWindows.length > 0) {
      recommendations.push(`Optimal purchase window: ${optimalWindows[0].reason} - Save ${optimalWindows[0].savings}%`);
    }
    if (forecast.confidenceLevel < 60) {
      recommendations.push('Limited historical data - predictions may vary');
    }
    recommendations.push(`Forecasted spend for next ${timeframe} days: Review budget allocation`);

    const response = {
      forecastedSpend: forecast.forecastedSpend,
      confidenceLevel: forecast.confidenceLevel,
      timeframe: `${timeframe} days`,
      breakdown: forecast.breakdown,
      optimalWindows,
      supplierScores: supplierScores.slice(0, 5),
      recommendations,
      generatedAt: new Date().toISOString(),
    };

    await cacheInsight(supabaseClient, {
      insightType: 'predict-procurement-spend',
      domain: 'procurement',
      title: 'Procurement Spend Prediction',
      content: response,
      confidenceLevel: forecast.confidenceLevel,
      projectId: projectId ?? undefined,
      userId: user.id,
      promptVersion: cacheKey,
      ttlHours: 6,
    });

    return new Response(
      JSON.stringify({ ...response, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return createErrorResponse(error, corsHeaders);
  }
});
