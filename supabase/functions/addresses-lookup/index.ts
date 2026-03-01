import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateRequest } from "../_shared/authorization.ts";
import { MemoryCache } from "../_shared/address/cache.ts";
import { createAddressLookupHandler } from "../_shared/address/handler.ts";
import type { AddressLookupResult } from "../_shared/address/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const brCache = new MemoryCache<AddressLookupResult>();
const usCache = new MemoryCache<AddressLookupResult>();

const handler = createAddressLookupHandler({
  brCache,
  usCache,
  authenticate: authenticateRequest,
  getEnv: (key) => Deno.env.get(key),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const response = await handler(req);

  return new Response(response.body, {
    status: response.status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
});
