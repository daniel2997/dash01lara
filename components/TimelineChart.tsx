'use client'
import {
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { PanelHeading } from './SectionHeader'

// Painel de gráfico — §3.7 (moldura) + §5 (cores de série).
interface TimelineChartProps {
  data: Array<{ dia?: string; data?: string; total?: number; trafego?: number; leads?: number; gasto?: number }>
  mode?: 'leads' | 'campaigns'
}

const AXIS = 'rgba(245,255,248,0.4)'
const GRID = 'rgba(83,166,104,0.08)'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-strong rounded-xl p-3 text-xs">
      <p className="text-ink-45 mb-2 font-semibold">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1 last:mb-0">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-ink-60">{p.name}:</span>
          <span className="text-ink font-bold">
            {p.name === 'Gasto'
              ? `R$ ${Number(p.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
              : Number(p.value).toLocaleString('pt-BR')}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function TimelineChart({ data, mode = 'leads' }: TimelineChartProps) {
  const formatted = data.map(d => ({
    ...d,
    name: (d.dia || d.data || '').slice(5), // show MM-DD
  }))

  return (
    <section className="bg-surface border border-card rounded-[18px] p-[26px]">
      <PanelHeading>
        {mode === 'leads' ? 'Leads ao longo do tempo' : 'Performance diária'}
      </PanelHeading>

      <div className="mt-5">
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              {/* Barras verticais: gradiente 180deg da escada de verdes (§5) */}
              <linearGradient id="barGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#53a668" />
                <stop offset="100%" stopColor="#075743" />
              </linearGradient>
              {/* Dinheiro gasto mantém o coral funcional (§1.3) */}
              <linearGradient id="barCoral" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e79a86" />
                <stop offset="100%" stopColor="rgba(231,154,134,0.35)" />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: AXIS, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: AXIS, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            {mode === 'campaigns' && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: AXIS, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={50}
                tickFormatter={(v) => `R$${v}`}
              />
            )}
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(83,166,104,0.05)' }} />
            <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(245,255,248,0.6)', paddingTop: 12 }} />

            {mode === 'leads' ? (
              <>
                <Bar yAxisId="left" dataKey="total" name="Total" fill="url(#barGreen)" radius={[8, 8, 0, 0]} />
                <Line yAxisId="left" type="monotone" dataKey="trafego" name="Tráfego" stroke="#86e0a3" strokeWidth={2} dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="organico" name="Orgânico" stroke="#3ea98a" strokeWidth={2} dot={false} />
              </>
            ) : (
              <>
                <Bar yAxisId="right" dataKey="gasto" name="Gasto" fill="url(#barCoral)" radius={[8, 8, 0, 0]} />
                <Line yAxisId="left" type="monotone" dataKey="leads" name="Leads" stroke="#86e0a3" strokeWidth={2} dot={false} />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
