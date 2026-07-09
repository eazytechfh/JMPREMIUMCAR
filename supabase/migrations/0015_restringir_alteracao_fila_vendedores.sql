-- Somente admin, gerente e admin_master podem alterar quem esta "na vez" na fila.

drop policy if exists "vendedores_all_authenticated" on public."VENDEDORES";

drop policy if exists "vendedores_select_authenticated" on public."VENDEDORES";
create policy "vendedores_select_authenticated"
  on public."VENDEDORES" for select
  to authenticated
  using (true);

drop policy if exists "vendedores_insert_admin_gerente" on public."VENDEDORES";
create policy "vendedores_insert_admin_gerente"
  on public."VENDEDORES" for insert
  to authenticated
  with check (public.get_my_cargo() in ('admin_master', 'admin', 'gerente'));

drop policy if exists "vendedores_update_admin_gerente" on public."VENDEDORES";
create policy "vendedores_update_admin_gerente"
  on public."VENDEDORES" for update
  to authenticated
  using (public.get_my_cargo() in ('admin_master', 'admin', 'gerente'))
  with check (public.get_my_cargo() in ('admin_master', 'admin', 'gerente'));

drop policy if exists "vendedores_delete_admin_gerente" on public."VENDEDORES";
create policy "vendedores_delete_admin_gerente"
  on public."VENDEDORES" for delete
  to authenticated
  using (public.get_my_cargo() in ('admin_master', 'admin', 'gerente'));

create or replace function public.definir_vendedor_da_vez(p_vendedor_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.get_my_cargo() not in ('admin_master', 'admin', 'gerente') then
    raise exception 'Sem permissao para alterar a fila de atendimento.' using errcode = '42501';
  end if;

  if not exists (select 1 from public."VENDEDORES" where id = p_vendedor_id) then
    raise exception 'Vendedor nao encontrado.';
  end if;

  update public."VENDEDORES"
  set atender = 'espera'
  where coalesce(atender, '') <> 'espera';

  update public."VENDEDORES"
  set atender = 'vez'
  where id = p_vendedor_id;
end;
$$;

grant execute on function public.definir_vendedor_da_vez(bigint) to authenticated;
