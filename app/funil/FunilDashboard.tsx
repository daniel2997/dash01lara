'use client'
import { useEffect, useState, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { formatBRL, formatNum } from '@/lib/utils'
import KPICard from '@/components/KPICard'
import Pill, { PillRow } from '@/components/Pill'
import ConversionCard from '@/components/ConversionCard'
import FunnelBars from '@/components/FunnelBars'
import SectionHeader from '@/components/SectionHeader'
import PageHeader, { HeaderButton } from '@/components/PageHeader'
import BrandFooter from '@/components/BrandFooter'
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

  const pctGrupos = kpis && kpis.total_leads > 0 ? (kpis.grupos / kpis.total_leads) * 100 : 0
  const roi = kpis && kpis.total_gasto > 0
    ? `${((kpis.total_receita / kpis.total_gasto) * 100).toFixed(0)}%`
    : '—'

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Funil de"
        accent="conversão"
        contextLabel="Lançamento:"
        contextValue={lancamento ?? 'Todos'}
      >
        <LancamentoFilter options={lancamentos} value={lancamento} onChange={setLancamento} />
        <HeaderButton onClick={fetchData} title="Atualizar">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </HeaderButton>
      </PageHeader>

      <div className="max-w-[1220px] mx-auto px-6 lg:px-10 pt-12 pb-16">
        {/* Captação — cards de volume + pill de custo unitário (§3.3 / §3.4) */}
        <section className="mb-12">
          <SectionHeader badge="A" title="Captação" qualifier="Leads" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <KPICard label="Total de Leads" value={kpis ? formatNum(kpis.total_leads) : '—'} loading={loading} />
            <KPICard label="Leads Captados" value={kpis ? formatNum(kpis.leads_trafego) : '—'} loading={loading} />
            <KPICard label="Leads Orgânicos" value={kpis ? formatNum(kpis.leads_organico) : '—'} loading={loading} />
            <KPICard label="Sem Rastreio" value={kpis ? formatNum(kpis.leads_sem_rastreio) : '—'} loading={loading} />
            <KPICard
              label="Valor Gasto"
              value={kpis ? formatBRL(kpis.total_gasto) : '—'}
              tone="spend"
              highlight
              loading={loading}
            />
          </div>
          <div className="mt-3.5">
            <PillRow>
              <Pill label="CPL Investido" value={kpis ? formatBRL(kpis.cpl) : '—'} tone="cost" loading={loading} />
            </PillRow>
          </div>
        </section>

        {/* Etapas do funil (§3.5) */}
        <section className="mb-12">
          <SectionHeader
            badge="B"
            title="Etapas do Funil"
            group
            sub="Panorama geral de cada estágio"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ConversionCard
              label="Total de Leads"
              value={kpis ? formatNum(kpis.total_leads) : '—'}
              desc="Cadastros nas páginas de captação"
              step={0}
              loading={loading}
            />
            <ConversionCard
              label="Privado"
              value={kpis ? formatNum(kpis.privado) : '—'}
              pct={kpis?.conv_privado}
              desc={`Entraram no privado — de ${kpis ? formatNum(kpis.total_leads) : '—'} leads`}
              step={1}
              loading={loading}
            />
            <ConversionCard
              label="Grupos"
              value={kpis ? formatNum(kpis.grupos) : '—'}
              pct={kpis?.conv_grupos}
              desc={`Entraram nos grupos — de ${kpis ? formatNum(kpis.privado) : '—'} no privado`}
              step={2}
              loading={loading}
            />
            <ConversionCard
              label="Compras"
              value={kpis ? formatNum(kpis.compras) : '—'}
              pct={kpis?.conv_compra}
              desc={`Final do fluxo — de ${kpis ? formatNum(kpis.total_leads) : '—'} leads`}
              step={3}
              loading={loading}
            />
          </div>
        </section>

        {/* Funil visual (§3.6) */}
        <div className="mb-12">
          <FunnelBars
            title="Funil de Conversão"
            sub="Taxa de conversão entre etapas"
            loading={loading}
            steps={[
              { label: 'Total Leads', value: formatNum(kpis?.total_leads ?? 0), width: 100 },
              { label: 'Privado', value: formatNum(kpis?.privado ?? 0), width: kpis?.conv_privado ?? 0, pct: kpis?.conv_privado },
              { label: 'Grupos', value: formatNum(kpis?.grupos ?? 0), width: pctGrupos, pct: kpis?.conv_grupos },
              { label: 'Compras', value: formatNum(kpis?.compras ?? 0), width: kpis?.conv_compra ?? 0, pct: kpis?.conv_compra },
            ]}
          />
        </div>

        {/* Visualizações */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-12">
          <TimelineChart data={timeline} mode="leads" />
          <PagesBarChart data={pages} />
        </div>

        {/* Resultado */}
        <section className="mb-12">
          <SectionHeader badge="C" title="Resultado" qualifier="Receita" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            <KPICard
              label="Receita Total"
              value={kpis ? formatBRL(kpis.total_receita) : '—'}
              tone="good"
              loading={loading}
            />
            <KPICard label="Compras" value={kpis ? formatNum(kpis.compras) : '—'} loading={loading} />
            <KPICard label="Privado" value={kpis ? formatNum(kpis.privado) : '—'} loading={loading} />
          </div>
          <div className="mt-3.5">
            <PillRow>
              <Pill
                label="ROI"
                value={roi}
                tone={kpis && kpis.total_receita >= kpis.total_gasto ? 'good' : 'bad'}
                loading={loading}
              />
            </PillRow>
          </div>
        </section>

        <BrandFooter />
      </div>
    </div>
  )
}
