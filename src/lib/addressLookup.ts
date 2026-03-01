import { supabase } from "@/integrations/supabase/client";

export interface BrAddressLookup {
  postal_code?: string;
  line1?: string;
  district?: string;
  city?: string;
  region?: string;
  ibge?: string;
  source?: string;
  quality?: {
    is_valid?: boolean;
    messages?: string[];
    warnings?: string[];
  };
}

export async function lookupBrazilCep(cep: string): Promise<{
  normalized: BrAddressLookup | null;
  error: string | null;
}> {
  const { data, error } = await supabase.functions.invoke(
    "addresses-lookup",
    {
      body: {
        country: "BR",
        postal_code: cep,
      },
    }
  );

  if (error) {
    return {
      normalized: null,
      error: error.message || "CEP lookup failed.",
    };
  }

  return {
    normalized: data?.normalized ?? null,
    error: null,
  };
}
