-- Impede alterações diretas, inclusive via API, nas etapas usadas por automações.
create or replace function public.pipeline_etapa_protegida(p_slug text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select lower(trim(coalesce(p_slug, ''))) in (
    'oportunidade',
    'em_qualificacao',
    'em_negociacao',
    'follow_up'
  );
$$;

create or replace function public.bloquear_alteracao_etapa_protegida()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.pipeline_etapa_protegida(old.slug) and (
    new.slug is distinct from old.slug
    or new.nome is distinct from old.nome
    or new.cor is distinct from old.cor
    or new.ordem is distinct from old.ordem
    -- Protege is_inicial também caso a coluna exista nesta ou em uma versão futura do schema.
    or (to_jsonb(new) -> 'is_inicial') is distinct from (to_jsonb(old) -> 'is_inicial')
  ) then
    raise exception 'Esta etapa é protegida por automações e não pode ser alterada.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_bloquear_alteracao_etapa_protegida on public.pipeline_etapas;
create trigger trg_bloquear_alteracao_etapa_protegida
before update on public.pipeline_etapas
for each row execute function public.bloquear_alteracao_etapa_protegida();

create or replace function public.bloquear_exclusao_etapa_protegida()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.pipeline_etapa_protegida(old.slug) then
    raise exception 'Esta etapa é protegida por automações e não pode ser excluída.'
      using errcode = '42501';
  end if;

  return old;
end;
$$;

drop trigger if exists trg_bloquear_exclusao_etapa_protegida on public.pipeline_etapas;
create trigger trg_bloquear_exclusao_etapa_protegida
before delete on public.pipeline_etapas
for each row execute function public.bloquear_exclusao_etapa_protegida();
