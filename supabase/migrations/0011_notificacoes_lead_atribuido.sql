-- Notificacoes para vendedores quando um lead e atribuido a eles.

create table if not exists public.lead_notificacoes (
  id bigserial primary key,
  id_usuario uuid not null references public.profiles(id) on delete cascade,
  id_lead int4 not null references public."BASE_DE_LEADS"(id) on delete cascade,
  titulo text not null,
  mensagem text not null,
  lida boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.lead_notificacoes enable row level security;

drop policy if exists "lead_notificacoes_select_own" on public.lead_notificacoes;
create policy "lead_notificacoes_select_own"
  on public.lead_notificacoes for select
  to authenticated
  using (id_usuario = auth.uid());

drop policy if exists "lead_notificacoes_update_own" on public.lead_notificacoes;
create policy "lead_notificacoes_update_own"
  on public.lead_notificacoes for update
  to authenticated
  using (id_usuario = auth.uid())
  with check (id_usuario = auth.uid());

create index if not exists lead_notificacoes_usuario_lida_created_idx
  on public.lead_notificacoes (id_usuario, lida, created_at desc);

create or replace function public.notificar_lead_atribuido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.vendedor is null or btrim(new.vendedor) = '' then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.vendedor is not distinct from old.vendedor then
    return new;
  end if;

  insert into public.lead_notificacoes (id_usuario, id_lead, titulo, mensagem)
  select
    profiles.id,
    new.id,
    'Novo lead atribuído',
    coalesce(new.nome_lead, 'Lead') || ' foi atribuído a você.'
  from public.profiles
  where profiles.cargo = 'vendedor'
    and profiles.nome = new.vendedor
    and coalesce(profiles.desativado, false) = false;

  return new;
end;
$$;

drop trigger if exists trg_notificar_lead_atribuido on public."BASE_DE_LEADS";
create trigger trg_notificar_lead_atribuido
  after insert or update of vendedor on public."BASE_DE_LEADS"
  for each row
  execute function public.notificar_lead_atribuido();
