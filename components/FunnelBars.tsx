// Funil / barras horizontais — §3.6 do guia.
export interface FunnelStep {
  label: string
  value: string
  /** Largura da barra, 0–100. */
  width: number
  /** Conversão vs. a etapa anterior, exibida no badge entre as barras.
   *  null quando a RPC não consegue calcular (denominador zero). */
  pct?: number | null
}

// Gradientes em sequência (§3.6).
const GRADIENTS = [
  'linear-gradient(90deg, #075743, #53a668)',
  'linear-gradient(90deg, #064d3c, #3ea98a)',
  'linear-gradient(90deg, #05402f, #86e0a3)',
  'linear-gradient(90deg, #043528, #b6f0c8)',
]

interface FunnelBarsProps {
  title: string
  sub?: string
  steps: FunnelStep[]
  loading?: boolean
}

export default function FunnelBars({ title, sub, steps, loading }: FunnelBarsProps) {
  return (
    <section className="bg-surface border border-card rounded-[18px] p-[30px]">
      <h2 className="text-[22px] font-bold text-ink">{title}</h2>
      {sub && <p className="text-sm text-ink-45 mt-1">{sub}</p>}

      <div className="mt-6">
        {steps.map((s, i) => (
          <div key={s.label}>
            {i > 0 && s.pct != null && (
              <div className="flex justify-center my-2">
                <span className="rounded-md border border-[rgba(83,166,104,0.2)] bg-[rgba(83,166,104,0.12)] px-2.5 py-[3px] text-xs font-bold text-ink-70">
                  {s.pct.toFixed(1)}%
                </span>
              </div>
            )}
            <div
              className={`h-[62px] rounded-xl px-6 flex items-center justify-between mx-auto ${loading ? '' : 'bar-in'}`}
              style={{
                width: `${Math.max(Math.min(s.width, 100), 6)}%`,
                background: GRADIENTS[i % GRADIENTS.length],
                transformOrigin: i === 0 ? 'left center' : 'center',
                animationDelay: `${i * 0.12}s`,
              }}
            >
              <span className="text-base font-bold text-[#041008] truncate">{s.label}</span>
              {!loading && (
                <span className="text-xl font-extrabold text-[#041008] whitespace-nowrap pl-3">
                  {s.value}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
