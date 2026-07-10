-- Mantém VENDEDORES.quantos_lead sincronizado com as atribuições reais em BASE_DE_LEADS.
-- A comparação normalizada evita divergências causadas por espaços ou caixa no nome.
create or replace function public.sincronizar_contagem_leads_vendedor(p_vendedor text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(btrim(p_vendedor), '') is null then
    return;
  end if;

  update public."VENDEDORES" as v
  set quantos_lead = (
    select count(*)::integer
    from public."BASE_DE_LEADS" as l
    where lower(btrim(l.vendedor)) = lower(btrim(v.vendedor))
  )
  where lower(btrim(v.vendedor)) = lower(btrim(p_vendedor));
end;
$$;

create or replace function public.sincronizar_contagem_leads_vendedores_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.sincronizar_contagem_leads_vendedor(old.vendedor);
    return old;
  end if;

  if tg_op = 'INSERT' then
    perform public.sincronizar_contagem_leads_vendedor(new.vendedor);
    return new;
  end if;

  if new.vendedor is distinct from old.vendedor then
    perform public.sincronizar_contagem_leads_vendedor(old.vendedor);
    perform public.sincronizar_contagem_leads_vendedor(new.vendedor);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sincronizar_contagem_leads_vendedores on public."BASE_DE_LEADS";
create trigger trg_sincronizar_contagem_leads_vendedores
after insert or update of vendedor or delete on public."BASE_DE_LEADS"
for each row execute function public.sincronizar_contagem_leads_vendedores_trigger();

-- Corrige imediatamente os contadores que ficaram desatualizados antes desta migration.
update public."VENDEDORES" as v
set quantos_lead = (
  select count(*)::integer
  from public."BASE_DE_LEADS" as l
  where lower(btrim(l.vendedor)) = lower(btrim(v.vendedor))
);
