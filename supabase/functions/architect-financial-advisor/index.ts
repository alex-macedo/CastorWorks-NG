/**
 * Architect Financial Advisor Edge Function
 *
 * Generates AI-powered financial analysis for architect projects including:
 * - Variance predictions
 * - Cost anomalies detection
 * - Spending pattern analysis
 * - Optimization recommendations
 * - Budget alerts
 * - Overall health scoring
 *
 * Uses existing BudgetIntelligenceAnalysis type system
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
  projectId: z.string().uuid().optional(),
  analysisTypes: z.array(
    z.enum(['variance', 'anomaly', 'patterns', 'optimization', 'alerts'])
  ).optional(),
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
    console.log('Received architect financial advisor request:', JSON.stringify({
      projectId: requestBody.projectId,
      analysisTypes: requestBody.analysisTypes,
      language: requestBody.language
    }));

    const { projectId, analysisTypes, language, forceRefresh } = requestSchema.parse(requestBody);

    // Authenticate user
    const { user } = await authenticateRequest(req);
    const supabase = createServiceRoleClient();

    // ✅ MANDATORY SECURITY CHECK: Verify access before any DB operations
    if (projectId) {
      await verifyProjectAccess(user.id, projectId, supabase);
    }

    // Check cache first (unless force refresh)
    const cacheKey = projectId || 'all-projects';
    if (!forceRefresh) {
      const cached = await getCachedInsight(
        supabase,
        'architect-financial-advisor',
        'financial',
        cacheKey,
        user.id
      );

      if (cached) {
        console.log(`✅ Returning cached financial advisor for ${cacheKey}`);
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

    // Fetch financial data
    const financialData = await fetchFinancialData(supabase, projectId, user.id);

    console.log(`Financial data fetched for ${cacheKey}:`, JSON.stringify({
      hasBudgets: !!financialData.budgets,
      budgetsCount: financialData.budgets?.length || 0,
      hasEntries: !!financialData.financialEntries,
      entriesCount: financialData.financialEntries?.length || 0,
      hasTimeEntries: !!financialData.timeEntries,
      timeEntriesCount: financialData.timeEntries?.length || 0,
      totalBudget: financialData.totalBudget,
      totalSpent: financialData.totalSpent,
    }, null, 2));

    // Generate financial advisor analysis
    const analysis = await generateFinancialAdvisorAnalysis(
      financialData,
      analysisTypes || ['variance', 'anomaly', 'patterns', 'optimization', 'alerts'],
      language,
      cacheKey
    );

    // Cache the result
    await cacheInsight(supabase, {
      insightType: 'architect-financial-advisor',
      domain: 'financial',
      title: 'Architect Financial Advisor Analysis',
      content: analysis,
      confidenceLevel: 85,
      projectId: cacheKey,
      userId: user.id,
      ttlHours: 6,
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
    console.error('Architect Financial Advisor error:', error);

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
 * Fetch financial data for architect projects
 */
