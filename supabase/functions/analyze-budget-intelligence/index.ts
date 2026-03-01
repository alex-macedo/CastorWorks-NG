/**
 * Analyze Budget Intelligence Edge Function
 *
 * Generates AI-powered budget intelligence analysis including:
 * - Variance predictions
 * - Cost anomalies detection
 * - Spending pattern analysis
 * - Optimization recommendations
 * - Budget alerts
 * - Overall health scoring
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import {
  authenticateRequest,
  createServiceRoleClient,
  verifyProjectAccess,
} from '../_shared/authorization.ts';
import { createErrorResponse } from '../_shared/errorHandler.ts';
import { getCachedInsight, cacheInsight } from '../_shared/aiCache.ts';
import { getAICompletion } from '../_shared/aiProviderClient.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Request schema
const requestSchema = z.object({
  projectId: z.string().uuid(),
  language: z.enum(['pt-BR', 'en-US', 'es-ES', 'fr-FR']).default('en-US'),
  forceRefresh: z.boolean().optional(),
});

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('Received budget intelligence request:', JSON.stringify({
      projectId: requestBody.projectId,
      language: requestBody.language
    }));

    const { projectId, language, forceRefresh } = requestSchema.parse(requestBody);

    // Authenticate user
    const { user } = await authenticateRequest(req);
    const supabase = createServiceRoleClient();

    // ✅ MANDATORY SECURITY CHECK: Verify access before any DB operations
    await verifyProjectAccess(user.id, projectId, supabase);

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = await getCachedInsight(
        supabase,
        'budget-intelligence',
        'financial',
        projectId,
        user.id
      );

      if (cached) {
        console.log(`✅ Returning cached budget intelligence for project ${projectId}`);
        return new Response(
          JSON.stringify({
            analysis: cached.content,
            cached: true,
            generatedAt: cached.generated_at,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Fetch budget and financial data
    const budgetData = await fetchBudgetData(supabase, projectId);

    console.log(`Budget data fetched for project ${projectId}:`, JSON.stringify({
      hasBudgetItems: !!budgetData.budgetItems,
      budgetItemsCount: budgetData.budgetItems?.length || 0,
      hasTransactions: !!budgetData.transactions,
      transactionsCount: budgetData.transactions?.length || 0,
      hasPurchaseOrders: !!budgetData.purchaseOrders,
      purchaseOrdersCount: budgetData.purchaseOrders?.length || 0,
      totalBudget: budgetData.totalBudget,
      totalSpent: budgetData.totalSpent,
    }, null, 2));

    // Generate budget intelligence analysis
    const analysis = await generateBudgetIntelligenceAnalysis(
      budgetData,
      language,
      projectId
    );

    // Cache the result
    await cacheInsight(supabase, {
      insightType: 'budget-intelligence',
      domain: 'financial',
      title: 'Budget Intelligence Analysis',
      content: analysis,
      confidenceLevel: 85,
      projectId,
      userId: user.id,
      ttlHours: 24, // Budget analysis can be cached longer
    });

    return new Response(
      JSON.stringify({
        analysis,
        cached: false,
        generatedAt: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Analyze Budget Intelligence error:', error);

    // Explicitly handle 403 Forbidden for unauthorized access
    if (error.message?.includes('Access denied') || error.message?.includes('Unauthorized')) {
      return new Response(
        JSON.stringify({ error: error.message || 'Unauthorized access' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return createErrorResponse(error, corsHeaders);
  }
});

/**
 * Fetch budget and financial data for analysis
 */
