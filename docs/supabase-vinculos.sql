-- ============================================================================
-- Conta Comigo One — persistência dos vínculos de lançamento no Supabase
-- ============================================================================
-- Objetivo: o servidor passar a guardar/devolver o vínculo de cada lançamento
-- com a conta e a fatura (conta_id / fatura_mes_ano), o status e o parcelamento
-- das despesas, e os campos de recorrência das fixas — incluindo a tabela de
-- receitas fixas, que ainda NÃO existe.
--
-- Sem isso, ao abrir o app num aparelho novo/preview os lançamentos vêm
-- "soltos" (sem conta) e as faturas de cartão aparecem zeradas, porque o
-- cálculo da fatura filtra despesas por (conta_id == cartão && fatura_mes_ano).
--
-- COMO APLICAR: não há ferramenta de migração no repo. Rode este arquivo no
-- SQL Editor do painel do Supabase (projeto wpymqverwnuinlypwouw), uma vez.
--
-- SEGURANÇA: tudo é ADITIVO e IDEMPOTENTE (ADD COLUMN IF NOT EXISTS /
-- CREATE TABLE IF NOT EXISTS). Não renomeia, não dropa, não muda tipo, não faz
-- UPDATE que reescreva linhas existentes. O banco é compartilhado e está em
-- produção (app do Lê usa as mesmas tabelas): adicionar colunas anuláveis é
-- retrocompatível — o SELECT * do outro app continua funcionando e ele
-- simplesmente ignora as colunas novas.
--
-- BACKFILL dos dados antigos: NÃO é feito por SQL (não dá pra adivinhar o
-- conta_id no servidor). É feito pelo próprio app: a função
-- _oneFinBackfillVinculosParaSupa() reenvia os lançamentos locais completos no
-- primeiro login pós-deploy (rode primeiro no aparelho mais completo — desktop).
--
-- Estado verificado em 2026-06-08 via PostgREST (read-only):
--   receitas        EXISTE — falta: conta_id
--   despesas        EXISTE — falta: conta_id, fatura_mes_ano, status, lote_id,
--                                   parcela_atual, parcelas_total, recorrencia
--   despesas_fixas  EXISTE — falta: nome, dia_do_mes, inicio, fim,
--                                   meses_pulados, conta_id
--   receitas_fixas  NÃO EXISTE — criar tabela inteira + RLS
-- ============================================================================

-- ── receitas: vínculo de conta (status/tipo/forma_pagamento já existem) ──
alter table public.receitas add column if not exists conta_id text;

-- ── despesas: vínculo conta/fatura + status + parcelamento ──
alter table public.despesas add column if not exists conta_id        text;
alter table public.despesas add column if not exists fatura_mes_ano  text;   -- 'YYYY-MM'
alter table public.despesas add column if not exists status          text;
alter table public.despesas add column if not exists lote_id         text;
alter table public.despesas add column if not exists parcela_atual   integer;
alter table public.despesas add column if not exists parcelas_total  integer;
alter table public.despesas add column if not exists recorrencia     text;

-- ── despesas_fixas: completar a recorrência + vínculo de conta ──
alter table public.despesas_fixas add column if not exists nome          text;
alter table public.despesas_fixas add column if not exists dia_do_mes    integer;
alter table public.despesas_fixas add column if not exists inicio        text;   -- 'YYYY-MM'
alter table public.despesas_fixas add column if not exists fim           text;   -- 'YYYY-MM' (opcional)
alter table public.despesas_fixas add column if not exists meses_pulados jsonb default '[]'::jsonb;
alter table public.despesas_fixas add column if not exists conta_id      text;

-- ── receitas_fixas: tabela nova (espelha despesas_fixas) ──
-- NOTA: id/user_id como uuid para casar com as demais tabelas (ids vêm de
-- crypto.randomUUID() e user_id de auth.uid()). Se no seu schema as outras
-- tabelas usarem outro tipo, ajuste aqui antes de rodar.
create table if not exists public.receitas_fixas (
  id            uuid primary key,
  user_id       uuid not null,
  nome          text,
  descricao     text,
  categoria     text,
  valor         numeric default 0,
  dia_do_mes    integer,
  inicio        text,   -- 'YYYY-MM'
  fim           text,   -- 'YYYY-MM' (opcional)
  meses_pulados jsonb default '[]'::jsonb,
  conta_id      text,
  created_at    timestamptz default now()
);

create index if not exists receitas_fixas_user_id_idx on public.receitas_fixas (user_id);

