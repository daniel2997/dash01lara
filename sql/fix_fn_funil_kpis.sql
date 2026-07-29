-- ============================================================================
-- Correcao da fn_funil_kpis — dashboard Dashlara / evento laracastilho
--
-- Bugs corrigidos:
--   B1  compras e receita somavam workcompra INTEIRA, ignorando p_lancamento
--   B2  leads_trafego sempre 0 (utm_id_campanha esta 100% NULL na base)
--   B3  cpl sempre 0 (consequencia de B2: divisao guardada por v_trafego > 0)
--   B4  leads_sem_rastreio dava 0 por construcao (total - trafego - organico,
--       com trafego e organico complementares → sempre 0)
--   B5  parsing de workcompra.valor: "1997.00" virava 199700 (100x) e
--       "1.997,00" virava 0 (regex rejeitava dois separadores)
--   B6  receita ignorava a tabela mlcaprovado por completo. workcompra e o
--       produto de ENTRADA (ticket medio R$ 27,61); mlcaprovado e o HIGH
--       TICKET (ticket medio R$ 681,95, 1.459 linhas, ~R$ 994 mil). O
--       dashboard somava so a entrada — e ainda 100x inflada, o que por
--       coincidencia produzia um numero grande e mascarava a ausencia.
--   B7  linhas de teste entravam na receita (teste@gmail.com em workcompra,
--       testeComprador...@example.com em mlcaprovado — R$ 1.527 somados).
--   B8  nao havia como ver a receita SEM TAG. So ~43% das compras casam com
--       algum cadastro que tenha lancamento, entao a soma dos lancamentos fica
--       bem abaixo do faturamento real. Sem expor o balde orfao, o dashboard
--       sugere que o resto simplesmente nao existe.
--
-- NAO altera: fn_campaigns_kpis e fn_lancamentos (ambas corretas).
--
-- ⚠️ LER ANTES DE RODAR: os blocos marcados [DECISAO] mudam a definicao de
--    metrica. Revise se concorda com o criterio antes de aplicar.
-- ============================================================================


-- ############################################################################
-- 0) INDICES — RODAR ESTE BLOCO PRIMEIRO, E SOZINHO
--
-- ⚠️ A fn_funil_kpis(null) JA estoura o statement timeout de forma
--    intermitente hoje (erro 57014). A correcao do B1 adiciona um EXISTS
--    correlacionando workcompra x cadastroClientes por email e telefone —
--    sem estes indices isso vira seq scan por linha e o timeout deixa de ser
--    intermitente e passa a ser permanente.
--
-- CONCURRENTLY nao roda dentro de transacao. No SQL Editor do Supabase,
-- execute UMA instrucao por vez (selecione a linha e rode), ou remova o
-- CONCURRENTLY se puder segurar lock de escrita por alguns segundos.
-- ############################################################################

-- Filtro de lancamento (usado em toda chamada)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cadastro_lancamento
  ON public."cadastroClientes" (lancamento);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_privado_lancamento
  ON public."Privado" (lancamento);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grupos_lancamento
  ON public.grupos (lancamento);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_launch_tag
  ON public.campaigns_bms (launch_tag);

-- Chaves de atribuicao de compra → lancamento (indices de EXPRESSAO: precisam
-- casar exatamente com a expressao usada na funcao, senao nao sao usados)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cadastro_email_norm
  ON public."cadastroClientes" (BTRIM(LOWER(email)));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cadastro_fone_norm
  ON public."cadastroClientes" ((regexp_replace(COALESCE(telefone, ''), '\D', '', 'g')));

-- Cobre o par (lancamento, chave) — e o formato que o EXISTS realmente busca
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cadastro_lanc_email
  ON public."cadastroClientes" (lancamento, BTRIM(LOWER(email)));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cadastro_lanc_fone
  ON public."cadastroClientes" (lancamento, (regexp_replace(COALESCE(telefone, ''), '\D', '', 'g')));

-- B8: o balde "sem tag" pergunta se existe QUALQUER cadastro com lancamento
-- para aquele email/telefone. Indice parcial serve exatamente a esse predicado
-- e e bem menor que o total (so ~63% dos cadastros tem lancamento).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cadastro_email_com_tag
  ON public."cadastroClientes" (BTRIM(LOWER(email)))
  WHERE lancamento IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cadastro_fone_com_tag
  ON public."cadastroClientes" ((regexp_replace(COALESCE(telefone, ''), '\D', '', 'g')))
  WHERE lancamento IS NOT NULL;

