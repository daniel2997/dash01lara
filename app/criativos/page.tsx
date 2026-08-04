"use client";

import { useApi } from "@/lib/useApi";
import { useLaunch } from "@/components/LaunchContext";
import { Card, PageHeader, Loading, EmptyBadge } from "@/components/ui";
import { formatCurrency, formatInt, formatPct } from "@/lib/config";
import { getDriveLink } from "@/lib/criativos";
import { useState } from "react";
import type { DiagnosticoCriativo } from "@/app/api/diagnostico-criativos/route";

interface Resp {
  criativos: DiagnosticoCriativo[];
}

// --- Color thresholds based on the traffic manager's framework ---

type Nivel = "red" | "yellow" | "green" | "fire";

const CORES: Record<Nivel, string> = {
  red: "bg-red-500/20 text-red-400",
  yellow: "bg-yellow-500/20 text-yellow-400",
  green: "bg-emerald-500/20 text-emerald-400",
  fire: "bg-blue-500/20 text-blue-300",
};

const LABELS: Record<Nivel, string> = {
  red: "Fraco",
  yellow: "Medio",
  green: "Bom",
  fire: "Excelente",
};

function getNivel(value: number | null, ranges: { red: number; yellow: number; green: number }): Nivel | null {
  if (value === null) return null;
  if (value < ranges.red) return "red";
  if (value < ranges.yellow) return "yellow";
  if (value < ranges.green) return "green";
  return "fire";
}

const THRESHOLDS = {
  hookRate:       { red: 20, yellow: 30, green: 40 },   // ThruPlay / impressoes %
  retencaoHook:   { red: 30, yellow: 45, green: 60 },   // ThruPlay / video starts %
  retencaoBody:   { red: 10, yellow: 15, green: 25 },   // p75 / ThruPlay %
  ctr:            { red: 0.8, yellow: 1.2, green: 2 },  // clicks / impressoes %
  conversaoCta:   { red: 10, yellow: 20, green: 35 },   // clicks / p75 %
  carregamento:   { red: 60, yellow: 75, green: 85 },   // lpv / clicks %
  conversaoPagina:{ red: 20, yellow: 35, green: 50 },   // leads / lpv %
};

