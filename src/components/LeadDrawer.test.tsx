import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BaseDeLeads } from '@/types/database';
import { LeadDrawer } from './LeadDrawer';

const rpc = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => {
    const query: Record<string, unknown> = {};
    let table = '';
    for (const method of ['select', 'eq', 'order', 'update', 'delete', 'insert', 'single', 'maybeSingle']) {
      query[method] = vi.fn(() => query);
    }
    query.then = (resolve: (value: unknown) => unknown) => resolve({
      data: table === 'BASE_DE_LEADS' ? { id: 42, observacao_vendedor: 'Contato amanhã' } : [],
      error: null,
    });
    return { from: vi.fn((value: string) => { table = value; return query; }), rpc };
  },
}));

const lead = {
  id: 42,
  id_empresa: 7,
  nome_lead: 'Maria Silva',
  telefone: '11999999999',
  email: null,
  origem: null,
  vendedor: null,
  veiculo_interesse: null,
  resumo_qualificacao: null,
  estagio_lead: 'oportunidade',
  ordem_pipeline: null,
  resumo_comercial: null,
  created_at: '2026-07-22T10:00:00Z',
  updated_at: null,
  valor: null,
  observacao_vendedor: null,
  bot_ativo: null,
  bot_ativo_alterado_em: null,
  Etapa: null,
  QuemEnviouMsg: null,
  UltimaMensagem: null,
  StatusDeFollow: null,
  Transferencia: null,
  PesquisaDeSatisfacao: null,
  IdContatoClick: null,
  lid: null,
  DataEHora: null,
  cpf: null,
  data_nascimento: null,
  score_serasa: null,
} satisfies BaseDeLeads;

function renderDrawer(overrides: Partial<BaseDeLeads> = {}) {
  const props = {
    lead: { ...lead, ...overrides },
    estagioLabel: 'Oportunidade',
    estagioColor: '#22c55e',
    estagioLabelOf: vi.fn((value) => value ?? 'Oportunidade'),
    onClose: vi.fn(),
    onUpdated: vi.fn(),
    onDeleted: vi.fn(),
  };
  render(<LeadDrawer {...props} />);
  return props;
}

describe('LeadDrawer secure controls', () => {
  beforeEach(() => rpc.mockReset());
  afterEach(cleanup);

  it('requires an accessible confirmation before deletion', async () => {
    const user = userEvent.setup();
    renderDrawer();
    expect(screen.queryByRole('dialog', { name: 'Confirmar exclusão' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Excluir lead' }));
    expect(screen.getByRole('dialog', { name: 'Confirmar exclusão' })).toHaveAttribute('aria-modal', 'true');
    expect(within(screen.getByRole('dialog')).getByText(/Maria Silva/)).toBeInTheDocument();
  });

  it('shows persisted AI state and only updates after database confirmation', async () => {
    const user = userEvent.setup();
    const props = renderDrawer();
    expect(screen.getByText('IA inativa')).toBeInTheDocument();
    expect(screen.getByText('Última alteração: não registrada')).toBeInTheDocument();

    rpc.mockResolvedValue({
      data: [{ id: 42, id_empresa: 7, bot_ativo: 'true', bot_ativo_alterado_em: '2026-07-22T12:00:00Z' }],
      error: null,
    });
    await user.click(screen.getByRole('button', { name: 'Ativar IA' }));
    expect(props.onUpdated).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42, bot_ativo: 'true', bot_ativo_alterado_em: '2026-07-22T12:00:00Z' })
    );
  });

  it('announces observation success only after a confirmed update', async () => {
    const user = userEvent.setup();
    const props = renderDrawer();
    await user.type(screen.getByPlaceholderText('Anote observações sobre este lead...'), 'Contato amanhã');
    await user.click(screen.getByRole('button', { name: 'Salvar observação' }));
    expect(props.onUpdated).toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Observação salva com sucesso');
  });
});
