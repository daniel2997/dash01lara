'use client'
import { useEffect, useState, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { formatBRL, formatNum } from '@/lib/utils'
import KPICard from '@/components/KPICard'
import Pill, { PillRow } from '@/components/Pill'
import SectionHeader from '@/components/SectionHeader'
import PageHeader, { HeaderButton } from '@/components/PageHeader'
import BrandFooter from '@/components/BrandFooter'
import Callout from '@/components/Callout'
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

// Cor por significado da coluna (§1.3): coral = dinheiro gasto, dourado = custo unitário.
const campanhaCols: Column<CampRow>[] = [
  { key: 'campanha', label: 'Campanha', tone: 'strong', truncate: true },
  { key: 'gasto', label: 'Investimento', format: brl, align: 'right', tone: 'spend' },
  { key: 'leads', label: 'Leads', format: num, align: 'right', tone: 'good' },
  { key: 'cpl', label: 'CPL', format: brl, align: 'right', tone: 'cost' },
  { key: 'cpm', label: 'CPM', format: brl, align: 'right', tone: 'costAcc' },
  { key: 'cpc', label: 'CPC', format: brl, align: 'right', tone: 'costAcc' },
  { key: 'ctr', label: 'CTR', format: pct, align: 'right', tone: 'accent' },
  { key: 'impressoes', label: 'Impressões', format: num, align: 'right' },
]

const conjCols: Column<ConjRow>[] = [
  { key: 'conjunto', label: 'Conjunto', tone: 'strong', truncate: true },
  { key: 'gasto', label: 'Investimento', format: brl, align: 'right', tone: 'spend' },
  { key: 'leads', label: 'Leads', format: num, align: 'right', tone: 'good' },
  { key: 'cpl', label: 'CPL', format: brl, align: 'right', tone: 'cost' },
  { key: 'cpc', label: 'CPC', format: brl, align: 'right', tone: 'costAcc' },
  { key: 'ctr', label: 'CTR', format: pct, align: 'right', tone: 'accent' },
  { key: 'clicks', label: 'Clicks', format: num, align: 'right' },
]

const adCols: Column<AdRow>[] = [
  { key: 'anuncio', label: 'Anúncio', tone: 'strong', truncate: true },
  { key: 'gasto', label: 'Investimento', format: brl, align: 'right', tone: 'spend' },
  { key: 'leads', label: 'Leads', format: num, align: 'right', tone: 'good' },
  { key: 'cpl', label: 'CPL', format: brl, align: 'right', tone: 'cost' },
  { key: 'cpc', label: 'CPC', format: brl, align: 'right', tone: 'costAcc' },
  { key: 'ctr', label: 'CTR', format: pct, align: 'right', tone: 'accent' },
  { key: 'clicks', label: 'Clicks', format: num, align: 'right' },
]

const dateCols: Column<DateRow>[] = [
  { key: 'data', label: 'Data', tone: 'strong' },
  { key: 'gasto', label: 'Investimento', format: brl, align: 'right', tone: 'spend' },
  { key: 'leads', label: 'Leads', format: num, align: 'right', tone: 'good' },
  { key: 'cpl', label: 'CPL', format: brl, align: 'right', tone: 'cost' },
  { key: 'cpm', label: 'CPM', format: brl, align: 'right', tone: 'costAcc' },
  { key: 'cpc', label: 'CPC', format: brl, align: 'right', tone: 'costAcc' },
  { key: 'ctr', label: 'CTR', format: pct, align: 'right', tone: 'accent' },
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

  // Linha de total da tabela por data — mesmos agregados já retornados por fn_campaigns_kpis.
  const dateTotals = kpis ? {
    label: 'Total',
    values: {
      gasto: formatBRL(kpis.total_gasto),
      leads: formatNum(kpis.total_leads),
      cpl: formatBRL(kpis.cpl),
      cpm: formatBRL(kpis.cpm),
      cpc: formatBRL(kpis.cpc),
      ctr: `${kpis.ctr}%`,
      impressoes: formatNum(kpis.total_impressoes),
      clicks: formatNum(kpis.total_clicks),
    },
  } : undefined

  const panelTotals = kpis ? [
    { label: 'Total investido', value: formatBRL(kpis.total_gasto), tone: 'spend' as const },
    { label: 'Total leads', value: formatNum(kpis.total_leads), tone: 'good' as const },
  ] : undefined

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Mídia"
        accent="Paga"
        contextLabel="Lançamento:"
        contextValue={lancamento ?? 'Todos'}
      >
        <LancamentoFilter options={lancamentos} value={lancamento} onChange={setLancamento} />
        <HeaderButton onClick={fetchData} title="Atualizar">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </HeaderButton>
      </PageHeader>

      <div className="max-w-[1220px] mx-auto px-6 lg:px-10 pt-12 pb-16">
        {/* Tráfego — volumes em cards, taxas e custos em pills (§3.3 / §3.4) */}
        <section className="mb-12">
          <SectionHeader badge="A" title="Tráfego" qualifier="Facebook Ads" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <KPICard label="Impressões" value={kpis ? formatNum(kpis.total_impressoes) : '—'} loading={loading} />
            <KPICard label="Clicks" value={kpis ? formatNum(kpis.total_clicks) : '—'} loading={loading} />
            <KPICard label="Alcance" value={kpis ? formatNum(kpis.total_reach) : '—'} loading={loading} />
            <KPICard label="Leads Tráfego" value={kpis ? formatNum(kpis.total_leads) : '—'} tone="good" loading={loading} />
            <KPICard
              label="Investimento"
              value={kpis ? formatBRL(kpis.total_gasto) : '—'}
              tone="spend"
              highlight
              loading={loading}
            />
          </div>
          <div className="mt-3.5">
            <PillRow>
              <Pill label="CTR" value={kpis ? `${kpis.ctr}%` : '—'} tone={kpis && kpis.ctr >= 1 ? 'good' : 'bad'} loading={loading} />
              <Pill label="CPC" value={kpis ? formatBRL(kpis.cpc) : '—'} tone="cost" loading={loading} />
              <Pill label="CPM" value={kpis ? formatBRL(kpis.cpm) : '—'} tone="cost" loading={loading} />
              <Pill label="CPL" value={kpis ? formatBRL(kpis.cpl) : '—'} tone="cost" loading={loading} />
            </PillRow>
          </div>
        </section>

        {/* Série temporal */}
        <div className="mb-12">
          <TimelineChart data={byDate} mode="campaigns" />
        </div>

        {/* Detalhamento por dia (§3.7) */}
        <div className="mb-12">
          <MetricsTable
            title="Por Data"
            columns={dateCols}
            data={byDate}
            loading={loading}
            maxRows={14}
            totals={panelTotals}
            totalRow={dateTotals}
          />
        </div>

        {/* Rankings (§3.2 grupo + §3.7 + §3.8) */}
        <section>
          <SectionHeader
            badge="#"
            title="Rankings"
            group
            sub="Performance de campanhas, conjuntos e anúncios"
          />
          <div className="mb-5">
            <Callout>
              Ordenado pelos dados como vêm da fonte. Clique em qualquer coluna para reordenar — o
              rank acompanha a ordem exibida.
            </Callout>
          </div>

          <div className="space-y-4">
            <MetricsTable title="Por Campanha" columns={campanhaCols} data={byCamp} loading={loading} ranked />
            <MetricsTable title="Por Conjunto" columns={conjCols} data={byConj} loading={loading} ranked />
            <MetricsTable title="Por Anúncio" columns={adCols} data={byAd} loading={loading} ranked />
          </div>
        </section>

        <div className="mt-12">
          <BrandFooter />
        </div>
      </div>
    </div>
  )
}