function MetricCell({ value, metric, suffix = "%" }: { value: number | null; metric: keyof typeof THRESHOLDS; suffix?: string }) {
  if (value === null) return <td className="text-center text-ink-30 px-2 py-2">—</td>;
  const nv = getNivel(value, THRESHOLDS[metric]);
  return (
    <td className="text-center px-2 py-2">
      <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold ${nv ? CORES[nv] : ""}`}>
        {value.toFixed(1)}{suffix}
      </span>
    </td>
  );
}

// Diagnosis logic based on the framework
function getDiagnostico(c: DiagnosticoCriativo): { texto: string; tipo: "hook" | "body" | "cta" | "page" | "load" | "ok" } | null {
  const hr = c.hookRate;
  const rb = c.retencaoBody;
  const ctr = c.ctr;
  const car = c.carregamento;
  const cp = c.conversaoPagina;

  if (hr !== null && hr < 20) return { texto: "Hook fraco — testar novas aberturas", tipo: "hook" };
  if (hr !== null && hr >= 30 && rb !== null && rb < 10) return { texto: "Hook bom, body nao entrega — refazer desenvolvimento", tipo: "body" };
  if (rb !== null && rb >= 10 && ctr !== null && ctr < 0.8) return { texto: "Assistem mas nao clicam — revisar CTA/oferta", tipo: "cta" };
  if (ctr !== null && ctr >= 0.8 && car !== null && car < 60) return { texto: "Clicam mas pagina nao carrega — checar LP", tipo: "load" };
  if (car !== null && car >= 75 && cp !== null && cp < 20) return { texto: "Pagina nao converte — revisar headline/form", tipo: "page" };
  return null;
}

const DIAG_CORES: Record<string, string> = {
  hook: "border-red-500/30 bg-red-500/5 text-red-400",
  body: "border-yellow-500/30 bg-yellow-500/5 text-yellow-400",
  cta: "border-orange-500/30 bg-orange-500/5 text-orange-400",
  load: "border-purple-500/30 bg-purple-500/5 text-purple-400",
  page: "border-blue-500/30 bg-blue-500/5 text-blue-400",
};

export default function CriativosPage() {
  const { lancamento } = useLaunch();
  const { data, loading } = useApi<Resp>("/api/diagnostico-criativos");
  const [expandido, setExpandido] = useState(false);

  if (loading || !data) return <Loading />;

  const criativos = data.criativos;
  const visiveis = expandido ? criativos : criativos.slice(0, 10);

  return (
    <div>
      <PageHeader
        title="Diagnostico de Criativos"
        subtitle={`Analise de funil por anuncio · ${lancamento}`}
      />

      {criativos.length === 0 && (
        <div className="card p-4 mb-6 flex items-center gap-3">
          <EmptyBadge>sem dados</EmptyBadge>
          <p className="text-sm text-ink-60">
            Nenhum criativo com dados de video suficientes para este lancamento.
          </p>
        </div>
      )}

      {criativos.length > 0 && criativos[0].usandoProxy && (
        <div className="card p-3 mb-4 flex items-center gap-2 border-l-[3px] border-l-yellow-500/50 bg-yellow-500/5">
          <span className="text-yellow-400 text-xs font-semibold">PROXY</span>
          <p className="text-[11px] text-ink-60">
            Hook Rate usando ThruPlay (15s) como proxy. Dados de 3s serao populados automaticamente nas proximas execucoes do n8n.
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {(["red", "yellow", "green", "fire"] as Nivel[]).map((n) => (
          <span key={n} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${CORES[n]}`}>
            <span className={`w-2 h-2 rounded-full ${n === "red" ? "bg-red-400" : n === "yellow" ? "bg-yellow-400" : n === "green" ? "bg-emerald-400" : "bg-blue-300"}`} />
            {LABELS[n]}
          </span>
        ))}
      </div>

      <Card title="Funil por Criativo" className="mb-6">
        <div style={{ overflowX: "auto" }}>
          <table className="w-full text-xs sm:text-sm" style={{ minWidth: 900 }}>
            <thead>
              <tr className="text-ink-60 border-b border-card">
                <th className="text-left py-2 px-2 sticky left-0 bg-card z-10">Criativo</th>
                <th className="text-right py-2 px-2">Gasto</th>
                <th className="text-right py-2 px-2">Impr.</th>
                <th className="text-center py-2 px-2" title="ThruPlay / Impressoes">
                  <div className="leading-tight">Hook Rate</div>
                  <div className="text-[9px] text-ink-40 font-normal">ThruPlay/Impr</div>
                </th>
                <th className="text-center py-2 px-2" title="ThruPlay / Video Starts">
                  <div className="leading-tight">Ret. Hook</div>
                  <div className="text-[9px] text-ink-40 font-normal">ThruPlay/Starts</div>
                </th>
                <th className="text-center py-2 px-2" title="p75 / ThruPlay">
                  <div className="leading-tight">Ret. Body</div>
                  <div className="text-[9px] text-ink-40 font-normal">p75/ThruPlay</div>
                </th>
                <th className="text-center py-2 px-2" title="Clicks / Impressoes">
                  <div className="leading-tight">CTR Link</div>
                  <div className="text-[9px] text-ink-40 font-normal">Clicks/Impr</div>
                </th>
                <th className="text-center py-2 px-2" title="Clicks / p75">
                  <div className="leading-tight">Conv. CTA</div>
                  <div className="text-[9px] text-ink-40 font-normal">Clicks/p75</div>
                </th>
                <th className="text-center py-2 px-2" title="LPV / Clicks">
                  <div className="leading-tight">Carreg.</div>
                  <div className="text-[9px] text-ink-40 font-normal">LPV/Clicks</div>
                </th>
                <th className="text-center py-2 px-2" title="Leads / LPV">
                  <div className="leading-tight">Conv. Pag.</div>
                  <div className="text-[9px] text-ink-40 font-normal">Leads/LPV</div>
                </th>
                <th className="text-right py-2 px-2">Leads</th>
                <th className="text-right py-2 px-2">CPL</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((c) => {
                const driveLink = getDriveLink(c.nome);
                const diag = getDiagnostico(c);
                return (
                  <tr key={c.nome} className="border-b border-card/40 hover:bg-row group">
                    <td className="py-2 px-2 max-w-[180px] sticky left-0 bg-card z-10">
                      <div className="truncate font-medium">
                        {driveLink ? (
                          <a href={driveLink} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                            {c.nome}
                          </a>
                        ) : (
                          c.nome
                        )}
                      </div>
                      {diag && (
                        <div className={`mt-1 text-[10px] leading-tight px-1.5 py-0.5 rounded border ${DIAG_CORES[diag.tipo]}`}>
                          {diag.texto}
                        </div>
                      )}
                    </td>
                    <td className="text-right py-2 px-2 whitespace-nowrap text-ink-60">{formatCurrency(c.gasto)}</td>
                    <td className="text-right py-2 px-2 text-ink-60">{formatInt(c.impressoes)}</td>
                    <MetricCell value={c.hookRate} metric="hookRate" />
                    <MetricCell value={c.retencaoHook} metric="retencaoHook" />
                    <MetricCell value={c.retencaoBody} metric="retencaoBody" />
                    <MetricCell value={c.ctr} metric="ctr" />
                    <MetricCell value={c.conversaoCta} metric="conversaoCta" />
                    <MetricCell value={c.carregamento} metric="carregamento" />
                    <MetricCell value={c.conversaoPagina} metric="conversaoPagina" />
                    <td className="text-right py-2 px-2 font-semibold">{formatInt(c.leads)}</td>
                    <td className="text-right py-2 px-2 whitespace-nowrap text-ink-60">
                      {c.cpl !== null ? formatCurrency(c.cpl) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {criativos.length > 10 && (
          <button
            onClick={() => setExpandido((v) => !v)}
            className="mt-3 text-xs text-accent hover:underline"
          >
            {expandido ? "Ver menos" : `Ver todos (${criativos.length})`}
          </button>
        )}
      </Card>

      {/* Interpretation guide */}
      <Card title="Como interpretar" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-ink-60">
          <div>
            <p className="font-semibold text-ink mb-1">Regua de referencia</p>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-ink-45">
                  <th className="text-left py-1">Metrica</th>
                  <th className="text-center py-1">Fraco</th>
                  <th className="text-center py-1">Medio</th>
                  <th className="text-center py-1">Bom</th>
                  <th className="text-center py-1">Top</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Hook Rate", "<20%", "20-29%", "30-39%", "40%+"],
                  ["Ret. Hook", "<30%", "30-44%", "45-59%", "60%+"],
                  ["Ret. Body", "<10%", "10-14%", "15-25%", ">25%"],
                  ["CTR Link", "<0.8%", "0.8-1.2%", "1.2-2%", ">2%"],
                  ["Conv. CTA", "<10%", "10-19%", "20-35%", ">35%"],
                  ["Carregam.", "<60%", "60-74%", "75-84%", "85%+"],
                  ["Conv. Pag.", "<20%", "20-34%", "35-49%", "50%+"],
                ].map(([label, ...vals]) => (
                  <tr key={label} className="border-t border-card/30">
                    <td className="py-1 text-ink-80">{label}</td>
                    {vals.map((v, i) => (
                      <td key={i} className={`text-center py-1 ${
                        i === 0 ? "text-red-400" : i === 1 ? "text-yellow-400" : i === 2 ? "text-emerald-400" : "text-blue-300"
                      }`}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <p className="font-semibold text-ink mb-1">Regra principal</p>
            <p className="leading-relaxed">
              Se o resultado final esta ruim, procure a <span className="text-red-400 font-semibold">primeira etapa vermelha</span>.
              Se o resultado final esta bom, nao pause o criativo apenas porque uma metrica intermediaria esta baixa.
            </p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li><span className="text-red-400">Hook fraco</span> — teste novas aberturas (imagem, frase, texto na tela)</li>
              <li><span className="text-yellow-400">Hook bom + Body fraco</span> — mantenha hook, refaca desenvolvimento</li>
              <li><span className="text-orange-400">Assistem + nao clicam</span> — revise CTA, oferta, urgencia</li>
              <li><span className="text-purple-400">Clicam + nao carrega</span> — cheque velocidade da LP, pixel, redirect</li>
              <li><span className="text-blue-400">Carrega + nao converte</span> — revise headline, formulario, provas</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
