-- Mantem a ordem visual do Pipeline dentro de cada etapa.
-- Leads novos ou movidos recebem sempre a proxima posicao, ficando no final da coluna.

alter table public."BASE_DE_LEADS"
  add column if not exists ordem_pipeline integer;

with ordenados as (
  select
    id,
    row_number() over (
      partition by estagio_lead
      order by created_at asc, id asc
    ) as ordem
  from public."BASE_DE_LEADS"
  where estagio_lead is not null
)
update public."BASE_DE_LEADS" leads
set ordem_pipeline = ordenados.ordem
from ordenados
where leads.id = ordenados.id
  and leads.ordem_pipeline is null;

create index if not exists base_de_leads_estagio_ordem_pipeline_idx
  on public."BASE_DE_LEADS" (estagio_lead, ordem_pipeline);

create or replace function public.set_lead_ordem_pipeline_final()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.estagio_lead is not null and tg_op = 'INSERT' then
    select coalesce(max(ordem_pipeline), 0) + 1
    into new.ordem_pipeline
    from public."BASE_DE_LEADS"
    where estagio_lead = new.estagio_lead;
  elsif new.estagio_lead is not null
    and tg_op = 'UPDATE'
    and new.estagio_lead is distinct from old.estagio_lead
  then
    select coalesce(max(ordem_pipeline), 0) + 1
    into new.ordem_pipeline
    from public."BASE_DE_LEADS"
    where estagio_lead = new.estagio_lead;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_lead_ordem_pipeline_final on public."BASE_DE_LEADS";
create trigger trg_set_lead_ordem_pipeline_final
  before insert or update of estagio_lead on public."BASE_DE_LEADS"
  for each row
  execute function public.set_lead_ordem_pipeline_final();
