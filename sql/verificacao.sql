-- ============================================================================
-- Verificacao — rodar DEPOIS de aplicar sql/fix_fn_funil_kpis.sql
--
-- Cada bloco e independente: selecione um e rode, ou rode tudo e olhe so o
-- ultimo resultado (o editor do Supabase mostra apenas o da ultima instrucao).
-- ============================================================================


-- 1) Faturamento por tag, aberto nos dois produtos.
--    A linha "Sem tag" e a compra que nao casa com nenhum cadastro etiquetado.
SELECT * FROM public.fn_receita_por_tag();


-- 2) FECHAMENTO — o teste que importa.
--    A soma das tags tem de bater com o total geral. Se sobrar diferenca,
--    alguma venda esta sendo contada em mais de uma tag.
SELECT
  ROUND(SUM(receita_total), 2)                                       AS soma_das_tags,
  ROUND((public.fn_funil_kpis(NULL)->>'total_receita')::numeric, 2)  AS total_geral,
  ROUND(SUM(receita_total)
        - (public.fn_funil_kpis(NULL)->>'total_receita')::numeric, 2) AS diferenca
FROM public.fn_receita_por_tag();


-- 3) O fator 100 do bug de parsing: antes x depois, so na workcompra.
--    Esperado: 40.077.502,00  ->  400.775,02 (a diferenca de R$ 27 para o
--    numero final e a linha de teste, que a vw_vendas ja descarta).
SELECT
  COALESCE(SUM(CASE WHEN valor ~ '^[0-9]+([.,][0-9]+)?$'
    THEN REPLACE(REPLACE(valor,'.',''),',','.')::numeric ELSE 0 END), 0) AS formula_antiga,
  COALESCE(SUM(public.fn_parse_valor(valor)), 0)                          AS formula_nova
FROM public.workcompra;


-- 4) Nenhum valor real pode virar 0 ou ficar 100x maior. Confere formato a
--    formato. Na base atual so existem "27.00" (en-US) e "697" (inteiro).
SELECT
  valor                        AS valor_bruto,
  public.fn_parse_valor(valor) AS convertido,
  COUNT(*)                     AS ocorrencias
FROM (
  SELECT valor FROM public.workcompra
  UNION ALL
  SELECT valor FROM public.mlcaprovado
) t
GROUP BY valor, 2
ORDER BY ocorrencias DESC
LIMIT 30;


-- 5) Composicao do high ticket. Se as faixas baixas (abaixo de ~R$ 300) forem
--    PRIMEIRA PARCELA e nao venda cheia, a receita esta superestimada — mas
--    pesam so ~R$ 9,6 mil (1% do total), entao a decisao muda pouco.
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


-- 6) Tempo da chamada mais pesada. Se passar de ~5s, os indices do bloco 0
--    nao foram criados ou nao estao sendo usados (procure por "Seq Scan on
--    cadastroClientes" no plano).
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM public.fn_receita_por_tag();
