interface ConversionCardProps {
  label: string
  value: number
  from: string
  to: string
  loading?: boolean
}

function getColor(val: number) {
  if (val >= 80) return { bar: 'bg-emerald-500', text: 'text-emerald-400' }
  if (val >= 50) return { bar: 'bg-yellow-500', text: 'text-yellow-400' }
  return { bar: 'bg-red-500', text: 'text-red-400' }
}

export default function ConversionCard({ label, value, from, to, loading }: ConversionCardProps) {
  const c = getColor(value)
  return (
    <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-4">
      <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide mb-3">{label}</p>
      {loading ? (
        <div className="h-8 w-20 shimmer rounded mb-3" />
      ) : (
        <p className={`text-3xl font-bold mb-3 ${c.text}`}>{value.toFixed(1)}%</p>
      )}
      {/* Progress bar */}
      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-3">
        {!loading && (
          <div
            className={`h-full ${c.bar} rounded-full transition-all duration-700`}
            style={{ width: `${Math.min(value, 100)}%` }}
          />
        )}
      </div>
      <div className="flex justify-between text-[10px] text-zinc-500">
        <span>{from}</span>
        <span className="text-zinc-600">→</span>
        <span>{to}</span>
      </div>
    </div>
  )
}