-- B6: mlcaprovado entra no calculo de receita e e atribuida por email/telefone
-- exatamente como workcompra — precisa dos mesmos indices do lado dela.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mlcaprovado_email_norm
  ON public.mlcaprovado (BTRIM(LOWER(email)));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mlcaprovado_fone_norm
  ON public.mlcaprovado ((regexp_replace(COALESCE(telefone, ''), '\D', '', 'g')));

ANALYZE public."cadastroClientes";
ANALYZE public."Privado";
ANALYZE public.grupos;
ANALYZE public.campaigns_bms;
ANALYZE public.workcompra;
ANALYZE public.mlcaprovado;


-- ────────────────────────────────────────────────────────────────────────────
-- 1) Helper: normaliza valor monetario em text para numeric
--    Trata pt-BR ("1.997,00"), en-US ("1,997.00"), simples ("1997") e sujeira
--    ("R$ 1.997,00"). Retorna 0 para o que nao for interpretavel.
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

  -- remove tudo que nao for digito, separador ou sinal negativo
  v := regexp_replace(p_valor, '[^0-9.,-]', '', 'g');
  IF v = '' OR v = '-' THEN RETURN 0; END IF;

  IF v ~ ',[0-9]{1,2}$' THEN
    -- decimal e virgula (pt-BR): ponto é milhar
    v := replace(replace(v, '.', ''), ',', '.');
  ELSIF v ~ '\.[0-9]{1,2}$' THEN
    -- decimal e ponto (en-US): virgula é milhar
    v := replace(v, ',', '');
  ELSE
    -- sem parte decimal reconhecivel: ambos os separadores sao milhar
    v := replace(replace(v, '.', ''), ',', '');
  END IF;

  IF v !~ '^-?[0-9]+(\.[0-9]+)?$' THEN RETURN 0; END IF;
  RETURN v::numeric;
EXCEPTION WHEN others THEN
  RETURN 0;
END;
$function$;

COMMENT ON FUNCTION public.fn_parse_valor(text) IS
  'Converte valor monetario em text para numeric, aceitando formato pt-BR e en-US. Retorna 0 se nao interpretavel.';


-- ────────────────────────────────────────────────────────────────────────────
-- 2) fn_funil_kpis corrigida
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
  v_receita_entrada numeric; v_receita_high numeric; v_receita numeric;
  v_receita_total_geral numeric;
  -- B8: balde orfao (compra que nao casa com nenhum cadastro com lancamento).
  -- _e = entrada/workcompra, _h = high ticket/mlcaprovado.
  v_compras_sem_tag_e bigint; v_receita_sem_tag_e numeric;
  v_compras_sem_tag_h bigint; v_receita_sem_tag_h numeric;
  v_compras_sem_tag   bigint; v_receita_sem_tag   numeric;
