-- Leads novos ou movidos passam a ocupar a primeira posicao da etapa.
-- A ordem atual dos leads existentes e preservada.

create or replace function public.set_lead_ordem_pipeline_inicio()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.estagio_lead is not null and tg_op = 'INSERT' then
    select coalesce(min(ordem_pipeline), 1) - 1
    into new.ordem_pipeline
    from public."BASE_DE_LEADS"
    where estagio_lead = new.estagio_lead;
  elsif new.estagio_lead is not null
    and tg_op = 'UPDATE'
    and new.estagio_lead is distinct from old.estagio_lead
  then
    select coalesce(min(ordem_pipeline), 1) - 1
    into new.ordem_pipeline
    from public."BASE_DE_LEADS"
    where estagio_lead = new.estagio_lead;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_lead_ordem_pipeline_final on public."BASE_DE_LEADS";
drop trigger if exists trg_set_lead_ordem_pipeline_inicio on public."BASE_DE_LEADS";

create trigger trg_set_lead_ordem_pipeline_inicio
  before insert or update of estagio_lead on public."BASE_DE_LEADS"
  for each row
  execute function public.set_lead_ordem_pipeline_inicio();

drop function if exists public.set_lead_ordem_pipeline_final();
