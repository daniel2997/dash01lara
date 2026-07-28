'use client'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { PanelHeading } from './SectionHeader'

interface PagesBarChartProps {
  data: Array<{ nome_pagina: string; total: number; trafego: number; organico: number }>
}

// Sem cores inventadas (§5): escada de verdes decaindo por opacidade conforme o rank.
const LADDER = ['#86e0a3', '#53a668', '#3ea98a', '#2f6f5c']
const barColor = (i: number) => {
  const base = LADDER[Math.min(i, LADDER.length - 1)]
  const opacity = Math.max(1 - i * 0.07, 0.35)
  return { fill: base, opacity }
}

const AXIS = 'rgba(245,255,248,0.4)'

const Tip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-surface border border-strong rounded-xl p-3 text-xs">
      <p className="text-ink font-semibold mb-1 max-w-[180px] truncate">{d.nome_pagina}</p>
      <p className="text-ink-45">Total: <span className="text-ink">{d.total.toLocaleString('pt-BR')}</span></p>
      <p className="text-ink-45">Tráfego: <span className="text-accent-bright">{d.trafego.toLocaleString('pt-BR')}</span></p>
      <p className="text-ink-45">Orgânico: <span className="text-teal-mid">{d.organico.toLocaleString('pt-BR')}</span></p>
    </div>
  )
}

export default function PagesBarChart({ data }: PagesBarChartProps) {
  const formatted = data.map(d => ({
    ...d,
    name: d.nome_pagina.length > 22 ? d.nome_pagina.slice(0, 22) + '…' : d.nome_pagina,
  }))

  return (
    <section className="bg-surface border border-card rounded-[18px] p-[26px]">
      <PanelHeading>Melhores páginas</PanelHeading>

      <div className="mt-5">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={formatted} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
            <XAxis type="number" tick={{ fill: AXIS, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: 'rgba(245,255,248,0.6)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={130}
            />
            <Tooltip content={<Tip />} cursor={{ fill: 'rgba(83,166,104,0.05)' }} />
            <Bar dataKey="total" radius={[0, 8, 8, 0]}>
              {formatted.map((_, i) => {
                const c = barColor(i)
                return <Cell key={i} fill={c.fill} fillOpacity={c.opacity} />
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
