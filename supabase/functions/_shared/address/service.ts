import { MemoryCache } from "./cache.ts";
import { AddressLookupError } from "./errors.ts";
import { normalizeCep } from "./normalize.ts";
import type {
  AddressLookupConfig,
  AddressLookupInput,
  AddressLookupResult,
} from "./types.ts";
import { lookupBrasilApi } from "./providers/brasilapi.ts";
import { lookupViaCep } from "./providers/viacep.ts";
import { lookupUsps } from "./providers/usps.ts";

interface Logger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
}

interface ServiceDeps {
  logger: Logger;
  brCache: MemoryCache<AddressLookupResult>;
  usCache: MemoryCache<AddressLookupResult>;
  uspsConfig: {
    baseUrl: string;
    clientId: string;
    clientSecret: string;
  };
}

export class AddressLookupService {
  private config: AddressLookupConfig;
  private deps: ServiceDeps;

  constructor(config: AddressLookupConfig, deps: ServiceDeps) {
    this.config = config;
    this.deps = deps;
  }

  lookup(input: AddressLookupInput): Promise<AddressLookupResult> {
    if (input.country === "BR") {
      return this.lookupBrazil(input);
    }
    if (input.country === "US") {
      return this.lookupUnitedStates(input);
    }

    throw new AddressLookupError(
      400,
      "invalid_request",
      "Unsupported country."
    );
  }

  private async lookupBrazil(
    input: AddressLookupInput
  ): Promise<AddressLookupResult> {
    const cep = normalizeCep(input.postal_code ?? "");
    if (!cep) {
      throw new AddressLookupError(
        400,
        "invalid_request",
        "Invalid CEP."
      );
    }

    const cacheKey = `br:${cep}`;
    const cached = this.deps.brCache.get(cacheKey);
    if (cached) {
      this.deps.logger.info("BR cache hit", { cacheKey });
      return cached;
    }

    const options = {
      timeoutMs: this.config.timeoutMs,
      retryCount: this.config.retryCount,
    };

    let result;
    try {
      result = await lookupViaCep(
        { ...input, postal_code: cep },
        options
      );
    } catch (_error) {
      this.deps.logger.warn("ViaCEP error, falling back", {
        cacheKey,
      });
      try {
        result = await lookupBrasilApi(
          { ...input, postal_code: cep },
          options
        );
      } catch (_fallbackError) {
        throw new AddressLookupError(
          502,
          "provider_error",
          "CEP lookup failed."
        );
      }
    }

    if (!result.normalized.quality.is_valid) {
      this.deps.logger.warn("ViaCEP miss, falling back", { cacheKey });
      try {
        result = await lookupBrasilApi(
          { ...input, postal_code: cep },
          options
        );
      } catch (_error) {
        this.deps.logger.warn("BrasilAPI error", { cacheKey });
        throw new AddressLookupError(
          502,
          "provider_error",
          "CEP lookup failed."
        );
      }
    }

    const output: AddressLookupResult = {
      raw_input: input,
      normalized: result.normalized,
    };

    this.deps.brCache.set(
      cacheKey,
      output,
      this.config.cacheTtlBrSeconds
    );

    return output;
  }

  private async lookupUnitedStates(
    input: AddressLookupInput
  ): Promise<AddressLookupResult> {
    if (!input.line1 || !input.city || !input.region) {
      throw new AddressLookupError(
        400,
        "invalid_request",
        "US address requires line1, city, and region."
      );
    }

    const cacheKey = await buildUsCacheKey(input);
    const cached = this.deps.usCache.get(cacheKey);
    if (cached) {
      this.deps.logger.info("US cache hit", { cacheKey });
      return cached;
    }

    let result;
    try {
      result = await lookupUsps(input, {
        baseUrl: this.deps.uspsConfig.baseUrl,
        clientId: this.deps.uspsConfig.clientId,
        clientSecret: this.deps.uspsConfig.clientSecret,
        timeoutMs: this.config.timeoutMs,
        retryCount: this.config.retryCount,
      });
    } catch (_error) {
      throw new AddressLookupError(
        502,
        "provider_error",
        "USPS validation failed."
      );
    }

    const output: AddressLookupResult = {
      raw_input: input,
      normalized: result.normalized,
      standardized: result.normalized,
    };

    this.deps.usCache.set(
      cacheKey,
      output,
      this.config.cacheTtlUsSeconds
    );

    return output;
  }
}

async function buildUsCacheKey(input: AddressLookupInput): Promise<string> {
  const parts = [
    input.line1 ?? "",
    input.line2 ?? "",
    input.city ?? "",
    input.region ?? "",
    input.postal_code ?? "",
  ];
  const data = parts.join("|").toLowerCase();
  return `us:${await sha256(data)}`;
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
