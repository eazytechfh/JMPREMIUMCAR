'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createClient } from '@/lib/supabase/client';
import type { BaseDeLeads, Etiqueta, LeadEtiqueta } from '@/types/database';
import { Avatar } from '@/components/Avatar';
import { LeadDrawer } from '@/components/LeadDrawer';
import { LeadFilters, createDefaultLeadFilters, filterLeads } from '@/components/LeadFilters';
import { ESTAGIO_CONFIG } from '@/components/StatusBadge';
import { DEFAULT_PIPELINE_STAGES, type PipelineStage } from '@/lib/pipeline-stages';

// Fallback usado enquanto a tabela configurável ainda está carregando (ou antes da migration).
const COLUNAS_PADRAO = (Object.keys(ESTAGIO_CONFIG) as Array<keyof typeof ESTAGIO_CONFIG>).map((id) => ({
  id,
  label: ESTAGIO_CONFIG[id].label,
  color: ESTAGIO_CONFIG[id].color,
}));

const LEADS_PER_COLUMN_PAGE = 12;

const LEAD_SELECT_BASE =
  'id, id_empresa, nome_lead, telefone, email, origem, vendedor, veiculo_interesse, resumo_qualificacao, estagio_lead, resumo_comercial, created_at, updated_at, valor, observacao_vendedor, bot_ativo, "Etapa", "QuemEnviouMsg", "UltimaMensagem", StatusDeFollow:"Status de Follow", "Transferencia", PesquisaDeSatisfacao:"Pesquisa de satisfação", IdContatoClick:"ID CONTATO CLICK", lid, DataEHora:"Data e Hora", cpf, data_nascimento, score_serasa';

const LEAD_SELECT =
  'id, id_empresa, nome_lead, telefone, email, origem, vendedor, veiculo_interesse, resumo_qualificacao, estagio_lead, ordem_pipeline, resumo_comercial, created_at, updated_at, valor, observacao_vendedor, bot_ativo, "Etapa", "QuemEnviouMsg", "UltimaMensagem", StatusDeFollow:"Status de Follow", "Transferencia", PesquisaDeSatisfacao:"Pesquisa de satisfação", IdContatoClick:"ID CONTATO CLICK", lid, DataEHora:"Data e Hora", cpf, data_nascimento, score_serasa';

type ColunaId = string;

function normalizeEstagio(estagio: string | null | undefined, colunas = COLUNAS_PADRAO): ColunaId {
  const key = (estagio ?? '').toLowerCase().trim();
  const found = colunas.find((c) => c.id === key);
  return found ? found.id : 'oportunidade';
}

