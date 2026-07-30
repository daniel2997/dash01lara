"use client";

import { useApi } from "@/lib/useApi";
import { useLaunch } from "@/components/LaunchContext";
import { KpiCard, Card, PageHeader, Loading, EmptyBadge } from "@/components/ui";
import RankList from "@/components/RankList";
import type { RankItem } from "@/app/api/ads/route";
import { formatCurrency, formatInt, formatPct } from "@/lib/config";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";

interface MidiaResp {
  vazio: boolean;
  totais: {
    gasto: number;
    impressoes: number;
    clicks: number;
    reach: number;
    leads: number;
    lpv: number;
    checkout: number;
    cpl: number;
    cpc: number;
    cpm: number;
    ctr: number;
  };
  porCampanha: {
    campanha: string;
    gasto: number;
    clicks: number;
    impressoes: number;
    leads: number;
    lpv: number;
  }[];
  porDia: { data: string; gasto: number; clicks: number; leads: number }[];
}

interface AdsResp {
  totalLeads: number;
  semAtribuicao: number;
  temGasto: boolean;
  melhoresCampanhas: RankItem[];
  melhoresCriativos: RankItem[];
  melhoresConjuntos: RankItem[];
}

const fmtDia = (v: string) => {
  try {
    return format(parseISO(v), "dd/MM");
  } catch {
    return v;
  }
};

export default function MidiaPage() {
  const { lancamento } = useLaunch();
  const { data, loading } = useApi<MidiaResp>("/api/midia");
  const { data: ads } = useApi<AdsResp>("/api/ads");

  if (loading || !data) return <Loading />;

  const t = data.totais;

  return (
    <div>
      <PageHeader
        title="Mídia / Tráfego"
        subtitle={`Anúncios no Meta · ${lancamento}`}
      />

      {data.vazio && (
        <div className="card p-4 mb-6 flex items-center gap-3">
          <EmptyBadge>aguardando dados</EmptyBadge>
          <p className="text-sm text-ink-60">
            Nenhuma campanha com a tag{" "}
            <code className="text-accent-bright">{lancamento}</code> na{" "}
            <code>campaigns_bms</code> ainda. Assim que o tráfego for importado,
            os números aparecem aqui automaticamente.
          </p>
        </div>
      )}

      <div className="kpi-grid mb-6">
        <KpiCard title="Gasto" value={formatCurrency(t.gasto)} color="#e79a86" />
        <KpiCard title="Leads" value={formatInt(t.leads)} color="#86e0a3" />
        <KpiCard title="CPL" value={formatCurrency(t.cpl)} subtitle="Custo por lead" color="#c9a24b" />
        <KpiCard title="Cliques" value={formatInt(t.clicks)} subtitle={`CTR ${formatPct(t.ctr, 2)}`} color="#53a668" />
        <KpiCard title="Impressões" value={formatInt(t.impressoes)} subtitle={`CPM ${formatCurrency(t.cpm)}`} color="#53a668" />
        <KpiCard title="CPC" value={formatCurrency(t.cpc)} color="#53a668" />
        <KpiCard title="Alcance" value={formatInt(t.reach)} color="#3ea98a" />
        <KpiCard title="Views LP" value={formatInt(t.lpv)} subtitle={`${formatInt(t.checkout)} checkouts`} color="#86e0a3" />
      </div>

      {/* Melhores criativos e campanhas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card
          title="Melhores Criativos"
          right={
            <span className="text-[10px] text-ink-45 uppercase tracking-wider">
              por leads gerados
            </span>
          }
        >
          <RankList itens={ads?.melhoresCriativos ?? []} cor="#86e0a3" />
        </Card>
        <Card
          title="Melhores Campanhas"
          right={
            <span className="text-[10px] text-ink-45 uppercase tracking-wider">
              por leads gerados
            </span>
          }
        >
          <RankList itens={ads?.melhoresCampanhas ?? []} cor="#53a668" />
        </Card>
      </div>

      <Card title="Melhores Conjuntos (Ad Sets)" className="mb-6">
        <RankList itens={ads?.melhoresConjuntos ?? []} cor="#53a668" limite={10} />
        {ads && ads.semAtribuicao > 0 && (
          <p className="text-[11px] text-ink-45 mt-4">
            {formatInt(ads.semAtribuicao)} de {formatInt(ads.totalLeads)} leads sem
            campanha/anúncio identificado (orgânico ou fora do rastreio).
          </p>
        )}
      </Card>

      <Card title="Gasto e Cliques por Dia" className="mb-6">
        {data.porDia.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.porDia} margin={{ left: -14, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(133,183,235,0.1)" />
              <XAxis dataKey="data" stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={fmtDia} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} width={36} />
              <Tooltip
                contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(133,183,235,0.2)", borderRadius: 12, fontSize: 12 }}
                labelFormatter={(v) => fmtDia(String(v))}
              />
              <Bar dataKey="gasto" name="Gasto" fill="#53a668" radius={[4, 4, 0, 0]} />
              <Bar dataKey="clicks" name="Cliques" fill="#3ea98a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-ink-45 text-sm py-10 text-center">Sem dados de tráfego.</p>
        )}
      </Card>

      <Card title="Campanhas">
        <div style={{ overflowX: "auto" }}>
          <table className="w-full text-xs sm:text-sm" style={{ minWidth: 640 }}>
            <thead>
              <tr className="text-ink-60 border-b border-card">
                <th className="text-left py-2 px-2">Campanha</th>
                <th className="text-right py-2 px-2">Gasto</th>
                <th className="text-right py-2 px-2">Leads</th>
                <th className="text-right py-2 px-2">CPL</th>
                <th className="text-right py-2 px-2">Cliques</th>
                <th className="text-right py-2 px-2">CTR</th>
                <th className="text-right py-2 px-2">Views LP</th>
              </tr>
            </thead>
            <tbody>
              {data.porCampanha.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-ink-45 py-8">
                    Nenhuma campanha ainda.
                  </td>
                </tr>
              )}
              {data.porCampanha.map((c) => (
                <tr key={c.campanha} className="border-b border-card/40 hover:bg-row">
                  <td className="py-2 px-2 max-w-[240px] truncate">{c.campanha}</td>
                  <td className="text-right py-2 px-2 whitespace-nowrap">{formatCurrency(c.gasto)}</td>
                  <td className="text-right py-2 px-2">{formatInt(c.leads)}</td>
                  <td className="text-right py-2 px-2 whitespace-nowrap">{c.leads > 0 ? formatCurrency(c.gasto / c.leads) : "—"}</td>
                  <td className="text-right py-2 px-2">{formatInt(c.clicks)}</td>
                  <td className="text-right py-2 px-2">{c.impressoes > 0 ? formatPct((c.clicks / c.impressoes) * 100, 2) : "—"}</td>
                  <td className="text-right py-2 px-2">{formatInt(c.lpv)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
