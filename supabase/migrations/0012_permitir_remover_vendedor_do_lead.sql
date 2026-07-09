-- Permite que um vendedor remova a propria atribuicao de um lead.
-- Sem isso, o WITH CHECK bloqueia updates que mudam vendedor para null.

drop policy if exists "base_de_leads_update" on public."BASE_DE_LEADS";
create policy "base_de_leads_update"
  on public."BASE_DE_LEADS" for update
  to authenticated
  using (
    public.get_my_cargo() in ('admin_master', 'admin', 'gerente')
    or vendedor = public.get_my_nome()
  )
  with check (
    public.get_my_cargo() in ('admin_master', 'admin', 'gerente')
    or vendedor = public.get_my_nome()
    or vendedor is null
  );
