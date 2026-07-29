-- ============================================================================
-- Correcao da receita — dashboard Dashlara / evento laracastilho
--
-- Os dois produtos:
--   workcompra  = produto de ENTRADA     (ticket medio R$ 27,61 — 14.515 compras)
--   mlcaprovado = produto HIGH TICKET    (ticket medio R$ 681,95 — 1.458 vendas)
--
-- Bugs corrigidos:
--   B1  parsing de valor: REPLACE(valor,'.','') tratava o ponto como separador
--       de milhar. Como todo valor tem 2 decimais ("27.00"), a receita inteira
--       saia multiplicada por 100 — era dai que vinha o R$ 40.077.502 na tela.
--   B2  a receita ignorava a mlcaprovado, que e 71% do faturamento.
--   B3  linhas de teste entravam na conta (teste@gmail.com em workcompra e
--       testeComprador...@example.com em mlcaprovado — R$ 1.527 somados).
--
-- Receita real: R$ 1.395.026,66 = 400.748,02 (entrada) + 994.278,64 (high).
--
-- Entrega duas funcoes:
--   fn_funil_kpis      — total geral, ja quebrado nos dois produtos
--   fn_receita_por_tag — o mesmo faturamento aberto por lancamento
--
-- NAO altera: fn_campaigns_kpis e fn_lancamentos.
-- ============================================================================


-- ############################################################################
-- 0) INDICES
--
-- Sem CONCURRENTLY de proposito: o SQL Editor do Supabase roda tudo dentro de
-- uma transacao, e CONCURRENTLY nao pode (erro 25001). Assim o arquivo inteiro
-- roda de uma colada so.
--
-- O custo: cada CREATE INDEX segura um lock de escrita na tabela enquanto
-- constroi. Nestes volumes (178 mil linhas) sao poucos segundos por indice, e
-- o dashboard so le — na pratica ninguem percebe. Se algum dia a tabela ficar
-- grande a ponto de isso incomodar, ai sim vale rodar com CONCURRENTLY, uma
-- instrucao por vez e fora do editor.
--
-- A compra nao guarda lancamento: ela e ligada a um lancamento casando
-- email/telefone com cadastroClientes. Sem estes indices isso vira seq scan
-- por linha e a funcao estoura o statement timeout (erro 57014).
-- ############################################################################

CREATE INDEX IF NOT EXISTS idx_cadastro_lancamento
  ON public."cadastroClientes" (lancamento);
CREATE INDEX IF NOT EXISTS idx_privado_lancamento
  ON public."Privado" (lancamento);
CREATE INDEX IF NOT EXISTS idx_grupos_lancamento
  ON public.grupos (lancamento);
CREATE INDEX IF NOT EXISTS idx_campaigns_launch_tag
  ON public.campaigns_bms (launch_tag);

-- Nao ha indice para a ligacao compra -> lancamento de proposito. A primeira
-- versao fazia isso com subconsulta correlacionada (um lookup por venda) e,
-- como o criterio e "casa por email OU por telefone", o planner nao conseguia
-- usar indice para o OR: virava varredura dos 178 mil cadastros para cada uma
-- das ~16 mil vendas. Estourava o timeout.
--
-- A vw_vendas_tag abaixo inverte isso: monta o mapa chave -> lancamento UMA
-- vez e casa por hash join. Sao duas varreduras da cadastroClientes no total,
-- e nao 16 mil — e ai indice nenhum e necessario.

ANALYZE public."cadastroClientes";
ANALYZE public."Privado";
ANALYZE public.grupos;
ANALYZE public.campaigns_bms;
ANALYZE public.workcompra;
ANALYZE public.mlcaprovado;


