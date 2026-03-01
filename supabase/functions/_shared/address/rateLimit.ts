interface RateLimitState {
  count: number;
  resetAt: number;
}

export interface AddressRateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const state = new Map<string, RateLimitState>();

export function checkAddressRateLimit(
  key: string,
  config: AddressRateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const existing = state.get(key);

  if (!existing || now >= existing.resetAt) {
    state.set(key, { count: 1, resetAt: now + config.windowMs });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }

  const nextCount = existing.count + 1;
  existing.count = nextCount;
  state.set(key, existing);

  return {
    allowed: nextCount <= config.maxRequests,
    remaining: Math.max(0, config.maxRequests - nextCount),
    resetAt: existing.resetAt,
  };
}