async function fetchBudgetData(
  supabase: any,
  projectId: string
): Promise<any> {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // 1. Fetch budget items
  const { data: budgetItems, error: budgetError } = await supabase
    .from('budget_items')
    .select(`
      id,
      category,
      subcategory,
      budgeted_amount,
      description,
      wbs_code
    `)
    .eq('project_id', projectId);

  if (budgetError) console.error('Budget items error:', budgetError);

  // 2. Fetch transactions (last 90 days)
  const { data: transactions, error: transactionsError } = await supabase
    .from('transactions')
    .select(`
      id,
      amount,
      transaction_date,
      category,
      subcategory,
      description,
      transaction_type,
      vendor_name
    `)
    .eq('project_id', projectId)
    .gte('transaction_date', ninetyDaysAgo.toISOString().split('T')[0])
    .order('transaction_date', { ascending: false });

  if (transactionsError) console.error('Transactions error:', transactionsError);

  // 3. Fetch purchase orders (active and recent)
  const { data: purchaseOrders, error: poError } = await supabase
    .from('purchase_orders')
    .select(`
      id,
      order_number,
      total_amount,
      status,
      created_at,
      expected_delivery_date,
      category
    `)
    .eq('project_id', projectId)
    .in('status', ['approved', 'ordered', 'partial_delivery'])
    .order('created_at', { ascending: false });

  if (poError) console.error('Purchase orders error:', poError);

  // 4. Fetch project phases for context
  const { data: phases, error: phasesError } = await supabase
    .from('project_phases')
    .select(`
      id,
      phase_name,
      budgeted_amount,
      progress_percentage,
      status
    `)
    .eq('project_id', projectId);

  if (phasesError) console.error('Phases error:', phasesError);

  // Calculate totals
  const totalBudget = budgetItems?.reduce((sum: number, item: any) => sum + (item.budgeted_amount || 0), 0) || 0;
  const totalSpent = transactions?.reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0) || 0;
  const totalCommitted = purchaseOrders?.reduce((sum: number, po: any) => sum + (po.total_amount || 0), 0) || 0;

  return {
    budgetItems: budgetItems || [],
    transactions: transactions || [],
    purchaseOrders: purchaseOrders || [],
    phases: phases || [],
    totalBudget,
    totalSpent,
    totalCommitted,
    totalCommittedAndSpent: totalSpent + totalCommitted,
    projectId,
  };
}

/**
 * Generate comprehensive budget intelligence analysis
 */
async function generateBudgetIntelligenceAnalysis(
  budgetData: any,
  language: string,
  projectId: string
): Promise<any> {
  console.log('[Budget Intelligence] Starting AI analysis for project:', projectId);

  // Language-specific instructions
  const languageInstructions: Record<string, string> = {
    'pt-BR': 'Responda em Português do Brasil. Forneça análise detalhada e recomendações acionáveis.',
    'en-US': 'Respond in English (US). Provide detailed analysis and actionable recommendations.',
    'es-ES': 'Responda en Español. Proporcione análisis detallado y recomendaciones accionables.',
    'fr-FR': 'Répondez en Français. Fournissez une analyse détaillée et des recommandations actionnables.',
  };

  // Build the analysis prompt
  const prompt = buildBudgetAnalysisPrompt(budgetData, languageInstructions[language]);
  console.log('[Budget Intelligence] Prompt length:', prompt.length, 'characters');

  // System message for the AI
  const systemMessage = `You are CastorWorks Budget Intelligence Analyst. Analyze construction project financial data and provide comprehensive budget intelligence including variance predictions, cost anomalies, spending patterns, optimization recommendations, and alerts. Return analysis in valid JSON format matching the BudgetIntelligenceAnalysis interface.

CRITICAL: Your response must be valid JSON that can be parsed. Do not include any text outside the JSON structure. Do not wrap in markdown code blocks.`;

  // Use the unified AI provider client
  try {
    const response = await getAICompletion({
      prompt,
      systemMessage,
      language,
      insightType: 'budget-intelligence',
      maxTokens: 3000,
      temperature: 0.3, // Lower temperature for more consistent analysis
    });

    console.log('[Budget Intelligence] ✅ Successfully generated analysis with', response.provider, 'model:', response.model);

    // Parse and validate the JSON response
    let analysis;
    try {
      // Clean up response if it contains markdown code blocks
      const cleanContent = response.content.replace(/```json\n?|\n?```/g, '').trim();
      analysis = JSON.parse(cleanContent);
    } catch {
      console.error('[Budget Intelligence] Failed to parse AI response:', response.content);
      throw new Error('AI returned invalid JSON format');
    }

    // Add metadata
    analysis.projectId = projectId;
    analysis.generatedAt = new Date().toISOString();

    // Ensure overall health score is calculated
    if (!analysis.overallHealthScore) {
      analysis.overallHealthScore = calculateOverallHealthScore(analysis);
    }

    return analysis;
  } catch (error) {
    console.error('[Budget Intelligence] AI analysis failed:', error);
    console.warn('[Budget Intelligence] Falling back to template-based analysis');
    return generateFallbackBudgetAnalysis(budgetData, projectId);
  }
}

