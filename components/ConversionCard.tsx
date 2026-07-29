// Card de etapa — §3.5 do guia.
// Escada de verdes (§1.2): do mais escuro/frio ao mais claro conforme avança a etapa.
export const STEP_COLORS = ['#2f6f5c', '#53a668', '#3ea98a', '#86e0a3']

interface ConversionCardProps {
  label: string
  /** Volume da etapa. */
  value: string
  /** Conversão vs. a etapa anterior. Ausente na primeira etapa e quando a
   *  RPC não consegue calcular (denominador zero). */
  pct?: number | null
  /** O que a etapa mede. */
  desc: string
  /** Posição na escada de verdes. */
  step?: number
  loading?: boolean
}

export default function ConversionCard({
  label, value, pct, desc, step = 0, loading,
}: ConversionCardProps) {
  const dot = STEP_COLORS[step % STEP_COLORS.length]
  // Acima de 100% a etapa tem mais gente que a anterior — o funil não fecha.
  // É anomalia de dado, não performance: sinaliza em coral em vez de verde.
  const anomalo = pct != null && pct > 100
  // Verde = taxa boa, coral = taxa ruim (§1.3). Sem escala intermediária.
  const good = !anomalo && (pct ?? 0) >= 50

  return (
    <div className="bg-surface border border-card rounded-2xl p-[22px]">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ background: dot, boxShadow: `0 0 10px ${dot}` }}
          />
          <span className="text-xs font-bold uppercase tracking-[0.08em] text-ink-70 truncate">
            {label}
          </span>
        </div>
        {pct != null && !loading && (
          <span
            className="flex-shrink-0 rounded-md px-2.5 py-[3px] text-xs font-bold"
            style={
              good
                ? { color: '#86e0a3', background: 'rgba(83,166,104,0.14)' }
                : { color: '#e79a86', background: 'rgba(231,154,134,0.12)' }
            }
            title={anomalo ? 'Acima de 100%: esta etapa tem mais registros que a anterior' : undefined}
          >
            {anomalo && '⚠ '}{pct.toFixed(1)}%
          </span>
        )}
      </div>

      {loading ? (
        <div className="h-10 w-28 shimmer rounded" />
      ) : (
        <p className="text-[40px] leading-none font-extrabold tracking-[-0.02em] text-ink">
          {value}
        </p>
      )}

      <p className="mt-[14px] pt-[14px] border-t border-inner text-[13px] text-ink-45">
        {desc}
      </p>
    </div>
  )
}
