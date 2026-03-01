import { fetchWithRetry } from "../http.ts";
import { emptyNormalized, normalizeCep } from "../normalize.ts";
import type { AddressLookupInput, ProviderResult } from "../types.ts";

const BRASIL_API_BASE_URL = "https://brasilapi.com.br/api/cep/v1";

interface BrasilApiResponse {
  cep?: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  ibge?: string;
}

export async function lookupBrasilApi(
  input: AddressLookupInput,
  options: { timeoutMs: number; retryCount: number }
): Promise<ProviderResult> {
  const cep = normalizeCep(input.postal_code ?? "");
  if (!cep) {
    const normalized = emptyNormalized("BR", "brasilapi");
    normalized.quality.messages.push("Invalid CEP.");
    return { normalized, raw: null };
  }

  const url = `${BRASIL_API_BASE_URL}/${cep}`;
  const response = await fetchWithRetry(url, { method: "GET" }, options);

  if (!response.ok) {
    if (response.status === 404) {
      const normalized = emptyNormalized("BR", "brasilapi");
      normalized.postal_code = cep;
      normalized.quality.messages.push("CEP not found.");
      return { normalized, raw: null };
    }
    throw new Error(`BrasilAPI error: ${response.status}`);
  }

  const data = (await response.json()) as BrasilApiResponse;
  const normalized = emptyNormalized("BR", "brasilapi");
  normalized.postal_code = data.cep ?? cep;
  normalized.line1 = data.street ?? "";
  normalized.district = data.neighborhood ?? "";
  normalized.city = data.city ?? "";
  normalized.region = data.state ?? "";
  normalized.ibge = data.ibge ?? "";
  normalized.quality.is_valid = true;

  return { normalized, raw: data };
}
