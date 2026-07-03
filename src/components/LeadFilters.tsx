'use client';

import { useMemo } from 'react';
import type { BaseDeLeads, Etiqueta } from '@/types/database';
import { PillFilter, type PillOption } from '@/components/PillFilter';
import { isDentroExpediente } from '@/lib/expediente';

export type Periodo = 'hoje' | 'ontem' | '7d' | '30d' | '90d' | 'todos';
export type Expediente = 'todos' | 'dentro' | 'fora';

export interface LeadFiltersState {
  busca: string;
  origemFiltro: string;
  vendedorFiltro: string;
  veiculoFiltro: string;
  etiquetaFiltro: string;
  periodo: Periodo;
  expediente: Expediente;
}

export function createDefaultLeadFilters(): LeadFiltersState {
  return {
    busca: '',
    origemFiltro: 'todas',
    vendedorFiltro: 'todos',
    veiculoFiltro: 'todos',
    etiquetaFiltro: 'todas',
    periodo: 'todos',
    expediente: 'todos',
  };
}

const PERIODO_OPTIONS: PillOption<Periodo>[] = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'ontem', label: 'Ontem' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: 'todos', label: 'Todos' },
];

const EXPEDIENTE_OPTIONS: PillOption<Expediente>[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'dentro', label: 'Dentro do expediente' },
  { value: 'fora', label: 'Fora do expediente' },
];

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function filterLeads(
  leads: BaseDeLeads[],
  filters: LeadFiltersState,
  etiquetasPorLead?: Map<number, Set<number>>
): BaseDeLeads[] {
  return leads.filter((lead) => {
    if (filters.busca) {
      const term = filters.busca.toLowerCase();
      const matches =
        lead.nome_lead?.toLowerCase().includes(term) ||
        lead.telefone?.toLowerCase().includes(term) ||
        lead.email?.toLowerCase().includes(term);
      if (!matches) return false;
    }

    if (filters.origemFiltro !== 'todas' && lead.origem !== filters.origemFiltro) return false;
    if (filters.vendedorFiltro !== 'todos' && lead.vendedor !== filters.vendedorFiltro) return false;
    if (filters.veiculoFiltro !== 'todos' && lead.veiculo_interesse !== filters.veiculoFiltro) return false;
    if (filters.etiquetaFiltro !== 'todas') {
      const idEtiqueta = Number(filters.etiquetaFiltro);
      if (!etiquetasPorLead?.get(lead.id)?.has(idEtiqueta)) return false;
    }

    if (filters.periodo !== 'todos') {
      const created = new Date(lead.created_at);
      const limites: Record<Exclude<Periodo, 'todos'>, Date> = {
        hoje: daysAgo(0),
        ontem: daysAgo(1),
        '7d': daysAgo(7),
        '30d': daysAgo(30),
        '90d': daysAgo(90),
      };

      if (filters.periodo === 'ontem') {
        const inicioOntem = daysAgo(1);
        const fimOntem = daysAgo(0);
        if (!(created >= inicioOntem && created < fimOntem)) return false;
      } else if (created < limites[filters.periodo]) {
        return false;
      }
    }

    if (filters.expediente !== 'todos') {
      const dentro = isDentroExpediente(new Date(lead.created_at));
      if (filters.expediente === 'dentro' && !dentro) return false;
      if (filters.expediente === 'fora' && dentro) return false;
    }

    return true;
  });
}

interface LeadFiltersProps {
  leads: BaseDeLeads[];
  filters: LeadFiltersState;
  onChange: (filters: LeadFiltersState) => void;
  onClear: () => void;
  etiquetas?: Etiqueta[];
}

export function LeadFilters({ leads, filters, onChange, onClear, etiquetas }: LeadFiltersProps) {
  const origensDisponiveis = useMemo(
    () => Array.from(new Set(leads.map((l) => l.origem).filter((v): v is string => Boolean(v)))),
    [leads]
  );
  const vendedoresDisponiveis = useMemo(
    () => Array.from(new Set(leads.map((l) => l.vendedor).filter((v): v is string => Boolean(v)))),
    [leads]
  );
  const veiculosDisponiveis = useMemo(
    () =>
      Array.from(new Set(leads.map((l) => l.veiculo_interesse).filter((v): v is string => Boolean(v)))),
    [leads]
  );

  function update(partial: Partial<LeadFiltersState>) {
    onChange({ ...filters, ...partial });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-card p-4 shadow-sm">
      <input
        type="text"
        placeholder="Buscar por nome, telefone ou e-mail..."
        value={filters.busca}
        onChange={(e) => update({ busca: e.target.value })}
        className="min-w-[220px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
      />

      <select
        value={filters.origemFiltro}
        onChange={(e) => update({ origemFiltro: e.target.value })}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="todas">Todas as origens</option>
        {origensDisponiveis.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>

      <select
        value={filters.vendedorFiltro}
        onChange={(e) => update({ vendedorFiltro: e.target.value })}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="todos">Todos os vendedores</option>
        {vendedoresDisponiveis.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>

      <select
        value={filters.veiculoFiltro}
        onChange={(e) => update({ veiculoFiltro: e.target.value })}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="todos">Todos os veículos</option>
        {veiculosDisponiveis.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>

      {etiquetas && (
        <select
          value={filters.etiquetaFiltro}
          onChange={(e) => update({ etiquetaFiltro: e.target.value })}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="todas">Todas as etiquetas</option>
          {etiquetas.map((etiqueta) => (
            <option key={etiqueta.id} value={String(etiqueta.id)}>
              {etiqueta.nome}
            </option>
          ))}
        </select>
      )}

      <PillFilter options={PERIODO_OPTIONS} selected={filters.periodo} onChange={(periodo) => update({ periodo })} />
      <PillFilter
        options={EXPEDIENTE_OPTIONS}
        selected={filters.expediente}
        onChange={(expediente) => update({ expediente })}
      />

      <button
        type="button"
        onClick={onClear}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
      >
        Limpar filtros
      </button>
    </div>
  );
}