-- RLS: dono = user_id (espelha as tabelas existentes)
alter table public.receitas_fixas enable row level security;

drop policy if exists "receitas_fixas_select" on public.receitas_fixas;
drop policy if exists "receitas_fixas_insert" on public.receitas_fixas;
drop policy if exists "receitas_fixas_update" on public.receitas_fixas;
drop policy if exists "receitas_fixas_delete" on public.receitas_fixas;

create policy "receitas_fixas_select" on public.receitas_fixas
  for select using (auth.uid() = user_id);
create policy "receitas_fixas_insert" on public.receitas_fixas
  for insert with check (auth.uid() = user_id);
create policy "receitas_fixas_update" on public.receitas_fixas
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "receitas_fixas_delete" on public.receitas_fixas
  for delete using (auth.uid() = user_id);

-- ============================================================================
-- VERIFICAÇÃO (opcional) — rode depois para conferir que tudo entrou:
-- ============================================================================
-- select column_name from information_schema.columns
--   where table_schema='public' and table_name='despesas' order by 1;
-- select column_name from information_schema.columns
--   where table_schema='public' and table_name='despesas_fixas' order by 1;
-- select to_regclass('public.receitas_fixas');  -- não deve ser null
-- select polname, cmd from pg_policies where tablename='receitas_fixas';

-- ============================================================================
-- ADENDO (2026-06-08) — sync do "recebido/pago" das FIXAS
-- ============================================================================
-- O estado de pago/recebido de uma ocorrência de fixa vive no molde, em
-- template.pagoPorMes = { "YYYY-MM": valor }. Sem coluna no servidor, o
-- "recebido" não sincronizava (ex.: Pro Labore aparecia "a receber" no
-- preview). Aditivo/idempotente, default '{}'. Aplicado no painel.
alter table public.receitas_fixas
  add column if not exists pago_por_mes jsonb default '{}'::jsonb;
alter table public.despesas_fixas
  add column if not exists pago_por_mes jsonb default '{}'::jsonb;

-- ============================================================================
-- ADENDO (2026-06-08) — override de VALOR por mês das FIXAS (valor_por_mes)
-- ============================================================================
-- "Editar só este mês" deixou de criar lançamento avulso (que duplicava com a
-- projeção do molde). Agora grava um override de valor no próprio molde, em
-- template.valorPorMes = { "YYYY-MM": valor }. A projeção do mês usa esse valor
-- se existir, senão o valor-base da fixa. Espelha pago_por_mes.
-- Aditivo/idempotente, default '{}'. O fromRow trata '{}' como "sem override".
alter table public.receitas_fixas
  add column if not exists valor_por_mes jsonb default '{}'::jsonb;
alter table public.despesas_fixas
  add column if not exists valor_por_mes jsonb default '{}'::jsonb;

-- ============================================================================
-- ADENDO (2026-06-08) — âncora do "saldo de hoje" das CONTAS (saldo_data)
-- ============================================================================
-- O campo "Saldo atual" passa a ser uma âncora: saldoInicial = saldo NAQUELE dia
-- (saldo_data). oneFinSaldoBanco só conta lançamentos confirmados com data
-- DEPOIS de saldo_data — sem recontar o passado já embutido no valor informado.
-- Aditivo/idempotente. O app só envia saldo_data quando a conta foi ancorada,
-- então rodar isto não é urgente pro funcionamento local (é pra cross-device).
alter table public.contas
  add column if not exists saldo_data text;   -- 'YYYY-MM-DD'

-- ----------------------------------------------------------------------------
-- ADENDO (2026-06-08b) — garantir TODAS as colunas de contas no servidor.
-- O upsert de contas envia o objeto inteiro; se QUALQUER coluna faltar, o
-- upsert falha por completo e o saldo (saldo_inicial) nunca chega ao servidor —
-- daí o saldo recém-digitado "volta" no reload (o merge pega o saldo-base antigo
-- do servidor). Estas colunas evoluíram com a feature de contas e podem não
-- existir em bases antigas. Idempotente.
alter table public.contas add column if not exists saldo_inicial          numeric default 0;
alter table public.contas add column if not exists saldo                  numeric default 0;
alter table public.contas add column if not exists dia_fechamento         integer;
alter table public.contas add column if not exists dia_vencimento         integer;
alter table public.contas add column if not exists faturas_pagas          jsonb default '[]'::jsonb;
alter table public.contas add column if not exists faturas_pagas_detalhe  jsonb default '{}'::jsonb;
alter table public.contas add column if not exists meses_fechados         jsonb default '[]'::jsonb;
