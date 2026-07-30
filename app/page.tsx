"use client";

import { useApi } from "@/lib/useApi";
import { useLaunch } from "@/components/LaunchContext";
import { EtapaResultado } from "@/app/api/funil/route";
import FunnelChart from "@/components/FunnelChart";
import RankList from "@/components/RankList";
import type { RankItem } from "@/app/api/ads/route";
import { KpiCard, Card, PageHeader, Loading } from "@/components/ui";
import { formatCurrency, formatInt, formatPct } from "@/lib/config";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";

interface FunilResp {
  etapas: EtapaResultado[];
  receita: number;
}
interface MidiaResp {
  vazio: boolean;
  totais: { gasto: number; leads: number; cpl: number; clicks: number };
}
interface CadastrosResp {
  total: number;
  porDia: { data: string; total: number }[];
}
interface AdsResp {
  melhoresCampanhas: RankItem[];
  melhoresCriativos: RankItem[];
}

const fmtDia = (v: string) => {
  try {
    return format(parseISO(v), "dd/MM");
  } catch {
    return v;
  }
};

export default function Overview() {
  const { lancamento } = useLaunch();
  const { data: funil, loading } = useApi<FunilResp>("/api/funil");
  const { data: midia } = useApi<MidiaResp>("/api/midia");
  const { data: cadastros } = useApi<CadastrosResp>("/api/cadastros");
  const { data: ads } = useApi<AdsResp>("/api/ads");

  if (loading || !funil) return <Loading />;

  const etapaMap = Object.fromEntries(funil.etapas.map((e) => [e.key, e]));
  const cadastrosTotal = etapaMap.cadastros?.total ?? 0;
  const privado = etapaMap.privado?.total ?? 0;
  const grupos = etapaMap.grupos?.total ?? 0;
  const gasto = midia?.totais.gasto ?? 0;
  const receita = funil.receita;

  const convGrupo =
    cadastrosTotal > 0 ? (grupos / cadastrosTotal) * 100 : 0;

  return (
    <div>
      <PageHeader
        title="Visão Geral"
        accent="Lara Castilho"
        subtitle={`Lançamento ${lancamento} `}
      />

      {/* KPIs principais */}
      <div className="kpi-grid mb-6">
        <KpiCard
          title="Cadastros"
          value={formatInt(cadastrosTotal)}
          subtitle="Leads na página de captação"
          color="#86e0a3"
        />
        <KpiCard
          title="No Privado"
          value={formatInt(privado)}
          subtitle={
            cadastrosTotal > 0
              ? `${formatPct((privado / cadastrosTotal) * 100)} dos cadastros`
              : undefined
          }
          color="#53a668"
        />
        <KpiCard
          title="Nos Grupos"
          value={formatInt(grupos)}
          subtitle={
            cadastrosTotal > 0
              ? `${formatPct(convGrupo)} dos cadastros`
              : undefined
          }
          color="#3ea98a"
        />
        <KpiCard
          title="Investido"
          value={formatCurrency(gasto)}
          subtitle={midia?.vazio ? "tráfego ainda não importado" : "em anúncios"}
          color="#53a668"
        />
        <KpiCard
          title="CPL"
          value={gasto > 0 && cadastrosTotal > 0 ? formatCurrency(gasto / cadastrosTotal) : "—"}
          subtitle="Custo por lead (gasto ÷ cadastros)"
          color="#c9a24b"
        />
        <KpiCard
          title="Receita"
          value={formatCurrency(receita)}
          subtitle="Ingressos do workshop (mentoria em breve)"
          color="#075743"
        />
        <KpiCard
          title="ROAS"
          value={gasto > 0 ? `${(receita / gasto).toFixed(2)}x` : "—"}
          subtitle="Retorno sobre o investido"
          color={receita >= gasto && gasto > 0 ? "#3ea98a" : "#e79a86"}
        />
        <KpiCard
          title="Cliques"
          value={formatInt(midia?.totais.clicks ?? 0)}
          subtitle="Nos anúncios"
          color="#53a668"
        />
      </div>

      {/* Funil + cadastros por dia */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card title="Funil do Lançamento">
          <FunnelChart etapas={funil.etapas} />
        </Card>

        <Card title="Cadastros por Dia">
          {cadastros && cadastros.porDia.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart
                data={cadastros.porDia}
                margin={{ left: -18, right: 8, top: 8, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradCad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#86e0a3" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#86e0a3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(133,183,235,0.1)" />
                <XAxis dataKey="data" stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={fmtDia} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} width={30} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15,23,42,0.95)",
                    border: "1px solid rgba(133,183,235,0.2)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  labelFormatter={(v) => fmtDia(String(v))}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  name="Cadastros"
                  stroke="#86e0a3"
                  strokeWidth={2}
                  fill="url(#gradCad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-ink-45 text-sm py-10 text-center">
              Sem cadastros no período.
            </p>
          )}
        </Card>
      </div>

      {/* Melhores criativos e campanhas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card
          title="Melhores Criativos"
          right={
            <span className="text-[10px] text-ink-45 uppercase tracking-wider">
              por leads
            </span>
          }
        >
          <RankList itens={ads?.melhoresCriativos ?? []} cor="#86e0a3" limite={5} />
        </Card>
        <Card
          title="Melhores Campanhas"
          right={
            <span className="text-[10px] text-ink-45 uppercase tracking-wider">
              por leads
            </span>
          }
        >
          <RankList itens={ads?.melhoresCampanhas ?? []} cor="#53a668" limite={5} />
        </Card>
      </div>
    </div>
  );
}
