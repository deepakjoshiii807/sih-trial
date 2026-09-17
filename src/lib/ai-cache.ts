/**
 * Client-side AI cache + token budget helpers.
 * Shared by every AI feature so there is one place that handles caching,
 * deduplication, offline fallback, and budget display.
 *
 * Hash: FNV-1a 32-bit doubled to 64 hex chars — far fewer collisions than
 * the previous `(h*31)` fast hash which collided on short common prefixes.
 * Eviction: LRU by cachedAt, not lexicographic sort.
 */
export interface CachedAI<T> {
  value: T;
  cachedAt: number;
  hashKey: string;
  source: "ai" | "deterministic" | "cache";
}

const STORAGE_PREFIX = "l2l.ai_cache.";
const MAX_ENTRIES = 60;
const TTL_MS = 1000 * 60 * 60 * 24; // 24h default

function storageKey(ns: string, hashKey: string): string {
  return `${STORAGE_PREFIX}${ns}:${hashKey}`;
}

export function aiHashKey(parts: string[]): string {
  // FNV-1a 32-bit — two independent seeds → 64 hex chars
  const s = parts.join("|");
  let h1 = 2166136261 >>> 0;
  let h2 = 16777619 >>> 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 16777619) >>> 0;
    h2 ^= c ^ (h1 & 0xff);
    h2 = Math.imul(h2, 16777619) >>> 0;
  }
  const hex = (n: number) => n.toString(16).padStart(8, "0");
  return hex(h1) + hex(h2) + "-" + (s.length % 10000).toString(16);
}

export function readAICache<T>(ns: string, hashKey: string): CachedAI<T> | null {
  try {
    const raw = localStorage.getItem(storageKey(ns, hashKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedAI<T>;
    if (!parsed || typeof parsed.cachedAt !== "number") return null;
    if (Date.now() - parsed.cachedAt > TTL_MS) {
      localStorage.removeItem(storageKey(ns, hashKey));
      return null;
    }
    // Touch for LRU — update cachedAt on read so hot entries survive eviction
    // Do not re-serialize on every read in tight loops; only when old
    if (Date.now() - parsed.cachedAt > 60_000) {
      try {
        localStorage.setItem(storageKey(ns, hashKey), JSON.stringify({ ...parsed, cachedAt: Date.now() }));
      } catch { /* quota */ }
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeAICache<T>(ns: string, hashKey: string, value: T, source: "ai" | "deterministic" = "ai"): void {
  try {
    const payload: CachedAI<T> = { value, cachedAt: Date.now(), hashKey, source };
    localStorage.setItem(storageKey(ns, hashKey), JSON.stringify(payload));
    // Trim LRU — drop oldest by cachedAt for this namespace
    const entries: { key: string; at: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`${STORAGE_PREFIX}${ns}:`)) {
        try {
          const raw = localStorage.getItem(k);
          const at = raw ? (JSON.parse(raw).cachedAt as number) : 0;
          entries.push({ key: k, at: typeof at === "number" ? at : 0 });
        } catch {
          entries.push({ key: k, at: 0 });
        }
      }
    }
    if (entries.length > MAX_ENTRIES) {
      entries.sort((a, b) => a.at - b.at);
      for (let i = 0; i < entries.length - MAX_ENTRIES; i++) localStorage.removeItem(entries[i].key);
    }
  } catch {
    // quota — drop oldest for this namespace and give up
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(`${STORAGE_PREFIX}${ns}:`)) keys.push(k);
      }
      if (keys.length) localStorage.removeItem(keys[0]);
    } catch { /* ignore */ }
  }
}

export function clearAICache(ns?: string): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (!ns || k.startsWith(`${STORAGE_PREFIX}${ns}:`)) && k.startsWith(STORAGE_PREFIX)) keys.push(k);
    }
    for (const k of keys) localStorage.removeItem(k);
  } catch {
    /* no-op */
  }
}

/** In-flight dedup so two mounts don't fire the same AI request twice. */
export function dedupedFetch<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const g = globalThis as unknown as { __l2l_ai_inflight?: Map<string, Promise<T>> };
  g.__l2l_ai_inflight ??= new Map<string, Promise<T>>();
  const existing = (g.__l2l_ai_inflight as Map<string, Promise<T>>).get(key);
  if (existing) return existing;
  const p = fn().finally(() => {
    (g.__l2l_ai_inflight as Map<string, Promise<T>>).delete(key);
  });
  (g.__l2l_ai_inflight as Map<string, Promise<T>>).set(key, p);
  return p;
}
