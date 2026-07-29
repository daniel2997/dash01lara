'use client'
import { useEffect, useState, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { formatBRL, formatNum } from '@/lib/utils'
import Callout from '@/components/Callout'
import MetricsTable from '@/components/MetricsTable'
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
  total_gasto: number; total_receita: number;
  // Receita vem quebrada em dois produtos com ticket ~25x diferente: workcompra
  // (entrada, ~R$ 28) e mlcaprovado (high ticket, ~R$ 682). Um total único
  // esconde essa composição. Opcionais: ficam undefined enquanto a fn_funil_kpis
  // corrigida (sql/fix_fn_funil_kpis.sql) não for aplicada no Supabase.
  receita_entrada?: number; receita_high_ticket?: number;
  compras_entrada?: number; compras_high_ticket?: number;
  // null quando a RPC não consegue calcular (denominador zero) — exibido como "—"
  cpl: number | null;
  conv_privado: number | null; conv_grupos: number | null; conv_compra: number | null;
}

/** Uma linha por lançamento, mais a linha "Sem tag" com as compras que não
 *  casam com nenhum cadastro etiquetado. A soma fecha com o total geral. */
interface ReceitaPorTag {
  tag: string
  receita_entrada: number
  receita_high_ticket: number
  receita_total: number
  compras: number
}

export default function FunilDashboard() {
  const [kpis, setKpis] = useState<FunilKPIs | null>(null)
  const [porTag, setPorTag] = useState<ReceitaPorTag[]>([])
  const [pages, setPages] = useState<any[]>([])
  const [timeline, setTimeline] = useState<any[]>([])
  const [lancamentos, setLancamentos] = useState<any[]>([])
  const [lancamento, setLancamento] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const sb = getSupabase()
      const [kpisRes, pagesRes, timelineRes, lancRes, porTagRes] = await Promise.all([
        sb.rpc('fn_funil_kpis', { p_lancamento: lancamento }),
        sb.rpc('fn_leads_by_pagina', { p_lancamento: lancamento, p_limit: 8 }),
        sb.rpc('fn_leads_over_time', { p_lancamento: lancamento, p_days: 60 }),
        sb.rpc('fn_lancamentos'),
        // Sem parâmetro: a tabela por tag é sempre a visão completa, para dar
        // o contexto de quanto o lançamento filtrado representa do todo.
        sb.rpc('fn_receita_por_tag'),
      ])
      if (kpisRes.data) setKpis(kpisRes.data as FunilKPIs)
      if (pagesRes.data) setPages(pagesRes.data)
      if (timelineRes.data) setTimeline(timelineRes.data)
      if (lancRes.data) setLancamentos(lancRes.data)
      if (porTagRes.data) setPorTag(porTagRes.data as ReceitaPorTag[])
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }, [lancamento])

  useEffect(() => { fetchData() }, [fetchData])

  const pctGrupos = kpis && kpis.total_leads > 0 ? (kpis.grupos / kpis.total_leads) * 100 : 0

  // receita/gasto é ROAS, não ROI (ROI seria (receita - gasto)/gasto). Rotular
  // 345% como "ROI" superestima o retorno em 100 p.p. — o lucro vai no pill ao lado.
  const roas = kpis && kpis.total_gasto > 0
    ? `${(kpis.total_receita / kpis.total_gasto).toFixed(2)}x`
    : '—'
  const lucro = kpis ? kpis.total_receita - kpis.total_gasto : null

  /** A RPC antiga não devolve a quebra por produto — sinal de que o SQL de
   *  correção ainda não rodou e o total exibido está 100x inflado e sem o high ticket. */
  const rpcDesatualizada = kpis != null && kpis.receita_entrada === undefined

  const ticket = (receita?: number, qtd?: number) =>
    receita != null && qtd != null && qtd > 0 ? formatBRL(receita / qtd) : '—'

  const somaTags = porTag.reduce(
    (a, r) => ({
      entrada: a.entrada + (r.receita_entrada ?? 0),
      high: a.high + (r.receita_high_ticket ?? 0),
      total: a.total + (r.receita_total ?? 0),
      compras: a.compras + (r.compras ?? 0),
    }),
    { entrada: 0, high: 0, total: 0, compras: 0 },
  )

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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <KPICard
              label={lancamento ? 'Faturamento do Lançamento' : 'Faturamento Total'}
              value={kpis ? formatBRL(kpis.total_receita) : '—'}
              sub="Entrada + high ticket"
              tone="good"
              highlight
              loading={loading}
            />
            <KPICard
              label="Entrada"
              value={kpis ? formatBRL(kpis.receita_entrada) : '—'}
              sub={`${kpis ? formatNum(kpis.compras_entrada) : '—'} compras · ticket ${ticket(kpis?.receita_entrada, kpis?.compras_entrada)}`}
              loading={loading}
            />
            <KPICard
              label="High Ticket"
              value={kpis ? formatBRL(kpis.receita_high_ticket) : '—'}
              sub={`${kpis ? formatNum(kpis.compras_high_ticket) : '—'} vendas · ticket ${ticket(kpis?.receita_high_ticket, kpis?.compras_high_ticket)}`}
              loading={loading}
            />
          </div>
          <div className="mt-3.5">
            <PillRow>
              <Pill
                label="ROAS"
                value={roas}
                tone={kpis && kpis.total_receita >= kpis.total_gasto ? 'good' : 'bad'}
                loading={loading}
              />
              <Pill
                label="Lucro"
                value={formatBRL(lucro)}
                tone={lucro != null && lucro >= 0 ? 'good' : 'bad'}
                loading={loading}
              />
              <Pill label="Investido" value={kpis ? formatBRL(kpis.total_gasto) : '—'} tone="spend" loading={loading} />
            </PillRow>
          </div>

          {rpcDesatualizada && (
            <div className="mt-3.5">
              <Callout>
                A <code>fn_funil_kpis</code> do Supabase ainda é a versão antiga: a receita está
                100x inflada e não inclui o high ticket. Rode <code>sql/fix_fn_funil_kpis.sql</code>.
              </Callout>
            </div>
          )}
        </section>

        {/* Faturamento por tag — sempre a visão completa, independente do filtro.
            A linha "Sem tag" é a compra que não casa com nenhum cadastro
            etiquetado; sem ela a tabela não fecharia com o total geral. */}
        <div className="mb-12">
          <MetricsTable<ReceitaPorTag>
            title="Faturamento por tag"
            data={porTag}
            loading={loading}
            maxRows={12}
            totals={[
              { label: 'Total', value: formatBRL(somaTags.total), tone: 'good' },
              { label: 'Vendas', value: formatNum(somaTags.compras) },
            ]}
            columns={[
              { key: 'tag', label: 'Lançamento', tone: 'strong' },
              { key: 'compras', label: 'Vendas', align: 'right', format: v => formatNum(v) },
              { key: 'receita_entrada', label: 'Entrada', align: 'right', format: v => formatBRL(v) },
              { key: 'receita_high_ticket', label: 'High Ticket', align: 'right', format: v => formatBRL(v) },
              { key: 'receita_total', label: 'Total', align: 'right', tone: 'good', format: v => formatBRL(v) },
            ]}
            totalRow={{
              label: 'Total',
              values: {
                compras: formatNum(somaTags.compras),
                receita_entrada: formatBRL(somaTags.entrada),
                receita_high_ticket: formatBRL(somaTags.high),
                receita_total: formatBRL(somaTags.total),
              },
            }}
          />
        </div>

        <BrandFooter />
      </div>
    </div>
  )
}