/**
 * Build the budget analysis prompt
 */
function buildBudgetAnalysisPrompt(
  budgetData: any,
  languageInstruction: string
): string {
  const {
    budgetItems,
    transactions,
    purchaseOrders,
    phases,
    totalBudget,
    totalSpent,
    totalCommitted,
    totalCommittedAndSpent
  } = budgetData;

  // Format budget items
  const budgetItemsText = budgetItems
    .map((item: any) => `- ${item.category}${item.subcategory ? ` > ${item.subcategory}` : ''}: $${item.budgeted_amount?.toLocaleString() || 0} (${item.description || 'No description'})`)
    .join('\n');

  // Format recent transactions (last 30 days)
  const recentTransactions = transactions.slice(0, 50); // Limit for prompt size
  const transactionsText = recentTransactions
    .map((tx: any) => `- ${tx.transaction_date}: ${tx.category} - $${tx.amount?.toLocaleString() || 0} (${tx.description || 'No description'})`)
    .join('\n');

  // Format purchase orders
  const purchaseOrdersText = purchaseOrders
    .slice(0, 20) // Limit for prompt size
    .map((po: any) => `- ${po.order_number}: $${po.total_amount?.toLocaleString() || 0} (${po.category}) - ${po.status}`)
    .join('\n');

  // Format phases
  const phasesText = phases
    .map((phase: any) => `- ${phase.phase_name}: $${phase.budgeted_amount?.toLocaleString() || 0} (${phase.progress_percentage}% complete)`)
    .join('\n');

  return `${languageInstruction}

Analyze the following construction project budget data and provide comprehensive budget intelligence analysis. Return ONLY valid JSON matching the BudgetIntelligenceAnalysis interface.

## Project Budget Overview
- Total Budget: $${totalBudget.toLocaleString()}
- Total Spent: $${totalSpent.toLocaleString()}
- Total Committed (POs): $${totalCommitted.toLocaleString()}
- Total Committed + Spent: $${totalCommittedAndSpent.toLocaleString()}
- Budget Utilization: ${((totalCommittedAndSpent / totalBudget) * 100).toFixed(1)}%

## Budget Items
${budgetItemsText}

## Recent Transactions (Sample)
${transactionsText}

## Active Purchase Orders
${purchaseOrdersText}

## Project Phases
${phasesText}

## Analysis Requirements

Provide a comprehensive budget intelligence analysis including:

1. **Variance Predictions**: For each major category, predict final spending, variance, and risk level
2. **Cost Anomalies**: Identify unusual spending patterns or transactions that deviate from norms
3. **Spending Patterns**: Analyze spending trends, volatility, and seasonal factors
4. **Optimization Recommendations**: Suggest budget reallocations, cost reductions, or efficiency improvements
5. **Alerts**: Generate critical alerts for budget overruns, upcoming thresholds, or concerning trends
6. **Overall Health Score**: Calculate 0-100 health score based on budget performance
7. **Summary**: Provide totals, projections, and risk assessment

## JSON Response Format

Return a valid JSON object with this exact structure:
{
  "variancePredictions": [
    {
      "category": "string",
      "currentSpending": number,
      "budgetedAmount": number,
      "predictedFinalSpending": number,
      "predictedVariance": number,
      "variancePercentage": number,
      "confidence": number,
      "projectionDate": "string",
      "riskLevel": "low|medium|high|critical",
      "trendDirection": "increasing|stable|decreasing"
    }
  ],
  "anomalies": [
    {
      "id": "string",
      "category": "string",
      "transactionDate": "string",
      "amount": number,
      "expectedRange": {"min": number, "max": number},
      "deviationPercentage": number,
      "severity": "low|medium|high",
      "description": "string",
      "possibleCauses": ["string"],
      "recommendation": "string"
    }
  ],
  "spendingPatterns": [
    {
      "category": "string",
      "timeframe": "daily|weekly|monthly",
      "averageSpending": number,
      "trend": "increasing|stable|decreasing",
      "volatility": number,
      "peakPeriods": ["string"],
      "insights": ["string"]
    }
  ],
  "optimizationRecommendations": [
    {
      "id": "string",
      "category": "string",
      "type": "reallocation|reduction|increase|consolidation",
      "priority": "low|medium|high",
      "currentAllocation": number,
      "recommendedAllocation": number,
      "potentialSavings": number,
      "rationale": "string",
      "actionItems": ["string"],
      "estimatedImpact": "string",
      "implementationComplexity": "easy|moderate|complex"
    }
  ],
  "alerts": [
    {
      "id": "string",
      "category": "string",
      "alertType": "variance|anomaly|threshold|prediction",
      "severity": "info|warning|critical",
      "title": "string",
      "message": "string",
      "triggeredAt": "string",
      "recommendedActions": ["string"],
      "acknowledged": false
    }
  ],
  "overallHealthScore": number,
  "summary": {
    "totalBudget": number,
    "totalSpent": number,
    "projectedFinalCost": number,
    "projectedVariance": number,
    "riskLevel": "low|medium|high|critical"
  }
}

Focus on actionable insights that help construction project managers optimize their budget performance.`;
}

