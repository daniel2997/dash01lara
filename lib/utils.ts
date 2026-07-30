export function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatNum(value: number) {
  return value.toLocaleString('pt-BR')
}