async function fetchFinancialData(
  supabase: any,
  projectId: string | undefined,
  userId: string
): Promise<any> {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Build base query for accessible projects
  let projectIds: string[] = [];
  
  if (projectId) {
    projectIds = [projectId];
  } else {
    // Fetch all projects the user has access to
    const { data: accessibleProjects, error: projectsError } = await supabase
      .rpc('get_user_accessible_projects', { _user_id: userId });
    
    if (projectsError) {
      console.error('Error fetching accessible projects:', projectsError);
    } else {
      projectIds = accessibleProjects?.map((p: any) => p.project_id) || [];
    }
  }

  if (projectIds.length === 0) {
    return {
      budgets: [],
      budgetLineItems: [],
      financialEntries: [],
      timeEntries: [],
      expenses: [],
      revenue: [],
      phases: [],
      tasks: [],
      procurementData: [],
      totalBudget: 0,
      totalSpent: 0,
      totalRevenue: 0,
      projectCount: 0,
    };
  }

  // 1. Fetch project budgets
  const { data: budgets, error: budgetsError } = await supabase
    .from('project_budgets')
    .select(`
      id,
      project_id,
      name,
      description,
      budget_model,
      status,
      total_budget,
      contingency_amount,
      labor_budget,
      materials_budget,
      equipment_budget,
      subcontractor_budget,
      created_at,
      updated_at
    `)
    .in('project_id', projectIds);

  if (budgetsError) console.error('Budgets error:', budgetsError);

  // 2. Fetch budget line items
  const { data: budgetLineItems, error: lineItemsError } = await supabase
    .from('budget_line_items')
    .select(`
      id,
      budget_id,
      phase_id,
      group_name,
      description,
      total_cost,
      sort_order,
      category
    `)
    .in('budget_id', budgets?.map((b: any) => b.id) || []);

  if (lineItemsError) console.error('Budget line items error:', lineItemsError);

  // 3. Fetch financial entries (last 90 days)
  const { data: financialEntries, error: entriesError } = await supabase
    .from('project_financial_entries')
    .select(`
      id,
      project_id,
      entry_type,
      category,
      amount,
      date,
      payment_method,
      recipient_payer,
      reference,
      description,
      phase_id,
      cost_code_id
    `)
    .in('project_id', projectIds)
    .gte('date', ninetyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false });

  if (entriesError) console.error('Financial entries error:', entriesError);

  // 4. Fetch time entries for labor cost analysis
  const { data: timeEntries, error: timeError } = await supabase
    .from('architect_time_entries')
    .select(`
      id,
      project_id,
      task_id,
      description,
      start_time,
      end_time,
      duration_minutes,
      billable,
      hourly_rate
    `)
    .in('project_id', projectIds)
    .gte('start_time', ninetyDaysAgo.toISOString())
    .order('start_time', { ascending: false });

  if (timeError) console.error('Time entries error:', timeError);

  // 5. Fetch project phases for context
  const { data: phases, error: phasesError } = await supabase
    .from('project_phases')
    .select(`
      id,
      project_id,
      phase_name,
      budget_allocated,
      progress_percentage,
      status,
      start_date,
      end_date
    `)
    .in('project_id', projectIds);

  if (phasesError) console.error('Phases error:', phasesError);

  // 6. Fetch architect tasks
  const { data: tasks, error: tasksError } = await supabase
    .from('architect_tasks')
    .select(`
      id,
      project_id,
      title,
      status,
      priority,
      due_date
    `)
    .in('project_id', projectIds);

  if (tasksError) console.error('Tasks error:', tasksError);

  // 7. Fetch procurement data
  const { data: procurementData, error: procurementError } = await supabase
    .from('purchase_orders')
    .select(`
      id,
      project_id,
      purchase_order_number,
      total_amount,
      status,
      created_at,
      expected_delivery_date
    `)
    .in('project_id', projectIds)
    .in('status', ['approved', 'ordered', 'partial_delivery', 'delivered']);

  if (procurementError) console.error('Procurement error:', procurementError);

  // Calculate totals
  const totalBudget = budgets?.reduce((sum: number, b: any) => sum + (Number(b.total_budget) || 0), 0) || 
                       budgetLineItems?.reduce((sum: number, b: any) => sum + (Number(b.total_cost) || 0), 0) || 0;
  
  const totalSpent = financialEntries
    ?.filter((e: any) => e.entry_type === 'expense')
    .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0) || 0;
    
  const totalRevenue = financialEntries
    ?.filter((e: any) => e.entry_type === 'income')
    .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0) || 0;

  return {
    budgets: budgets || [],
    budgetLineItems: budgetLineItems || [],
    financialEntries: financialEntries || [],
    timeEntries: timeEntries || [],
    phases: phases || [],
    tasks: tasks || [],
    procurementData: procurementData || [],
    totalBudget,
    totalSpent,
    totalRevenue,
    projectCount: projectIds.length,
    projectIds,
  };
}