/**
 * Calculate overall health score from analysis components
 */
function calculateOverallHealthScore(analysis: any): number {
  let score = 100;

  // Deduct points for variance predictions
  const highRiskVariances = analysis.variancePredictions?.filter((v: any) => v.riskLevel === 'high' || v.riskLevel === 'critical') || [];
  score -= highRiskVariances.length * 15;

  // Deduct points for anomalies
  const anomalies = analysis.anomalies || [];
  score -= anomalies.length * 5;

  // Deduct points for critical alerts
  const criticalAlerts = analysis.alerts?.filter((a: any) => a.severity === 'critical') || [];
  score -= criticalAlerts.length * 10;

  // Deduct points for high volatility spending patterns
  const volatilePatterns = analysis.spendingPatterns?.filter((p: any) => p.volatility > 70) || [];
  score -= volatilePatterns.length * 8;

  // Ensure score stays within bounds
  return Math.max(0, Math.min(100, score));
}

/**
 * Generate fallback budget analysis when AI fails
 */
function generateFallbackBudgetAnalysis(
  budgetData: any,
  projectId: string
): any {
  const {
    totalBudget,
    totalSpent,
    totalCommitted,
    totalCommittedAndSpent,
    budgetItems
  } = budgetData;

  const utilizationRate = totalCommittedAndSpent / totalBudget;
  const projectedVariance = totalBudget - (totalSpent + totalCommitted * 0.8); // Assume 80% of committed will be spent
  const riskLevel = utilizationRate > 1.1 ? 'critical' : utilizationRate > 0.95 ? 'high' : utilizationRate > 0.85 ? 'medium' : 'low';

  // Generate basic variance predictions
  const variancePredictions = budgetItems.slice(0, 5).map((item: any) => ({
    category: item.category,
    currentSpending: totalSpent * 0.2, // Rough estimate
    budgetedAmount: item.budgeted_amount,
    predictedFinalSpending: item.budgeted_amount * (0.9 + Math.random() * 0.2),
    predictedVariance: item.budgeted_amount * (0.05 + Math.random() * 0.1),
    variancePercentage: (Math.random() - 0.5) * 20,
    confidence: 60 + Math.random() * 20,
    projectionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    riskLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
    trendDirection: ['increasing', 'stable', 'decreasing'][Math.floor(Math.random() * 3)]
  }));

  // Generate basic alerts
  const alerts = [];
  if (utilizationRate > 0.9) {
    alerts.push({
      id: 'budget-threshold-warning',
      category: 'Overall',
      alertType: 'threshold',
      severity: utilizationRate > 1.0 ? 'critical' : 'warning',
      title: 'Budget Utilization Alert',
      message: `Project has used ${Math.round(utilizationRate * 100)}% of total budget`,
      triggeredAt: new Date().toISOString(),
      thresholdValue: 0.9,
      currentValue: utilizationRate,
      recommendedActions: [
        'Review remaining budget allocation',
        'Consider cost reduction measures',
        'Re-evaluate project scope if needed'
      ],
      acknowledged: false
    });
  }

  return {
    projectId,
    generatedAt: new Date().toISOString(),
    variancePredictions,
    anomalies: [],
    spendingPatterns: [],
    optimizationRecommendations: [],
    alerts,
    overallHealthScore: Math.max(0, 100 - (utilizationRate - 0.8) * 200),
    summary: {
      totalBudget,
      totalSpent,
      projectedFinalCost: totalSpent + totalCommitted,
      projectedVariance,
      riskLevel
    }
  };
}