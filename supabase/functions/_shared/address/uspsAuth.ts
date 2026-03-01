import { fetchWithRetry } from "./http.ts";

interface UspsTokenState {
  token: string;
  expiresAtMs: number;
}

interface UspsAuthConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  timeoutMs: number;
  retryCount: number;
}

let cachedToken: UspsTokenState | null = null;
let inflight: Promise<string> | null = null;

const REFRESH_SKEW_MS = 60 * 1000;

export async function getUspsToken(config: UspsAuthConfig): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAtMs - REFRESH_SKEW_MS) {
    return cachedToken.token;
  }

  if (inflight) {
    return inflight;
  }

  inflight = requestToken(config);

  try {
    const token = await inflight;
    return token;
  } finally {
    inflight = null;
  }
}

async function requestToken(config: UspsAuthConfig): Promise<string> {
  const url = `${config.baseUrl}/oauth2/v3/token`;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const response = await fetchWithRetry(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    },
    { timeoutMs: config.timeoutMs, retryCount: config.retryCount }
  );

  if (!response.ok) {
    throw new Error(`USPS token error: ${response.status}`);
  }

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!payload.access_token) {
    throw new Error("USPS token missing access_token");
  }

  const expiresIn = Math.max(60, payload.expires_in ?? 300);
  cachedToken = {
    token: payload.access_token,
    expiresAtMs: Date.now() + expiresIn * 1000,
  };

  return payload.access_token;
}

export function resetUspsTokenState() {
  cachedToken = null;
  inflight = null;
}
