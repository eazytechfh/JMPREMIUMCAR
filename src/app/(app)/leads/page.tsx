'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useVirtualizer } from '@tanstack/react-virtual';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/client';
import type { BaseDeLeads, Etiqueta, LeadEtiqueta, Vendedor } from '@/types/database';
import { Avatar } from '@/components/Avatar';
import { LeadDrawer } from '@/components/LeadDrawer';
import { ESTAGIO_CONFIG, StatusBadge } from '@/components/StatusBadge';
import { LeadFilters, createDefaultLeadFilters, filterLeads } from '@/components/LeadFilters';

const ORIGEM_DOT_COLORS: Record<string, string> = {
  whatsapp: '#22c55e',
  instagram: '#a855f7',
  facebook: '#3b82f6',
  site: '#38bdf8',
  indicacao: '#f97316',
};

const LEAD_SELECT_BASE =
  'id, id_empresa, nome_lead, telefone, email, origem, vendedor, veiculo_interesse, resumo_qualificacao, estagio_lead, resumo_comercial, created_at, updated_at, valor, observacao_vendedor, bot_ativo, "Etapa", "QuemEnviouMsg", "UltimaMensagem", StatusDeFollow:"Status de Follow", "Transferencia", PesquisaDeSatisfacao:"Pesquisa de satisfa\u00e7\u00e3o", IdContatoClick:"ID CONTATO CLICK", lid, DataEHora:"Data e Hora", cpf, data_nascimento, score_serasa';

const LEAD_SELECT =
  'id, id_empresa, nome_lead, telefone, email, origem, vendedor, veiculo_interesse, resumo_qualificacao, estagio_lead, ordem_pipeline, resumo_comercial, created_at, updated_at, valor, observacao_vendedor, bot_ativo, "Etapa", "QuemEnviouMsg", "UltimaMensagem", StatusDeFollow:"Status de Follow", "Transferencia", PesquisaDeSatisfacao:"Pesquisa de satisfa\u00e7\u00e3o", IdContatoClick:"ID CONTATO CLICK", lid, DataEHora:"Data e Hora", cpf, data_nascimento, score_serasa';

const COLUNAS = (Object.keys(ESTAGIO_CONFIG) as Array<keyof typeof ESTAGIO_CONFIG>).map((id) => ({
  id,
  label: ESTAGIO_CONFIG[id].label,
  color: ESTAGIO_CONFIG[id].color,
}));

type ColunaId = (typeof COLUNAS)[number]['id'];

function normalizeEstagio(estagio: string | null | undefined): ColunaId {
  const key = (estagio ?? '').toLowerCase().trim();
  const found = COLUNAS.find((c) => c.id === key);
  return found ? found.id : 'oportunidade';
}

function getOrigemColor(origem: string | null): string {
  if (!origem) return '#6b7280';
  return ORIGEM_DOT_COLORS[origem.toLowerCase()] ?? '#6b7280';
}

function isOrdemPipelineMissing(error: { message?: string; details?: string | null } | null): boolean {
  const text = `${error?.message ?? ''} ${error?.details ?? ''}`.toLowerCase();
  return text.includes('ordem_pipeline');
}

interface NovoLeadModalProps {
  vendedores: Vendedor[];
  idEmpresaPadrao: number;
  vendedorPadrao: string;
  onClose: () => void;
  onCreated: (lead: BaseDeLeads) => void;
}

