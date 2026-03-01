import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createErrorResponse } from "../_shared/errorHandler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Fetching exchange rates from API...');

    // Fetch exchange rates from exchangerate-api.io (free tier)
    const baseCurrency = 'BRL';
    const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
    
    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.statusText}`);
    }

    const data = await response.json();
    const rates = data.rates;
    const rateDate = new Date().toISOString().split('T')[0];

    console.log(`Fetched ${Object.keys(rates).length} exchange rates`);

    // Insert or update exchange rates in database
    const rateEntries = Object.entries(rates).map(([toCurrency, rate]) => ({
      from_currency: baseCurrency,
      to_currency: toCurrency,
      rate: rate as number,
      rate_date: rateDate,
    }));

    // Batch insert with upsert
    for (const entry of rateEntries) {
      const { error } = await supabaseClient
        .from('exchange_rates')
        .upsert(entry, {
          onConflict: 'from_currency,to_currency,rate_date'
        });

      if (error) {
        console.error(`Error inserting rate ${entry.from_currency}/${entry.to_currency}:`, error);
      }
    }

    console.log('Exchange rates updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        ratesUpdated: rateEntries.length,
        date: rateDate 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return createErrorResponse(error, corsHeaders);
  }
});
