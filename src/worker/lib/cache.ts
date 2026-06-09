import type { Env } from "../env";

// Thin JSON helpers over Workers KV, used to cache feeds and leaderboards.
// Values are stored with a TTL so stale data self-expires.

export async function cacheGet<T>(env: Env, key: string): Promise<T | null> {
  const raw = await env.CACHE.get(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function cacheSet(
  env: Env,
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> {
  await env.CACHE.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
}

export async function cacheDelete(env: Env, key: string): Promise<void> {
  await env.CACHE.delete(key);
}
