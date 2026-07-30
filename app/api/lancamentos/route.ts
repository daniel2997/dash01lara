import { NextResponse } from "next/server";
import { fetchAll } from "@/lib/supabase";
import { LANCAMENTO_PADRAO } from "@/lib/config";

export const dynamic = "force-dynamic";

// Descobre os códigos de lançamento existentes (a base é compartilhada
// entre clientes, então filtramos por lançamento em todo o dashboard).
export async function GET() {
  const rows = await fetchAll<{ lancamento: string | null }>(
    "cadastroClientes",
    { select: "lancamento" }
  );

  const set = new Set<string>();
  for (const r of rows) if (r.lancamento) set.add(r.lancamento);

  // garante que o lançamento padrão apareça sempre
  set.add(LANCAMENTO_PADRAO);

  const lancamentos = Array.from(set).sort((a, b) => b.localeCompare(a));

  return NextResponse.json(
    { lancamentos },
    { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" } }
  );
}
