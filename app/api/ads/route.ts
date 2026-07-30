import { NextRequest, NextResponse } from "next/server";
import { fetchAll } from "@/lib/supabase";
import { LANCAMENTO_PADRAO, COL, lancamentoDaCampanha } from "@/lib/config";

export const dynamic = "force-dynamic";

// As colunas reais deste projeto sao utm_nome_* (ver COL em lib/config).
interface CadRow {
  utm_nome_campanha: string | null;
  utm_nome_conjunto: string | null;
  utm_nome_anuncio: string | null;
}
interface CampRow {
  Campanha: string | null;
  Conjunto: string | null;
  ad: string | null;
  gasto: number | null;
  clicks: number | null;
  impressoes: number | null;
  launch_tag: string | null;
}

export interface RankItem {
  nome: string;
  leads: number;
  gasto: number;
  clicks: number;
  impressoes: number;
  cpl: number; // gasto / leads (só quando há gasto)
}

const num = (v: unknown) => Number(v) || 0;

// Junta leads (cadastroClientes) com gasto (campaigns_bms) pela mesma chave.
function rankear(
  cadastros: CadRow[],
  campanhas: CampRow[],
  cadKey: keyof CadRow,
  campKey: keyof CampRow
): RankItem[] {
  const map: Record<string, RankItem> = {};
  const get = (k: string) => {
    if (!map[k])
      map[k] = { nome: k, leads: 0, gasto: 0, clicks: 0, impressoes: 0, cpl: 0 };
    return map[k];
  };

  for (const c of cadastros) {
    const k = (c[cadKey] as string)?.trim();
    if (!k) continue;
    get(k).leads += 1;
  }
  for (const c of campanhas) {
    const k = (c[campKey] as string)?.trim();
    if (!k) continue;
    const it = get(k);
    it.gasto += num(c.gasto);
    it.clicks += num(c.clicks);
    it.impressoes += num(c.impressoes);
  }

  return Object.values(map)
    .map((it) => ({ ...it, cpl: it.leads > 0 && it.gasto > 0 ? it.gasto / it.leads : 0 }))
    .sort((a, b) => b.leads - a.leads || b.gasto - a.gasto)
    .slice(0, 15);
}

export async function GET(req: NextRequest) {
  const lancamento =
    req.nextUrl.searchParams.get("lancamento") || LANCAMENTO_PADRAO;

  const [cadastros, todasCampanhas] = await Promise.all([
    fetchAll<CadRow>("cadastroClientes", {
      lancamento,
      select: `${COL.campanha},${COL.conjunto},${COL.anuncio}`,
    }),
    // Sem filtro no banco: launch_tag chega NULL, resolvemos pelo nome abaixo.
    fetchAll<CampRow>("campaigns_bms", {
      select: "Campanha,Conjunto,ad,gasto,clicks,impressoes,launch_tag",
    }),
  ]);

  const campanhas = todasCampanhas.filter(
    (r) => lancamentoDaCampanha(r.Campanha, r.launch_tag) === lancamento
  );

  const semAtribuicao = cadastros.filter(
    (c) => !c[COL.campanha] && !c[COL.anuncio]
  ).length;

  return NextResponse.json(
    {
      lancamento,
      totalLeads: cadastros.length,
      semAtribuicao, // leads sem campanha/anúncio (orgânico ou não rastreado)
      temGasto: campanhas.length > 0,
      melhoresCampanhas: rankear(cadastros, campanhas, COL.campanha, "Campanha"),
      melhoresCriativos: rankear(cadastros, campanhas, COL.anuncio, "ad"),
      melhoresConjuntos: rankear(cadastros, campanhas, COL.conjunto, "Conjunto"),
    },
    { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" } }
  );
}
