/** Valor ausente. As RPCs devolvem null quando a metrica nao e calculavel
 *  (ex.: CPL sem leads de trafego) — exibir "—" e honesto; "R$ 0,00" nao. */
const EMPTY = '—'

type Maybe = number | null | undefined

export function formatBRL(value: Maybe): string {
  if (value == null || !Number.isFinite(value)) return EMPTY
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

export function formatNum(value: Maybe): string {
  if (value == null || !Number.isFinite(value)) return EMPTY
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M'
  if (value >= 1_000) return (value / 1_000).toFixed(1) + 'k'
  return new Intl.NumberFormat('pt-BR').format(value)
}

export function formatPercent(value: Maybe): string {
  if (value == null || !Number.isFinite(value)) return EMPTY
  return `${value.toFixed(1)}%`
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
