/** Cache em memória com TTL para evitar consultas repetidas ao Supabase */
const cache = new Map<string, { data: unknown; expires: number }>();

const DEFAULT_TTL = 60_000; // 60 segundos
const NIGHT_TTL = 5 * 60 * 60 * 1000; // 5 horas (até as 6h)

/** Verifica se é horário de madrugada (1h-6h horário de Brasília) */
export function isNightMode(): boolean {
  const now = new Date();
  // UTC-3 para Brasília
  const brHour = (now.getUTCHours() - 3 + 24) % 24;
  return brHour >= 1 && brHour < 6;
}

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache(key: string, data: unknown, ttl?: number) {
  const effectiveTtl = ttl ?? (isNightMode() ? NIGHT_TTL : DEFAULT_TTL);
  cache.set(key, { data, expires: Date.now() + effectiveTtl });
}