-- ────────────────────────────────────────────────────────────────────────────
-- 1) Helper: normaliza valor monetario em text para numeric
--    Trata en-US ("865.08"), inteiro ("697"), pt-BR ("1.997,00") e sujeira
--    ("R$ 1.997,00"). Retorna 0 para o que nao for interpretavel.
--    Na base atual so existem os dois primeiros formatos, ambos sem ambiguidade.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_parse_valor(p_valor text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  v text;
BEGIN
  IF p_valor IS NULL THEN RETURN 0; END IF;

  v := regexp_replace(p_valor, '[^0-9.,-]', '', 'g');
  IF v = '' OR v = '-' THEN RETURN 0; END IF;

  IF v ~ ',[0-9]{1,2}$' THEN
    v := replace(replace(v, '.', ''), ',', '.');   -- decimal e virgula (pt-BR)
  ELSIF v ~ '\.[0-9]{1,2}$' THEN
    v := replace(v, ',', '');                      -- decimal e ponto (en-US)
  ELSE
    v := replace(replace(v, '.', ''), ',', '');    -- sem decimal: tudo milhar
  END IF;

  IF v !~ '^-?[0-9]+(\.[0-9]+)?$' THEN RETURN 0; END IF;
  RETURN v::numeric;
EXCEPTION WHEN others THEN
  RETURN 0;
END;
$function$;

COMMENT ON FUNCTION public.fn_parse_valor(text) IS
  'Converte valor monetario em text para numeric, aceitando pt-BR e en-US. Retorna 0 se nao interpretavel.';


-- ────────────────────────────────────────────────────────────────────────────
-- 2) Venda unificada: os dois produtos numa view so, ja sem linhas de teste
--    e com o valor convertido. Serve as duas funcoes abaixo.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.vw_vendas AS
  SELECT
    row_number() OVER (ORDER BY t.produto, t.created_at, t.email) AS venda_id,
    t.produto, t.email, t.telefone, t.created_at AS data_compra, t.valor
  FROM (
    SELECT 'entrada'::text AS produto, w.email, w.telefone, w.created_at,
           public.fn_parse_valor(w.valor) AS valor
    FROM public.workcompra w
    WHERE BTRIM(LOWER(COALESCE(w.email, ''))) NOT LIKE '%example.com'
      AND BTRIM(LOWER(COALESCE(w.email, ''))) NOT LIKE 'teste@%'
    UNION ALL
    SELECT 'high'::text, m.email, m.telefone, m.created_at,
           public.fn_parse_valor(m.valor)
    FROM public.mlcaprovado m
    WHERE BTRIM(LOWER(COALESCE(m.email, ''))) NOT LIKE '%example.com'
      AND BTRIM(LOWER(COALESCE(m.email, ''))) NOT LIKE 'teste@%'
  ) t;

COMMENT ON VIEW public.vw_vendas IS
  'Vendas dos dois produtos (entrada=workcompra, high=mlcaprovado), sem linhas de teste e com valor ja numerico.';


-- ────────────────────────────────────────────────────────────────────────────
-- 2b) Cada venda com o seu lancamento resolvido — a peca central.
--
-- A compra nao guarda lancamento; ela e ligada casando email OU telefone com
-- cadastroClientes.
--
-- REGRA: vale so o cadastro ANTERIOR a compra, e entre esses o MAIS RECENTE.
-- Casar so por identidade, ignorando data, credita a venda a qualquer
-- lancamento em que a pessoa um dia se cadastrou — inclusive um que ainda nem
-- existia quando ela comprou. Media na base de 2026-07-29: isso inflava 21%
-- da receita atribuida (R$ 125.529), e era o unico motivo de o LA16MAR26
-- aparecer com R$ 27 sem ter tido venda nenhuma (compra em 2025-12-03,
-- cadastro em 2026-03-09).
--
-- "Mais recente antes da compra" e o lancamento que plausivelmente levou a
-- pessoa a comprar. Email tem prioridade sobre telefone por ser mais confiavel.
-- lancamento NULL = venda sem tag.
--
-- DISTINCT ON escolhe um unico cadastro por venda, entao cada venda conta uma
-- vez e a soma por tag fecha com o total geral.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.vw_vendas_tag AS
  WITH cad AS (
    SELECT
      lancamento,
      data_criacao,
      NULLIF(BTRIM(LOWER(email)), '')                                   AS chave_email,
      NULLIF(regexp_replace(COALESCE(telefone, ''), '\D', '', 'g'), '') AS chave_fone
    FROM public."cadastroClientes"
    WHERE lancamento IS NOT NULL
  ),
  por_email AS (
    SELECT DISTINCT ON (s.venda_id) s.venda_id, c.lancamento
    FROM public.vw_vendas s
    JOIN cad c ON c.chave_email = NULLIF(BTRIM(LOWER(s.email)), '')
    WHERE c.data_criacao <= s.data_compra
    ORDER BY s.venda_id, c.data_criacao DESC
  ),
  por_fone AS (
    SELECT DISTINCT ON (s.venda_id) s.venda_id, c.lancamento
    FROM public.vw_vendas s
    JOIN cad c ON c.chave_fone = NULLIF(regexp_replace(COALESCE(s.telefone, ''), '\D', '', 'g'), '')
    WHERE c.data_criacao <= s.data_compra
    ORDER BY s.venda_id, c.data_criacao DESC
  )
  SELECT
    s.produto,
    s.valor,
    COALESCE(e.lancamento, f.lancamento) AS lancamento
  FROM public.vw_vendas s
  LEFT JOIN por_email e ON e.venda_id = s.venda_id
  LEFT JOIN por_fone  f ON f.venda_id = s.venda_id;

