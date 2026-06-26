import clsx from 'clsx';

export interface StatusConfig {
  label: string;
  color: string; // hex
}

// Mapa central de estágio -> { label, color }. Mantido aqui para ser reaproveitado por
// Pipeline, Leads e Dashboard, garantindo cores consistentes em toda a aplicação.
export const ESTAGIO_CONFIG: Record<string, StatusConfig> = {
  oportunidade: { label: 'Oportunidade', color: '#22c55e' },
  em_qualificacao: { label: 'Em Qualificação', color: '#38bdf8' },
  transferido: { label: 'Transferido', color: '#3b82f6' },
  negociacao: { label: 'Negociação', color: '#f97316' },
  proposta: { label: 'Proposta', color: '#a855f7' },
  fechado: { label: 'Fechado', color: '#16a34a' },
  perdido: { label: 'Perdido', color: '#ef4444' },
};

const DEFAULT_CONFIG: StatusConfig = { label: 'Desconhecido', color: '#6b7280' };

interface StatusBadgeProps {
  estagio: string | null | undefined;
  className?: string;
}

export function StatusBadge({ estagio, className }: StatusBadgeProps) {
  const key = (estagio ?? '').toLowerCase().trim();
  const config = ESTAGIO_CONFIG[key] ?? DEFAULT_CONFIG;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        className
      )}
      style={{ backgroundColor: `${config.color}1a`, color: config.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: config.color }} />
      {config.label}
    </span>
  );
}
