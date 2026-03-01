export type CountryCode = "BR" | "US";

export interface AddressQuality {
  is_valid: boolean;
  is_deliverable: boolean | null;
  messages: string[];
  warnings: string[];
}

export interface NormalizedAddress {
  country: CountryCode;
  postal_code: string;
  line1: string;
  line2: string;
  district: string;
  city: string;
  region: string;
  zip5: string;
  zip4: string;
  ibge: string;
  source: string;
  quality: AddressQuality;
}

export interface AddressLookupInput {
  country: CountryCode;
  postal_code?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  region?: string | null;
  district?: string | null;
}

export interface AddressLookupResult {
  raw_input: AddressLookupInput;
  normalized: NormalizedAddress;
  standardized?: NormalizedAddress;
}

export interface ProviderResult {
  normalized: NormalizedAddress;
  raw: unknown;
}

export interface AddressProvider {
  name: string;
  country: CountryCode;
  lookup: (input: AddressLookupInput) => Promise<ProviderResult>;
}

export interface AddressLookupConfig {
  cacheTtlBrSeconds: number;
  cacheTtlUsSeconds: number;
  timeoutMs: number;
  retryCount: number;
}
