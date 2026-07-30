import { NextRequest, NextResponse } from "next/server";
import { fetchAll } from "@/lib/supabase";
import { LANCAMENTO_PADRAO, lancamentoDaCampanha } from "@/lib/config";

export const dynamic = "force-dynamic";

interface CampaignRow {
  Campanha: string | null;
  Conjunto: string | null;
  ad: string | null;
  gasto: number | null;
  impressoes: number | null;
  clicks: number | null;
  unique_clicks: number | null;
  reach: number | null;
  leads: string | null;
  land_page_views: number | null;
  initiate_checkout: string | null;
  data: string | null;
  launch_tag: string | null;
}

const num = (v: unknown) => Number(v) || 0;
const pint = (v: unknown) => parseInt(String(v)) || 0;

export async function GET(req: NextRequest) {
  const lancamento =
    req.nextUrl.searchParams.get("lancamento") || LANCAMENTO_PADRAO;

  // Não dá para filtrar por launch_tag no banco: a coluna chega NULL. Puxamos
  // tudo e resolvemos o lançamento pelo nome da campanha (com alias) aqui.
  // O volume é pequeno — dezenas de linhas por dia.
  const todas = await fetchAll<CampaignRow>("campaigns_bms", {
    select:
      "Campanha,Conjunto,ad,gasto,impressoes,clicks,unique_clicks,reach,leads,land_page_views,initiate_checkout,data,launch_tag",
  });

  const rows = todas.filter(
    (r) => lancamentoDaCampanha(r.Campanha, r.launch_tag) === lancamento
  );

  const t = rows.reduce(
    (a, r) => ({
      gasto: a.gasto + num(r.gasto),
      impressoes: a.impressoes + num(r.impressoes),
      clicks: a.clicks + num(r.clicks),
      reach: a.reach + num(r.reach),
      leads: a.leads + pint(r.leads),
      lpv: a.lpv + num(r.land_page_views),
      checkout: a.checkout + pint(r.initiate_checkout),
    }),
    { gasto: 0, impressoes: 0, clicks: 0, reach: 0, leads: 0, lpv: 0, checkout: 0 }
  );

  const cpl = t.leads > 0 ? t.gasto / t.leads : 0;
  const cpc = t.clicks > 0 ? t.gasto / t.clicks : 0;
  const cpm = t.impressoes > 0 ? (t.gasto / t.impressoes) * 1000 : 0;
  const ctr = t.impressoes > 0 ? (t.clicks / t.impressoes) * 100 : 0;

  // Por campanha
  const campMap: Record<
    string,
    {
      campanha: string;
      gasto: number;
      clicks: number;
      impressoes: number;
      leads: number;
      lpv: number;
    }
  > = {};
  for (const r of rows) {
    const k = r.Campanha || "(sem nome)";
    if (!campMap[k])
      campMap[k] = {
        campanha: k,
        gasto: 0,
        clicks: 0,
        impressoes: 0,
        leads: 0,
        lpv: 0,
      };
    campMap[k].gasto += num(r.gasto);
    campMap[k].clicks += num(r.clicks);
    campMap[k].impressoes += num(r.impressoes);
    campMap[k].leads += pint(r.leads);
    campMap[k].lpv += num(r.land_page_views);
  }
  const porCampanha = Object.values(campMap).sort((a, b) => b.gasto - a.gasto);

  // Por dia
  const diaMap: Record<
    string,
    { data: string; gasto: number; clicks: number; leads: number }
  > = {};
  for (const r of rows) {
    const d = (r.data || "").slice(0, 10);
    if (!d) continue;
    if (!diaMap[d]) diaMap[d] = { data: d, gasto: 0, clicks: 0, leads: 0 };
    diaMap[d].gasto += num(r.gasto);
    diaMap[d].clicks += num(r.clicks);
    diaMap[d].leads += pint(r.leads);
  }
  const porDia = Object.values(diaMap).sort((a, b) =>
    a.data.localeCompare(b.data)
  );

  // Tags que caíram em outro lançamento: o fallback para a tag crua é
  // silencioso, então devolvemos isto para a tela poder avisar em vez de
  // simplesmente sumir com o gasto.
  const outrasTags = Array.from(
    new Set(
      todas
        .map((r) => lancamentoDaCampanha(r.Campanha, r.launch_tag))
        .filter((l): l is string => !!l && l !== lancamento)
    )
  );

  return NextResponse.json(
    {
      lancamento,
      vazio: rows.length === 0,
      totais: { ...t, cpl, cpc, cpm, ctr },
      porCampanha,
      porDia,
      outrasTags,
    },
    { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" } }
  );
}
