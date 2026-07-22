import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve('supabase/migrations/0020_seguranca_leads_e_controle_ia.sql'), 'utf8');

describe('lead security and AI migration', () => {
  it('preserves the existing AI column type and values while adding its timestamp', () => {
    expect(sql).toMatch(/add column if not exists bot_ativo_alterado_em timestamptz/i);
    expect(sql).not.toMatch(/alter column bot_ativo type/i);
    expect(sql).not.toMatch(/set bot_ativo = false/i);
    expect(sql).not.toMatch(/alter column bot_ativo set default/i);
    expect(sql).not.toMatch(/alter column bot_ativo set not null/i);
  });

  it('uses server time only for real AI state changes and preserves an unchanged timestamp', () => {
    expect(sql).toMatch(/new\.bot_ativo is distinct from old\.bot_ativo/i);
    expect(sql).toMatch(/new\.bot_ativo_alterado_em := now\(\)/i);
    expect(sql).toMatch(/new\.bot_ativo_alterado_em := old\.bot_ativo_alterado_em/i);
    expect(sql).toMatch(/before update of bot_ativo, bot_ativo_alterado_em/i);
  });

  it('blocks unprivileged role changes in a database trigger', () => {
    expect(sql).toMatch(/before update of cargo on public\.profiles/i);
    expect(sql).toMatch(/new\.cargo is distinct from old\.cargo/i);
    expect(sql).toMatch(/admin_master[\s\S]+admin[\s\S]+gerente/i);
    expect(sql).toMatch(/errcode = '42501'/i);
  });

  it('keeps lead operations authenticated, tenant-filtered, authorized, and atomic', () => {
    expect(sql).toMatch(/auth\.uid\(\) is null/i);
    expect(sql).toMatch(/id_empresa = p_id_empresa/i);
    expect(sql).toMatch(/bot_ativo is distinct from v_novo_status/i);
    expect(sql).toMatch(/get_my_cargo\(\) not in \('admin_master', 'admin', 'gerente'\)/i);
    expect(sql).not.toMatch(/service_role/i);
  });
});
