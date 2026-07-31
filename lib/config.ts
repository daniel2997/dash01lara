/**
 * Configuração central do funil — evento Lara Castilho.
 *
 * Funil completo:
 *   Tráfego (Meta) → Lead Page (cadastro) → Privado → Grupo
 *   → Workshop (produto de entrada) → Mentoria (high-ticket)
 *
 * As etapas com `disponivel: false` ainda não têm tabela no Supabase. Quando
 * as tabelas de venda existirem, é só marcar `disponivel: true` aqui — o resto
 * do dashboard se adapta sozinho, sem tocar em query nem em componente.
 */

export const LANCAMENTO_PADRAO =
  process.env.NEXT_PUBLIC_LANCAMENTO_PADRAO || "LA03AGOSTO26";

export interface EtapaFunil {
  key: string;
  label: string;
  descricao: string;
  /** tabela no Supabase; null = ainda não existe */
  tabela: string | null;
  /** coluna que identifica o lançamento nessa tabela */
  lancamentoCol?: string;
  /** coluna de valor (R$) quando é uma etapa de venda */
  valorCol?: string;
  /** filtro extra de igualdade (ex: status = 'paid') */
  filtro?: { col: string; valor: string };
  /** cor do tema para gráficos/cards */
  cor: string;
  /** já temos dados/tabela pra essa etapa? */
  disponivel: boolean;
  /** é uma etapa de venda (gera receita)? */
  venda?: boolean;
}

/** Escada de verdes da identidade Mete Marcha — do mais claro ao mais fundo. */
export const FUNIL: EtapaFunil[] = [
  {
    key: "cadastros",
    label: "Lead Page",
    descricao: "Cadastros na página de captação",
    tabela: "cadastroClientes",
    lancamentoCol: "lancamento",
    cor: "#86e0a3",
    disponivel: true,
  },
  {
    key: "privado",
    label: "Privado",
    descricao: "Entraram no privado / DM",
    tabela: "Privado",
    lancamentoCol: "lancamento",
    cor: "#53a668",
    disponivel: true,
  },
  {
    key: "grupos",
    label: "Grupo",
    descricao: "Entraram nos grupos de WhatsApp",
    tabela: "grupos",
    lancamentoCol: "lancamento",
    cor: "#3ea98a",
    disponivel: true,
  },
  {
    key: "workshop",
    label: "Workshop",
    descricao: "Compraram o ingresso do workshop",
    tabela: "workcompras",
    lancamentoCol: "lancamento",
    valorCol: "valor",
    filtro: { col: "status", valor: "paid" },
    cor: "#2f6f5c",
    disponivel: true,
    venda: true,
  },
  {
    key: "mentoria",
    label: "Mentoria",
    descricao: "Compraram a mentoria (high-ticket)",
    tabela: "mlcaprovado",
    lancamentoCol: "lancamento",
    valorCol: "valor",
    cor: "#075743",
    disponivel: false,
    venda: true,
  },
];

export const COL = {
  campanha: "utm_nome_campanha",
  conjunto: "utm_nome_conjunto",
  anuncio: "utm_nome_anuncio",
  pagina: "nome_pagina",
  plataforma: "plataforma",
  data: "data_criacao",
} as const;

export const ALIAS_LANCAMENTO: Record<string, string> = {
  LA29JUL26: "LA03AGOSTO26",
  LA30JUL26: "LA03AGOSTO26",
};

export function lancamentoDaCampanha(
  nome: string | null | undefined,
  launchTag?: string | null
): string | null {
  const tag = launchTag?.trim();
  if (tag) return tag;
  const m = /^\s*\[\s*([A-Za-z0-9]+)\s*\]/.exec(nome || "");
  if (!m) return null;
  return ALIAS_LANCAMENTO[m[1]] ?? m[1];
}

/** Paleta para séries de gráfico — verdes da marca primeiro. */
export const CORES = [
  "#86e0a3",
  "#53a668",
  "#3ea98a",
  "#2f6f5c",
  "#075743",
  "#c9a24b",
  "#e79a86",
  "#f5fff8",
];

export function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatInt(value: number) {
  return value.toLocaleString("pt-BR");
}

export function formatPct(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`;
}
