import { NextRequest, NextResponse } from "next/server";
import { fetchAll, countRows, supabaseAdmin, withTimeout } from "@/lib/supabase";
import { FUNIL, LANCAMENTO_PADRAO } from "@/lib/config";

export const dynamic = "force-dynamic";

export interface EtapaResultado {
  key: string;
  label: string;
  descricao: string;
  cor: string;
  disponivel: boolean;
  venda: boolean;
  total: number; // pessoas/eventos nessa etapa
  valor: number; // R$ (só etapas de venda)
}

// Cache mais longo de madrugada (0h-6h BRT = 3h-9h UTC)
function revalidate() {
  const h = new Date().getUTCHours();
  return h >= 3 && h < 9 ? 3600 : 300;
}

/**
 * Quando `dia` é informado, usa a RPC fn_funil_kpis que filtra pelo dia
 * operacional (20:30→20:30). Senão, mantém o fluxo original (fetchAll/countRows).
 */
async function getEtapasViaDia(lancamento: string, dia: string) {
  const result = await withTimeout(
    supabaseAdmin.rpc("fn_funil_kpis", { p_lancamento: lancamento, p_dia: dia } as any),
    10_000
  );
  const kpis = result.data as any;
  if (!kpis) return null;

  return FUNIL.map((e): EtapaResultado => {
    const base = {
      key: e.key,
      label: e.label,
      descricao: e.descricao,
      cor: e.cor,
      disponivel: e.disponivel,
      venda: !!e.venda,
    };
    if (!e.disponivel) return { ...base, total: 0, valor: 0 };

    switch (e.key) {
      case "cadastros":
        return { ...base, total: kpis.total_leads ?? 0, valor: 0 };
      case "privado":
        return { ...base, total: kpis.privado ?? 0, valor: 0 };
      case "grupos":
        return { ...base, total: kpis.grupos ?? 0, valor: 0 };
      case "workshop":
        return { ...base, total: kpis.compras ?? 0, valor: Number(kpis.total_receita) || 0 };
      default:
        return { ...base, total: 0, valor: 0 };
    }
  });
}

export async function GET(req: NextRequest) {
  const lancamento =
    req.nextUrl.searchParams.get("lancamento") || LANCAMENTO_PADRAO;
  const dia = req.nextUrl.searchParams.get("dia");

  // Se tem filtro de dia, usa a RPC (dia operacional 20:30→20:30)
  if (dia) {
    const etapas = await getEtapasViaDia(lancamento, dia);
    if (etapas) {
      const receita = etapas.reduce((s, e) => s + (e.venda ? e.valor : 0), 0);
      return NextResponse.json(
        { lancamento, dia, etapas, receita },
        { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=30" } }
      );
    }
  }

  // Sem dia: fluxo original
  const etapas: EtapaResultado[] = await Promise.all(
    FUNIL.map(async (e): Promise<EtapaResultado> => {
      const base = {
        key: e.key,
        label: e.label,
        descricao: e.descricao,
        cor: e.cor,
        disponivel: e.disponivel,
        venda: !!e.venda,
      };

      if (!e.disponivel || !e.tabela) {
        return { ...base, total: 0, valor: 0 };
      }

      // Tráfego: "total" = soma de cliques das campanhas
      if (e.key === "trafego") {
        const rows = await fetchAll<{ clicks: number | null }>(e.tabela, {
          lancamento,
          lancamentoCol: e.lancamentoCol,
          select: "clicks",
        });
        const clicks = rows.reduce((s, r) => s + (Number(r.clicks) || 0), 0);
        return { ...base, total: clicks, valor: 0 };
      }

      // Etapas de venda: conta linhas + soma valor
      if (e.venda && e.valorCol) {
        const rows = await fetchAll<Record<string, unknown>>(e.tabela, {
          lancamento,
          lancamentoCol: e.lancamentoCol,
          select: `${e.valorCol}`,
          filtro: e.filtro,
        });
        const valor = rows.reduce(
          (s, r) => s + (parseFloat(String(r[e.valorCol!])) || 0),
          0
        );
        return { ...base, total: rows.length, valor };
      }

      // Etapas simples: só conta linhas
      const total = await countRows(e.tabela, {
        lancamento,
        lancamentoCol: e.lancamentoCol,
      });
      return { ...base, total, valor: 0 };
    })
  );

  const receita = etapas.reduce((s, e) => s + (e.venda ? e.valor : 0), 0);

  return NextResponse.json(
    { lancamento, etapas, receita },
    {
      headers: {
        "Cache-Control": `s-maxage=${revalidate()}, stale-while-revalidate=60`,
      },
    }
  );
}
