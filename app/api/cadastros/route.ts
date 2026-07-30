import { NextRequest, NextResponse } from "next/server";
import { fetchAll } from "@/lib/supabase";
import { LANCAMENTO_PADRAO, COL } from "@/lib/config";

export const dynamic = "force-dynamic";

// Colunas reais deste projeto. Nao existe "dispositivo" aqui.
interface Cadastro {
  data_criacao: string | null;
  nome_pagina: string | null;
  utm_nome_campanha: string | null;
  utm_nome_conjunto: string | null;
  utm_nome_anuncio: string | null;
  plataforma: string | null;
}

function topN(
  rows: Cadastro[],
  key: keyof Cadastro,
  n = 12,
  label = "(não informado)"
) {
  const map: Record<string, number> = {};
  for (const r of rows) {
    const k = (r[key] as string) || label;
    map[k] = (map[k] || 0) + 1;
  }
  return Object.entries(map)
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, n);
}

export async function GET(req: NextRequest) {
  const lancamento =
    req.nextUrl.searchParams.get("lancamento") || LANCAMENTO_PADRAO;

  const rows = await fetchAll<Cadastro>("cadastroClientes", {
    lancamento,
    select: `${COL.data},${COL.pagina},${COL.campanha},${COL.conjunto},${COL.anuncio},${COL.plataforma}`,
  });

  // Cadastros por dia
  const porDiaMap: Record<string, number> = {};
  for (const r of rows) {
    const d = (r[COL.data] || "").slice(0, 10);
    if (!d) continue;
    porDiaMap[d] = (porDiaMap[d] || 0) + 1;
  }
  const porDia = Object.entries(porDiaMap)
    .map(([data, total]) => ({ data, total }))
    .sort((a, b) => a.data.localeCompare(b.data));

  return NextResponse.json(
    {
      lancamento,
      total: rows.length,
      porDia,
      porPagina: topN(rows, COL.pagina),
      porCampanha: topN(rows, COL.campanha),
      porAnuncio: topN(rows, COL.anuncio),
      porPlataforma: topN(rows, COL.plataforma),
    },
    { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" } }
  );
}
