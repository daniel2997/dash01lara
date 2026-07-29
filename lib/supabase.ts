import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Nas rotas de API usamos a service role (ignora RLS); no client, a anon.
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Client para uso no servidor (API routes) — acesso total via service role. */
export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

/** Max pages to fetch in any paginated loop (prevents infinite loops). */
const MAX_PAGES = 100;

/** Default timeout for any Supabase operation (ms). */
const QUERY_TIMEOUT_MS = 10_000;

/**
 * Races a promise against a timeout. Rejects if the promise doesn't resolve
 * within `ms` milliseconds. Accepts PromiseLike (Supabase query builders).
 */
export function withTimeout<T>(promiseLike: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    Promise.resolve(promiseLike),
    new Promise<never>((_resolve, reject) =>
      setTimeout(() => reject(new Error(`Query timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/**
 * Busca TODAS as linhas de uma tabela filtrando por lancamento, paginando de
 * 1000 em 1000 (limite do PostgREST). Resiliente: se a tabela nao existir ou
 * der erro, devolve [] em vez de quebrar o dashboard.
 *
 * Safety: limited to MAX_PAGES iterations and QUERY_TIMEOUT_MS per page.
 */
export async function fetchAll<T = Record<string, unknown>>(
  table: string,
  opts: { lancamento?: string; lancamentoCol?: string; select?: string } = {}
): Promise<T[]> {
  const { lancamento, lancamentoCol = "lancamento", select = "*" } = opts;
  const PAGE = 1000;
  const rows: T[] = [];
  let from = 0;
  let iterations = 0;

  while (iterations < MAX_PAGES) {
    iterations++;
    try {
      let query = supabaseAdmin
        .from(table)
        .select(select)
        .range(from, from + PAGE - 1);
      if (lancamento) query = query.eq(lancamentoCol, lancamento);

      const result = await withTimeout(query, QUERY_TIMEOUT_MS);
      if (result.error) {
        console.warn(`[fetchAll] ${table}: ${result.error.message}`);
        break;
      }
      const page = (result.data as T[]) || [];
      rows.push(...page);
      if (page.length < PAGE) break;
      from += PAGE;
    } catch (err) {
      console.warn(
        `[fetchAll] ${table} page ${iterations}: ${err instanceof Error ? err.message : String(err)}`
      );
      break;
    }
  }

  if (iterations >= MAX_PAGES) {
    console.warn(
      `[fetchAll] ${table}: hit max page limit (${MAX_PAGES}), returning partial data (${rows.length} rows)`
    );
  }

  return rows;
}

/** Soma uma coluna numérica de uma tabela (por lancamento). Devolve 0 se falhar. */
export async function sumColumn(
  table: string,
  column: string,
  opts: { lancamento?: string; lancamentoCol?: string } = {}
): Promise<number> {
  const { lancamento, lancamentoCol = "lancamento" } = opts;

  try {
    let query = supabaseAdmin
      .from(table)
      .select(column);
    if (lancamento) query = query.eq(lancamentoCol, lancamento);

    const result = await withTimeout(query, QUERY_TIMEOUT_MS);
    if (result.error) {
      console.warn(`[sumColumn] ${table}.${column}: ${result.error.message}`);
      return 0;
    }
    const rows = (result.data as unknown as Record<string, unknown>[]) || [];
    return rows.reduce((acc, r) => acc + (Number(r[column]) || 0), 0);
  } catch (err) {
    console.warn(
      `[sumColumn] ${table}.${column}: ${err instanceof Error ? err.message : String(err)}`
    );
    return 0;
  }
}

/** Conta linhas de uma tabela (por lancamento). Devolve 0 se a tabela nao existir. */
export async function countRows(
  table: string,
  opts: { lancamento?: string; lancamentoCol?: string } = {}
): Promise<number> {
  const { lancamento, lancamentoCol = "lancamento" } = opts;

  try {
    let query = supabaseAdmin
      .from(table)
      .select("*", { count: "exact", head: true });
    if (lancamento) query = query.eq(lancamentoCol, lancamento);

    const result = await withTimeout(query, QUERY_TIMEOUT_MS);
    if (result.error) {
      console.warn(`[countRows] ${table}: ${result.error.message}`);
      return 0;
    }
    return result.count ?? 0;
  } catch (err) {
    console.warn(
      `[countRows] ${table}: ${err instanceof Error ? err.message : String(err)}`
    );
    return 0;
  }
}
