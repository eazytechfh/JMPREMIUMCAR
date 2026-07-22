import { describe, expect, it, vi } from 'vitest';
import {
  deleteLead,
  formatLeadAiChangedAt,
  isLeadAiActive,
  setLeadAiStatus,
  type LeadOperationsClient,
} from './leads';

function clientReturning(data: unknown, error: { message: string } | null = null): LeadOperationsClient {
  return { rpc: vi.fn().mockResolvedValue({ data, error }) };
}

describe('deleteLead', () => {
  it.each([0, -1, 1.5, Number.NaN])('rejects invalid lead id %s before calling Supabase', async (leadId) => {
    const client = clientReturning([]);
    await expect(deleteLead(client, { leadId, idEmpresa: 7 })).rejects.toThrow('Lead inválido.');
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it('requires the database to confirm the requested lead and tenant', async () => {
    const client = clientReturning([{ id: 42, id_empresa: 8 }]);
    await expect(deleteLead(client, { leadId: 42, idEmpresa: 7 })).rejects.toThrow(
      'Não foi possível excluir o lead.'
    );
  });

  it('returns the deleted id only after an exact database confirmation', async () => {
    const client = clientReturning([{ id: 42, id_empresa: 7 }]);
    await expect(deleteLead(client, { leadId: 42, idEmpresa: 7 })).resolves.toBe(42);
    expect(client.rpc).toHaveBeenCalledWith('excluir_lead_seguro', {
      p_lead_id: 42,
      p_id_empresa: 7,
    });
  });
});

describe('setLeadAiStatus', () => {
  it('rejects a non-boolean state before calling Supabase', async () => {
    const client = clientReturning([]);
    await expect(
      setLeadAiStatus(client, { leadId: 42, idEmpresa: 7, ativo: 'true' as unknown as boolean })
    ).rejects.toThrow('Status da IA inválido.');
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it('rejects empty, stale, mismatched, or timestamp-less transitions', async () => {
    const invalidRows = [
      [],
      [{ id: 41, id_empresa: 7, bot_ativo: 'true', bot_ativo_alterado_em: '2026-07-22T12:00:00Z' }],
      [{ id: 42, id_empresa: 8, bot_ativo: 'true', bot_ativo_alterado_em: '2026-07-22T12:00:00Z' }],
      [{ id: 42, id_empresa: 7, bot_ativo: 'false', bot_ativo_alterado_em: '2026-07-22T12:00:00Z' }],
      [{ id: 42, id_empresa: 7, bot_ativo: 'true', bot_ativo_alterado_em: null }],
    ];

    for (const rows of invalidRows) {
      await expect(
        setLeadAiStatus(clientReturning(rows), { leadId: 42, idEmpresa: 7, ativo: true })
      ).rejects.toThrow('Não foi possível alterar o status da IA.');
    }
  });

  it('returns only the state confirmed by the atomic database transition', async () => {
    const row = {
      id: 42,
      id_empresa: 7,
      bot_ativo: 'true',
      bot_ativo_alterado_em: '2026-07-22T12:00:00Z',
    };
    const client = clientReturning([row]);
    await expect(setLeadAiStatus(client, { leadId: 42, idEmpresa: 7, ativo: true })).resolves.toEqual(row);
    expect(client.rpc).toHaveBeenCalledWith('alterar_status_ia_lead', {
      p_lead_id: 42,
      p_id_empresa: 7,
      p_ativo: true,
    });
  });
});

describe('isLeadAiActive', () => {
  it.each(['true', 'TRUE', '1', 'sim', 'ativo'])('recognizes active textual value %s', (value) => {
    expect(isLeadAiActive(value)).toBe(true);
  });

  it.each(['false', '0', 'não', 'inativo', null, undefined])('does not rewrite inactive/unknown value %s', (value) => {
    expect(isLeadAiActive(value)).toBe(false);
  });
});

describe('formatLeadAiChangedAt', () => {
  it.each([null, undefined, '', 'not-a-date'])('falls back for invalid value %s', (value) => {
    expect(formatLeadAiChangedAt(value)).toBe('não registrada');
  });

  it('formats a valid timestamp in Brazilian Portuguese', () => {
    expect(formatLeadAiChangedAt('2026-07-22T12:00:00Z')).not.toBe('não registrada');
  });
});
