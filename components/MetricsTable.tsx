'use client'
import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

// Painel de tabela — §3.7 do guia. Badge de rank — §3.8.

/** Cor da célula pelo significado da coluna (§1.3), nunca por decoração. */
export type ColTone = 'default' | 'muted' | 'strong' | 'good' | 'accent' | 'spend' | 'spendAcc' | 'cost' | 'costAcc'

const colToneClass: Record<ColTone, string> = {
  default: 'text-ink-70',
  muted: 'text-ink-45',
  strong: 'text-ink font-semibold',
  good: 'text-accent-bright font-semibold',
  accent: 'text-accent font-semibold',
  spend: 'text-coral font-bold',
  spendAcc: 'text-coral-soft',
  cost: 'text-gold',
  costAcc: 'text-gold-soft',
}

export interface Column<T> {
  key: keyof T
  label: string
  format?: (v: any) => string
  align?: 'left' | 'right'
  tone?: ColTone
  /** Trunca nomes longos com ellipsis (§3.7). */
  truncate?: boolean
}

interface Total {
  label?: string
  values: Record<string, string>
}

interface MetricsTableProps<T> {
  title: string
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  maxRows?: number
  /** Badge de rank na primeira coluna (§3.8). */
  ranked?: boolean
  /** Totais exibidos no header do painel. */
  totals?: Array<{ label: string; value: string; tone?: ColTone }>
  /** Linha de total ao pé da tabela. */
  totalRow?: Total
}

function RankBadge({ rank }: { rank: number }) {
  const base = 'w-[26px] h-[26px] rounded-full flex items-center justify-center text-xs font-extrabold'
  if (rank === 1) {
    return (
      <span
        className={base}
        style={{ background: 'linear-gradient(135deg, #53a668, #86e0a3)', color: '#041008' }}
      >
        1
      </span>
    )
  }
  if (rank <= 3) {
    return <span className={`${base} bg-[rgba(83,166,104,0.18)] text-accent-bright`}>{rank}</span>
  }
  return <span className={`${base} text-ink-40`}>{rank}</span>
}

export default function MetricsTable<T extends Record<string, any>>({
  title, columns, data, loading, maxRows = 10, ranked, totals, totalRow,
}: MetricsTableProps<T>) {
  const [sort, setSort] = useState<{ key: keyof T; dir: 'asc' | 'desc' } | null>(null)
  const [expanded, setExpanded] = useState(false)

  const sorted = [...data].sort((a, b) => {
    if (!sort) return 0
    const av = a[sort.key], bv = b[sort.key]
    const diff = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
    return sort.dir === 'asc' ? diff : -diff
  })

  const visible = expanded ? sorted : sorted.slice(0, maxRows)

  const toggle = (key: keyof T) => {
    setSort(s => !s || s.key !== key ? { key, dir: 'desc' } : s.dir === 'desc' ? { key, dir: 'asc' } : null)
  }

  const colSpan = columns.length + (ranked ? 1 : 0)

  return (
    <section className="bg-surface border border-card rounded-[18px] overflow-hidden">
      {/* Header do painel (§3.7) */}
      <div className="flex items-center justify-between flex-wrap gap-4 px-[26px] py-5">
        <div className="flex items-center gap-3">
          <span className="w-1 h-5 rounded-[3px] bg-accent flex-shrink-0" />
          <h3 className="text-[19px] font-bold text-ink">{title}</h3>
          {loading && (
            <span className="w-3.5 h-3.5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          )}
        </div>
        {totals && totals.length > 0 && !loading && (
          <div className="flex flex-wrap gap-[22px] text-[13px] text-ink-45">
            {totals.map(t => (
              <span key={t.label}>
                {t.label}:{' '}
                <span className={colToneClass[t.tone ?? 'strong']}>{t.value}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b border-head">
              {ranked && (
                <th className="px-[14px] py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-40 w-[52px]">
                  #
                </th>
              )}
              {columns.map(col => (
                <th
                  key={String(col.key)}
                  onClick={() => toggle(col.key)}
                  className={`px-[14px] py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-40 cursor-pointer select-none hover:text-ink-70 transition-colors ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sort?.key === col.key ? (
                      sort.dir === 'desc'
                        ? <ChevronDown size={11} className="text-accent-bright" />
                        : <ChevronUp size={11} className="text-accent-bright" />
                    ) : (
                      <ChevronDown size={11} className="text-[rgba(83,166,104,0.25)]" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-row">
                  {Array.from({ length: colSpan }).map((_, j) => (
                    <td key={j} className="px-[14px] py-3.5">
                      <div className="h-3 shimmer rounded w-20" />
                    </td>
                  ))}
                </tr>
              ))
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-[14px] py-10 text-center text-sm text-ink-45">
                  Nenhum dado encontrado
                </td>
              </tr>
            ) : (
              <>
                {visible.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-row hover:bg-[rgba(83,166,104,0.04)] transition-colors"
                  >
                    {ranked && (
                      <td className="px-[14px] py-3.5">
                        <RankBadge rank={i + 1} />
                      </td>
                    )}
                    {columns.map(col => (
                      <td
                        key={String(col.key)}
                        className={`px-[14px] py-3.5 text-sm ${colToneClass[col.tone ?? 'default']} ${
                          col.align === 'right' ? 'text-right tabular-nums' : ''
                        } ${col.truncate ? 'max-w-[280px] whitespace-nowrap overflow-hidden text-ellipsis' : ''}`}
                        title={col.truncate ? String(row[col.key] ?? '') : undefined}
                      >
                        {col.format ? col.format(row[col.key]) : String(row[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}

                {totalRow && (
                  <tr className="bg-[rgba(83,166,104,0.06)] font-bold">
                    {ranked && <td className="px-[14px] py-3.5" />}
                    {columns.map((col, i) => {
                      const v = totalRow.values[String(col.key)]
                      return (
                        <td
                          key={String(col.key)}
                          className={`px-[14px] py-3.5 text-sm ${
                            v === undefined
                              ? 'text-[rgba(245,255,248,0.35)]'
                              : colToneClass[col.tone ?? 'default']
                          } ${col.align === 'right' ? 'text-right tabular-nums' : ''}`}
                        >
                          {i === 0 && v === undefined ? (totalRow.label ?? 'Total') : (v ?? '--')}
                        </td>
                      )
                    })}
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {!loading && data.length > maxRows && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full py-3 text-[13px] text-ink-45 hover:text-accent-bright border-t border-row transition-colors"
        >
          {expanded ? 'Mostrar menos' : `Ver todos (${data.length})`}
        </button>
      )}
    </section>
  )
}
