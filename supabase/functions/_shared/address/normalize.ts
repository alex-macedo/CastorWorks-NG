import type { NormalizedAddress } from "./types.ts";

export function normalizeCep(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) {
    return null;
  }
  return digits;
}

export function normalizeZip(value: string): {
  zip5: string;
  zip4: string;
  postal_code: string;
} {
  const digits = value.replace(/\D/g, "");
  const zip5 = digits.slice(0, 5);
  const zip4 = digits.length >= 9 ? digits.slice(5, 9) : "";
  const postal_code = zip4 ? `${zip5}-${zip4}` : zip5;

  return { zip5, zip4, postal_code };
}

export function emptyNormalized(
  country: NormalizedAddress["country"],
  source: string
): NormalizedAddress {
  return {
    country,
    postal_code: "",
    line1: "",
    line2: "",
    district: "",
    city: "",
    region: "",
    zip5: "",
    zip4: "",
    ibge: "",
    source,
    quality: {
      is_valid: false,
      is_deliverable: null,
      messages: [],
      warnings: [],
    },
  };
}
