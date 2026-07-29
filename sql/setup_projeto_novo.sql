-- ============================================================================
-- Setup do projeto NOVO (dgyujceulggrjuqoyncn) — Dashlara
--
-- Cria tudo que o dashboard chama. Roda de uma colada so no SQL Editor.
-- Idempotente: CREATE OR REPLACE / IF NOT EXISTS em tudo, pode rodar de novo.
--
-- DIFERENCAS em relacao ao projeto antigo, ja tratadas aqui:
--   - cadastroClientes.telefone e BIGINT (era text) -> casta para text antes
--     de normalizar. Privado.telefone e grupos.phone idem.
--   - cadastroClientes.data_criacao e TIMESTAMPTZ (era timestamp).
--   - grupos.phone tem lixo (valor 0) -> fn_norm_fone descarta.
--   - campaigns_bms.launch_tag chega 100% NULL, e a tag no nome da campanha
--     esta errada ([LA29JUL26] e [LA30JUL26] quando o certo e LA03AGOSTO26).
--     Resolvido no bloco 2b com a tabela lancamento_alias.
--
-- workcompra e mlcaprovado sao criadas VAZIAS, com a estrutura certa. O
-- faturamento aparece como R$ 0,00 ate voce carregar os dados; quando carregar,
-- passa a somar sozinho, sem precisar mexer em nada aqui.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- 1) Tabelas de venda (vazias por enquanto)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workcompra (
  email      text,
  telefone   text,
  created_at timestamptz,
  nome       text,
  valor      text
);

CREATE TABLE IF NOT EXISTS public.mlcaprovado (
  email      text,
  telefone   text,
  created_at timestamptz,
  nome       text,
  valor      text
);

COMMENT ON TABLE public.workcompra  IS 'Produto de ENTRADA (workshop). valor e text por compatibilidade com a origem.';
COMMENT ON TABLE public.mlcaprovado IS 'Produto HIGH TICKET. valor e text por compatibilidade com a origem.';

-- RLS ligada e sem policy: ninguem le direto pela API. As funcoes abaixo sao
-- SECURITY DEFINER, entao continuam enxergando os dados. Importante porque a
-- anon key fica exposta no navegador.
ALTER TABLE public.workcompra  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mlcaprovado ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────────────────────
-- 2) Helpers
-- ────────────────────────────────────────────────────────────────────────────

-- Valor monetario em text -> numeric. Aceita "865.08", "697", "1.997,00",
-- "R$ 1.997,00". Retorna 0 no que nao der para interpretar.
CREATE OR REPLACE FUNCTION public.fn_parse_valor(p_valor text)
RETURNS numeric
LANGUAGE plpgsql IMMUTABLE
AS $function$
DECLARE v text;
BEGIN
  IF p_valor IS NULL THEN RETURN 0; END IF;
  v := regexp_replace(p_valor, '[^0-9.,-]', '', 'g');
  IF v = '' OR v = '-' THEN RETURN 0; END IF;
  IF    v ~ ',[0-9]{1,2}$'  THEN v := replace(replace(v, '.', ''), ',', '.');
  ELSIF v ~ '\.[0-9]{1,2}$' THEN v := replace(v, ',', '');
  ELSE                           v := replace(replace(v, '.', ''), ',', '');
  END IF;
  IF v !~ '^-?[0-9]+(\.[0-9]+)?$' THEN RETURN 0; END IF;
  RETURN v::numeric;
EXCEPTION WHEN others THEN RETURN 0;
END;
$function$;

