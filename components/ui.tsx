"use client";

import { ReactNode } from "react";

/**
 * Card métrico — §3.3 do guia Mete Marcha.
 *
 * `color` é semântico, não decorativo (§1.3): coral só em dinheiro gasto,
 * dourado só em custo unitário, verde no resto.
 */
export function KpiCard({
  title,
  value,
  subtitle,
  color = "#86e0a3",
  destaque = false,
}: {
  title: string;
  value: string;
  subtitle?: string;
  color?: string;
  /** Card de destaque do grid — no máximo 1 por grid (§3.3). */
  destaque?: boolean;
}) {
  return (
    <div className={`card p-3 sm:p-4 ${destaque ? "card-raised" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-ink-45 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.09em] truncate mr-2">
          {title}
        </p>
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
          style={{ background: `${color}26` }}
        >
          <span className="w-2 h-2 rounded-full" style={{ background: color }} />
        </span>
      </div>
      <p
        className="text-base sm:text-xl lg:text-2xl font-bold tracking-tight truncate"
        style={{ color }}
      >
        {value}
      </p>
      {subtitle && (
        <p className="text-ink-40 text-[9px] sm:text-[11px] mt-1 leading-tight truncate">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/** Painel de conteúdo — §3.7. A barra vertical verde marca o título. */
export function Card({
  title,
  children,
  right,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card p-4 sm:p-5 ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between mb-4 gap-3">
          {title && (
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-1 h-5 rounded-[3px] bg-accent shrink-0" />
              <h2 className="text-sm sm:text-base font-bold text-ink truncate">
                {title}
              </h2>
            </div>
          )}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

/** Cabeçalho de página — §3.1. O kicker manuscrito é o único uso do marker. */
export function PageHeader({
  title,
  subtitle,
  accent,
  kicker = "Mete Marcha",
}: {
  title: string;
  subtitle?: string;
  accent?: string;
  kicker?: string;
}) {
  return (
    <div className="mb-6">
      {kicker && (
        <p className="marker text-accent text-xs sm:text-sm mb-1">{kicker}</p>
      )}
      <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight uppercase text-ink">
        {title} {accent && <span className="text-accent-bright">{accent}</span>}
      </h1>
      {subtitle && (
        <p className="text-ink-45 text-xs sm:text-sm mt-1">{subtitle}</p>
      )}
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent" />
    </div>
  );
}

/** Etapa sem tabela ainda, ou dado ausente — §3.9. Dourado = atenção, não erro. */
export function EmptyBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.09em] text-gold bg-gold/10 border border-gold/20 rounded-full px-2 py-0.5">
      {children}
    </span>
  );
}

/** Nota / callout — §3.9. */
export function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[10px] border border-card border-l-[3px] border-l-accent bg-accent/5 px-4 py-3">
      <span className="w-[7px] h-[7px] rounded-full bg-accent shrink-0" />
      <p className="text-sm text-ink-60">{children}</p>
    </div>
  );
}