COMMENT ON VIEW public.vw_vendas_tag IS
  'Cada venda com o lancamento resolvido: cadastro mais recente ANTERIOR a compra, por email (prioridade) ou telefone. lancamento NULL = sem tag. Cada venda aparece uma unica vez.';


-- ────────────────────────────────────────────────────────────────────────────
-- 3) fn_funil_kpis — total geral, quebrado nos dois produtos
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_funil_kpis(p_lancamento text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_total bigint; v_trafego bigint; v_organico bigint; v_sem_rastreio bigint;
  v_privado bigint; v_grupos bigint;
  v_compras bigint; v_aprovados bigint;
  v_gasto numeric;
  v_receita_entrada numeric; v_receita_high numeric;
BEGIN
  -- Leads, com origem em 3 baldes mutuamente exclusivos.
  -- O criterio antigo (utm_id_campanha IS NOT NULL) nunca acertava, porque a
  -- coluna esta 100% NULL. Aqui "trafego" e qualquer lead com ALGUM sinal de
  -- UTM em qualquer das 4 colunas, tratando string vazia como ausente.
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE COALESCE(
      NULLIF(BTRIM(utm_id_campanha),''), NULLIF(BTRIM(utm_nome_campanha),''),
      NULLIF(BTRIM(utm_id_anuncio),''),  NULLIF(BTRIM(utm_nome_anuncio),'')
    ) IS NOT NULL),
    COUNT(*) FILTER (WHERE COALESCE(
      NULLIF(BTRIM(utm_id_campanha),''), NULLIF(BTRIM(utm_nome_campanha),''),
      NULLIF(BTRIM(utm_id_anuncio),''),  NULLIF(BTRIM(utm_nome_anuncio),'')
    ) IS NULL AND COALESCE(
      NULLIF(BTRIM(nome_pagina),''), NULLIF(BTRIM(plataforma),'')
    ) IS NOT NULL),
    COUNT(*) FILTER (WHERE COALESCE(
      NULLIF(BTRIM(utm_id_campanha),''), NULLIF(BTRIM(utm_nome_campanha),''),
      NULLIF(BTRIM(utm_id_anuncio),''),  NULLIF(BTRIM(utm_nome_anuncio),''),
      NULLIF(BTRIM(nome_pagina),''),     NULLIF(BTRIM(plataforma),'')
    ) IS NULL)
  INTO v_total, v_trafego, v_organico, v_sem_rastreio
  FROM "cadastroClientes"
  WHERE p_lancamento IS NULL OR lancamento = p_lancamento;

  SELECT COUNT(*) INTO v_privado FROM "Privado"
    WHERE p_lancamento IS NULL OR lancamento = p_lancamento;

  SELECT COUNT(*) INTO v_grupos FROM grupos
    WHERE p_lancamento IS NULL OR lancamento = p_lancamento;

  -- B1 + B2 + B3: receita dos dois produtos, com o parser corrigido.
  -- O lancamento de cada venda ja vem resolvido pela vw_vendas_tag, entao aqui
  -- e uma comparacao direta — nada de subconsulta por linha.
  SELECT
    COUNT(*)              FILTER (WHERE s.produto = 'entrada'),
    COALESCE(SUM(s.valor) FILTER (WHERE s.produto = 'entrada'), 0),
    COUNT(*)              FILTER (WHERE s.produto = 'high'),
    COALESCE(SUM(s.valor) FILTER (WHERE s.produto = 'high'), 0)
  INTO v_compras, v_receita_entrada, v_aprovados, v_receita_high
  FROM vw_vendas_tag s
  WHERE p_lancamento IS NULL OR s.lancamento = p_lancamento;

  SELECT COALESCE(SUM(gasto::numeric), 0) INTO v_gasto FROM campaigns_bms
    WHERE p_lancamento IS NULL OR launch_tag = p_lancamento;

  RETURN json_build_object(
    'total_leads',        v_total,
    'leads_trafego',      v_trafego,
    'leads_organico',     v_organico,
    'leads_sem_rastreio', v_sem_rastreio,
    'privado',            v_privado,
    'grupos',             v_grupos,
    'compras',            v_compras,
    'total_gasto',        v_gasto,
    -- Receita dos dois produtos, separada e somada.
    'total_receita',        v_receita_entrada + v_receita_high,
    'receita_entrada',      v_receita_entrada,
    'receita_high_ticket',  v_receita_high,
    'compras_entrada',      v_compras,
    'compras_high_ticket',  v_aprovados,
    -- NULL (nao 0) quando nao da para calcular, para o dash exibir "—".
    'cpl',          CASE WHEN v_trafego > 0 THEN ROUND(v_gasto / v_trafego, 2) END,
    'conv_privado', CASE WHEN v_total   > 0 THEN ROUND(v_privado::numeric / v_total   * 100, 1) END,
    'conv_grupos',  CASE WHEN v_privado > 0 THEN ROUND(v_grupos::numeric  / v_privado * 100, 1) END,
    'conv_compra',  CASE WHEN v_total   > 0 THEN ROUND(v_compras::numeric / v_total   * 100, 1) END
  );
