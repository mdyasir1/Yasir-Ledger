/**
 * A small in-process rate limiter.
 *
 * This is deliberately simple: it protects the single login endpoint against
 * online guessing. It is per-instance, so on a serverless platform it limits
 * attempts per warm instance rather than globally. That is acceptable for a
 * single-administrator application and is documented in SECURITY.md.
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

// Keep the map from growing without bound.
const MAX_BUCKETS = 5000;

function sweep(now: number): void {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * Register an attempt against `key` and report whether it is allowed.
 *
 * @param key     identifies the caller, e.g. an IP address
 * @param limit   maximum number of attempts per window
 * @param windowMs length of the window in milliseconds
 */
export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: limit - 1,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  return {
    allowed: true,
    remaining: limit - existing.count,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

/** Forget the attempts recorded for a key, e.g. after a successful login. */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/** Test helper: drop all recorded state. */
export function clearRateLimits(): void {
  buckets.clear();
}
