import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, withTimeout } from "@/lib/supabase";
import { LANCAMENTO_PADRAO } from "@/lib/config";

export const dynamic = "force-dynamic";

export interface VendaRankItem {
  nome: string;
  vendas: number;
  receita: number;
}

export async function GET(req: NextRequest) {
  const lancamento =
    req.nextUrl.searchParams.get("lancamento") || LANCAMENTO_PADRAO;

  const [campRes, criatRes] = await Promise.all([
    withTimeout(
      supabaseAdmin.rpc("fn_vendas_por_campanha", { p_lancamento: lancamento }),
      10_000
    ),
    withTimeout(
      supabaseAdmin.rpc("fn_vendas_por_criativo", { p_lancamento: lancamento }),
      10_000
    ),
  ]);

  const porCampanha: VendaRankItem[] = (campRes.data ?? []).map((r: any) => ({
    nome: r.campanha,
    vendas: Number(r.vendas),
    receita: Number(r.receita),
  }));

  const porCriativo: VendaRankItem[] = (criatRes.data ?? []).map((r: any) => ({
    nome: r.criativo,
    vendas: Number(r.vendas),
    receita: Number(r.receita),
  }));

  return NextResponse.json(
    { lancamento, porCampanha, porCriativo },
    { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" } }
  );
}