BEGIN
  -- ── Leads, com a classificacao de origem em 3 baldes mutuamente exclusivos ──
  -- [DECISAO] B2/B4: o criterio antigo (utm_id_campanha IS NOT NULL) nunca
  -- acertava, porque a coluna esta sempre NULL. Aqui consideramos "trafego"
  -- qualquer lead com ALGUM sinal de UTM preenchido, em qualquer das 4 colunas
  -- (id/nome de campanha, id/nome de anuncio), tratando string vazia como
  -- ausente. Se o rastreamento passar a gravar utm_id_campanha, continua valendo.
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE
      COALESCE(
        NULLIF(BTRIM(utm_id_campanha),   ''),
        NULLIF(BTRIM(utm_nome_campanha), ''),
        NULLIF(BTRIM(utm_id_anuncio),    ''),
        NULLIF(BTRIM(utm_nome_anuncio),  '')
      ) IS NOT NULL
    ),
    -- organico: sem UTM, mas sabemos de onde veio (pagina ou plataforma)
    COUNT(*) FILTER (WHERE
      COALESCE(
        NULLIF(BTRIM(utm_id_campanha),   ''),
        NULLIF(BTRIM(utm_nome_campanha), ''),
        NULLIF(BTRIM(utm_id_anuncio),    ''),
        NULLIF(BTRIM(utm_nome_anuncio),  '')
      ) IS NULL
      AND COALESCE(
        NULLIF(BTRIM(nome_pagina), ''),
        NULLIF(BTRIM(plataforma),  '')
      ) IS NOT NULL
    ),
    -- sem rastreio: nem UTM, nem pagina, nem plataforma
    COUNT(*) FILTER (WHERE
      COALESCE(
        NULLIF(BTRIM(utm_id_campanha),   ''),
        NULLIF(BTRIM(utm_nome_campanha), ''),
        NULLIF(BTRIM(utm_id_anuncio),    ''),
        NULLIF(BTRIM(utm_nome_anuncio),  ''),
        NULLIF(BTRIM(nome_pagina),       ''),
        NULLIF(BTRIM(plataforma),        '')
      ) IS NULL
    )
  INTO v_total, v_trafego, v_organico, v_sem_rastreio
  FROM "cadastroClientes"
  WHERE p_lancamento IS NULL OR lancamento = p_lancamento;

  -- ── Etapas do funil ────────────────────────────────────────────────────────
  SELECT COUNT(*) INTO v_privado FROM "Privado"
    WHERE p_lancamento IS NULL OR lancamento = p_lancamento;

  SELECT COUNT(*) INTO v_grupos FROM grupos
    WHERE p_lancamento IS NULL OR lancamento = p_lancamento;

  -- ── B1: compras e receita AGORA filtradas por lancamento ───────────────────
  -- [DECISAO] workcompra nao guarda lancamento, entao a compra e atribuida ao
  -- lancamento via cadastroClientes, casando por email (case/space-insensitive)
  -- ou por telefone (so digitos). EXISTS evita multiplicar a compra quando ha
  -- mais de um cadastro do mesmo lead.
  --
  -- B7: linhas de teste ficam fora da receita.
  --
  -- B8: o mesmo scan ja classifica a compra como SEM TAG — nao casa com NENHUM
  --     cadastro que tenha lancamento preenchido. Calcular aqui, via FILTER, e
  --     nao numa query separada, evita uma segunda varredura da workcompra
  --     inteira. Note que "sem tag" NAO depende de p_lancamento: e sempre o
  --     balde orfao global, e por isso nao muda quando voce troca o filtro.
  SELECT
    COUNT(*)        FILTER (WHERE no_escopo),
    COALESCE(SUM(v) FILTER (WHERE no_escopo), 0),
    COUNT(*)        FILTER (WHERE NOT tem_tag),
    COALESCE(SUM(v) FILTER (WHERE NOT tem_tag), 0)
  INTO v_compras, v_receita_entrada, v_compras_sem_tag_e, v_receita_sem_tag_e
  FROM (
    SELECT
      public.fn_parse_valor(w.valor) AS v,           -- B5: parser corrigido
      ( p_lancamento IS NULL
        OR EXISTS (
             SELECT 1 FROM "cadastroClientes" c
             WHERE c.lancamento = p_lancamento
               AND ( (   NULLIF(BTRIM(LOWER(c.email)), '') IS NOT NULL
                     AND BTRIM(LOWER(c.email)) = BTRIM(LOWER(w.email)) )
                  OR (   NULLIF(regexp_replace(COALESCE(w.telefone, ''), '\D', '', 'g'), '') IS NOT NULL
                     AND regexp_replace(COALESCE(c.telefone, ''), '\D', '', 'g')
                       = regexp_replace(COALESCE(w.telefone, ''), '\D', '', 'g') ) )
           ) ) AS no_escopo,
      EXISTS (
        SELECT 1 FROM "cadastroClientes" c
        WHERE c.lancamento IS NOT NULL
          AND ( (   NULLIF(BTRIM(LOWER(c.email)), '') IS NOT NULL
                AND BTRIM(LOWER(c.email)) = BTRIM(LOWER(w.email)) )
             OR (   NULLIF(regexp_replace(COALESCE(w.telefone, ''), '\D', '', 'g'), '') IS NOT NULL
                AND regexp_replace(COALESCE(c.telefone, ''), '\D', '', 'g')
                  = regexp_replace(COALESCE(w.telefone, ''), '\D', '', 'g') ) )
      ) AS tem_tag
    FROM workcompra w
    WHERE BTRIM(LOWER(COALESCE(w.email, ''))) NOT LIKE '%example.com'
      AND BTRIM(LOWER(COALESCE(w.email, ''))) NOT LIKE 'teste@%'
  ) t;

  -- ── B6: receita do HIGH TICKET (mlcaprovado) ───────────────────────────────
  -- workcompra e o produto de ENTRADA (ticket medio R$ 27,61). mlcaprovado e o
  -- HIGH TICKET (ticket medio R$ 681,95) e estava fora da receita por completo.
  --
  -- [DECISAO] soma CHEIA da coluna valor. Os valores vao de ~R$ 60 a R$ 1.500 e
  -- os altos (865.08, 740.88, 771.65) tem cara de preco com juros de
  -- parcelamento. Se os baixos (61.74, 72.09) forem PRIMEIRA PARCELA e nao
  -- venda cheia, esta soma superestima — nesse caso troque o SUM por
  --   SUM(public.fn_parse_valor(m.valor)) FILTER (WHERE public.fn_parse_valor(m.valor) >= 500)
  -- Atribuicao por lancamento identica a de workcompra, e mesmo balde B8.
  SELECT
    COUNT(*)        FILTER (WHERE no_escopo),
    COALESCE(SUM(v) FILTER (WHERE no_escopo), 0),
    COUNT(*)        FILTER (WHERE NOT tem_tag),
    COALESCE(SUM(v) FILTER (WHERE NOT tem_tag), 0)
  INTO v_aprovados, v_receita_high, v_compras_sem_tag_h, v_receita_sem_tag_h
  FROM (
    SELECT
      public.fn_parse_valor(m.valor) AS v,
      ( p_lancamento IS NULL
        OR EXISTS (
             SELECT 1 FROM "cadastroClientes" c
             WHERE c.lancamento = p_lancamento
               AND ( (   NULLIF(BTRIM(LOWER(c.email)), '') IS NOT NULL
                     AND BTRIM(LOWER(c.email)) = BTRIM(LOWER(m.email)) )
                  OR (   NULLIF(regexp_replace(COALESCE(m.telefone, ''), '\D', '', 'g'), '') IS NOT NULL
                     AND regexp_replace(COALESCE(c.telefone, ''), '\D', '', 'g')
                       = regexp_replace(COALESCE(m.telefone, ''), '\D', '', 'g') ) )
           ) ) AS no_escopo,
      EXISTS (
        SELECT 1 FROM "cadastroClientes" c
        WHERE c.lancamento IS NOT NULL
          AND ( (   NULLIF(BTRIM(LOWER(c.email)), '') IS NOT NULL
                AND BTRIM(LOWER(c.email)) = BTRIM(LOWER(m.email)) )
             OR (   NULLIF(regexp_replace(COALESCE(m.telefone, ''), '\D', '', 'g'), '') IS NOT NULL
                AND regexp_replace(COALESCE(c.telefone, ''), '\D', '', 'g')
                  = regexp_replace(COALESCE(m.telefone, ''), '\D', '', 'g') ) )
      ) AS tem_tag
    FROM mlcaprovado m
    WHERE BTRIM(LOWER(COALESCE(m.email, ''))) NOT LIKE '%example.com'
      AND BTRIM(LOWER(COALESCE(m.email, ''))) NOT LIKE 'teste@%'
  ) t;

  v_receita         := v_receita_entrada   + v_receita_high;
  v_compras_sem_tag := v_compras_sem_tag_e + v_compras_sem_tag_h;
  v_receita_sem_tag := v_receita_sem_tag_e + v_receita_sem_tag_h;

  -- Receita GERAL (sem filtro de lancamento). Serve so para o dashboard saber
  -- quanto da receita a atribuicao por lancamento deixou de cobrir — a cobertura
  -- e de ~43%, entao exibir o valor filtrado sem esse contexto passa a impressao
  -- de que o lancamento vendeu pouco, quando na verdade a compra nao casou com
  -- nenhum cadastro. Ver bloco 3e.
  IF p_lancamento IS NULL THEN
    v_receita_total_geral := v_receita;
  ELSE
    SELECT
      COALESCE(SUM(public.fn_parse_valor(w.valor)), 0)
      + (SELECT COALESCE(SUM(public.fn_parse_valor(m.valor)), 0)
           FROM mlcaprovado m
          WHERE BTRIM(LOWER(COALESCE(m.email, ''))) NOT LIKE '%example.com'
            AND BTRIM(LOWER(COALESCE(m.email, ''))) NOT LIKE 'teste@%')
    INTO v_receita_total_geral
    FROM workcompra w
    WHERE BTRIM(LOWER(COALESCE(w.email, ''))) NOT LIKE '%example.com'
      AND BTRIM(LOWER(COALESCE(w.email, ''))) NOT LIKE 'teste@%';
  END IF;

  -- ── Investimento (ja estava correto) ───────────────────────────────────────
  SELECT COALESCE(SUM(gasto::numeric), 0) INTO v_gasto FROM campaigns_bms
    WHERE p_lancamento IS NULL OR launch_tag = p_lancamento;

  RETURN json_build_object(
    'total_leads',        v_total,
    'leads_trafego',      v_trafego,
    'leads_organico',     v_organico,
    'leads_sem_rastreio', v_sem_rastreio,   -- B4: agora e um balde de verdade
    'privado',            v_privado,
    'grupos',             v_grupos,
    'compras',            v_compras,
    'total_gasto',        v_gasto,
    -- B6: total agora e entrada + high ticket. As parcelas vao separadas para o
    -- dashboard poder mostrar a composicao — um total unico esconde que sao
    -- dois produtos com ticket 25x diferente.
    'total_receita',        v_receita,
    'receita_entrada',      v_receita_entrada,
    'receita_high_ticket',  v_receita_high,
    'compras_entrada',      v_compras,
    'compras_high_ticket',  v_aprovados,
    -- B8: receita que nao casa com nenhum lancamento. Valor GLOBAL — nao muda
    -- com o filtro. Exibir isso e o que impede o dashboard de dar a entender
    -- que a soma dos lancamentos e o faturamento total.
    'receita_sem_tag',      v_receita_sem_tag,
    'compras_sem_tag',      v_compras_sem_tag,
    -- Faturamento sem filtro nenhum. Igual a total_receita na visao geral; com
    -- filtro, e o denominador que da sentido a receita_sem_tag e a cobertura.
    'receita_total_geral',  v_receita_total_geral,
    -- % da receita geral que este lancamento conseguiu atribuir. NULL na visao
    -- geral (onde nao ha o que atribuir). Ver comentario em v_receita_total_geral.
    'cobertura_receita',  CASE WHEN p_lancamento IS NOT NULL AND v_receita_total_geral > 0
                               THEN ROUND(v_receita / v_receita_total_geral * 100, 1) END,
    -- B3: CPL sobre leads de trafego; volta NULL (nao 0) quando nao da para
    -- calcular, para o dashboard poder exibir "—" em vez de "R$ 0,00".
    'cpl',          CASE WHEN v_trafego > 0 THEN ROUND(v_gasto / v_trafego, 2) END,
    'conv_privado', CASE WHEN v_total   > 0 THEN ROUND(v_privado::numeric / v_total   * 100, 1) END,
    'conv_grupos',  CASE WHEN v_privado > 0 THEN ROUND(v_grupos::numeric  / v_privado * 100, 1) END,
    'conv_compra',  CASE WHEN v_total   > 0 THEN ROUND(v_compras::numeric / v_total   * 100, 1) END
  );
