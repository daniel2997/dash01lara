// Card métrico — §3.3 do guia Mete Marcha.
// `tone` é semântico, não decorativo: coral só em dinheiro gasto, dourado só em custo unitário (§1.3).
export type Tone = 'default' | 'good' | 'bad' | 'spend' | 'cost'

interface KPICardProps {
  label: string
  value: string
  sub?: string
  tone?: Tone
  /** Card de destaque do grid — no máximo 1 por grid (§3.3). */
  highlight?: boolean
  loading?: boolean
}

export const toneClass: Record<Tone, string> = {
  default: 'text-ink',
  good: 'text-accent-bright',
  bad: 'text-coral',
  spend: 'text-coral',
  cost: 'text-gold',
}

export default function KPICard({
  label, value, sub, tone = 'default', highlight, loading,
}: KPICardProps) {
  return (
    <div
      className={`rounded-[14px] px-5 py-[18px] border ${
        highlight
          ? 'bg-surface-raised border-strong'
          : 'bg-surface border-card'
      }`}
    >
      <p
        className={`text-[11px] font-semibold uppercase tracking-[0.09em] mb-2 ${
          highlight ? 'text-[rgba(134,224,163,0.7)]' : 'text-ink-45'
        }`}
      >
        {label}
      </p>
      {loading ? (
        <div className="h-7 w-24 shimmer rounded" />
      ) : (
        <p className={`text-[28px] leading-none font-bold tracking-tight ${toneClass[tone]}`}>
          {value}
        </p>
      )}
      {sub && !loading && <p className="text-xs text-ink-45 mt-2">{sub}</p>}
    </div>
  )
}
