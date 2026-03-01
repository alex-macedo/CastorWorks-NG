// deno-lint-ignore no-import-prefix
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createServiceRoleClient } from "../_shared/authorization.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") || "claude-3-5-sonnet-20241022";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WbsItem {
  id?: string;
  name: string;
  description?: string;
}

interface AnalysisRequest {
  items: WbsItem[];
  availableCostCodes: Array<{ code: string; name: string }>;
  language?: string;
}

const extractJson = (text: string) => {
  try {
    // First try to parse the entire text as JSON
    return JSON.parse(text);
  } catch (_e) {
    // If that fails, try to extract JSON from within the text
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      // Try with array brackets too
      const arrayMatch = text.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        return JSON.parse(arrayMatch[0]);
      }
    } catch (_e2) {
      // If all parsing fails, throw a more helpful error
      console.error("Failed to parse JSON from AI response:", text.substring(0, 500));
      throw new Error("AI response was not valid JSON. Please try again.");
    }
    throw new Error("AI response was not valid JSON. Please try again.");
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Simplified authentication - just check for valid session
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Unauthorized: Missing or invalid authorization header");
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      throw new Error("Unauthorized: Empty token");
    }

    // Quick token validation
    const supabase = createServiceRoleClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error("Unauthorized: Invalid token");
    }

    console.log(`Analyzing WBS for user: ${user.id}`);

    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured in Supabase Secrets");
    }

    // 2. Parse request
    let requestData: AnalysisRequest;
    try {
      requestData = await req.json();
    } catch (_e) {
      throw new Error("Invalid request body. Expected JSON.");
    }

    const { items, availableCostCodes, language = "en-US" } = requestData;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("The 'items' array is required and must not be empty.");
    }

    if (!availableCostCodes || !Array.isArray(availableCostCodes) || availableCostCodes.length === 0) {
      throw new Error("The 'availableCostCodes' array is required.");
    }

    // 3. Process items in batches to avoid timeouts and token limits
    const BATCH_SIZE = 10; // Reduced from 20 for better reliability
    // deno-lint-ignore no-explicit-any
    const allSuggestions: any[] = [];

    console.log(`Processing ${items.length} items in batches of ${BATCH_SIZE}`);

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(items.length / BATCH_SIZE)} (${batch.length} items)`);

      // 4. Construct prompt for this batch
      const itemsList = batch.map((it, idx) => `[${idx}] ID: ${it.id || "N/A"}, Name: ${it.name}, Description: ${it.description || "(none)"}`).join("\n");
      
      const prompt = `You are a construction cost controller. Suggest the best Cost Code for each WBS item from the list below.

Available Cost Codes:
${availableCostCodes.map(cc => `- ${cc.code}: ${cc.name}`).join("\n")}

Language for reasoning: ${language}

Items to analyze:
${itemsList}

Return ONLY a JSON object with this structure:
{
  "suggestions": [
    {
      "id": "original_id",
      "suggestedCode": "CODE",
      "reasoning": "Simple explanation"
    }
  ]
}

Respond ONLY with valid JSON.`;

      // Call Anthropic for this batch with timeout
      console.log(`Calling Anthropic for batch (${batch.length} items)...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      // deno-lint-ignore no-explicit-any
      let anthropicData: any;
      // deno-lint-ignore no-explicit-any
      let batchResult: any;

      try {
        const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: ANTHROPIC_MODEL,
            max_tokens: 3000,
            messages: [{ role: "user", content: prompt }],
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!anthropicResponse.ok) {
          const errorText = await anthropicResponse.text();
          console.error("Anthropic API Error:", anthropicResponse.status, errorText);
          throw new Error(`AI service error (${anthropicResponse.status}): ${errorText}`);
        }

        anthropicData = await anthropicResponse.json();
        if (!anthropicData.content || !anthropicData.content[0] || !anthropicData.content[0].text) {
          console.error("Invalid Anthropic response structure:", anthropicData);
          throw new Error("Invalid response from AI service");
        }

        const content = anthropicData.content[0].text;
        batchResult = extractJson(content);

      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error("AI service request timed out. Please try again.");
        }
        throw fetchError;
      }

      // Add batch suggestions to overall results
      if (batchResult.suggestions && Array.isArray(batchResult.suggestions)) {
        allSuggestions.push(...batchResult.suggestions);
      }

      // Log usage for this batch (simplified)
      try {
        await supabase.from("ai_usage_logs").insert({
          user_id: user.id,
          feature: "wbs_cost_code_batch_analysis",
          model: ANTHROPIC_MODEL,
          input_tokens: anthropicData.usage?.input_tokens || 0,
          output_tokens: anthropicData.usage?.output_tokens || 0,
          total_cost: ((anthropicData.usage?.input_tokens || 0) * 0.003 + (anthropicData.usage?.output_tokens || 0) * 0.015) / 1000,
        });
      } catch (logError) {
        // Don't fail the request if logging fails
        console.warn("Usage logging failed (non-fatal):", logError.message);
      }

      // Add a small delay between batches to avoid overwhelming the API
      if (i + BATCH_SIZE < items.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // 6. Return combined results
    const analysisResult = { suggestions: allSuggestions };

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Edge Function Detailed Error:', message);
    
    // Return the actual error message for debugging
    return new Response(
      JSON.stringify({ 
        error: message,
        debug: true 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: (error instanceof Error && (error.message.includes('404') || error.message.includes('not found'))) ? 404 : 500,
      }
    );
  }
});
