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
import type { BaseDeLeads } from '@/types/database';
import { Avatar } from '@/components/Avatar';

// Decisão de design: como não há acesso aos dados reais de produção para inferir todos os
// valores possíveis de estagio_lead, definimos aqui um conjunto razoável de estágios de funil
// para concessionárias de veículos. Caso o estágio real de um lead não esteja nesta lista, ele
// é exibido na coluna "Oportunidade" (fallback) até ser reclassificado manualmente.
const COLUNAS = [
  { id: 'oportunidade', label: 'Oportunidade', color: '#22c55e' },
  { id: 'em_qualificacao', label: 'Em Qualificação', color: '#38bdf8' },
  { id: 'transferido', label: 'Transferido', color: '#3b82f6' },
  { id: 'negociacao', label: 'Negociação', color: '#f97316' },
  { id: 'proposta', label: 'Proposta', color: '#a855f7' },
  { id: 'fechado', label: 'Fechado', color: '#16a34a' },
  { id: 'perdido', label: 'Perdido', color: '#ef4444' },
] as const;

type ColunaId = (typeof COLUNAS)[number]['id'];

function normalizeEstagio(estagio: string): ColunaId {
  const key = estagio.toLowerCase().trim();
  const found = COLUNAS.find((c) => c.id === key);
  return found ? found.id : 'oportunidade';
}

interface CardProps {
  lead: BaseDeLeads;
}

function LeadCard({ lead }: CardProps) {
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
      className="cursor-grab rounded-lg border border-gray-200 bg-white p-3 shadow-sm active:cursor-grabbing"
    >
      <div className="mb-2 flex items-center gap-2">
        <Avatar name={lead.nome_lead} size={28} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900">{lead.nome_lead}</p>
          <p className="truncate text-xs text-gray-500">{lead.telefone}</p>
        </div>
      </div>
      {lead.veiculo_interesse && (
        <p className="truncate text-xs text-gray-600">Interesse: {lead.veiculo_interesse}</p>
      )}
      {lead.vendedor && <p className="truncate text-xs text-gray-400">Vendedor: {lead.vendedor}</p>}
    </div>
  );
}

interface ColumnProps {
  id: ColunaId;
  label: string;
  color: string;
  leads: BaseDeLeads[];
}

function Column({ id, label, color, leads }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-xl bg-gray-50 p-3 ${
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

      <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export default function PipelinePage() {
  const [leads, setLeads] = useState<BaseDeLeads[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      const { data, error } = await supabase
        .from('BASE_DE_LEADS')
        .select(
          'id, id_empresa, nome_lead, telefone, email, origem, vendedor, veiculo_interesse, resumo_qualificacao, estagio_lead, resumo_comercial, created_at, updated_at, valor, observacao_vendedor, bot_ativo, "Etapa", "QuemEnviouMsg", "UltimaMensagem", "Status de Follow", "Transferencia", "Pesquisa de satisfação", "ID CONTATO CLICK", lid, "Data e Hora"'
        )
        .order('created_at', { ascending: false });

      if (!isMounted) return;

      if (error) {
        console.error('Erro ao buscar leads:', error.message);
        setLeads([]);
      } else {
        setLeads((data as unknown as BaseDeLeads[]) ?? []);
      }
      setLoading(false);
    }

    fetchLeads();
    return () => {
      isMounted = false;
    };
  }, []);

  const leadsPorColuna = useMemo(() => {
    const map = new Map<ColunaId, BaseDeLeads[]>(COLUNAS.map((c) => [c.id, []]));
    leads.forEach((lead) => {
      const coluna = normalizeEstagio(lead.estagio_lead);
      map.get(coluna)?.push(lead);
    });
    return map;
  }, [leads]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const leadId = Number(active.id);
    const novoEstagio = over.id as ColunaId;

    const leadAtual = leads.find((l) => l.id === leadId);
    if (!leadAtual) return;

    const estagioAnterior = leadAtual.estagio_lead;
    if (normalizeEstagio(estagioAnterior) === novoEstagio) return;

    // Optimistic update: atualiza a UI imediatamente para dar sensação de resposta instantânea
    // no drag and drop, antes mesmo de confirmar a escrita no banco.
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, estagio_lead: novoEstagio } : l))
    );

    const supabase = createClient();
    const { error } = await supabase
      .from('BASE_DE_LEADS')
      .update({ estagio_lead: novoEstagio })
      .eq('id', leadId);

    if (error) {
      // Rollback em caso de erro de escrita, e aviso simples ao usuário.
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, estagio_lead: estagioAnterior } : l))
      );
      setErrorMessage('Não foi possível mover o lead. Tente novamente.');
      setTimeout(() => setErrorMessage(null), 4000);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
        <p className="text-sm text-gray-500">Arraste os cards entre as etapas do funil</p>
      </div>

      {errorMessage && (
        <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{errorMessage}</div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {COLUNAS.map((coluna) => (
              <Column
                key={coluna.id}
                id={coluna.id}
                label={coluna.label}
                color={coluna.color}
                leads={leadsPorColuna.get(coluna.id) ?? []}
              />
            ))}
          </div>
        </DndContext>
      )}
    </div>
  );
}
