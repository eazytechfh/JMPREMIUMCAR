export interface PipelineStage {
  id: number;
  slug: string;
  nome: string;
  cor: string;
  ordem: number;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_PIPELINE_STAGES: PipelineStage[] = [
  { id: -1, slug: 'oportunidade', nome: 'Oportunidade', cor: '#22c55e', ordem: 0 },
  { id: -2, slug: 'em_qualificacao', nome: 'Em Qualificação', cor: '#38bdf8', ordem: 1 },
  { id: -3, slug: 'em_negociacao', nome: 'Em Negociação', cor: '#f97316', ordem: 2 },
  { id: -4, slug: 'follow_up', nome: 'Follow-up', cor: '#a855f7', ordem: 3 },
  { id: -5, slug: 'fechado', nome: 'Fechado', cor: '#16a34a', ordem: 4 },
  { id: -6, slug: 'nao_fechou', nome: 'Não Fechou', cor: '#ef4444', ordem: 5 },
  { id: -7, slug: 'pesquisa_atendimento', nome: 'Pesquisa de Atendimento', cor: '#06b6d4', ordem: 6 },
];

export function slugifyStage(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50);
}
