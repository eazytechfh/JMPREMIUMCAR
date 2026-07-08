-- EazyClick CRM - inclui a role "admin" nas permissoes de escrita de etiquetas.
--
-- A role "admin" foi adicionada depois da migration inicial, mas as policies de etiquetas
-- continuaram aceitando apenas admin_master/gerente. Isso fazia o cadastro de etiquetas falhar
-- para administradores comuns.

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
