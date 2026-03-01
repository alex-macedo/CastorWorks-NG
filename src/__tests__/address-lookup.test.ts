import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  normalizeCep,
} from "../../supabase/functions/_shared/address/normalize";
import { MemoryCache } from "../../supabase/functions/_shared/address/cache";
import {
  lookupViaCep,
} from "../../supabase/functions/_shared/address/providers/viacep";
import {
  lookupUsps,
} from "../../supabase/functions/_shared/address/providers/usps";
import {
  getUspsToken,
  resetUspsTokenState,
} from "../../supabase/functions/_shared/address/uspsAuth";
import {
  AddressLookupService,
} from "../../supabase/functions/_shared/address/service";
import {
  createAddressLookupHandler,
} from "../../supabase/functions/_shared/address/handler";

const mockFetch = vi.fn();

beforeEach(() => {
  if (typeof vi.stubGlobal === 'function') {
    vi.stubGlobal("fetch", mockFetch);
  } else {
    (globalThis as any).fetch = mockFetch;
  }
});

const originalFetch = globalThis.fetch;

afterEach(() => {
  if (typeof vi.unstubAllGlobals === 'function') {
    vi.unstubAllGlobals();
  } else {
    globalThis.fetch = originalFetch;
  }
  vi.clearAllMocks();
  resetUspsTokenState();
});

describe("normalizeCep", () => {
  it("normalizes valid CEP", () => {
    expect(normalizeCep("12345-678")).toBe("12345678");
  });

  it("returns null for invalid CEP", () => {
    expect(normalizeCep("123")).toBeNull();
  });
});

describe("BR providers", () => {
  it("handles ViaCEP erro response", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ erro: true }), { status: 200 })
    );

    const result = await lookupViaCep(
      { country: "BR", postal_code: "01001000" },
      { timeoutMs: 2000, retryCount: 0 }
    );

    expect(result.normalized.quality.is_valid).toBe(false);
    expect(result.normalized.quality.messages.length).toBeGreaterThan(0);
  });

  it("falls back to BrasilAPI when ViaCEP misses", async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ erro: true }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            cep: "01001000",
            street: "Praca da Se",
            neighborhood: "Se",
            city: "Sao Paulo",
            state: "SP",
            ibge: "3550308",
          }),
          { status: 200 }
        )
      );

    const service = new AddressLookupService(
      {
        cacheTtlBrSeconds: 60,
        cacheTtlUsSeconds: 60,
        timeoutMs: 2000,
        retryCount: 0,
      },
      {
        brCache: new MemoryCache(),
        usCache: new MemoryCache(),
        uspsConfig: {
          baseUrl: "https://apis.usps.com",
          clientId: "test",
          clientSecret: "test",
        },
        logger: {
          info: () => undefined,
          warn: () => undefined,
        },
      }
    );

    const result = await service.lookup({
      country: "BR",
      postal_code: "01001000",
    });

    expect(result.normalized.source).toBe("brasilapi");
    expect(result.normalized.quality.is_valid).toBe(true);
  });
});

describe("USPS token cache", () => {
  it("uses single-flight token requests", async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({ access_token: "token-1", expires_in: 300 }),
        { status: 200 }
      )
    );

    const config = {
      clientId: "id",
      clientSecret: "secret",
      baseUrl: "https://apis.usps.com",
      timeoutMs: 2000,
      retryCount: 0,
    };

    const [tokenA, tokenB] = await Promise.all([
      getUspsToken(config),
      getUspsToken(config),
    ]);

    expect(tokenA).toBe("token-1");
    expect(tokenB).toBe("token-1");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("refreshes token before expiry", async () => {
    if (typeof vi.useFakeTimers === 'function') vi.useFakeTimers();
    if (typeof vi.setSystemTime === 'function') vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));

    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: "token-1", expires_in: 1 }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: "token-2", expires_in: 300 }),
          { status: 200 }
        )
      );

    const config = {
      clientId: "id",
      clientSecret: "secret",
      baseUrl: "https://apis.usps.com",
      timeoutMs: 2000,
      retryCount: 0,
    };

    const tokenA = await getUspsToken(config);
    if (typeof vi.setSystemTime === 'function') vi.setSystemTime(new Date("2024-01-01T00:00:03Z"));
    const tokenB = await getUspsToken(config);

    expect(tokenA).toBe("token-1");
    expect(tokenB).toBe("token-2");

    vi.useRealTimers();
  });
});

describe("USPS mapping", () => {
  it("maps ZIP+4 into normalized schema", async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: "token-1", expires_in: 300 }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            address: {
              streetAddress: "475 L'Enfant Plaza SW",
              city: "Washington",
              state: "DC",
              ZIPCode: "20260",
              ZIPPlus4: "0004",
            },
          }),
          { status: 200 }
        )
      );

    const result = await lookupUsps(
      {
        country: "US",
        line1: "475 L'enfant Plaza SW",
        city: "Washington",
        region: "DC",
      },
      {
        baseUrl: "https://apis.usps.com",
        clientId: "id",
        clientSecret: "secret",
        timeoutMs: 2000,
        retryCount: 0,
      }
    );

    expect(result.normalized.zip5).toBe("20260");
    expect(result.normalized.zip4).toBe("0004");
    expect(result.normalized.quality.is_valid).toBe(true);
  });
});

describe("MemoryCache", () => {
  it("expires entries based on ttl", () => {
    if (typeof vi.useFakeTimers === 'function') vi.useFakeTimers();
    if (typeof vi.setSystemTime === 'function') vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));

    const cache = new MemoryCache<string>();
    cache.set("key", "value", 1);

    expect(cache.get("key")).toBe("value");

    if (typeof vi.setSystemTime === 'function') vi.setSystemTime(new Date("2024-01-01T00:00:02Z"));
    expect(cache.get("key")).toBeNull();

    vi.useRealTimers();
  });
});

describe("AddressLookupHandler", () => {
  it("returns normalized payload for BR lookup", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          cep: "01001-000",
          logradouro: "Praca da Se",
          bairro: "Se",
          localidade: "Sao Paulo",
          uf: "SP",
          ibge: "3550308",
        }),
        { status: 200 }
      )
    );

    const handler = createAddressLookupHandler({
      brCache: new MemoryCache(),
      usCache: new MemoryCache(),
      authenticate: async () => ({ user: { id: "user-1" } }),
      getEnv: () => undefined,
    });

    const request = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ country: "BR", postal_code: "01001000" }),
    });

    const response = await handler(request);
    const payload = await response.json();

    expect(payload.normalized).toBeTruthy();
    expect(payload.normalized.country).toBe("BR");
  });
});
