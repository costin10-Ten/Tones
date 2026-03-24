/**
 * Generic sliding-window rate limiter.
 * Usage: const limiter = createRateLimiter(3, 10 * 60_000);
 *        if (limiter.isLimited(ip)) return 429;
 */
export function createRateLimiter(maxRequests: number, windowMs: number) {
  const timestamps = new Map<string, number[]>();

  function isLimited(key: string): boolean {
    const now = Date.now();
    const cutoff = now - windowMs;
    const times = (timestamps.get(key) ?? []).filter(t => t > cutoff);
    if (times.length >= maxRequests) return true;
    times.push(now);
    timestamps.set(key, times);
    if (timestamps.size > 500) {
      for (const [k, ts] of timestamps) {
        if (!ts.some(t => t > cutoff)) timestamps.delete(k);
      }
    }
    return false;
  }

  return { isLimited };
}
