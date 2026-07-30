"use client";

import { EtapaResultado } from "@/app/api/funil/route";
import { formatInt, formatPct, formatCurrency } from "@/lib/config";
import { EmptyBadge } from "./ui";

export default function FunnelChart({ etapas }: { etapas: EtapaResultado[] }) {
  // base de conversão = a maior etapa disponível (normalmente Lead Page/Cadastros)
  const base = Math.max(
    ...etapas.filter((e) => e.disponivel).map((e) => e.total),
    1
  );

  let anterior: EtapaResultado | null = null;

  return (
    <div className="space-y-2.5">
      {etapas.map((e) => {
        const pctBase = base > 0 ? (e.total / base) * 100 : 0;
        const convAnterior =
          anterior && anterior.total > 0
            ? (e.total / anterior.total) * 100
            : null;
        const largura = e.disponivel ? Math.max(pctBase, e.total > 0 ? 4 : 0) : 0;

        const row = (
          <div key={e.key} className="group">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: e.cor }}
                />
                <span className="text-sm font-medium truncate">{e.label}</span>
                {!e.disponivel && <EmptyBadge>em breve</EmptyBadge>}
              </div>
              <div className="flex items-center gap-3 shrink-0 text-right">
                {convAnterior !== null && e.disponivel && (
                  <span className="text-[10px] text-ink-45">
                    {formatPct(convAnterior)} do anterior
                  </span>
                )}
                <span className="text-sm font-bold tabular-nums">
                  {e.disponivel ? formatInt(e.total) : "—"}
                </span>
              </div>
            </div>

            <div className="h-7 rounded-lg bg-inner overflow-hidden relative">
              <div
                className="funnel-bar h-full rounded-lg flex items-center px-2"
                style={{
                  width: `${largura}%`,
                  background: `linear-gradient(90deg, ${e.cor}cc, ${e.cor}66)`,
                  minWidth: e.disponivel && e.total > 0 ? 40 : 0,
                }}
              >
                {e.venda && e.valor > 0 && (
                  <span className="text-[10px] font-semibold text-ink/90 whitespace-nowrap">
                    {formatCurrency(e.valor)}
                  </span>
                )}
              </div>
            </div>
            <p className="text-[10px] text-ink-40 mt-0.5">{e.descricao}</p>
          </div>
        );

        if (e.disponivel) anterior = e;
        return row;
      })}
    </div>
  );
}
