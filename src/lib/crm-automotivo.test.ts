import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('pacote CRM automotivo', () => {
  it('notifica o vendedor por realtime e som sem polling agressivo', () => {
    const source = read('src/components/LeadAssignmentNotifications.tsx');
    expect(source).toContain("new Audio('/effects/lead-assigned.mp3')");
    expect(source).toContain("channel('lead-assignment-notifications')");
    expect(source).toContain("table: 'lead_notificacoes'");
    expect(source).toContain('180_000');
    expect(source).toContain("window.dispatchEvent(new CustomEvent('lead-assignments-changed'))");
  });

  it('valida venda antes de fechar e exibe celebração por cinco segundos', () => {
    const pipeline = read('src/app/(app)/pipeline/page.tsx');
    const celebration = read('src/components/SaleCelebration.tsx');
    expect(pipeline).toContain("novoEstagio === 'fechado'");
    expect(pipeline).toContain('VendaFechadaModal');
    expect(pipeline).toContain('SaleCelebration');
    expect(celebration).toContain('CELEBRATION_DURATION_MS = 5_000');
    expect(celebration).toContain('playAt(engine, 11)');
    expect(celebration).toContain('playAt(money, 5)');
    expect(celebration).toContain('Parabéns pela venda!');
    expect(celebration).toContain('sale-car-right-to-left');
  });

  it('mostra auditoria e autoria da observação com histórico rolável', () => {
    const drawer = read('src/components/LeadDrawer.tsx');
    expect(drawer).toContain("from('lead_logs')");
    expect(drawer).toContain('Logs gerais');
    expect(drawer).toContain('max-h-64');
    expect(drawer).toContain('overflow-y-auto');
    expect(drawer).toContain('ultimoLogObservacao');
  });

  it('permite filtrar e alterar status do estoque', () => {
    const inventory = read('src/app/(app)/estoque/page.tsx');
    expect(inventory).toContain('Disponível');
    expect(inventory).toContain('Indisponível');
    expect(inventory).toContain('Vendido');
    expect(inventory).toContain('atualizarStatus');
  });

  it('possui loading automotivo reutilizável', () => {
    expect(read('src/components/AutomotiveLoading.tsx')).toContain('automotive-loading-car');
    expect(read('src/app/(app)/leads/page.tsx')).toContain('AutomotiveLoading');
    expect(read('src/app/(app)/pipeline/page.tsx')).toContain('AutomotiveLoading');
    expect(read('src/app/(app)/estoque/page.tsx')).toContain('AutomotiveLoading');
  });

  it('entrega migration segura sem alterar migrations existentes', () => {
    const sql = read('supabase/migrations/0021_crm_automotivo_auditoria_realtime.sql');
    expect(sql).toContain('create table if not exists public.lead_logs');
    expect(sql).toContain('validar_fechamento_lead');
    expect(sql).toContain('supabase_realtime');
    expect(sql).toContain('lead_excluido');
    expect(sql).toContain("get_my_cargo() in ('admin_master', 'admin', 'gerente')");
  });
});