function NovoLeadModal({ vendedores, idEmpresaPadrao, vendedorPadrao, onClose, onCreated }: NovoLeadModalProps) {
  const [form, setForm] = useState({
    nome_lead: '',
    telefone: '',
    email: '',
    origem: 'manual',
    vendedor: vendedorPadrao,
    veiculo_interesse: '',
    valor: '',
    observacao_vendedor: '',
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function buscarProximaOrdemPipeline(estagio: string): Promise<number> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('BASE_DE_LEADS')
      .select('ordem_pipeline')
      .eq('estagio_lead', estagio)
      .not('ordem_pipeline', 'is', null)
      .order('ordem_pipeline', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (isOrdemPipelineMissing(error)) return 0;

    const ordemAtual = (data as { ordem_pipeline: number | null } | null)?.ordem_pipeline ?? 0;
    return ordemAtual + 1;
  }

  async function criarLead() {
    if (!form.nome_lead.trim() || !form.telefone.trim()) {
      setErro('Informe nome e telefone para criar o lead.');
      return;
    }

    setSalvando(true);
    setErro(null);

    const valorNumerico = form.valor ? Number(form.valor.replace(',', '.')) : null;
    const supabase = createClient();
    const estagioInicial = 'oportunidade';
    const ordemPipeline = await buscarProximaOrdemPipeline(estagioInicial);
    const payload = {
      id_empresa: idEmpresaPadrao,
      nome_lead: form.nome_lead.trim(),
      telefone: form.telefone.trim(),
      email: form.email.trim() || null,
      origem: form.origem.trim() || 'manual',
      vendedor: form.vendedor || null,
      veiculo_interesse: form.veiculo_interesse.trim() || null,
      valor: typeof valorNumerico === 'number' && Number.isFinite(valorNumerico) ? valorNumerico : null,
      observacao_vendedor: form.observacao_vendedor.trim() || null,
      estagio_lead: estagioInicial,
    };
    let result = await supabase
      .from('BASE_DE_LEADS')
      .insert({
        ...payload,
        ordem_pipeline: ordemPipeline,
      })
      .select(LEAD_SELECT)
      .single();
    let data = result.data;
    let error = result.error;

    if (isOrdemPipelineMissing(error)) {
      const fallback = await supabase.from('BASE_DE_LEADS').insert(payload).select(LEAD_SELECT_BASE).single();
      data = fallback.data as typeof data;
      error = fallback.error;
    }

    setSalvando(false);

    if (error) {
      setErro(`Erro ao criar lead: ${error.message}`);
      return;
    }

    onCreated(data as unknown as BaseDeLeads);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-xl rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Novo lead</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Fechar"
          >
            x
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs text-gray-500">
            Nome
            <input
              value={form.nome_lead}
              onChange={(e) => setForm((prev) => ({ ...prev, nome_lead: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
            />
          </label>
          <label className="text-xs text-gray-500">
            Telefone
            <input
              value={form.telefone}
              onChange={(e) => setForm((prev) => ({ ...prev, telefone: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
            />
          </label>
          <label className="text-xs text-gray-500">
            E-mail
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
            />
          </label>
          <label className="text-xs text-gray-500">
            Origem
            <input
              value={form.origem}
              onChange={(e) => setForm((prev) => ({ ...prev, origem: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
            />
          </label>
          <label className="text-xs text-gray-500">
            Vendedor
            <select
              value={form.vendedor}
              onChange={(e) => setForm((prev) => ({ ...prev, vendedor: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
            >
              <option value="">Sem vendedor</option>
              {vendedores.map((vendedor) => (
                <option key={vendedor.id} value={vendedor.vendedor ?? ''}>
                  {vendedor.vendedor}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-500">
            Veiculo de interesse
            <input
              value={form.veiculo_interesse}
              onChange={(e) => setForm((prev) => ({ ...prev, veiculo_interesse: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
            />
          </label>
          <label className="text-xs text-gray-500">
            Valor
            <input
              type="number"
              step="0.01"
              value={form.valor}
              onChange={(e) => setForm((prev) => ({ ...prev, valor: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
            />
          </label>
          <label className="text-xs text-gray-500 sm:col-span-2">
            Observacao
            <textarea
              value={form.observacao_vendedor}
              onChange={(e) => setForm((prev) => ({ ...prev, observacao_vendedor: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
            />
          </label>
        </div>

        {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={criarLead}
            disabled={salvando}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {salvando ? 'Salvando...' : 'Adicionar lead'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<BaseDeLeads[]>([]);
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [leadEtiquetas, setLeadEtiquetas] = useState<LeadEtiqueta[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(createDefaultLeadFilters);
  const [leadSelecionado, setLeadSelecionado] = useState<BaseDeLeads | null>(null);
  const [novoLeadAberto, setNovoLeadAberto] = useState(false);
  const [vendedorPadrao, setVendedorPadrao] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function fetchLeads() {
      setLoading(true);
      const supabase = createClient();
      let leadsResult: {
        data: unknown;
        error: { message?: string; details?: string | null } | null;
      } = await supabase
        .from('BASE_DE_LEADS')
        .select(LEAD_SELECT)
        .not('estagio_lead', 'is', null)
        .order('created_at', { ascending: false });

      if (isOrdemPipelineMissing(leadsResult.error)) {
        leadsResult = await supabase
          .from('BASE_DE_LEADS')
          .select(LEAD_SELECT_BASE)
          .not('estagio_lead', 'is', null)
          .order('created_at', { ascending: false });
      }

      const [{ data: etiquetasData }, { data: leadEtiquetasData }, { data: vendedoresData }] =
        await Promise.all([
          supabase.from('etiquetas').select('id, nome, cor, created_at').order('nome'),
          supabase.from('lead_etiquetas').select('id, id_lead, id_etiqueta, created_at'),
          supabase
            .from('VENDEDORES')
            .select('id, created_at, vendedor, telefone, atender, quantos_lead, id_click, id_empresa')
            .order('vendedor'),
        ]);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!userError && userData.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nome')
          .eq('id', userData.user.id)
          .single();
        if (isMounted) setVendedorPadrao((profile as { nome: string | null } | null)?.nome ?? '');
      }

      if (!isMounted) return;

      if (leadsResult.error) {
        console.error('Erro ao buscar leads:', leadsResult.error.message);
        setLeads([]);
      } else {
        setLeads(((leadsResult.data as unknown as BaseDeLeads[]) ?? []).filter((lead) => lead.estagio_lead !== null));
      }
      setEtiquetas((etiquetasData as Etiqueta[]) ?? []);
      setLeadEtiquetas((leadEtiquetasData as LeadEtiqueta[]) ?? []);
      setVendedores((vendedoresData as Vendedor[]) ?? []);
      setLoading(false);
    }

    fetchLeads();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const leadId = Number(searchParams.get('lead'));
    if (!leadId || loading) return;

    const lead = leads.find((item) => item.id === leadId);
    if (lead) setLeadSelecionado(lead);
  }, [leads, loading, searchParams]);

  const etiquetaIdsPorLead = useMemo(() => {
    const map = new Map<number, Set<number>>();
    leadEtiquetas.forEach((item) => {
      const set = map.get(item.id_lead) ?? new Set<number>();
      set.add(item.id_etiqueta);
      map.set(item.id_lead, set);
    });
    return map;
  }, [leadEtiquetas]);

  const leadsFiltrados = useMemo(
    () => filterLeads(leads, filters, etiquetaIdsPorLead),
    [leads, filters, etiquetaIdsPorLead]
  );

  const idEmpresaPadrao = useMemo(() => leads.find((lead) => lead.id_empresa)?.id_empresa ?? 1, [leads]);

  function limparFiltros() {
    setFilters(createDefaultLeadFilters());
  }

  function atualizarEtiquetasDoLead(leadId: number, etiquetaIds: number[]) {
    setLeadEtiquetas((prev) => [
      ...prev.filter((item) => item.id_lead !== leadId),
      ...etiquetaIds.map((idEtiqueta) => ({
        id: -idEtiqueta,
        id_lead: leadId,
        id_etiqueta: idEtiqueta,
        created_at: new Date().toISOString(),
      })),
    ]);
  }

  function exportarCsv() {
    const headers = ['Nome', 'Telefone', 'Email', 'Origem', 'Vendedor', 'Veiculo', 'Estagio', 'Valor', 'Criado em'];
    const rows = leadsFiltrados.map((l) => [
      l.nome_lead,
      l.telefone,
      l.email ?? '',
      l.origem ?? '',
      l.vendedor ?? '',
      l.veiculo_interesse ?? '',
      l.estagio_lead,
      l.valor ?? '',
      l.created_at,
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leads_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
    []
  );

  const parentRef = useRef<HTMLDivElement>(null);
  const ROW_HEIGHT = 64;

  const rowVirtualizer = useVirtualizer({
    count: leadsFiltrados.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-gray-500">{leadsFiltrados.length} lead(s) encontrado(s)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setNovoLeadAberto(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Adicionar lead
          </button>
          <button
            type="button"
            onClick={exportarCsv}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      <LeadFilters
        leads={leads}
        filters={filters}
        etiquetas={etiquetas}
        onChange={setFilters}
        onClear={limparFiltros}
      />

      <div className="rounded-xl bg-card shadow-sm">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_0.8fr] gap-2 border-b border-gray-200 px-4 py-3 text-xs font-semibold uppercase text-gray-500">
          <span>Lead</span>
          <span>Origem</span>
          <span>Vendedor</span>
          <span>Veiculo</span>
          <span>Estagio</span>
          <span>Valor</span>
        </div>

        {loading ? (
          <p className="px-4 py-6 text-sm text-gray-500">Carregando...</p>
        ) : leadsFiltrados.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500">Nenhum lead encontrado.</p>
        ) : (
          <div ref={parentRef} className="max-h-[600px] overflow-y-auto">
            <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const lead = leadsFiltrados[virtualRow.index];
                return (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => setLeadSelecionado(lead)}
                    className="absolute left-0 top-0 grid w-full grid-cols-[1.5fr_1fr_1fr_1fr_1fr_0.8fr] items-center gap-2 border-b border-gray-100 px-4 text-left hover:bg-gray-50"
                    style={{ height: virtualRow.size, transform: `translateY(${virtualRow.start}px)` }}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <Avatar name={lead.nome_lead} size={32} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{lead.nome_lead}</p>
                        <p className="truncate text-xs text-gray-500">
                          {lead.telefone} - {format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: getOrigemColor(lead.origem) }}
                      />
                      {lead.origem ?? '-'}
                    </div>
                    <span className="truncate text-sm text-gray-700">{lead.vendedor ?? '-'}</span>
                    <span className="truncate text-sm text-gray-700">{lead.veiculo_interesse ?? '-'}</span>
                    <StatusBadge estagio={lead.estagio_lead} />
                    <span className="text-sm font-medium text-foreground">
                      {lead.valor != null ? currencyFormatter.format(lead.valor) : '-'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {novoLeadAberto && (
        <NovoLeadModal
          vendedores={vendedores}
          idEmpresaPadrao={idEmpresaPadrao}
          vendedorPadrao={vendedorPadrao}
          onClose={() => setNovoLeadAberto(false)}
          onCreated={(lead) => {
            setLeads((prev) => [lead, ...prev]);
            setLeadSelecionado(lead);
            setNovoLeadAberto(false);
          }}
        />
      )}

      {leadSelecionado && (
        <LeadDrawer
          lead={leadSelecionado}
          estagioLabel={
            COLUNAS.find((c) => c.id === normalizeEstagio(leadSelecionado.estagio_lead))?.label ?? 'Oportunidade'
          }
          estagioColor={
            COLUNAS.find((c) => c.id === normalizeEstagio(leadSelecionado.estagio_lead))?.color ?? '#22c55e'
          }
          estagioLabelOf={(estagio) =>
            COLUNAS.find((c) => c.id === normalizeEstagio(estagio))?.label ?? estagio ?? 'Oportunidade'
          }
          onClose={() => setLeadSelecionado(null)}
          onUpdated={(atualizado) => {
            setLeadSelecionado(atualizado);
            setLeads((prev) => prev.map((l) => (l.id === atualizado.id ? atualizado : l)));
          }}
          onEtiquetasChanged={atualizarEtiquetasDoLead}
        />
      )}
    </div>
  );
}
