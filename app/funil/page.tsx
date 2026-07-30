"use client";

import { useApi } from "@/lib/useApi";
import { useLaunch } from "@/components/LaunchContext";
import { EtapaResultado } from "@/app/api/funil/route";
import FunnelChart from "@/components/FunnelChart";
import { Card, PageHeader, Loading } from "@/components/ui";
import { formatInt } from "@/lib/config";

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

      {/* "Cadastros por página" ficou de fora a pedido — não é decisão que o
          time toma por aqui. Dispositivo também: a coluna não existe neste
          projeto do Supabase. */}
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
