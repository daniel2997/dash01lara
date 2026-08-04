import { NextRequest, NextResponse } from "next/server";
import { fetchAll } from "@/lib/supabase";
import { LANCAMENTO_PADRAO, lancamentoDaCampanha } from "@/lib/config";

export const dynamic = "force-dynamic";

interface CampRow {
  ad: string | null;
  Campanha: string | null;
  gasto: number | null;
  impressoes: number | null;
  clicks: number | null;
  reach: number | null;
  land_page_views: number | null;
  leads: string | null;
  video_view: number | null;           // autoplay starts
  video_play_actions: string | null;   // 3-second video views (text type)
  thruplay_15s: number | null;
  video_p25_watched_actions: number | null;
  video_p50_watched_actions: number | null;
  video_p75_watched_actions: number | null;
  video_p100_watched_actions: number | null;
  launch_tag: string | null;
}

export interface DiagnosticoCriativo {
  nome: string;
  gasto: number;
  impressoes: number;
  videoStarts: number;           // autoplay starts (video_view)
  views3s: number;               // 3-second video views (video_play_actions)
  thruplay: number;
  p25: number;
  p50: number;
  p75: number;
  p100: number;
  clicks: number;
  lpv: number;
  leads: number;
  // Calculated — uses views3s when available, falls back to thruplay
  hookRate: number | null;       // views3s / impressoes (or thruplay/impressoes)
  retencaoHook: number | null;   // views3s / videoStarts (or thruplay/videoStarts)
  retencaoBody: number | null;   // p75 / views3s (or p75/thruplay)
  ctr: number | null;            // clicks / impressoes
  conversaoCta: number | null;   // clicks / p75
  carregamento: number | null;   // lpv / clicks
  conversaoPagina: number | null;// leads / lpv
  cpl: number | null;            // gasto / leads
  usandoProxy: boolean;          // true = using thruplay as fallback for 3s
}

const num = (v: unknown) => Number(v) || 0;
const pint = (v: unknown) => parseInt(String(v)) || 0;
const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : null);
const ratio = (a: number, b: number) => (b > 0 ? a / b : null);

export async function GET(req: NextRequest) {
  const lancamento =
    req.nextUrl.searchParams.get("lancamento") || LANCAMENTO_PADRAO;

  const todas = await fetchAll<CampRow>("campaigns_bms", {
    select:
      "ad,Campanha,gasto,impressoes,clicks,land_page_views,leads,video_view,video_play_actions,thruplay_15s,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions,launch_tag",
  });

  const rows = todas.filter(
    (r) => lancamentoDaCampanha(r.Campanha, r.launch_tag) === lancamento
  );

  // Aggregate by ad (creative)
  type Agg = Omit<DiagnosticoCriativo, "hookRate" | "retencaoHook" | "retencaoBody" | "ctr" | "conversaoCta" | "carregamento" | "conversaoPagina" | "cpl" | "usandoProxy">;
  const map: Record<string, Agg> = {};

  // Track how many rows per creative have video_play_actions data
  const rowCount: Record<string, { total: number; com3s: number }> = {};

  for (const r of rows) {
    const k = (r.ad || "").trim();
    if (!k) continue;
    if (!map[k]) {
      map[k] = { nome: k, gasto: 0, impressoes: 0, videoStarts: 0, views3s: 0, thruplay: 0, p25: 0, p50: 0, p75: 0, p100: 0, clicks: 0, lpv: 0, leads: 0 };
      rowCount[k] = { total: 0, com3s: 0 };
    }
    const it = map[k];
    const rc = rowCount[k];
    rc.total += 1;
    if (r.video_play_actions != null) rc.com3s += 1;
    it.gasto += num(r.gasto);
    it.impressoes += num(r.impressoes);
    it.videoStarts += num(r.video_view);
    it.views3s += pint(r.video_play_actions);
    it.thruplay += num(r.thruplay_15s);
    it.p25 += num(r.video_p25_watched_actions);
    it.p50 += num(r.video_p50_watched_actions);
    it.p75 += num(r.video_p75_watched_actions);
    it.p100 += num(r.video_p100_watched_actions);
    it.clicks += num(r.clicks);
    it.lpv += num(r.land_page_views);
    it.leads += pint(r.leads);
  }

  const criativos: DiagnosticoCriativo[] = Object.values(map)
    .map((it) => {
      // Only use 3s views when ALL rows for this creative have data (backfill complete)
      // Otherwise the partial sum would be divided by total impressions = distorted
      const rc = rowCount[it.nome] || { total: 0, com3s: 0 };
      const backfillCompleto = rc.com3s === rc.total && rc.total > 0;
      const usandoProxy = !backfillCompleto;
      const hook = usandoProxy ? it.thruplay : it.views3s;
      return {
        ...it,
        usandoProxy,
        hookRate: pct(hook, it.impressoes),
        retencaoHook: pct(hook, it.videoStarts),
        retencaoBody: pct(it.p75, hook),
        ctr: pct(it.clicks, it.impressoes),
        conversaoCta: pct(it.clicks, it.p75),
        carregamento: pct(it.lpv, it.clicks),
        conversaoPagina: pct(it.leads, it.lpv),
        cpl: it.leads > 0 ? it.gasto / it.leads : null,
      };
    })
    .filter((c) => c.impressoes > 100)
    .sort((a, b) => b.impressoes - a.impressoes);

  return NextResponse.json(
    { lancamento, criativos },
    { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" } }
  );
}