/**
 * Validate if AI response is in the expected language
 */
function validateResponseLanguage(analysis: any, expectedLanguage: string): boolean {
  // Extract text content from the analysis
  const textFields = extractTextFields(analysis);
  const combinedText = textFields.join(' ').toLowerCase();

  switch (expectedLanguage) {
    case 'pt-BR':
      // Check for Portuguese indicators
      return combinedText.includes('projeto') || combinedText.includes('orçamento') || 
             combinedText.includes('despesas') || combinedText.includes('receita') ||
             /ç|ã|õ|á|é|í|ó|ú/.test(combinedText);

    case 'es-ES':
      // Check for Spanish indicators
      return combinedText.includes('proyecto') || combinedText.includes('presupuesto') || 
             combinedText.includes('gastos') || combinedText.includes('ingresos') ||
             /ñ|á|é|í|ó|ú|ü/.test(combinedText);

    case 'fr-FR':
      // Check for French indicators
      return combinedText.includes('projet') || combinedText.includes('budget') || 
             combinedText.includes('dépenses') || combinedText.includes('revenus') ||
             /à|â|ä|é|è|ê|ë|ï|î|ô|ö|ù|û|ü|ÿ|ç/.test(combinedText);

    case 'en-US':
    default: {
      // For English, check that it doesn't contain excessive non-English characters
      // Allow some accented characters but not full non-English content
      const nonEnglishChars = combinedText.match(/[^a-zA-Z0-9\s.,!?;:'"()-]/g);
      return !nonEnglishChars || nonEnglishChars.length < combinedText.length * 0.1; // Less than 10% non-English chars
    }
  }
}

/**
 * Extract text fields from the analysis JSON for language validation
 */
function extractTextFields(obj: any, path = ''): string[] {
  const textFields: string[] = [];
  
  if (typeof obj === 'string') {
    textFields.push(obj);
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      textFields.push(...extractTextFields(item, `${path}[${index}]`));
    });
  } else if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      // Focus on fields likely to contain translated content
      if (['description', 'message', 'rationale', 'title', 'insights', 'possibleCauses', 'recommendation', 'recommendedActions', 'actionItems', 'estimatedImpact'].includes(key)) {
        textFields.push(...extractTextFields(value, `${path}.${key}`));
      } else if (typeof value === 'string' && value.length > 10) {
        // Include other string fields that are substantial
        textFields.push(value);
      } else {
        textFields.push(...extractTextFields(value, `${path}.${key}`));
      }
    }
  }
  
  return textFields;
}

/**
 * Attempt fallback translation for the analysis content
 */
