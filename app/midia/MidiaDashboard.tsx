'use client'
import { useEffect, useState, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { formatBRL, formatNum } from '@/lib/utils'
import KPICard from '@/components/KPICard'
import TimelineChart from '@/components/TimelineChart'
import MetricsTable, { Column } from '@/components/MetricsTable'
import LancamentoFilter from '@/components/LancamentoFilter'
import { RefreshCw } from 'lucide-react'

interface CampaignKPIs {
  total_gasto: number; total_leads: number; total_impressoes: number;
  total_clicks: number; total_reach: number;
  cpl: number; cpm: number; cpc: number; ctr: number;
}

type CampRow = { campanha: string; gasto: number; leads: number; impressoes: number; clicks: number; cpl: number; cpm: number; cpc: number; ctr: number }
type ConjRow = { conjunto: string; gasto: number; leads: number; clicks: number; cpl: number; cpc: number; ctr: number }
type AdRow   = { anuncio: string; gasto: number; leads: number; clicks: number; cpl: number; cpc: number; ctr: number }
type DateRow = { data: string; gasto: number; leads: number; impressoes: number; clicks: number; cpl: number; cpm: number; cpc: number; ctr: number }

const brl = (v: number) => formatBRL(v)
const num = (v: number) => formatNum(v)
const pct = (v: number) => `${Number(v).toFixed(2)}%`

const campanhaCols: Column<CampRow>[] = [
  { key: 'campanha', label: 'Campanha' },
  { key: 'gasto', label: 'Investimento', format: brl, align: 'right' },
  { key: 'leads', label: 'Leads', format: num, align: 'right' },
  { key: 'cpl', label: 'CPL', format: brl, align: 'right' },
  { key: 'cpm', label: 'CPM', format: brl, align: 'right' },
  { key: 'cpc', label: 'CPC', format: brl, align: 'right' },
  { key: 'ctr', label: 'CTR', format: pct, align: 'right' },
  { key: 'impressoes', label: 'Impressões', format: num, align: 'right' },
]

const conjCols: Column<ConjRow>[] = [
  { key: 'conjunto', label: 'Conjunto' },
  { key: 'gasto', label: 'Investimento', format: brl, align: 'right' },
  { key: 'leads', label: 'Leads', format: num, align: 'right' },
  { key: 'cpl', label: 'CPL', format: brl, align: 'right' },
  { key: 'cpc', label: 'CPC', format: brl, align: 'right' },
  { key: 'ctr', label: 'CTR', format: pct, align: 'right' },
  { key: 'clicks', label: 'Clicks', format: num, align: 'right' },
]

const adCols: Column<AdRow>[] = [
  { key: 'anuncio', label: 'Anúncio' },
  { key: 'gasto', label: 'Investimento', format: brl, align: 'right' },
  { key: 'leads', label: 'Leads', format: num, align: 'right' },
  { key: 'cpl', label: 'CPL', format: brl, align: 'right' },
  { key: 'cpc', label: 'CPC', format: brl, align: 'right' },
  { key: 'ctr', label: 'CTR', format: pct, align: 'right' },
  { key: 'clicks', label: 'Clicks', format: num, align: 'right' },
]

const dateCols: Column<DateRow>[] = [
  { key: 'data', label: 'Data' },
  { key: 'gasto', label: 'Investimento', format: brl, align: 'right' },
  { key: 'leads', label: 'Leads', format: num, align: 'right' },
  { key: 'cpl', label: 'CPL', format: brl, align: 'right' },
  { key: 'cpm', label: 'CPM', format: brl, align: 'right' },
  { key: 'cpc', label: 'CPC', format: brl, align: 'right' },
  { key: 'ctr', label: 'CTR', format: pct, align: 'right' },
  { key: 'impressoes', label: 'Impressões', format: num, align: 'right' },
  { key: 'clicks', label: 'Clicks', format: num, align: 'right' },
]

export default function MidiaDashboard() {
  const [kpis, setKpis] = useState<CampaignKPIs | null>(null)
  const [byDate, setByDate] = useState<DateRow[]>([])
  const [byCamp, setByCamp] = useState<CampRow[]>([])
  const [byConj, setByConj] = useState<ConjRow[]>([])
  const [byAd, setByAd] = useState<AdRow[]>([])
  const [lancamentos, setLancamentos] = useState<any[]>([])
  const [lancamento, setLancamento] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const sb = getSupabase()
      const [kpisRes, dateRes, campRes, conjRes, adRes, lancRes] = await Promise.all([
        sb.rpc('fn_campaigns_kpis', { p_lancamento: lancamento }),
        sb.rpc('fn_campaigns_by_date', { p_lancamento: lancamento }),
        sb.rpc('fn_campaigns_by_campanha', { p_lancamento: lancamento }),
        sb.rpc('fn_campaigns_by_conjunto', { p_lancamento: lancamento }),
        sb.rpc('fn_campaigns_by_anuncio', { p_lancamento: lancamento }),
        sb.rpc('fn_lancamentos'),
      ])
      if (kpisRes.data) setKpis(kpisRes.data as CampaignKPIs)
      if (dateRes.data) setByDate(dateRes.data)
      if (campRes.data) setByCamp(campRes.data)
      if (conjRes.data) setByConj(conjRes.data)
      if (adRes.data) setByAd(adRes.data)
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
            <h1 className="text-sm font-semibold text-white">Mídia Paga</h1>
            <p className="text-xs text-zinc-500">Performance de campanhas do Facebook Ads</p>
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
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          <KPICard label="Investimentos" value={kpis ? formatBRL(kpis.total_gasto) : '—'} loading={loading} color="indigo" />
          <KPICard label="Leads Tráfego" value={kpis ? formatNum(kpis.total_leads) : '—'} loading={loading} color="yellow" />
          <KPICard label="CPL" value={kpis ? formatBRL(kpis.cpl) : '—'} loading={loading} />
          <KPICard label="CPM" value={kpis ? formatBRL(kpis.cpm) : '—'} loading={loading} />
          <KPICard label="CTR" value={kpis ? `${kpis.ctr}%` : '—'} loading={loading} color={kpis && kpis.ctr >= 1 ? 'green' : 'red'} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KPICard label="Impressões" value={kpis ? formatNum(kpis.total_impressoes) : '—'} loading={loading} />
          <KPICard label="Clicks" value={kpis ? formatNum(kpis.total_clicks) : '—'} loading={loading} />
          <KPICard label="CPC" value={kpis ? formatBRL(kpis.cpc) : '—'} loading={loading} />
          <KPICard label="Alcance" value={kpis ? formatNum(kpis.total_reach) : '—'} loading={loading} />
        </div>

        <TimelineChart data={byDate} mode="campaigns" />

        <MetricsTable title="Por Data" columns={dateCols} data={byDate} loading={loading} maxRows={14} />
        <MetricsTable title="Por Campanha" columns={campanhaCols} data={byCamp} loading={loading} />
        <MetricsTable title="Por Conjunto" columns={conjCols} data={byConj} loading={loading} />
        <MetricsTable title="Por Anúncio" columns={adCols} data={byAd} loading={loading} />
      </div>
    </div>
  )
}
