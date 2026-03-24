# Supabase Schema — evento laracastilho
**Projeto:** evento laracastilho (`omgwczqubvamrewewzsp`)
**Região:** sa-east-1 (São Paulo)
**Postgres:** 17.4
**Extraído em:** 2026-03-24

---

## Resumo das Tabelas

| Tabela | Linhas | RLS |
|---|---|---|
| cadastroClientes | 173.897 | ✅ |
| Privado | 122.338 | ✅ |
| grupos | 92.010 | ✅ |
| scoreleads | 18.674 | ✅ |
| workcompra | 11.852 | ✅ |
| campaigns_bms | 4.983 | ✅ |
| mlcaprovado | 1.134 | ✅ |
| gastosfacebook | 31 | ✅ |
| user_roles | 0 | ✅ |

**Total de registros:** ~426.919

---

## 1. `public.cadastroClientes`
> Cadastro de leads/clientes com dados de UTM e rastreamento de campanha.

| Coluna | Tipo | Obrigatório | Notas |
|---|---|---|---|
| client_id | bigint | ✅ PK | auto-increment |
| data_criacao | timestamp | - | default: now() |
| nome | text | - | |
| email | text | ✅ | |
| telefone | text | ✅ | |
| ip | text | - | |
| utm_nome_campanha | text | - | |
| utm_id_campanha | text | - | |
| utm_nome_conjunto | text | - | |
| utm_id_conjunto | text | - | |
| utm_nome_anuncio | text | - | |
| utm_id_anuncio | text | - | |
| nome_pagina | text | - | |
| plataforma | text | - | |
| tipo_cadastro | text | - | |
| utm_tern | text | - | |
| lancamento | text | - | |

---

## 2. `public.Privado`
> Registro de telefones por lançamento (possivelmente lista de contatos privados/WhatsApp).

| Coluna | Tipo | Obrigatório | Notas |
|---|---|---|---|
| telefone | text | ✅ PK | |
| created_at | timestamp | ✅ | |
| lancamento | text | - | |

---

## 3. `public.grupos`
> Controle de entrada em grupos (WhatsApp/Telegram) por telefone e lançamento.

| Coluna | Tipo | Obrigatório | Notas |
|---|---|---|---|
| phone | text | ✅ PK | |
| created_at | timestamp | ✅ | |
| grupo | text | - | nome do grupo |
| lancamento | text | - | |

---

## 4. `public.scoreleads`
> Leads com pontuação por respostas a quiz/formulário (6 perguntas com pesos).

| Coluna | Tipo | Obrigatório | Notas |
|---|---|---|---|
| id | bigint | ✅ único | auto-increment |
| data_criacao | timestamp | ✅ | |
| nome | text | - | |
| email | text | - | |
| telefone | text | ✅ PK | |
| lancamento | text | - | |
| responder01..06 | text | - | respostas do quiz |
| peso01..06 | text | - | peso de cada resposta |
| pontuacao | text | - | score final |

---

## 5. `public.workcompra`
> Registro de compras (provavelmente worskshop/produto).

| Coluna | Tipo | Obrigatório | Notas |
|---|---|---|---|
| email | text | ✅ | sem PK definida |
| telefone | text | - | |
| created_at | timestamp | - | |
| nome | text | - | |
| valor | text | - | ⚠️ deveria ser numeric |

---

## 6. `public.campaigns_bms`
> Dados de campanhas do Facebook Ads por BM (Business Manager). Métricas detalhadas por anúncio/dia.

| Coluna | Tipo | Obrigatório | Notas |
|---|---|---|---|
| id_data | text | ✅ PK | identificador único |
| data | text | - | ⚠️ deveria ser date |
| BM | text | - | Business Manager |
| Campanha | text | - | nome da campanha |
| Conjunto | text | - | adset |
| ad | text | - | nome do anúncio |
| ad_id | bigint | - | |
| campaign_id | bigint | - | |
| adset_id | bigint | - | |
| gasto | float8 | - | em BRL |
| impressoes | bigint | - | |
| clicks | bigint | - | |
| unique_clicks | bigint | - | |
| reach | bigint | - | |
| frequency | float8 | - | |
| land_page_views | bigint | - | |
| leads | text | - | ⚠️ deveria ser int |
| initiate_checkout | text | - | ⚠️ deveria ser int |
| conversions | text | - | |
| conversion_values | text | - | |
| video_play_actions | text | - | |
| video_p25/50/75/100_watched | bigint | - | |
| thruplay_15s | bigint | - | |
| inline_post_engagement | bigint | - | |
| quality_ranking | text | - | |
| engagement_rate_ranking | text | - | |
| conversion_rate_ranking | text | - | |
| launch_tag | text | - | tag de lançamento |
| status_campaign | text | - | |
| paused_date | text | - | |
| Preco_do_Produto_BRL | text | - | |
| preview_url | text | - | |
| preview_reprocessed | text | - | default: 'N' |
| hbl_verified | text | - | default: 'N' |
| attribution_setting | text | - | |
| canvas_avg_view_percent | text | - | |
| canvas_avg_view_time | text | - | |

---

## 7. `public.mlcaprovado`
> Leads aprovados no MLC (possivelmente processo seletivo/aprovação).

| Coluna | Tipo | Obrigatório | Notas |
|---|---|---|---|
| email | text | ✅ PK | composta com telefone |
| telefone | text | ✅ PK | |
| created_at | timestamp | ✅ | |
| nome | text | - | |
| valor | text | - | ⚠️ deveria ser numeric |

---

## 8. `public.gastosfacebook`
> Gastos diários no Facebook Ads (tabela simples/legada).

| Coluna | Tipo | Obrigatório | Notas |
|---|---|---|---|
| gasto | text | ✅ PK | ⚠️ deveria ser numeric |
| campanha | text | - | |
| alcance | text | - | |
| data | timestamp | ✅ | |
| hora | text | - | |

---

## 9. `public.user_roles`
> Controle de permissões de usuários do dashboard.

| Coluna | Tipo | Obrigatório | Notas |
|---|---|---|---|
| id | uuid | ✅ PK | gen_random_uuid() |
| user_id | uuid | ✅ único | FK → auth.users.id |
| role | text | ✅ | admin / manager / viewer |
| created_at | timestamptz | - | default: now() |

---

## Observações e Pontos de Atenção

### Problemas de tipagem
- `valor` em `workcompra` e `mlcaprovado` é `text` mas deveria ser `numeric`
- `leads`, `initiate_checkout` em `campaigns_bms` são `text` mas deveriam ser `int`
- `data` em `campaigns_bms` e `gastosfacebook` é `text`/`timestamp` sem padronização
- `gasto` em `gastosfacebook` é PK mas é `text` — provavelmente erro de design

### Relações identificadas
- Todas as tabelas de leads/clientes usam `lancamento` como campo de segmentação
- `telefone` é o identificador comum entre: `Privado`, `grupos`, `scoreleads`, `workcompra`
- `email` é o identificador comum entre: `cadastroClientes`, `mlcaprovado`, `workcompra`
- `campaigns_bms` tem `launch_tag` que provavelmente corresponde ao campo `lancamento` das outras tabelas

### Funil de conversão identificado
```
cadastroClientes (173k leads)
    ↓ quiz
scoreleads (18k qualificados)
    ↓ aprovação
mlcaprovado (1.1k aprovados)
    ↓ compra
workcompra (11.8k compras)
```

### Métricas de mídia paga
- `campaigns_bms` → dados completos do Facebook Ads por anúncio/dia
- `gastosfacebook` → tabela legada/simplificada de gastos
