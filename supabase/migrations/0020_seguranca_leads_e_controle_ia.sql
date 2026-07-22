-- Safe deletion, persisted AI state, and database-level role protection.

alter table public."BASE_DE_LEADS"
  add column if not exists bot_ativo_alterado_em timestamptz;

create or replace function public.registrar_alteracao_bot_ativo()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.bot_ativo is distinct from old.bot_ativo then
    new.bot_ativo_alterado_em := now();
  else
    new.bot_ativo_alterado_em := old.bot_ativo_alterado_em;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_registrar_alteracao_bot_ativo on public."BASE_DE_LEADS";
create trigger trg_registrar_alteracao_bot_ativo
  before update of bot_ativo, bot_ativo_alterado_em
  on public."BASE_DE_LEADS"
  for each row execute function public.registrar_alteracao_bot_ativo();

create or replace function public.proteger_alteracao_cargo_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.cargo is distinct from old.cargo
     and public.get_my_cargo() not in ('admin_master', 'admin', 'gerente') then
    raise exception 'Sem permissão para alterar cargo.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_alteracao_cargo_profile on public.profiles;
create trigger trg_proteger_alteracao_cargo_profile
  before update of cargo on public.profiles
  for each row execute function public.proteger_alteracao_cargo_profile();

-- Replace the former permissive ALL policy so DELETE requires an administrative role.
drop policy if exists "base_de_leads_all_authenticated" on public."BASE_DE_LEADS";
drop policy if exists "base_de_leads_select_authenticated" on public."BASE_DE_LEADS";
create policy "base_de_leads_select_authenticated" on public."BASE_DE_LEADS"
  for select to authenticated using (true);
drop policy if exists "base_de_leads_insert_authenticated" on public."BASE_DE_LEADS";
create policy "base_de_leads_insert_authenticated" on public."BASE_DE_LEADS"
  for insert to authenticated with check (true);
drop policy if exists "base_de_leads_update_authenticated" on public."BASE_DE_LEADS";
create policy "base_de_leads_update_authenticated" on public."BASE_DE_LEADS"
  for update to authenticated using (true) with check (true);
drop policy if exists "base_de_leads_delete_admin" on public."BASE_DE_LEADS";
create policy "base_de_leads_delete_admin" on public."BASE_DE_LEADS"
  for delete to authenticated
  using (public.get_my_cargo() in ('admin_master', 'admin', 'gerente'));

create or replace function public.excluir_lead_seguro(p_lead_id bigint, p_id_empresa bigint)
returns table (id bigint, id_empresa bigint)
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Não autenticado.' using errcode = '42501'; end if;
  if p_lead_id is null or p_lead_id <= 0 or p_id_empresa is null or p_id_empresa <= 0 then
    raise exception 'Entrada inválida.' using errcode = '22023';
  end if;
  if public.get_my_cargo() not in ('admin_master', 'admin', 'gerente') then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  return query
    delete from public."BASE_DE_LEADS" as lead
    where lead.id = p_lead_id and lead.id_empresa = p_id_empresa
    returning lead.id::bigint, lead.id_empresa::bigint;
end;
$$;

create or replace function public.alterar_status_ia_lead(
  p_lead_id bigint, p_id_empresa bigint, p_ativo boolean
)
returns table (id bigint, id_empresa bigint, bot_ativo text, bot_ativo_alterado_em timestamptz)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_novo_status text := case when p_ativo then 'true' else 'false' end;
begin
  if auth.uid() is null then raise exception 'Não autenticado.' using errcode = '42501'; end if;
  if p_lead_id is null or p_lead_id <= 0 or p_id_empresa is null or p_id_empresa <= 0 or p_ativo is null then
    raise exception 'Entrada inválida.' using errcode = '22023';
  end if;
  return query
    update public."BASE_DE_LEADS" as lead
    set bot_ativo = v_novo_status
    where lead.id = p_lead_id
      and lead.id_empresa = p_id_empresa
      and lead.bot_ativo is distinct from v_novo_status
    returning lead.id::bigint, lead.id_empresa::bigint, lead.bot_ativo::text, lead.bot_ativo_alterado_em;
end;
$$;

revoke all on function public.excluir_lead_seguro(bigint, bigint) from public, anon;
grant execute on function public.excluir_lead_seguro(bigint, bigint) to authenticated;
revoke all on function public.alterar_status_ia_lead(bigint, bigint, boolean) from public, anon;
grant execute on function public.alterar_status_ia_lead(bigint, bigint, boolean) to authenticated;
