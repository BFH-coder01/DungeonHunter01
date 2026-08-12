// Token-bucket limiter for untrusted WebSocket traffic. Each connection owns
// its own `store`, so one noisy client cannot consume another player's budget.
export function consumeRateLimit(store, key, ratePerSecond, burst, now = Date.now()) {
  let bucket = store[key];
  if (!bucket) bucket = store[key] = { tokens: burst, updatedAt: now };

  const elapsed = Math.max(0, now - bucket.updatedAt);
  bucket.tokens = Math.min(burst, bucket.tokens + (elapsed * ratePerSecond) / 1000);
  bucket.updatedAt = now;
  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}