END;
$function$;


-- ────────────────────────────────────────────────────────────────────────────
-- 3) VERIFICACAO — rodar depois de aplicar os blocos 0 a 2
-- ────────────────────────────────────────────────────────────────────────────

-- 3a) Tempo da chamada mais pesada (o agregado geral). Se passar de ~5s,
--     os indices do bloco 0 nao foram criados ou nao estao sendo usados.
EXPLAIN (ANALYZE, BUFFERS) SELECT public.fn_funil_kpis(NULL);

-- 3b) Um lancamento pequeno: compras/receita tem de ser MENORES que o geral
SELECT 'LA03AGOSTO26' AS escopo, public.fn_funil_kpis('LA03AGOSTO26') AS kpis
UNION ALL
SELECT 'GERAL',        public.fn_funil_kpis(NULL);

-- 3c) O parser de valor: conferir que nenhum formato real vira 0 ou 100x
SELECT
  valor                              AS valor_bruto,
  public.fn_parse_valor(valor)       AS convertido,
  COUNT(*)                           AS ocorrencias
FROM public.workcompra
GROUP BY valor
ORDER BY ocorrencias DESC
LIMIT 30;

-- 3d) Receita: antes x depois. Valores esperados na base de 2026-07-29:
--       receita_formula_antiga = 40.077.502,00  <- o que o dashboard exibia
--       entrada_corrigida      =    400.748,02  (100x menor, B5 + B7)
--       high_ticket            =    994.278,64  (estava faltando, B6)
--       TOTAL REAL             =  1.395.026,66
SELECT
  COALESCE(SUM(CASE WHEN valor ~ '^[0-9]+([.,][0-9]+)?$'
    THEN REPLACE(REPLACE(valor,'.',''),',','.')::numeric ELSE 0 END), 0) AS receita_formula_antiga,
  COALESCE(SUM(public.fn_parse_valor(valor)) FILTER (
    WHERE BTRIM(LOWER(COALESCE(email,''))) NOT LIKE '%example.com'
      AND BTRIM(LOWER(COALESCE(email,''))) NOT LIKE 'teste@%'), 0)        AS entrada_corrigida,
  (SELECT COALESCE(SUM(public.fn_parse_valor(valor)), 0) FROM public.mlcaprovado
    WHERE BTRIM(LOWER(COALESCE(email,''))) NOT LIKE '%example.com'
      AND BTRIM(LOWER(COALESCE(email,''))) NOT LIKE 'teste@%')            AS high_ticket,
  COUNT(*)                                                                AS compras
