-- Salva dados editaveis do lead com validacao de permissao dentro do banco.
-- Resolve o caso do vendedor remover a propria atribuicao, que pode ser bloqueado por RLS.

create or replace function public.salvar_dados_lead(
  p_id int4,
  p_nome_lead text,
  p_cpf text,
  p_data_nascimento date,
  p_veiculo_interesse text,
  p_valor numeric,
  p_vendedor text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cargo text;
  v_nome text;
  v_vendedor_atual text;
begin
  select cargo, nome
  into v_cargo, v_nome
  from public.profiles
  where id = auth.uid();

  select vendedor
  into v_vendedor_atual
  from public."BASE_DE_LEADS"
  where id = p_id;

  if not found then
    raise exception 'Lead nao encontrado.';
  end if;

  if v_cargo not in ('admin_master', 'admin', 'gerente')
    and v_vendedor_atual is distinct from v_nome
  then
    raise exception 'Sem permissao para editar este lead.' using errcode = '42501';
  end if;

  if v_cargo = 'vendedor'
    and p_vendedor is not null
    and p_vendedor is distinct from v_nome
  then
    raise exception 'Vendedor nao pode atribuir lead para outro vendedor.' using errcode = '42501';
  end if;

  update public."BASE_DE_LEADS"
  set
    nome_lead = btrim(p_nome_lead),
    cpf = nullif(btrim(coalesce(p_cpf, '')), ''),
    data_nascimento = p_data_nascimento,
    veiculo_interesse = nullif(btrim(coalesce(p_veiculo_interesse, '')), ''),
    valor = p_valor,
    vendedor = nullif(btrim(coalesce(p_vendedor, '')), '')
  where id = p_id;
end;
$$;

grant execute on function public.salvar_dados_lead(
  int4,
  text,
  text,
  date,
  text,
  numeric,
  text
) to authenticated;