-- Telefone -> so digitos, ou NULL se nao for um numero plausivel.
-- Descarta o lixo que existe hoje em grupos.phone (valor 0).
CREATE OR REPLACE FUNCTION public.fn_norm_fone(p_fone text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $function$
  SELECT CASE
           WHEN length(regexp_replace(COALESCE(p_fone, ''), '\D', '', 'g')) >= 10
           THEN regexp_replace(COALESCE(p_fone, ''), '\D', '', 'g')
         END;
$function$;

-- Inteiro em text -> bigint, tolerante a vazio/lixo.
CREATE OR REPLACE FUNCTION public.fn_parse_int(p_v text)
RETURNS bigint
LANGUAGE sql IMMUTABLE
AS $function$
  SELECT COALESCE(NULLIF(regexp_replace(COALESCE(p_v, ''), '\D', '', 'g'), '')::bigint, 0);
$function$;


-- ────────────────────────────────────────────────────────────────────────────
-- 2b) Lancamento das campanhas
--
-- campaigns_bms.launch_tag chega NULL do processo de ingestao. A tag existe no
-- NOME da campanha, no formato "[LA29JUL26]_[CADASTRO]_...", mas o gestor
-- digita errado: hoje ha [LA29JUL26] (58 linhas) e [LA30JUL26] (6 linhas), e
-- as duas sao na verdade LA03AGOSTO26.
--
-- Por isso nao da para so extrair a tag do nome. A tabela de alias abaixo
-- traduz o que foi digitado para o lancamento de verdade. Quando o gestor
-- errar de novo, e uma linha aqui — nao mexe em funcao nenhuma.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lancamento_alias (
  alias      text PRIMARY KEY,   -- o que aparece entre colchetes no nome
  lancamento text NOT NULL       -- o lancamento de verdade
);

INSERT INTO public.lancamento_alias(alias, lancamento) VALUES
  ('LA29JUL26', 'LA03AGOSTO26'),
  ('LA30JUL26', 'LA03AGOSTO26')
ON CONFLICT (alias) DO UPDATE SET lancamento = EXCLUDED.lancamento;

ALTER TABLE public.lancamento_alias ENABLE ROW LEVEL SECURITY;

-- Campanha com o lancamento resolvido. Ordem de precedencia:
--   1. launch_tag, se um dia a ingestao passar a preencher
--   2. o alias traduzido
--   3. a tag crua do nome, quando nao houver alias cadastrado
CREATE OR REPLACE VIEW public.vw_campanhas AS
  SELECT
    b.*,
    COALESCE(
      NULLIF(BTRIM(b.launch_tag), ''),
      a.lancamento,
      t.tag_bruta
    ) AS lancamento
  FROM public.campaigns_bms b
  LEFT JOIN LATERAL (
    SELECT substring(b."Campanha" FROM '^\s*\[\s*([A-Za-z0-9]+)\s*\]') AS tag_bruta
  ) t ON TRUE
  LEFT JOIN public.lancamento_alias a ON a.alias = t.tag_bruta;

COMMENT ON VIEW public.vw_campanhas IS
  'campaigns_bms com o lancamento resolvido: launch_tag, senao alias traduzido, senao a tag crua do nome da campanha.';


-- Diagnostico: toda tag que aparece no nome das campanhas, e se ela tem alias.
--
-- O fallback para a tag crua e silencioso: quando um lancamento novo chega com
-- uma tag que ninguem cadastrou, o dash passa a mostra-la como se fosse um
-- lancamento proprio, e ninguem percebe. Foi assim que LA29JUL26 e LA30JUL26
-- passaram batido. Rode isto depois de cada lancamento novo: o que aparecer
-- com status 'SEM ALIAS' precisa de decisao — ou cadastrar o alias, ou
-- confirmar que a tag ja esta certa.
CREATE OR REPLACE VIEW public.vw_tags_campanha AS
  SELECT
    t.tag_bruta,
    a.lancamento                                  AS lancamento_mapeado,
    CASE WHEN a.alias IS NULL THEN 'SEM ALIAS — conferir'
         ELSE 'ok' END                            AS status,
    COUNT(*)                                      AS linhas,
    ROUND(SUM(b.gasto::numeric), 2)               AS gasto,
    MIN(b.data)                                   AS primeira_data,
    MAX(b.data)                                   AS ultima_data
  FROM public.campaigns_bms b
  LEFT JOIN LATERAL (
    SELECT substring(b."Campanha" FROM '^\s*\[\s*([A-Za-z0-9]+)\s*\]') AS tag_bruta
  ) t ON TRUE
  LEFT JOIN public.lancamento_alias a ON a.alias = t.tag_bruta
  GROUP BY t.tag_bruta, a.lancamento, a.alias
  ORDER BY 3, 5 DESC;