END;
$function$;


-- ────────────────────────────────────────────────────────────────────────────
-- 4) fn_receita_por_tag — o mesmo faturamento aberto por lancamento
--
-- Cada venda entra em UMA linha so, porque a vw_vendas_tag ja resolveu o
-- lancamento dela. Por isso a soma das linhas fecha exatamente com o total
-- geral. Venda sem lancamento cai em 'Sem tag'.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_receita_por_tag()
RETURNS TABLE (
  tag                 text,
  receita_entrada     numeric,
  receita_high_ticket numeric,
  receita_total       numeric,
  compras             bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT
    COALESCE(s.lancamento, 'Sem tag'),
    COALESCE(SUM(s.valor) FILTER (WHERE s.produto = 'entrada'), 0),
    COALESCE(SUM(s.valor) FILTER (WHERE s.produto = 'high'),    0),
    COALESCE(SUM(s.valor), 0),
    COUNT(*)
  FROM vw_vendas_tag s
  GROUP BY 1
  ORDER BY 4 DESC;
$function$;

COMMENT ON FUNCTION public.fn_receita_por_tag() IS
  'Faturamento por lancamento, aberto nos dois produtos. Cada venda conta uma vez; sem lancamento cai em "Sem tag". A soma das linhas fecha com fn_funil_kpis(NULL).';


-- ────────────────────────────────────────────────────────────────────────────
-- 5) RESULTADO — ultima instrucao do arquivo, entao e o que aparece na tela
--    depois do Run. Esperado na base de 2026-07-29:
--
--      antes         depois        entrada       high_ticket
--      40.077.502    1.395.026,66  400.748,02    994.278,64
--
--    Checagens mais fundas (fechamento por tag, plano de execucao) estao em
--    sql/verificacao.sql.
-- ────────────────────────────────────────────────────────────────────────────
SELECT
  40077502::numeric                                       AS antes,
  ROUND((public.fn_funil_kpis(NULL)->>'total_receita')::numeric, 2)       AS depois,
  ROUND((public.fn_funil_kpis(NULL)->>'receita_entrada')::numeric, 2)     AS entrada,
  ROUND((public.fn_funil_kpis(NULL)->>'receita_high_ticket')::numeric, 2) AS high_ticket,
  (SELECT COUNT(*) FROM public.fn_receita_por_tag())                      AS tags;