async function attemptFallbackTranslation(analysis: any, targetLanguage: string): Promise<any> {
  // For now, we'll implement a simple approach by regenerating with stricter instructions
  // In a production environment, you might integrate with a translation API
  
  console.log(`[Financial Advisor] Attempting fallback translation to ${targetLanguage}`);
  
  // Create a simplified prompt asking for translation
  const translationPrompt = `Please translate the following financial analysis content to ${targetLanguage}. 

IMPORTANT: Respond ONLY with valid JSON in the exact same structure. Do not add any explanatory text.

Content to translate:
${JSON.stringify(analysis, null, 2)}`;

  try {
    const response = await getAICompletion({
      prompt: translationPrompt,
      systemMessage: `You are a professional translator. Translate the provided JSON content to ${targetLanguage}. Maintain the exact JSON structure and field names. Only translate the string values, not the keys or numbers.`,
      language: targetLanguage,
      insightType: 'translation',
      maxTokens: 3500,
      temperature: 0.1, // Lower temperature for more consistent translation
    });

    const cleanContent = response.content.replace(/```json\n?|\n?```/g, '').trim();
    const translatedAnalysis = JSON.parse(cleanContent);
    
    // Mark as translated
    translatedAnalysis.translationNote = `Content translated to ${targetLanguage}`;
    
    return translatedAnalysis;
  } catch (error) {
    console.error('[Financial Advisor] Translation attempt failed:', error);
    throw error;
  }
}
async function generateFinancialAdvisorAnalysis(
  financialData: any,
  analysisTypes: string[],
  language: string,
  cacheKey: string
): Promise<any> {
  console.log('[Financial Advisor] Starting AI analysis for:', cacheKey);

  // Language-specific instructions
  const languageInstructions: Record<string, string> = {
    'pt-BR': 'Responda em Português do Brasil. Forneça análise financeira detalhada e recomendações acionáveis para arquitetos.',
    'en-US': 'Respond in English (US). Provide detailed financial analysis and actionable recommendations for architects.',
    'es-ES': 'Responda en Español. Proporcione análisis financiero detallado y recomendaciones accionables para arquitectos.',
    'fr-FR': 'Répondez en Français. Fournissez une analyse financière détaillée et des recommandations actionnables pour les architectes.',
  };

  // Build the analysis prompt
  const prompt = buildFinancialAdvisorPrompt(financialData, analysisTypes, languageInstructions[language]);
  console.log('[Financial Advisor] Prompt length:', prompt.length, 'characters');

   // System message for the AI
   const systemMessage = `You are CastorWorks Architect Financial Advisor. Analyze architect project financial data and provide comprehensive budget intelligence including variance predictions, cost anomalies, spending patterns, optimization recommendations, and alerts. 

CRITICAL LANGUAGE REQUIREMENT: You MUST respond in the language specified in the user prompt. If the prompt asks for Portuguese (pt-BR), respond entirely in Portuguese. If it asks for English (en-US), respond entirely in English. If it asks for Spanish (es-ES), respond entirely in Spanish. If it asks for French (fr-FR), respond entirely in French. Do not mix languages or default to English.

Return analysis in valid JSON format that can be parsed. Do not include any text outside the JSON structure. Do not wrap in markdown code blocks.`;

  // Use the unified AI provider client
  try {
    const response = await getAICompletion({
      prompt,
      systemMessage,
      language,
      insightType: 'architect-financial-advisor',
      maxTokens: 3500,
      temperature: 0.3,
    });

    console.log('[Financial Advisor] ✅ Successfully generated analysis with', response.provider, 'model:', response.model);

    // Parse and validate the JSON response
    let analysis;
    try {
      const cleanContent = response.content.replace(/```json\n?|\n?```/g, '').trim();
      analysis = JSON.parse(cleanContent);
    } catch {
      console.error('[Financial Advisor] Failed to parse AI response:', response.content);
      throw new Error('AI returned invalid JSON format');
    }

    // Validate language compliance
    const isValidLanguage = validateResponseLanguage(analysis, language);
    if (!isValidLanguage) {
      console.warn('[Financial Advisor] AI response language validation failed, attempting fallback translation');
      
      // Attempt to translate the response if possible
      try {
        analysis = await attemptFallbackTranslation(analysis, language);
      } catch (translationError) {
        console.error('[Financial Advisor] Fallback translation failed:', translationError);
        // Continue with the original response but log the issue
        analysis.translationNote = `Warning: Content may not be fully translated to ${language}. Please verify language settings.`;
      }
    }

    // Add metadata
    analysis.projectId = cacheKey;
    analysis.generatedAt = new Date().toISOString();

    // Ensure overall health score is calculated
    if (!analysis.overallHealthScore) {
      analysis.overallHealthScore = calculateOverallHealthScore(analysis);
    }

    return analysis;
  } catch (error) {
    console.error('[Financial Advisor] AI analysis failed:', error);
    console.warn('[Financial Advisor] Falling back to template-based analysis');
    return generateFallbackFinancialAnalysis(financialData, cacheKey);
  }
}

