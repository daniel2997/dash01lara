'use client'
import {
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend
} from 'recharts'

interface TimelineChartProps {
  data: Array<{ dia?: string; data?: string; total?: number; trafego?: number; leads?: number; gasto?: number }>
  mode?: 'leads' | 'campaigns'
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-zinc-400 mb-2 font-medium">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-zinc-300">{p.name}:</span>
          <span className="text-white font-semibold">
            {p.name === 'Gasto' ? `R$ ${Number(p.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : Number(p.value).toLocaleString('pt-BR')}
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
    <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-zinc-200 mb-4">
        {mode === 'leads' ? 'Leads ao longo do tempo' : 'Performance diária'}
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#71717a', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: '#71717a', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          {mode === 'campaigns' && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#71717a', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={50}
              tickFormatter={(v) => `R$${v}`}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: '#a1a1aa', paddingTop: 12 }}
          />
          {mode === 'leads' ? (
            <>
              <Bar yAxisId="left" dataKey="total" name="Total" fill="#6366f1" opacity={0.8} radius={[2,2,0,0]} />
              <Line yAxisId="left" type="monotone" dataKey="trafego" name="Tráfego" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="organico" name="Orgânico" stroke="#34d399" strokeWidth={2} dot={false} />
            </>
          ) : (
            <>
              <Bar yAxisId="right" dataKey="gasto" name="Gasto" fill="#6366f1" opacity={0.7} radius={[2,2,0,0]} />
              <Line yAxisId="left" type="monotone" dataKey="leads" name="Leads" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
