-- Etapas configuraveis do Pipeline. O slug e o identificador persistido em BASE_DE_LEADS;
-- nome, cor e ordem podem ser alterados sem quebrar historicos ou integracoes.
create table if not exists public.pipeline_etapas (
  id bigserial primary key,
  slug text not null unique check (slug ~ '^[a-z0-9_]+$'),
  nome text not null check (char_length(trim(nome)) between 1 and 60),
  cor text not null default '#6b7280' check (cor ~ '^#[0-9A-Fa-f]{6}$'),
  ordem integer not null check (ordem >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.pipeline_etapas (slug, nome, cor, ordem) values
  ('oportunidade', 'Oportunidade', '#22c55e', 0),
  ('em_qualificacao', 'Em Qualificação', '#38bdf8', 1),
  ('em_negociacao', 'Em Negociação', '#f97316', 2),
  ('follow_up', 'Follow-up', '#a855f7', 3),
  ('fechado', 'Fechado', '#16a34a', 4),
  ('nao_fechou', 'Não Fechou', '#ef4444', 5),
  ('pesquisa_atendimento', 'Pesquisa de Atendimento', '#06b6d4', 6)
on conflict (slug) do nothing;

-- A lista valida deixa de morar numa CHECK estatica e passa a ser validada pela tabela acima.
do $$
declare v_constraint record;
begin
  for v_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public."BASE_DE_LEADS"'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%estagio_lead%'
  loop
    execute format('alter table public."BASE_DE_LEADS" drop constraint %I', v_constraint.conname);
  end loop;
end $$;

create or replace function public.validar_etapa_pipeline_lead()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.estagio_lead is not null and not exists (
    select 1 from public.pipeline_etapas where slug = new.estagio_lead
  ) then
    raise exception 'Etapa de pipeline inexistente: %', new.estagio_lead using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validar_etapa_pipeline_lead on public."BASE_DE_LEADS";
create trigger trg_validar_etapa_pipeline_lead
  before insert or update of estagio_lead on public."BASE_DE_LEADS"
  for each row execute function public.validar_etapa_pipeline_lead();

create or replace function public.proteger_etapa_pipeline_em_uso()
returns trigger language plpgsql set search_path = public as $$
begin
  if exists (select 1 from public."BASE_DE_LEADS" where estagio_lead = old.slug) then
    raise exception 'A etapa possui leads e não pode ser excluída.' using errcode = '23503';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_proteger_etapa_pipeline_em_uso on public.pipeline_etapas;
create trigger trg_proteger_etapa_pipeline_em_uso
  before delete on public.pipeline_etapas
  for each row execute function public.proteger_etapa_pipeline_em_uso();

create or replace function public.touch_pipeline_etapa_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_pipeline_etapa on public.pipeline_etapas;
create trigger trg_touch_pipeline_etapa before update on public.pipeline_etapas
  for each row execute function public.touch_pipeline_etapa_updated_at();

alter table public.pipeline_etapas enable row level security;

drop policy if exists "pipeline_etapas_select_authenticated" on public.pipeline_etapas;
create policy "pipeline_etapas_select_authenticated" on public.pipeline_etapas
  for select to authenticated using (true);
drop policy if exists "pipeline_etapas_insert_gestores" on public.pipeline_etapas;
create policy "pipeline_etapas_insert_gestores" on public.pipeline_etapas
  for insert to authenticated with check (public.get_my_cargo() in ('admin_master', 'admin', 'gerente'));
drop policy if exists "pipeline_etapas_update_gestores" on public.pipeline_etapas;
create policy "pipeline_etapas_update_gestores" on public.pipeline_etapas
  for update to authenticated using (public.get_my_cargo() in ('admin_master', 'admin', 'gerente'))
  with check (public.get_my_cargo() in ('admin_master', 'admin', 'gerente'));
drop policy if exists "pipeline_etapas_delete_gestores" on public.pipeline_etapas;
create policy "pipeline_etapas_delete_gestores" on public.pipeline_etapas
  for delete to authenticated using (public.get_my_cargo() in ('admin_master', 'admin', 'gerente'));

grant select, insert, update, delete on public.pipeline_etapas to authenticated;
grant usage, select on sequence public.pipeline_etapas_id_seq to authenticated;