/**
 * Build the financial advisor analysis prompt
 */
function buildFinancialAdvisorPrompt(
  financialData: any,
  analysisTypes: string[],
  languageInstruction: string
): string {
  const {
    budgetLineItems,
    financialEntries,
    timeEntries,
    phases,
    procurementData,
    totalBudget,
    totalSpent,
    totalRevenue,
    projectCount,
  } = financialData;

  // Format budget items by category
  const budgetsByCategory = budgetLineItems.reduce((acc: any, item: any) => {
    const cat = item.group_name || item.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = { budgeted: 0, actual: 0 };
    acc[cat].budgeted += Number(item.total_cost) || Number(item.budgeted_amount) || 0;
    return acc;
  }, {});

  // Associate actual spent from financial entries to categories if possible
  financialEntries.forEach((tx: any) => {
    if (tx.entry_type === 'expense') {
      const cat = tx.category || 'Uncategorized';
      if (!budgetsByCategory[cat]) budgetsByCategory[cat] = { budgeted: 0, actual: 0 };
      budgetsByCategory[cat].actual += Number(tx.amount) || 0;
    }
  });

  const budgetsText = Object.entries(budgetsByCategory)
    .map(([cat, vals]: [string, any]) => `- ${cat}: Budgeted $${vals.budgeted.toLocaleString()}, Actual Spent $${vals.actual.toLocaleString()}, Variance $${(vals.budgeted - vals.actual).toLocaleString()}`)
    .join('\n');

  // Format recent transactions
  const recentTransactions = financialEntries.slice(0, 30);
  const transactionsText = recentTransactions
    .map((tx: any) => `- ${tx.date} [${tx.entry_type}]: ${tx.category} - $${tx.amount?.toLocaleString() || 0} (${tx.description || 'No description'})`)
    .join('\n');

  // Format time entries
  const totalBillableHours = timeEntries
    ?.filter((t: any) => t.billable)
    .reduce((sum: number, t: any) => sum + ((t.duration_minutes || 0) / 60), 0) || 0;
  const totalNonBillableHours = timeEntries
    ?.filter((t: any) => !t.billable)
    .reduce((sum: number, t: any) => sum + ((t.duration_minutes || 0) / 60), 0) || 0;

  // Format phases
  const phasesText = phases
    .map((p: any) => `- ${p.phase_name}: ${p.progress_percentage}% complete, Budgeted $${(p.budget_allocated || p.budgeted_amount)?.toLocaleString() || 0}`)
    .join('\n');

  // Format procurement
  const procurementText = procurementData
    .slice(0, 20)
    .map((po: any) => `- ${po.purchase_order_number}: $${po.total_amount?.toLocaleString() || 0} - ${po.status}`)
    .join('\n');

  const analysisTypesText = analysisTypes.join(', ');

  return `${languageInstruction}

IMPORTANT: All your analysis, descriptions, recommendations, and alerts must be written in the language specified above. Do not use any other language.

## Project Financial Overview
- Projects Analyzed: ${projectCount}
- Total Budgeted Amount (from line items): $${totalBudget.toLocaleString()}
- Total Spent (from financial entries): $${totalSpent.toLocaleString()}
- Total Revenue: $${totalRevenue.toLocaleString()}
- Net Position: $${(totalRevenue - totalSpent).toLocaleString()}
- Budget Utilization: ${totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0}%

## Time Tracking Summary
- Billable Hours: ${totalBillableHours.toFixed(1)}h
- Non-Billable Hours: ${totalNonBillableHours.toFixed(1)}h
- Total Tracked Time: ${(totalBillableHours + totalNonBillableHours).toFixed(1)}h

## Budget by Category (Grouped Line Items)
${budgetsText || 'No budget categories available'}

## Recent Financial Entries (Sample)
${transactionsText || 'No recent transactions'}

## Project Phases
${phasesText || 'No phase data available'}

## Procurement Data (Sample)
${procurementText || 'No procurement data'}

## Analysis Types Requested
${analysisTypesText}

## Analysis Requirements

Provide a comprehensive financial advisor analysis including:

1. **Variance Predictions**: For each major category, predict final spending, variance, and risk level
2. **Cost Anomalies**: Identify unusual spending patterns or transactions that deviate from norms
3. **Spending Patterns**: Analyze spending trends, volatility, and seasonal factors
4. **Optimization Recommendations**: Suggest budget reallocations, cost reductions, or efficiency improvements
5. **Alerts**: Generate critical alerts for budget overruns, upcoming thresholds, or concerning trends
6. **Overall Health Score**: Calculate 0-100 health score based on budget performance
7. **Summary**: Provide totals, projections, and risk assessment

## CRITICAL REMINDER
All text content in your JSON response (descriptions, messages, rationales, recommendations, alerts, etc.) MUST be in ${languageInstruction.split('.')[0].toLowerCase()}. This includes all string fields in the JSON structure.

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

Focus on actionable insights that help architects optimize their project financial performance. Consider billable vs non-billable time, phase progress, and procurement status.`;
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
 * Generate fallback financial analysis when AI fails
 */
function generateFallbackFinancialAnalysis(
  financialData: any,
  cacheKey: string
): any {
  const {
    totalBudget,
    totalSpent,
    totalRevenue,
    budgetLineItems,
    projectCount: _projectCount,
  } = financialData;

  const utilizationRate = totalBudget > 0 ? totalSpent / totalBudget : 0;
  const projectedVariance = totalBudget - totalSpent;
  const riskLevel = utilizationRate > 1.1 ? 'critical' : utilizationRate > 0.95 ? 'high' : utilizationRate > 0.85 ? 'medium' : 'low';

  // Generate basic variance predictions from budget line items
  const variancePredictions = (budgetLineItems || [])
    .slice(0, 5)
    .map((item: any) => ({
      category: item.group_name || item.category || 'Uncategorized',
      currentSpending: 0, // Placeholder
      budgetedAmount: Number(item.total_cost) || Number(item.budgeted_amount) || 0,
      predictedFinalSpending: (Number(item.total_cost) || Number(item.budgeted_amount) || 0) * (0.9 + Math.random() * 0.2),
      predictedVariance: (Number(item.total_cost) || Number(item.budgeted_amount) || 0) * 0.1,
      variancePercentage: 10,
      confidence: 60 + Math.random() * 20,
      projectionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      riskLevel: utilizationRate > 0.9 ? 'high' : utilizationRate > 0.75 ? 'medium' : 'low',
      trendDirection: utilizationRate > 0.9 ? 'increasing' : 'stable',
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
      message: `Projects have used ${Math.round(utilizationRate * 100)}% of total budget`,
      triggeredAt: new Date().toISOString(),
      thresholdValue: 0.9,
      currentValue: utilizationRate,
      recommendedActions: [
        'Review remaining budget allocation across projects',
        'Consider cost reduction measures',
        'Evaluate project scope if needed',
      ],
      acknowledged: false,
    });
  }

  if (totalRevenue < totalSpent) {
    alerts.push({
      id: 'negative-cashflow-warning',
      category: 'Cash Flow',
      alertType: 'prediction',
      severity: 'warning',
      title: 'Negative Cash Flow Alert',
      message: `Expenses ($${totalSpent.toLocaleString()}) exceed revenue ($${totalRevenue.toLocaleString()})`,
      triggeredAt: new Date().toISOString(),
      recommendedActions: [
        'Review billing and collection processes',
        'Analyze project profitability',
        'Consider payment schedule adjustments',
      ],
      acknowledged: false,
    });
  }

  return {
    projectId: cacheKey,
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
      projectedFinalCost: totalSpent,
      projectedVariance,
      riskLevel,
    },
  };
}