FROM public.workcompra;

-- 3f) Composicao do high ticket. Confirma a [DECISAO] do B6: se as faixas
--     baixas (abaixo de ~R$ 300) forem primeira parcela e nao venda cheia,
--     aplique o filtro de piso comentado na funcao.
SELECT
  CASE WHEN public.fn_parse_valor(valor) <  300 THEN 'a) < 300  (parcela?)'
       WHEN public.fn_parse_valor(valor) <  600 THEN 'b) 300-600'
       WHEN public.fn_parse_valor(valor) < 1000 THEN 'c) 600-1000'
       ELSE                                          'd) >= 1000' END AS faixa,
  COUNT(*)                                    AS linhas,
  ROUND(SUM(public.fn_parse_valor(valor)), 2) AS soma
FROM public.mlcaprovado
WHERE BTRIM(LOWER(COALESCE(email,''))) NOT LIKE '%example.com'
  AND BTRIM(LOWER(COALESCE(email,''))) NOT LIKE 'teste@%'
GROUP BY 1 ORDER BY 1;

-- 3e) Quantas compras conseguem ser atribuidas a algum lancamento.
--     Se a cobertura for baixa, "compras por lancamento" continua incompleto
--     e o numero honesto no dashboard e "nao atribuivel", nao um total menor.
SELECT
  COUNT(*)                                                    AS compras_total,
  COUNT(*) FILTER (WHERE atribuida)                           AS atribuidas,
  ROUND(100.0 * COUNT(*) FILTER (WHERE atribuida) / NULLIF(COUNT(*),0), 1) AS pct_cobertura
FROM (
  SELECT EXISTS (
    SELECT 1 FROM public."cadastroClientes" c
    WHERE c.lancamento IS NOT NULL
      AND ( ( NULLIF(BTRIM(LOWER(c.email)), '') IS NOT NULL
              AND BTRIM(LOWER(c.email)) = BTRIM(LOWER(w.email)) )
         OR ( NULLIF(regexp_replace(COALESCE(w.telefone,''), '\D','','g'), '') IS NOT NULL
              AND regexp_replace(COALESCE(c.telefone,''), '\D','','g')
                = regexp_replace(COALESCE(w.telefone,''), '\D','','g') ) )
  ) AS atribuida
  FROM public.workcompra w
) t;
