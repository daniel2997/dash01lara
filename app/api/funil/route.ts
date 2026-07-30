import { NextRequest, NextResponse } from "next/server";
import { fetchAll, countRows } from "@/lib/supabase";
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

export async function GET(req: NextRequest) {
  const lancamento =
    req.nextUrl.searchParams.get("lancamento") || LANCAMENTO_PADRAO;

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
