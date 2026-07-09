-- Corrige a ortografia das notificacoes de lead atribuido e atualiza o trigger.

update public.lead_notificacoes
set
  titulo = replace(titulo, 'atribuido', 'atribuído'),
  mensagem = replace(replace(mensagem, 'atribuido', 'atribuído'), 'voce', 'você')
where lida = false
  and (
    titulo like '%atribuido%'
    or mensagem like '%atribuido%'
    or mensagem like '%voce%'
  );

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
