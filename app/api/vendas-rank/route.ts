import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, withTimeout } from "@/lib/supabase";
import { LANCAMENTO_PADRAO } from "@/lib/config";

export const dynamic = "force-dynamic";

export interface VendaRankItem {
  nome: string;
  leads: number;
  vendas: number;
  receita: number;
}

export interface RegiaoItem {
  estado: string;
  leads: number;
  vendas: number;
  conv_pct: number;
}

export async function GET(req: NextRequest) {
  const lancamento =
    req.nextUrl.searchParams.get("lancamento") || LANCAMENTO_PADRAO;

  const [campRes, criatRes, regiaoRes] = await Promise.all([
    withTimeout(
      supabaseAdmin.rpc("fn_vendas_por_campanha", { p_lancamento: lancamento }),
      10_000
    ),
    withTimeout(
      supabaseAdmin.rpc("fn_vendas_por_criativo", { p_lancamento: lancamento }),
      10_000
    ),
    withTimeout(
      supabaseAdmin.rpc("fn_vendas_por_regiao", { p_lancamento: lancamento }),
      10_000
    ),
  ]);

  const porCampanha: VendaRankItem[] = (campRes.data ?? []).map((r: any) => ({
    nome: r.campanha,
    leads: Number(r.leads),
    vendas: Number(r.vendas),
    receita: Number(r.receita),
  }));

  const porCriativo: VendaRankItem[] = (criatRes.data ?? []).map((r: any) => ({
    nome: r.criativo,
    leads: Number(r.leads),
    vendas: Number(r.vendas),
    receita: Number(r.receita),
  }));

  const porRegiao: RegiaoItem[] = (regiaoRes.data ?? []).map((r: any) => ({
    estado: r.estado,
    leads: Number(r.leads),
    vendas: Number(r.vendas),
    conv_pct: Number(r.conv_pct),
  }));

  return NextResponse.json(
    { lancamento, porCampanha, porCriativo, porRegiao },
    { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" } }
  );
}