function sortByPipelineOrder(a: BaseDeLeads, b: BaseDeLeads): number {
  const orderA = a.ordem_pipeline ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.ordem_pipeline ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

function isOrdemPipelineMissing(error: { message?: string; details?: string | null } | null): boolean {
  const text = `${error?.message ?? ''} ${error?.details ?? ''}`.toLowerCase();
  return text.includes('ordem_pipeline');
}

interface CardProps {
  lead: BaseDeLeads;
  etiquetas: Etiqueta[];
  onOpen: (lead: BaseDeLeads) => void;
  onEtiquetaClick: (etiqueta: Etiqueta) => void;
}

function LeadCard({ lead, etiquetas, onOpen, onEtiquetaClick }: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(lead)}
      className="cursor-grab rounded-lg border border-gray-200 bg-white p-3 shadow-sm active:cursor-grabbing"
    >
      <div className="mb-2 flex items-center gap-2">
        <Avatar name={lead.nome_lead} size={28} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{lead.nome_lead}</p>
          <p className="truncate text-xs text-gray-500">{lead.telefone}</p>
        </div>
      </div>
      {lead.veiculo_interesse && (
        <p className="truncate text-xs text-gray-600">Interesse: {lead.veiculo_interesse}</p>
      )}
      {lead.vendedor && <p className="truncate text-xs text-gray-400">Vendedor: {lead.vendedor}</p>}
      {etiquetas.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {etiquetas.map((etiqueta) => (
            <button
              key={etiqueta.id}
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onEtiquetaClick(etiqueta);
              }}
              className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
              style={{
                backgroundColor: `${etiqueta.cor}1a`,
                borderColor: etiqueta.cor,
                color: etiqueta.cor,
              }}
            >
              {etiqueta.nome}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface ColumnProps {
  id: ColunaId;
  label: string;
  color: string;
  leads: BaseDeLeads[];
  etiquetasPorLead: Map<number, Etiqueta[]>;
  onOpenLead: (lead: BaseDeLeads) => void;
  onEtiquetaClick: (etiqueta: Etiqueta) => void;
  page: number;
  onPageChange: (page: number) => void;
}

function Column({
  id,
  label,
  color,
  leads,
  etiquetasPorLead,
  onOpenLead,
  onEtiquetaClick,
  page,
  onPageChange,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const totalPages = Math.max(1, Math.ceil(leads.length / LEADS_PER_COLUMN_PAGE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * LEADS_PER_COLUMN_PAGE;
  const visibleLeads = leads.slice(start, start + LEADS_PER_COLUMN_PAGE);

  return (
    <div
      ref={setNodeRef}
      className={`flex h-full min-h-0 w-72 shrink-0 flex-col rounded-xl bg-gray-50 p-3 ${
        isOver ? 'ring-2 ring-gray-400' : ''
      }`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-semibold text-gray-800">{label}</span>
        </div>
        <span className="text-xs text-gray-500">{leads.length}</span>
      </div>

      <SortableContext items={visibleLeads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {visibleLeads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              etiquetas={etiquetasPorLead.get(lead.id) ?? []}
              onOpen={onOpenLead}
              onEtiquetaClick={onEtiquetaClick}
            />
          ))}
        </div>
      </SortableContext>

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            disabled={safePage === 1}
            className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-xs text-gray-500">
            {safePage}/{totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
            disabled={safePage === totalPages}
            className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Proxima
          </button>
        </div>
      )}
    </div>
  );
}

export default function PipelinePage() {
  const [etapas, setEtapas] = useState<PipelineStage[]>(DEFAULT_PIPELINE_STAGES);
  const [leads, setLeads] = useState<BaseDeLeads[]>([]);
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [leadEtiquetas, setLeadEtiquetas] = useState<LeadEtiqueta[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [leadSelecionado, setLeadSelecionado] = useState<BaseDeLeads | null>(null);
  const [nomeUsuario, setNomeUsuario] = useState<string>('Usuário');
  const [filters, setFilters] = useState(createDefaultLeadFilters);
  const [columnPages, setColumnPages] = useState<Record<string, number>>({});

  useEffect(() => {
    async function fetchUsuario() {
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('nome, email')
        .eq('id', userData.user.id)
        .single();
      const nome = (profile as { nome: string | null; email: string | null } | null)?.nome;
      setNomeUsuario(nome || userData.user.email || 'Usuário');
    }
    fetchUsuario();
  }, []);

  // activationConstraint com distance pequena: faz o drag iniciar quase imediatamente ao
  // mover o mouse, dando resposta "rápida" ao usuário sem disparar drag acidental em cliques.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

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
        .order('ordem_pipeline', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      if (isOrdemPipelineMissing(leadsResult.error)) {
        leadsResult = await supabase
          .from('BASE_DE_LEADS')
          .select(LEAD_SELECT_BASE)
          .not('estagio_lead', 'is', null)
          .order('created_at', { ascending: false });
      }

      const [{ data: etiquetasData }, { data: leadEtiquetasData }, etapasResult] = await Promise.all([
        supabase.from('etiquetas').select('id, nome, cor, created_at').order('nome'),
        supabase.from('lead_etiquetas').select('id, id_lead, id_etiqueta, created_at'),
        supabase.from('pipeline_etapas').select('id, slug, nome, cor, ordem').order('ordem'),
      ]);

      if (!isMounted) return;

      if (leadsResult.error) {
        console.error('Erro ao buscar leads:', leadsResult.error.message);
        setLeads([]);
      } else {
        setLeads(((leadsResult.data as unknown as BaseDeLeads[]) ?? []).filter((lead) => lead.estagio_lead !== null));
      }
      setEtiquetas((etiquetasData as Etiqueta[]) ?? []);
      setLeadEtiquetas((leadEtiquetasData as LeadEtiqueta[]) ?? []);
      if (!etapasResult.error && etapasResult.data?.length) setEtapas(etapasResult.data as PipelineStage[]);
      setLoading(false);
    }

    fetchLeads();
    return () => {
      isMounted = false;
    };
  }, []);

  const colunas = useMemo(
    () => etapas.map((etapa) => ({ id: etapa.slug, label: etapa.nome, color: etapa.cor })),
    [etapas]
  );

  const etiquetaById = useMemo(() => new Map(etiquetas.map((etiqueta) => [etiqueta.id, etiqueta])), [etiquetas]);

  const etiquetaIdsPorLead = useMemo(() => {
    const map = new Map<number, Set<number>>();
    leadEtiquetas.forEach((item) => {
      const set = map.get(item.id_lead) ?? new Set<number>();
      set.add(item.id_etiqueta);
      map.set(item.id_lead, set);
    });
    return map;
  }, [leadEtiquetas]);

  const etiquetasPorLead = useMemo(() => {
    const map = new Map<number, Etiqueta[]>();
    leadEtiquetas.forEach((item) => {
      const etiqueta = etiquetaById.get(item.id_etiqueta);
      if (!etiqueta) return;
      const list = map.get(item.id_lead) ?? [];
      list.push(etiqueta);
      map.set(item.id_lead, list);
    });
    return map;
  }, [etiquetaById, leadEtiquetas]);

  const leadsFiltrados = useMemo(
    () => filterLeads(leads, filters, etiquetaIdsPorLead),
    [leads, filters, etiquetaIdsPorLead]
  );

  const leadsPorColuna = useMemo(() => {
    const map = new Map<ColunaId, BaseDeLeads[]>(colunas.map((c) => [c.id, []]));
    leadsFiltrados.forEach((lead) => {
      const coluna = normalizeEstagio(lead.estagio_lead, colunas);
      map.get(coluna)?.push(lead);
    });
    map.forEach((lista) => lista.sort(sortByPipelineOrder));
    return map;
  }, [colunas, leadsFiltrados]);

  useEffect(() => {
    setColumnPages((prev) => {
      let changed = false;
      const next = { ...prev };

      colunas.forEach((coluna) => {
        const total = leadsPorColuna.get(coluna.id)?.length ?? 0;
        const totalPages = Math.max(1, Math.ceil(total / LEADS_PER_COLUMN_PAGE));
        const current = next[coluna.id] ?? 1;

        if (current > totalPages) {
          next[coluna.id] = totalPages;
          changed = true;
        } else if (current < 1) {
          next[coluna.id] = 1;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [colunas, leadsPorColuna]);

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

  function filtrarPorEtiqueta(etiqueta: Etiqueta) {
    setFilters((prev) => ({ ...prev, etiquetaFiltro: String(etiqueta.id) }));
  }

  async function buscarPrimeiraOrdemPipeline(estagio: string): Promise<number> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('BASE_DE_LEADS')
      .select('ordem_pipeline')
      .eq('estagio_lead', estagio)
      .not('ordem_pipeline', 'is', null)
      .order('ordem_pipeline', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (isOrdemPipelineMissing(error)) return 0;

    const primeiraOrdem = (data as { ordem_pipeline: number | null } | null)?.ordem_pipeline ?? 1;
    return primeiraOrdem - 1;
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const leadId = Number(active.id);
    const colunaDestino = colunas.find((coluna) => coluna.id === over.id)?.id;
    const leadDestino = leads.find((lead) => lead.id === Number(over.id));
    const novoEstagio = colunaDestino ?? (leadDestino ? normalizeEstagio(leadDestino.estagio_lead, colunas) : null);
    if (!novoEstagio) return;

    const leadAtual = leads.find((l) => l.id === leadId);
    if (!leadAtual) return;

    const estagioAnterior = leadAtual.estagio_lead;
    if (normalizeEstagio(estagioAnterior, colunas) === novoEstagio) return;
    const ordemAnterior = leadAtual.ordem_pipeline;
    const novaOrdem = await buscarPrimeiraOrdemPipeline(novoEstagio);

    // Optimistic update: atualiza a UI imediatamente para dar sensação de resposta instantânea
    // no drag and drop, antes mesmo de confirmar a escrita no banco.
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, estagio_lead: novoEstagio, ordem_pipeline: novaOrdem } : l))
    );

    const supabase = createClient();
    let { error } = await supabase
      .from('BASE_DE_LEADS')
      .update({ estagio_lead: novoEstagio, ordem_pipeline: novaOrdem })
      .eq('id', leadId);

    if (isOrdemPipelineMissing(error)) {
      const fallback = await supabase.from('BASE_DE_LEADS').update({ estagio_lead: novoEstagio }).eq('id', leadId);
      error = fallback.error;
    }

    if (error) {
      // Rollback em caso de erro de escrita, e aviso simples ao usuário.
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, estagio_lead: estagioAnterior, ordem_pipeline: ordemAnterior } : l
        )
      );
      setErrorMessage('Não foi possível mover o lead. Tente novamente.');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    await supabase.from('lead_historico_estagio').insert({
      id_lead: leadId,
      estagio_anterior: estagioAnterior,
      estagio_novo: novoEstagio,
      usuario: nomeUsuario,
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
        <p className="text-sm text-gray-500">
          Arraste os cards entre as etapas do funil · {leadsFiltrados.length} lead(s) encontrado(s)
        </p>
      </div>

      {errorMessage && (
        <div className="shrink-0 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{errorMessage}</div>
      )}

      <div className="shrink-0">
        <LeadFilters
          leads={leads}
          filters={filters}
          etiquetas={etiquetas}
          onChange={setFilters}
          onClear={limparFiltros}
        />
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="min-h-0 flex-1 overflow-x-auto pb-2">
            <div className="flex h-full gap-4">
            {colunas.map((coluna) => (
              <Column
                key={coluna.id}
                id={coluna.id}
                label={coluna.label}
                color={coluna.color}
                leads={leadsPorColuna.get(coluna.id) ?? []}
                etiquetasPorLead={etiquetasPorLead}
                onOpenLead={setLeadSelecionado}
                onEtiquetaClick={filtrarPorEtiqueta}
                page={columnPages[coluna.id] ?? 1}
                onPageChange={(page) => setColumnPages((prev) => ({ ...prev, [coluna.id]: page }))}
              />
            ))}
            </div>
          </div>
        </DndContext>
      )}

      {leadSelecionado && (
        <LeadDrawer
          lead={leadSelecionado}
          estagioLabel={
            colunas.find((c) => c.id === normalizeEstagio(leadSelecionado.estagio_lead, colunas))?.label ??
            'Oportunidade'
          }
          estagioColor={
            colunas.find((c) => c.id === normalizeEstagio(leadSelecionado.estagio_lead, colunas))?.color ??
            '#22c55e'
          }
          estagioLabelOf={(estagio) =>
            colunas.find((c) => c.id === normalizeEstagio(estagio, colunas))?.label ?? estagio ?? 'Oportunidade'
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
