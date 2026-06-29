export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset_at: Date;
}

interface Bucket {
  count: number;
  reset_at: number;
}

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  input: { limit: number; windowMs: number; now?: number }
): RateLimitResult {
  const now = input.now ?? Date.now();
  const current = buckets.get(key);
  const bucket = current && current.reset_at > now
    ? current
    : { count: 0, reset_at: now + input.windowMs };
  bucket.count += 1;
  buckets.set(key, bucket);
  return {
    allowed: bucket.count <= input.limit,
    remaining: Math.max(0, input.limit - bucket.count),
    reset_at: new Date(bucket.reset_at),
  };
}

export function clearRateLimitBuckets(): void {
  buckets.clear();
}
