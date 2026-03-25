/**
 * Generic sliding-window rate limiter.
 * Usage: const limiter = createRateLimiter(3, 10 * 60_000);
 *        if (limiter.isLimited(ip)) return 429;
 */
export function createRateLimiter(maxRequests: number, windowMs: number, maxKeys = 500) {
  const timestamps = new Map<string, number[]>();

  // Periodic cleanup every 5 min — prevents unbounded growth in warm serverless instances
  const cleanupInterval = setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [k, ts] of timestamps) {
      if (!ts.some(t => t > cutoff)) timestamps.delete(k);
    }
  }, 5 * 60_000);
  // Allow GC if module is unloaded (e.g. test environments)
  if (typeof cleanupInterval === 'object') (cleanupInterval as NodeJS.Timeout).unref?.();

  function isLimited(key: string): boolean {
    const now = Date.now();
    const cutoff = now - windowMs;
    const times = (timestamps.get(key) ?? []).filter(t => t > cutoff);
    if (times.length >= maxRequests) return true;
    times.push(now);
    timestamps.set(key, times);
    if (timestamps.size >= maxKeys) {
      for (const [k, ts] of timestamps) {
        if (!ts.some(t => t > cutoff)) timestamps.delete(k);
      }
    }
    return false;
  }

  return { isLimited };
}
