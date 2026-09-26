type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export interface RateLimitConfig {
  /** Max requests per window */
  limit: number;
  /** Window in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs: number;
}

export function rateLimit(
  key: string,
  config: RateLimitConfig = { limit: 20, windowMs: 60_000 }
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + config.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.limit - 1, resetAt, retryAfterMs: 0 };
  }

  if (bucket.count >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: bucket.resetAt,
      retryAfterMs: bucket.resetAt - now,
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: config.limit - bucket.count,
    resetAt: bucket.resetAt,
    retryAfterMs: 0,
  };
}

export function resetRateLimit(key?: string) {
  if (key) buckets.delete(key);
  else buckets.clear();
}