COMMENT ON VIEW public.vw_tags_campanha IS
  'Tags encontradas no nome das campanhas e se tem alias cadastrado. Rodar apos cada lancamento novo: SEM ALIAS = decisao pendente.';


-- ────────────────────────────────────────────────────────────────────────────
-- 3) Vendas
-- ────────────────────────────────────────────────────────────────────────────

-- Os dois produtos numa fonte so, sem linhas de teste e com valor numerico.
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

-- Cada venda com o lancamento resolvido.
-- REGRA: vale so o cadastro ANTERIOR a compra, e entre esses o mais recente.
-- Casar so por identidade credita a venda a qualquer lancamento em que a pessoa
-- um dia se cadastrou, inclusive um que nem existia quando ela comprou.
-- DISTINCT ON garante um cadastro por venda: cada venda conta uma unica vez, e
-- por isso a soma por tag fecha com o total geral.
CREATE OR REPLACE VIEW public.vw_vendas_tag AS
  WITH cad AS (
    SELECT
      lancamento,
      data_criacao,
      NULLIF(BTRIM(LOWER(email)), '')     AS chave_email,
      public.fn_norm_fone(telefone::text) AS chave_fone
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
    JOIN cad c ON c.chave_fone = public.fn_norm_fone(s.telefone)
    WHERE c.data_criacao <= s.data_compra
    ORDER BY s.venda_id, c.data_criacao DESC
  )
  SELECT s.produto, s.valor, COALESCE(e.lancamento, f.lancamento) AS lancamento
  FROM public.vw_vendas s
  LEFT JOIN por_email e ON e.venda_id = s.venda_id
  LEFT JOIN por_fone  f ON f.venda_id = s.venda_id;


-- ────────────────────────────────────────────────────────────────────────────
-- 4) Funil
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_funil_kpis(p_lancamento text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_total bigint; v_trafego bigint; v_organico bigint; v_sem_rastreio bigint;
  v_privado bigint; v_grupos bigint;
  v_compras bigint; v_aprovados bigint;
  v_gasto numeric; v_receita_entrada numeric; v_receita_high numeric;
BEGIN
  -- "trafego" = qualquer sinal de UTM em qualquer das 4 colunas. Olhar so
  -- utm_id_campanha nunca acerta: essa coluna vive vazia.
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE COALESCE(
      NULLIF(BTRIM(utm_id_campanha),''), NULLIF(BTRIM(utm_nome_campanha),''),
      NULLIF(BTRIM(utm_id_anuncio),''),  NULLIF(BTRIM(utm_nome_anuncio),'')) IS NOT NULL),
    COUNT(*) FILTER (WHERE COALESCE(
      NULLIF(BTRIM(utm_id_campanha),''), NULLIF(BTRIM(utm_nome_campanha),''),
      NULLIF(BTRIM(utm_id_anuncio),''),  NULLIF(BTRIM(utm_nome_anuncio),'')) IS NULL
      AND COALESCE(NULLIF(BTRIM(nome_pagina),''), NULLIF(BTRIM(plataforma),'')) IS NOT NULL),
    COUNT(*) FILTER (WHERE COALESCE(
      NULLIF(BTRIM(utm_id_campanha),''), NULLIF(BTRIM(utm_nome_campanha),''),
      NULLIF(BTRIM(utm_id_anuncio),''),  NULLIF(BTRIM(utm_nome_anuncio),''),
      NULLIF(BTRIM(nome_pagina),''),     NULLIF(BTRIM(plataforma),'')) IS NULL)
  INTO v_total, v_trafego, v_organico, v_sem_rastreio
  FROM "cadastroClientes"
  WHERE p_lancamento IS NULL OR lancamento = p_lancamento;

  SELECT COUNT(*) INTO v_privado FROM "Privado"
    WHERE p_lancamento IS NULL OR lancamento = p_lancamento;

  SELECT COUNT(*) INTO v_grupos FROM grupos
    WHERE p_lancamento IS NULL OR lancamento = p_lancamento;

  SELECT
    COUNT(*)              FILTER (WHERE s.produto = 'entrada'),
    COALESCE(SUM(s.valor) FILTER (WHERE s.produto = 'entrada'), 0),
    COUNT(*)              FILTER (WHERE s.produto = 'high'),
    COALESCE(SUM(s.valor) FILTER (WHERE s.produto = 'high'), 0)
  INTO v_compras, v_receita_entrada, v_aprovados, v_receita_high
  FROM vw_vendas_tag s
  WHERE p_lancamento IS NULL OR s.lancamento = p_lancamento;

  SELECT COALESCE(SUM(gasto::numeric), 0) INTO v_gasto FROM vw_campanhas
    WHERE p_lancamento IS NULL OR lancamento = p_lancamento;

  RETURN json_build_object(
    'total_leads',       v_total,
    'leads_trafego',     v_trafego,
    'leads_organico',    v_organico,
    'leads_sem_rastreio',v_sem_rastreio,
    'privado',           v_privado,
    'grupos',            v_grupos,
    'compras',           v_compras,
    'total_gasto',       v_gasto,
    'total_receita',       v_receita_entrada + v_receita_high,
    'receita_entrada',     v_receita_entrada,
    'receita_high_ticket', v_receita_high,
    'compras_entrada',     v_compras,
    'compras_high_ticket', v_aprovados,
    -- NULL (nao 0) quando nao da para calcular: o dash exibe "—".
    'cpl',          CASE WHEN v_trafego > 0 THEN ROUND(v_gasto / v_trafego, 2) END,
    'conv_privado', CASE WHEN v_total   > 0 THEN ROUND(v_privado::numeric / v_total   * 100, 1) END,
    'conv_grupos',  CASE WHEN v_privado > 0 THEN ROUND(v_grupos::numeric  / v_privado * 100, 1) END,
    'conv_compra',  CASE WHEN v_total   > 0 THEN ROUND(v_compras::numeric / v_total   * 100, 1) END
  );
