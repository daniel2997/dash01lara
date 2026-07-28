import { toneClass, type Tone } from './KPICard'

// Linha de pills para taxas e custos derivados — §3.4 do guia.
export function PillRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2.5">{children}</div>
}

interface PillProps {
  label: string
  value: string
  tone?: Tone
  loading?: boolean
}

export default function Pill({ label, value, tone = 'default', loading }: PillProps) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-[rgba(83,166,104,0.16)] bg-[rgba(83,166,104,0.06)] px-[18px] py-[9px]">
      <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-45">
        {label}
      </span>
      {loading ? (
        <span className="h-3.5 w-12 shimmer rounded" />
      ) : (
        <span className={`text-sm font-bold ${toneClass[tone]}`}>{value}</span>
      )}
    </div>
  )
}
