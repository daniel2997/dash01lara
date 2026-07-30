'use client'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'

interface PagesBarChartProps {
  data: Array<{ nome_pagina: string; total: number; trafego: number; organico: number }>
}

const COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff', '#f0f4ff', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe']

const Tip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-white font-medium mb-1 max-w-[180px] truncate">{d.nome_pagina}</p>
      <p className="text-zinc-400">Total: <span className="text-white">{d.total.toLocaleString('pt-BR')}</span></p>
      <p className="text-zinc-400">Tráfego: <span className="text-yellow-400">{d.trafego.toLocaleString('pt-BR')}</span></p>
      <p className="text-zinc-400">Orgânico: <span className="text-emerald-400">{d.organico.toLocaleString('pt-BR')}</span></p>
    </div>
  )
}

export default function PagesBarChart({ data }: PagesBarChartProps) {
  const formatted = data.map(d => ({
    ...d,
    name: d.nome_pagina.length > 22 ? d.nome_pagina.slice(0, 22) + '…' : d.nome_pagina,
  }))

  return (
    <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-zinc-200 mb-4">Melhores páginas</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={formatted} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
          <XAxis type="number" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#a1a1aa', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={130}
          />
          <Tooltip content={<Tip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="total" radius={[0, 4, 4, 0]}>
            {formatted.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
