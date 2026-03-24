'use client'
import { useEffect, useState, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { formatBRL, formatNum } from '@/lib/utils'
import KPICard from '@/components/KPICard'
import ConversionCard from '@/components/ConversionCard'
import TimelineChart from '@/components/TimelineChart'
import PagesBarChart from '@/components/PagesBarChart'
import LancamentoFilter from '@/components/LancamentoFilter'
import { RefreshCw } from 'lucide-react'

interface FunilKPIs {
  total_leads: number; leads_trafego: number; leads_organico: number;
  leads_sem_rastreio: number; privado: number; grupos: number; compras: number;
  total_gasto: number; total_receita: number; cpl: number;
  conv_privado: number; conv_grupos: number; conv_compra: number;
}

export default function FunilDashboard() {
  const [kpis, setKpis] = useState<FunilKPIs | null>(null)
  const [pages, setPages] = useState<any[]>([])
  const [timeline, setTimeline] = useState<any[]>([])
  const [lancamentos, setLancamentos] = useState<any[]>([])
  const [lancamento, setLancamento] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const sb = getSupabase()
      const [kpisRes, pagesRes, timelineRes, lancRes] = await Promise.all([
        sb.rpc('fn_funil_kpis', { p_lancamento: lancamento }),
        sb.rpc('fn_leads_by_pagina', { p_lancamento: lancamento, p_limit: 8 }),
        sb.rpc('fn_leads_over_time', { p_lancamento: lancamento, p_days: 60 }),
        sb.rpc('fn_lancamentos'),
      ])
      if (kpisRes.data) setKpis(kpisRes.data as FunilKPIs)
      if (pagesRes.data) setPages(pagesRes.data)
      if (timelineRes.data) setTimeline(timelineRes.data)
      if (lancRes.data) setLancamentos(lancRes.data)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }, [lancamento])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur border-b border-zinc-800/60 px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-white">Funil de conversão</h1>
            <p className="text-xs text-zinc-500">Visão geral dos leads e conversões</p>
          </div>
          <div className="flex items-center gap-2">
            <LancamentoFilter options={lancamentos} value={lancamento} onChange={setLancamento} />
            <button
              onClick={fetchData}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-700/60 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KPICard label="Valor Gasto" value={kpis ? formatBRL(kpis.total_gasto) : '—'} loading={loading} color="indigo" />
          <KPICard label="CPL Investido" value={kpis ? formatBRL(kpis.cpl) : '—'} loading={loading} />
          <KPICard label="Leads Orgânicos" value={kpis ? formatNum(kpis.leads_organico) : '—'} loading={loading} color="green" />
          <KPICard label="Leads Captados" value={kpis ? formatNum(kpis.leads_trafego) : '—'} loading={loading} color="yellow" />
          <KPICard label="Sem Rastreio" value={kpis ? formatNum(kpis.leads_sem_rastreio) : '—'} loading={loading} />
          <KPICard label="Total de Leads" value={kpis ? formatNum(kpis.total_leads) : '—'} loading={loading} color="indigo" />
        </div>

        {/* Conversões */}
        <div>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Funil de conversão</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ConversionCard
              label="Página → Privado"
              value={kpis?.conv_privado ?? 0}
              from={`${kpis ? formatNum(kpis.total_leads) : '—'} leads`}
              to={`${kpis ? formatNum(kpis.privado) : '—'} privado`}
              loading={loading}
            />
            <ConversionCard
              label="Privado → Grupo"
              value={kpis?.conv_grupos ?? 0}
              from={`${kpis ? formatNum(kpis.privado) : '—'} privado`}
              to={`${kpis ? formatNum(kpis.grupos) : '—'} grupos`}
              loading={loading}
            />
            <ConversionCard
              label="Final do Fluxo"
              value={kpis?.conv_compra ?? 0}
              from={`${kpis ? formatNum(kpis.total_leads) : '—'} leads`}
              to={`${kpis ? formatNum(kpis.compras) : '—'} compras`}
              loading={loading}
            />
          </div>
        </div>

        {/* Funil visual */}
        <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-zinc-200 mb-4">Visualização do funil</h3>
          <div className="flex flex-col gap-2">
            {[
              { label: 'Total Leads', value: kpis?.total_leads ?? 0, color: 'bg-indigo-500', pct: 100 },
              { label: 'Privado', value: kpis?.privado ?? 0, color: 'bg-violet-500', pct: kpis?.conv_privado ?? 0 },
              { label: 'Grupos', value: kpis?.grupos ?? 0, color: 'bg-purple-500', pct: kpis ? (kpis.grupos / kpis.total_leads * 100) : 0 },
              { label: 'Compras', value: kpis?.compras ?? 0, color: 'bg-fuchsia-500', pct: kpis?.conv_compra ?? 0 },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className={`h-9 ${s.color} rounded-lg flex items-center justify-center transition-all duration-700 min-w-[60px]`}
                  style={{ width: `${Math.max(s.pct, 4)}%` }}
                >
                  {!loading && (
                    <span className="text-xs font-semibold text-white px-2 whitespace-nowrap">
                      {formatNum(s.value)}
                    </span>
                  )}
                </div>
                <span className="text-xs text-zinc-500">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TimelineChart data={timeline} mode="leads" />
          <PagesBarChart data={pages} />
        </div>

        {/* Receita */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KPICard label="Receita Total" value={kpis ? formatBRL(kpis.total_receita) : '—'} color="green" loading={loading} />
          <KPICard label="Compras" value={kpis ? formatNum(kpis.compras) : '—'} loading={loading} />
          <KPICard label="Privado" value={kpis ? formatNum(kpis.privado) : '—'} loading={loading} />
          <KPICard
            label="ROI"
            value={kpis && kpis.total_gasto > 0 ? `${((kpis.total_receita / kpis.total_gasto) * 100).toFixed(0)}%` : '—'}
            color={kpis && kpis.total_receita >= kpis.total_gasto ? 'green' : 'red'}
            loading={loading}
          />
        </div>
      </div>
    </div>
  )
}