END;
$function$;


CREATE OR REPLACE FUNCTION public.fn_receita_por_tag()
RETURNS TABLE (tag text, receita_entrada numeric, receita_high_ticket numeric,
               receita_total numeric, compras bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
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


CREATE OR REPLACE FUNCTION public.fn_lancamentos()
RETURNS TABLE (lancamento text, total bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $function$
  SELECT c.lancamento, COUNT(*)
  FROM "cadastroClientes" c
  WHERE c.lancamento IS NOT NULL AND BTRIM(c.lancamento) <> ''
  GROUP BY c.lancamento
  ORDER BY 2 DESC;
$function$;


CREATE OR REPLACE FUNCTION public.fn_leads_over_time(
  p_lancamento text DEFAULT NULL, p_days int DEFAULT 60)
RETURNS TABLE (dia date, total bigint, trafego bigint, organico bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $function$
  SELECT
    c.data_criacao::date,
    COUNT(*),
    COUNT(*) FILTER (WHERE COALESCE(
      NULLIF(BTRIM(c.utm_id_campanha),''), NULLIF(BTRIM(c.utm_nome_campanha),''),
      NULLIF(BTRIM(c.utm_id_anuncio),''),  NULLIF(BTRIM(c.utm_nome_anuncio),'')) IS NOT NULL),
    COUNT(*) FILTER (WHERE COALESCE(
      NULLIF(BTRIM(c.utm_id_campanha),''), NULLIF(BTRIM(c.utm_nome_campanha),''),
      NULLIF(BTRIM(c.utm_id_anuncio),''),  NULLIF(BTRIM(c.utm_nome_anuncio),'')) IS NULL)
  FROM "cadastroClientes" c
  WHERE c.data_criacao IS NOT NULL
    AND c.data_criacao >= (CURRENT_DATE - GREATEST(COALESCE(p_days, 60), 1))
    AND (p_lancamento IS NULL OR c.lancamento = p_lancamento)
  GROUP BY 1
  ORDER BY 1;
$function$;


-- ────────────────────────────────────────────────────────────────────────────
-- 5) Midia paga
--
-- ⚠️ campaigns_bms.launch_tag esta NULL nas 64 linhas de hoje. Enquanto ficar
--    assim, filtrar por lancamento devolve ZERO aqui — a visao "Todos" e a
--    unica com numero. Para o filtro funcionar, o processo que popula a
--    campaigns_bms precisa gravar launch_tag.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_campaigns_kpis(p_lancamento text DEFAULT NULL)
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $function$
  WITH t AS (
    SELECT COALESCE(SUM(gasto::numeric), 0)              AS gasto,
           COALESCE(SUM(public.fn_parse_int(leads)), 0)  AS leads,
           COALESCE(SUM(impressoes), 0)                  AS impressoes,
           COALESCE(SUM(clicks), 0)                      AS clicks,
           COALESCE(SUM(reach), 0)                       AS reach
    FROM vw_campanhas
    WHERE p_lancamento IS NULL OR lancamento = p_lancamento
  )
  SELECT json_build_object(
    'total_gasto',      ROUND(gasto, 2),
    'total_leads',      leads,
    'total_impressoes', impressoes,
    'total_clicks',     clicks,
    'total_reach',      reach,
    'cpl', CASE WHEN leads      > 0 THEN ROUND(gasto / leads, 2) END,
    'cpm', CASE WHEN impressoes > 0 THEN ROUND(gasto / impressoes * 1000, 2) END,
    'cpc', CASE WHEN clicks     > 0 THEN ROUND(gasto / clicks, 2) END,
    'ctr', CASE WHEN impressoes > 0 THEN ROUND(clicks::numeric / impressoes * 100, 2) END
  ) FROM t;
$function$;


CREATE OR REPLACE FUNCTION public.fn_campaigns_by_date(p_lancamento text DEFAULT NULL)
RETURNS TABLE (data date, gasto numeric, leads bigint, impressoes bigint,
               clicks bigint, cpl numeric, cpm numeric, cpc numeric, ctr numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $function$
  WITH t AS (
    SELECT b.data::date AS d,
           SUM(b.gasto::numeric)             AS g,
           SUM(public.fn_parse_int(b.leads)) AS l,
           SUM(b.impressoes)                 AS i,
           SUM(b.clicks)                     AS c
    FROM vw_campanhas b
    WHERE b.data ~ '^\d{4}-\d{2}-\d{2}'      -- ignora data em formato inesperado
      AND (p_lancamento IS NULL OR b.lancamento = p_lancamento)
    GROUP BY 1
  )
  SELECT d, ROUND(g, 2), l, i, c,
         CASE WHEN l > 0 THEN ROUND(g / l, 2) END,
         CASE WHEN i > 0 THEN ROUND(g / i * 1000, 2) END,
         CASE WHEN c > 0 THEN ROUND(g / c, 2) END,
         CASE WHEN i > 0 THEN ROUND(c::numeric / i * 100, 2) END
  FROM t ORDER BY d;
$function$;


CREATE OR REPLACE FUNCTION public.fn_campaigns_by_campanha(p_lancamento text DEFAULT NULL)
RETURNS TABLE (campanha text, gasto numeric, leads bigint, impressoes bigint,
               clicks bigint, cpl numeric, cpm numeric, cpc numeric, ctr numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $function$
  WITH t AS (
    SELECT COALESCE(NULLIF(BTRIM(b."Campanha"), ''), 'sem campanha') AS k,
           SUM(b.gasto::numeric)             AS g,
           SUM(public.fn_parse_int(b.leads)) AS l,
           SUM(b.impressoes)                 AS i,
           SUM(b.clicks)                     AS c
    FROM vw_campanhas b
    WHERE p_lancamento IS NULL OR b.lancamento = p_lancamento
    GROUP BY 1
  )
  SELECT k, ROUND(g, 2), l, i, c,
         CASE WHEN l > 0 THEN ROUND(g / l, 2) END,
         CASE WHEN i > 0 THEN ROUND(g / i * 1000, 2) END,
         CASE WHEN c > 0 THEN ROUND(g / c, 2) END,
         CASE WHEN i > 0 THEN ROUND(c::numeric / i * 100, 2) END
  FROM t ORDER BY 2 DESC;
$function$;


CREATE OR REPLACE FUNCTION public.fn_campaigns_by_conjunto(p_lancamento text DEFAULT NULL)
RETURNS TABLE (conjunto text, gasto numeric, leads bigint, clicks bigint,
               cpl numeric, cpc numeric, ctr numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $function$
  WITH t AS (
    SELECT COALESCE(NULLIF(BTRIM(b."Conjunto"), ''), 'sem conjunto') AS k,
           SUM(b.gasto::numeric)             AS g,
           SUM(public.fn_parse_int(b.leads)) AS l,
           SUM(b.impressoes)                 AS i,
           SUM(b.clicks)                     AS c
    FROM vw_campanhas b
    WHERE p_lancamento IS NULL OR b.lancamento = p_lancamento
    GROUP BY 1
  )
  SELECT k, ROUND(g, 2), l, c,
         CASE WHEN l > 0 THEN ROUND(g / l, 2) END,
         CASE WHEN c > 0 THEN ROUND(g / c, 2) END,
         CASE WHEN i > 0 THEN ROUND(c::numeric / i * 100, 2) END
  FROM t ORDER BY 2 DESC;
$function$;


CREATE OR REPLACE FUNCTION public.fn_campaigns_by_anuncio(p_lancamento text DEFAULT NULL)
RETURNS TABLE (anuncio text, gasto numeric, leads bigint, clicks bigint,
               cpl numeric, cpc numeric, ctr numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $function$
  WITH t AS (
    SELECT COALESCE(NULLIF(BTRIM(b.ad), ''), 'sem anuncio') AS k,
           SUM(b.gasto::numeric)             AS g,
           SUM(public.fn_parse_int(b.leads)) AS l,
           SUM(b.impressoes)                 AS i,
           SUM(b.clicks)                     AS c
    FROM vw_campanhas b
    WHERE p_lancamento IS NULL OR b.lancamento = p_lancamento
    GROUP BY 1
  )
  SELECT k, ROUND(g, 2), l, c,
         CASE WHEN l > 0 THEN ROUND(g / l, 2) END,
         CASE WHEN c > 0 THEN ROUND(g / c, 2) END,
         CASE WHEN i > 0 THEN ROUND(c::numeric / i * 100, 2) END
  FROM t ORDER BY 2 DESC;
$function$;


-- ────────────────────────────────────────────────────────────────────────────
-- 6) Permissoes — o dashboard usa a ANON key.
-- ────────────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.fn_funil_kpis(text)                TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_receita_por_tag()               TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_lancamentos()                   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_leads_over_time(text, int)      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_campaigns_kpis(text)            TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_campaigns_by_date(text)         TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_campaigns_by_campanha(text)     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_campaigns_by_conjunto(text)     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_campaigns_by_anuncio(text)      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_parse_valor(text)               TO anon, authenticated;


-- ────────────────────────────────────────────────────────────────────────────
-- 7) RESULTADO — ultima instrucao, e o que aparece depois do Run.
--    receita 0 e esperado enquanto workcompra/mlcaprovado estiverem vazias.
-- ────────────────────────────────────────────────────────────────────────────
-- Tags das campanhas: o que estiver 'SEM ALIAS' precisa de decisao.
SELECT * FROM public.vw_tags_campanha;

SELECT
  (public.fn_funil_kpis(NULL)->>'total_leads')::bigint    AS leads,
  (public.fn_funil_kpis(NULL)->>'privado')::bigint        AS privado,
  (public.fn_funil_kpis(NULL)->>'grupos')::bigint         AS grupos,
  (public.fn_funil_kpis(NULL)->>'total_gasto')::numeric   AS gasto,
  (public.fn_funil_kpis(NULL)->>'total_receita')::numeric AS receita,
  (SELECT COUNT(*) FROM public.fn_lancamentos())          AS lancamentos,
  (SELECT COUNT(*) FROM public.fn_campaigns_by_date(NULL))AS dias_de_midia;
