"use client";

import { useState } from "react";
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
  totais: { gasto: number; leads: number; cpl: number; clicks: number; lpv: number };
}
interface CadastrosResp {
  total: number;
  porDia: { data: string; total: number }[];
}
interface AdsResp {
  melhoresCampanhas: RankItem[];
  melhoresCriativos: RankItem[];
}
interface DiarioResp {
  dias: { dia: string; gasto: number; leads: number; privado: number; grupos: number; compras: number; receita: number; mentoria: number; receita_mentoria: number }[];
}
interface VendaRankItem {
  nome: string;
  leads: number;
  vendas: number;
  receita: number;
}
interface RegiaoItem {
  estado: string;
  leads: number;
  vendas: number;
  conv_pct: number;
}
interface VendasRankResp {
  porCampanha: VendaRankItem[];
  porCriativo: VendaRankItem[];
  porRegiao: RegiaoItem[];
}

const fmtDia = (v: string) => {
  try {
    return format(parseISO(v), "dd/MM");
  } catch {
    return v;
  }
};

function RegioesTable({ regioes }: { regioes: RegiaoItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const show = expanded ? regioes : regioes.slice(0, 8);
  return (
    <Card title="Vendas por Estado" className="mb-6">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-ink-45 text-[10px] uppercase tracking-[0.09em] border-b border-chrome">
              <th className="text-left py-2 pr-3">Estado</th>
              <th className="text-right py-2 px-3">Leads</th>
              <th className="text-right py-2 px-3">Vendas</th>
              <th className="text-right py-2 pl-3">Conv %</th>
            </tr>
          </thead>
          <tbody>
            {show.map((r) => (
              <tr key={r.estado} className="border-b border-chrome/50 hover:bg-white/[0.02]">
                <td className="py-2 pr-3 font-semibold text-ink">{r.estado}</td>
                <td className="py-2 px-3 text-right tabular-nums" style={{ color: "#86e0a3" }}>{formatInt(r.leads)}</td>
                <td className="py-2 px-3 text-right tabular-nums" style={{ color: "#2f6f5c" }}>{formatInt(r.vendas)}</td>
                <td className="py-2 pl-3 text-right tabular-nums font-semibold" style={{ color: r.conv_pct >= 3 ? "#3ea98a" : "#e79a86" }}>{r.conv_pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {regioes.length > 8 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full text-center text-xs text-accent hover:text-ink mt-3 py-1.5"
        >
          {expanded ? "Ver menos ▲" : `Ver todos (${regioes.length}) ▼`}
        </button>
      )}
    </Card>
  );
}

export default function Overview() {
  const { lancamento } = useLaunch();
  const { data: funil, loading } = useApi<FunilResp>("/api/funil");
  const { data: midia } = useApi<MidiaResp>("/api/midia");
  const { data: cadastros } = useApi<CadastrosResp>("/api/cadastros");
  const { data: ads } = useApi<AdsResp>("/api/ads");
  const { data: diario } = useApi<DiarioResp>("/api/funil-diario");
  const { data: vendasRank } = useApi<VendasRankResp>("/api/vendas-rank");

  if (loading || !funil) return <Loading />;

  const etapaMap = Object.fromEntries(funil.etapas.map((e) => [e.key, e]));
  const cadastrosTotal = etapaMap.cadastros?.total ?? 0;
  const privado = etapaMap.privado?.total ?? 0;
  const grupos = etapaMap.grupos?.total ?? 0;
  const gasto = midia?.totais.gasto ?? 0;
  const receita = funil.receita;

  const vendas = etapaMap.workshop?.total ?? 0;
  const convGrupo =
    cadastrosTotal > 0 ? (grupos / cadastrosTotal) * 100 : 0;
  const convGrupoVenda = grupos > 0 ? (vendas / grupos) * 100 : 0;
  const cpa = vendas > 0 ? gasto / vendas : 0;

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
          subtitle="Workshop + Mentoria"
          color="#075743"
        />
        <KpiCard
          title="ROAS"
          value={gasto > 0 ? `${(receita / gasto).toFixed(2)}x` : "—"}
          subtitle="Retorno sobre o investido"
          color={receita >= gasto && gasto > 0 ? "#3ea98a" : "#e79a86"}
        />
        <KpiCard
          title="CPA"
          value={cpa > 0 ? formatCurrency(cpa) : "—"}
          subtitle="Custo por aquisição (gasto ÷ vendas)"
          color="#e79a86"
        />
        <KpiCard
          title="Grupo → Venda"
          value={grupos > 0 ? formatPct(convGrupoVenda) : "—"}
          subtitle={`${formatInt(vendas)} vendas de ${formatInt(grupos)} no grupo`}
          color="#2f6f5c"
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

      {/* Funil por Dia (gasto operacional 20:30→20:30) */}
      {diario?.dias && diario.dias.length > 0 && (
        <Card title="Funil por Dia de Captação" className="mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-ink-45 text-[10px] uppercase tracking-[0.09em] border-b border-chrome">
                  <th className="text-left py-2 pr-3">Dia</th>
                  <th className="text-right py-2 px-3">Gasto</th>
                  <th className="text-right py-2 px-3">Leads</th>
                  <th className="text-right py-2 px-3">Privado</th>
                  <th className="text-right py-2 px-3">Grupo</th>
                  <th className="text-right py-2 px-3">Compras</th>
                  <th className="text-right py-2 px-3">Mentoria</th>
                  <th className="text-right py-2 pl-3">Receita</th>
                </tr>
              </thead>
              <tbody>
                {diario.dias.map((d) => (
                  <tr key={d.dia} className="border-b border-chrome/50 hover:bg-white/[0.02]">
                    <td className="py-2.5 pr-3 font-semibold text-ink">{fmtDia(d.dia)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: "#e79a86" }}>{formatCurrency(d.gasto)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: "#86e0a3" }}>{formatInt(d.leads)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: "#53a668" }}>{formatInt(d.privado)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: "#3ea98a" }}>{formatInt(d.grupos)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: "#2f6f5c" }}>{formatInt(d.compras)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: "#075743" }}>{formatInt(d.mentoria || 0)}</td>
                    <td className="py-2.5 pl-3 text-right tabular-nums font-semibold" style={{ color: "#86e0a3" }}>{formatCurrency(d.receita + (d.receita_mentoria || 0))}</td>
                  </tr>
                ))}
                <tr className="font-bold text-ink">
                  <td className="py-2.5 pr-3">Total</td>
                  <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: "#e79a86" }}>{formatCurrency(diario.dias.reduce((s, d) => s + d.gasto, 0))}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: "#86e0a3" }}>{formatInt(diario.dias.reduce((s, d) => s + d.leads, 0))}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: "#53a668" }}>{formatInt(diario.dias.reduce((s, d) => s + d.privado, 0))}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: "#3ea98a" }}>{formatInt(diario.dias.reduce((s, d) => s + d.grupos, 0))}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: "#2f6f5c" }}>{formatInt(diario.dias.reduce((s, d) => s + d.compras, 0))}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: "#075743" }}>{formatInt(diario.dias.reduce((s, d) => s + (d.mentoria || 0), 0))}</td>
                  <td className="py-2.5 pl-3 text-right tabular-nums font-semibold" style={{ color: "#86e0a3" }}>{formatCurrency(diario.dias.reduce((s, d) => s + d.receita + (d.receita_mentoria || 0), 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Vendas por campanha e criativo */}
      {vendasRank && (vendasRank.porCampanha.length > 0 || vendasRank.porCriativo.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <Card
            title="Vendas por Campanha"
            right={<span className="text-[10px] text-ink-45 uppercase tracking-wider">leads → vendas</span>}
          >
            <div className="space-y-3">
              {(vendasRank.porCampanha ?? []).slice(0, 10).map((item) => {
                const max = vendasRank.porCampanha[0]?.leads || 1;
                const conv = item.leads > 0 ? ((item.vendas / item.leads) * 100).toFixed(1) : "0";
                return (
                  <div key={item.nome}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="truncate mr-2 text-ink-70">{item.nome}</span>
                      <span className="font-semibold tabular-nums shrink-0">
                        {formatInt(item.leads)} leads → {item.vendas} vendas ({conv}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-inner overflow-hidden relative">
                      <div
                        className="h-full rounded-full absolute"
                        style={{ width: `${(item.leads / max) * 100}%`, background: "#86e0a3", opacity: 0.3 }}
                      />
                      <div
                        className="h-full rounded-full absolute"
                        style={{ width: `${(item.vendas / max) * 100}%`, background: "#2f6f5c", minWidth: 6 }}
                      />
                    </div>
                    <div className="text-[10px] text-ink-45 mt-0.5">{formatCurrency(item.receita)}</div>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card
            title="Vendas por Criativo"
            right={<span className="text-[10px] text-ink-45 uppercase tracking-wider">leads → vendas</span>}
          >
            <div className="space-y-3">
              {(vendasRank.porCriativo ?? []).slice(0, 10).map((item) => {
                const max = vendasRank.porCriativo[0]?.leads || 1;
                const conv = item.leads > 0 ? ((item.vendas / item.leads) * 100).toFixed(1) : "0";
                return (
                  <div key={item.nome}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="truncate mr-2 text-ink-70">{item.nome}</span>
                      <span className="font-semibold tabular-nums shrink-0">
                        {formatInt(item.leads)} leads → {item.vendas} vendas ({conv}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-inner overflow-hidden relative">
                      <div
                        className="h-full rounded-full absolute"
                        style={{ width: `${(item.leads / max) * 100}%`, background: "#86e0a3", opacity: 0.3 }}
                      />
                      <div
                        className="h-full rounded-full absolute"
                        style={{ width: `${(item.vendas / max) * 100}%`, background: "#075743", minWidth: 6 }}
                      />
                    </div>
                    <div className="text-[10px] text-ink-45 mt-0.5">{formatCurrency(item.receita)}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Vendas por Região */}
      {vendasRank?.porRegiao && vendasRank.porRegiao.length > 0 && (
        <RegioesTable regioes={vendasRank.porRegiao} />
      )}

      {/* Melhores criativos e campanhas por leads */}
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
