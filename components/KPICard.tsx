interface KPICardProps {
  label: string
  value: string
  sub?: string
  color?: 'default' | 'green' | 'red' | 'indigo' | 'yellow'
  loading?: boolean
}

const colors = {
  default: 'text-white',
  green: 'text-emerald-400',
  red: 'text-red-400',
  indigo: 'text-indigo-400',
  yellow: 'text-yellow-400',
}

export default function KPICard({ label, value, sub, color = 'default', loading }: KPICardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-4">
      <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide mb-2">{label}</p>
      {loading ? (
        <div className="h-7 w-24 shimmer rounded" />
      ) : (
        <p className={`text-2xl font-bold tracking-tight ${colors[color]}`}>{value}</p>
      )}
      {sub && !loading && (
        <p className="text-xs text-zinc-500 mt-1">{sub}</p>
      )}
    </div>
  )
}
