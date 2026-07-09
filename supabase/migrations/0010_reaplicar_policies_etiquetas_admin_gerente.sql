-- Reaplica as permissoes de escrita de etiquetas para admin, gerente e admin_master.
-- Esta migration e idempotente e cobre bancos onde a 0008 nao foi executada.

alter table public.etiquetas enable row level security;

drop policy if exists "etiquetas_select_authenticated" on public.etiquetas;
create policy "etiquetas_select_authenticated"
  on public.etiquetas for select
  to authenticated
  using (true);

drop policy if exists "etiquetas_insert_admin_gerente" on public.etiquetas;
create policy "etiquetas_insert_admin_gerente"
  on public.etiquetas for insert
  to authenticated
  with check (public.get_my_cargo() in ('admin_master', 'admin', 'gerente'));

drop policy if exists "etiquetas_update_admin_gerente" on public.etiquetas;
create policy "etiquetas_update_admin_gerente"
  on public.etiquetas for update
  to authenticated
  using (public.get_my_cargo() in ('admin_master', 'admin', 'gerente'))
  with check (public.get_my_cargo() in ('admin_master', 'admin', 'gerente'));

drop policy if exists "etiquetas_delete_admin_gerente" on public.etiquetas;
create policy "etiquetas_delete_admin_gerente"
  on public.etiquetas for delete
  to authenticated
  using (public.get_my_cargo() in ('admin_master', 'admin', 'gerente'));
