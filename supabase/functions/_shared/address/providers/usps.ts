import { fetchWithRetry } from "../http.ts";
import { emptyNormalized, normalizeZip } from "../normalize.ts";
import { getUspsToken } from "../uspsAuth.ts";
import type { AddressLookupInput, ProviderResult } from "../types.ts";

interface UspsProviderConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  timeoutMs: number;
  retryCount: number;
}

type UspsResponse = Record<string, unknown>;

export async function lookupUsps(
  input: AddressLookupInput,
  config: UspsProviderConfig
): Promise<ProviderResult> {
  const token = await getUspsToken({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    baseUrl: config.baseUrl,
    timeoutMs: config.timeoutMs,
    retryCount: config.retryCount,
  });

  const url = new URL(`${config.baseUrl}/addresses/v3/address`);
  url.searchParams.set("streetAddress", input.line1 ?? "");

  if (input.line2) {
    url.searchParams.set("secondaryAddress", input.line2);
  }
  if (input.city) {
    url.searchParams.set("city", input.city);
  }
  if (input.region) {
    url.searchParams.set("state", input.region);
  }
  if (input.postal_code) {
    url.searchParams.set("ZIPCode", input.postal_code);
  }

  const response = await fetchWithRetry(
    url.toString(),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    { timeoutMs: config.timeoutMs, retryCount: config.retryCount }
  );

  if (!response.ok) {
    throw new Error(`USPS error: ${response.status}`);
  }

  const data = (await response.json()) as UspsResponse;
  const normalized = mapUspsResponse(data);

  return { normalized, raw: data };
}

function mapUspsResponse(data: UspsResponse) {
  const normalized = emptyNormalized("US", "usps");
  const errors = Array.isArray(data.errors) ? data.errors : null;

  if (errors && errors.length > 0) {
    normalized.quality.messages.push("USPS could not validate address.");
    return normalized;
  }

  const address =
    (data.address as Record<string, unknown>) ??
    (Array.isArray(data.addresses) ? data.addresses[0] : null);

  if (!address || typeof address !== "object") {
    normalized.quality.messages.push("USPS could not validate address.");
    return normalized;
  }

  const line1 =
    (address.streetAddress as string) ||
    (address.addressLine1 as string) ||
    "";
  const line2 =
    (address.secondaryAddress as string) ||
    (address.addressLine2 as string) ||
    "";

  const city = (address.city as string) || "";
  const region = (address.state as string) || "";
  const zipCode =
    (address.ZIPCode as string) ||
    (address.zipCode as string) ||
    "";
  const zipPlus4 =
    (address.ZIPPlus4 as string) ||
    (address.zipPlus4 as string) ||
    "";

  const zip = zipPlus4 ? `${zipCode}-${zipPlus4}` : zipCode;
  const parsedZip = normalizeZip(zip || "");

  normalized.line1 = line1;
  normalized.line2 = line2;
  normalized.city = city;
  normalized.region = region;
  normalized.postal_code = parsedZip.postal_code;
  normalized.zip5 = parsedZip.zip5;
  normalized.zip4 = parsedZip.zip4;
  normalized.quality.is_valid = true;

  return normalized;
}
