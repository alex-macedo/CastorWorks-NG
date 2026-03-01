import { AddressLookupService } from "./service.ts";
import { toSafeError, AddressLookupError } from "./errors.ts";
import { checkAddressRateLimit } from "./rateLimit.ts";
import { MemoryCache } from "./cache.ts";
import type {
  AddressLookupInput,
  AddressLookupResult,
} from "./types.ts";

interface HandlerDeps {
  brCache: MemoryCache<AddressLookupResult>;
  usCache: MemoryCache<AddressLookupResult>;
  authenticate: (req: Request) => Promise<{ user: { id: string } }>;
  getEnv: (key: string) => string | undefined;
}

export function createAddressLookupHandler(deps: HandlerDeps) {
  return async function handleRequest(req: Request): Promise<Response> {
    const requestId = crypto.randomUUID();

    try {
      if (req.method !== "POST") {
        return jsonResponse(
          { error: "Method not allowed", request_id: requestId },
          405
        );
      }

      const { user } = await deps.authenticate(req);
      const input = await parseRequest(req);

      logLookup(requestId, input);

      const rateLimit = checkAddressRateLimit(user.id, {
        maxRequests: 60,
        windowMs: 60 * 1000,
      });

      if (!rateLimit.allowed) {
        return jsonResponse(
          {
            error: "Rate limit exceeded",
            request_id: requestId,
            reset_at: new Date(rateLimit.resetAt).toISOString(),
          },
          429
        );
      }

      const config = {
        cacheTtlBrSeconds: getNumberEnv(
          deps,
          "ADDRESS_CACHE_TTL_BR_SECONDS",
          604800
        ),
        cacheTtlUsSeconds: getNumberEnv(
          deps,
          "ADDRESS_CACHE_TTL_US_SECONDS",
          86400
        ),
        timeoutMs: getNumberEnv(deps, "ADDRESS_LOOKUP_TIMEOUT_MS", 2500),
        retryCount: 1,
      };

      const uspsBaseUrl = getUspsBaseUrl(deps.getEnv("USPS_ENV"));
      const uspsClientId = deps.getEnv("USPS_CLIENT_ID") ?? "";
      const uspsClientSecret = deps.getEnv("USPS_CLIENT_SECRET") ?? "";

      if (input.country === "US" && (!uspsClientId || !uspsClientSecret)) {
        throw new Error("USPS credentials not configured");
      }

      const service = new AddressLookupService(config, {
        brCache: deps.brCache,
        usCache: deps.usCache,
        uspsConfig: {
          baseUrl: uspsBaseUrl,
          clientId: uspsClientId,
          clientSecret: uspsClientSecret,
        },
        logger: {
          info: (message, meta) => console.info(message, meta ?? {}),
          warn: (message, meta) => console.warn(message, meta ?? {}),
        },
      });

      const result = await service.lookup(input);

      return jsonResponse(
        {
          request_id: requestId,
          country: input.country,
          raw_input: result.raw_input,
          normalized: result.normalized,
          standardized: result.standardized ?? null,
        },
        200
      );
    } catch (error) {
      const safeError = toSafeError(error);

      return jsonResponse(
        {
          error: safeError.message,
          code: safeError.code,
          messages: safeError.messages,
          request_id: requestId,
        },
        safeError.status
      );
    }
  };
}

async function parseRequest(req: Request): Promise<AddressLookupInput> {
  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    throw new AddressLookupError(
      400,
      "invalid_request",
      "Invalid JSON payload."
    );
  }

  const country = payload.country;
  if (country !== "BR" && country !== "US") {
    throw new AddressLookupError(
      400,
      "invalid_request",
      "Invalid country."
    );
  }

  return {
    country,
    postal_code: toOptionalString(payload.postal_code),
    line1: toOptionalString(payload.line1),
    line2: toOptionalString(payload.line2),
    city: toOptionalString(payload.city),
    region: toOptionalString(payload.region),
    district: toOptionalString(payload.district),
  };
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.trim();
  }
  return undefined;
}

function jsonResponse(payload: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getNumberEnv(
  deps: HandlerDeps,
  key: string,
  fallback: number
): number {
  const value = deps.getEnv(key);
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getUspsBaseUrl(envValue?: string | null): string {
  if (envValue === "tem") {
    return "https://apis.tem.usps.com";
  }
  return "https://apis.usps.com";
}

function logLookup(requestId: string, input: AddressLookupInput) {
  const meta: Record<string, unknown> = {
    request_id: requestId,
    country: input.country,
  };

  if (input.country === "BR") {
    meta.postal_code = input.postal_code ?? "";
  }
  if (input.country === "US" && input.postal_code) {
    meta.postal_code = input.postal_code;
  }

  console.info("[AddressLookup] request", meta);
}
