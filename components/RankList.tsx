"use client";

import { RankItem } from "@/app/api/ads/route";
import { formatCurrency, formatInt } from "@/lib/config";

export default function RankList({
  itens,
  cor = "#53a668",
  limite = 8,
  emptyText = "Sem atribuição de campanha/anúncio ainda.",
}: {
  itens: RankItem[];
  cor?: string;
  limite?: number;
  emptyText?: string;
}) {
  const lista = itens.slice(0, limite);
  const max = Math.max(...lista.map((i) => i.leads), 1);

  if (!lista.length)
    return (
      <p className="text-ink-45 text-sm py-6 text-center">{emptyText}</p>
    );

  return (
    <div className="space-y-3">
      {lista.map((i, idx) => (
        <div key={i.nome}>
          <div className="flex items-center justify-between mb-1 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] text-ink-45 w-4 shrink-0">
                {idx + 1}º
              </span>
              <span className="text-xs text-ink-70 truncate">{i.nome}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0 text-right">
              {i.gasto > 0 && (
                <span className="text-[10px] text-ink-45 whitespace-nowrap">
                  {formatCurrency(i.gasto)}
                  {i.cpl > 0 && ` · CPL ${formatCurrency(i.cpl)}`}
                </span>
              )}
              <span className="text-xs font-bold tabular-nums whitespace-nowrap">
                {formatInt(i.leads)} leads
              </span>
            </div>
          </div>
          <div className="h-2 rounded-full bg-inner overflow-hidden">
            <div
              className="funnel-bar h-full rounded-full"
              style={{ width: `${(i.leads / max) * 100}%`, background: cor, minWidth: 6 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
