"use client";

import { useApi } from "@/lib/useApi";
import { useLaunch } from "@/components/LaunchContext";
import { EtapaResultado } from "@/app/api/funil/route";
import FunnelChart from "@/components/FunnelChart";
import { Card, PageHeader, Loading } from "@/components/ui";
import { formatInt, formatCurrency } from "@/lib/config";

interface FunilResp {
  etapas: EtapaResultado[];
  receita: number;
}
interface CadastrosResp {
  total: number;
  porPagina: Item[];
  porCampanha: Item[];
  porAnuncio: Item[];
  porPlataforma: Item[];
}
interface Item {
  nome: string;
  total: number;
}
interface DiarioResp {
  dias: DiaFunil[];
}
interface DiaFunil {
  dia: string;
  gasto: number;
  leads: number;
  privado: number;
  grupos: number;
  compras: number;
  receita: number;
}

function formatDia(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function BarList({ itens, cor = "#53a668" }: { itens: Item[]; cor?: string }) {
  const max = Math.max(...itens.map((i) => i.total), 1);
  if (!itens.length)
    return <p className="text-ink-45 text-sm py-6 text-center">Sem dados.</p>;
  return (
    <div className="space-y-2">
      {itens.map((i) => (
        <div key={i.nome}>
          <div className="flex justify-between text-xs mb-1">
            <span className="truncate mr-2 text-ink-70">{i.nome}</span>
            <span className="font-semibold tabular-nums shrink-0">
              {formatInt(i.total)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-inner overflow-hidden">
            <div
              className="funnel-bar h-full rounded-full"
              style={{
                width: `${(i.total / max) * 100}%`,
                background: cor,
                minWidth: 6,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FunilPage() {
  const { lancamento } = useLaunch();
  const { data: funil, loading } = useApi<FunilResp>("/api/funil");
  const { data: cad } = useApi<CadastrosResp>("/api/cadastros");
  const { data: diario } = useApi<DiarioResp>("/api/funil-diario");

  if (loading || !funil) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Funil"
        subtitle={`Da captação à mentoria · ${lancamento}`}
      />

      <Card title="Etapas do Funil" className="mb-6">
        <FunnelChart etapas={funil.etapas} />
      </Card>

      {diario?.dias && diario.dias.length > 0 && (
        <Card title="Funil por Dia" className="mb-6">
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
                  <th className="text-right py-2 pl-3">Receita</th>
                </tr>
              </thead>
              <tbody>
                {diario.dias.map((d) => (
                  <tr key={d.dia} className="border-b border-chrome/50 hover:bg-white/[0.02]">
                    <td className="py-2.5 pr-3 font-semibold text-ink">{formatDia(d.dia)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-coral">{formatCurrency(d.gasto)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: "#86e0a3" }}>{formatInt(d.leads)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: "#53a668" }}>{formatInt(d.privado)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: "#3ea98a" }}>{formatInt(d.grupos)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: "#2f6f5c" }}>{formatInt(d.compras)}</td>
                    <td className="py-2.5 pl-3 text-right tabular-nums font-semibold" style={{ color: "#86e0a3" }}>{formatCurrency(d.receita)}</td>
                  </tr>
                ))}
                <tr className="font-bold text-ink">
                  <td className="py-2.5 pr-3">Total</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-coral">{formatCurrency(diario.dias.reduce((s, d) => s + d.gasto, 0))}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: "#86e0a3" }}>{formatInt(diario.dias.reduce((s, d) => s + d.leads, 0))}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: "#53a668" }}>{formatInt(diario.dias.reduce((s, d) => s + d.privado, 0))}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: "#3ea98a" }}>{formatInt(diario.dias.reduce((s, d) => s + d.grupos, 0))}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: "#2f6f5c" }}>{formatInt(diario.dias.reduce((s, d) => s + d.compras, 0))}</td>
                  <td className="py-2.5 pl-3 text-right tabular-nums font-semibold" style={{ color: "#86e0a3" }}>{formatCurrency(diario.dias.reduce((s, d) => s + d.receita, 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Cadastros por Campanha">
          <BarList itens={cad?.porCampanha ?? []} cor="#86e0a3" />
        </Card>
        <Card title="Cadastros por Anúncio">
          <BarList itens={cad?.porAnuncio ?? []} cor="#53a668" />
        </Card>
        <Card title="Plataforma" className="lg:col-span-2">
          <BarList itens={cad?.porPlataforma ?? []} cor="#3ea98a" />
        </Card>
      </div>
    </div>
  );
}
