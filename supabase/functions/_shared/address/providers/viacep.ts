import { fetchWithRetry } from "../http.ts";
import { emptyNormalized, normalizeCep } from "../normalize.ts";
import type { AddressLookupInput, ProviderResult } from "../types.ts";

const VIA_CEP_BASE_URL = "https://viacep.com.br/ws";

interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  ibge?: string;
  erro?: boolean;
}

export async function lookupViaCep(
  input: AddressLookupInput,
  options: { timeoutMs: number; retryCount: number }
): Promise<ProviderResult> {
  const cep = normalizeCep(input.postal_code ?? "");
  if (!cep) {
    const normalized = emptyNormalized("BR", "viacep");
    normalized.quality.messages.push("Invalid CEP.");
    return { normalized, raw: null };
  }

  const url = `${VIA_CEP_BASE_URL}/${cep}/json/`;
  const response = await fetchWithRetry(url, { method: "GET" }, options);

  if (!response.ok) {
    throw new Error(`ViaCEP error: ${response.status}`);
  }

  const data = (await response.json()) as ViaCepResponse;

  if (data.erro) {
    const normalized = emptyNormalized("BR", "viacep");
    normalized.postal_code = cep;
    normalized.quality.messages.push("CEP not found.");
    return { normalized, raw: data };
  }

  const normalized = emptyNormalized("BR", "viacep");
  normalized.postal_code = data.cep ?? cep;
  normalized.line1 = data.logradouro ?? "";
  normalized.district = data.bairro ?? "";
  normalized.city = data.localidade ?? "";
  normalized.region = data.uf ?? "";
  normalized.ibge = data.ibge ?? "";
  normalized.quality.is_valid = true;

  return { normalized, raw: data };
}
