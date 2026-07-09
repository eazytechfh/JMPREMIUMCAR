'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { LeadNotificacao } from '@/types/database';

interface LeadAssignmentNotificationsProps {
  userCargo: string;
}

function getMensagemParts(mensagem: string): { nome: string; complemento: string } {
  const normalized = mensagem.trim();
  const match = normalized.match(/^(.*?)\s+foi atribu[ií]do a voc[eê]\.?$/i);

  if (!match) {
    return { nome: 'Lead', complemento: normalized || 'foi atribuído a você.' };
  }

  return {
    nome: match[1]?.trim() || 'Lead',
    complemento: 'foi atribuído a você.',
  };
}

export function LeadAssignmentNotifications({ userCargo }: LeadAssignmentNotificationsProps) {
  const [notificacoes, setNotificacoes] = useState<LeadNotificacao[]>([]);
  const [aberto, setAberto] = useState(false);

  const fetchNotificacoes = useCallback(async () => {
    if (userCargo !== 'vendedor') return;

    const supabase = createClient();
    const { data } = await supabase
      .from('lead_notificacoes')
      .select('id, id_usuario, id_lead, titulo, mensagem, lida, created_at')
      .eq('lida', false)
      .order('created_at', { ascending: false })
      .limit(50);

    setNotificacoes((data as LeadNotificacao[]) ?? []);
  }, [userCargo]);

  useEffect(() => {
    if (userCargo !== 'vendedor') return;

    fetchNotificacoes();
    const interval = window.setInterval(fetchNotificacoes, 10000);
    return () => window.clearInterval(interval);
  }, [fetchNotificacoes, userCargo]);

  async function marcarComoLida(id: number) {
    setNotificacoes((prev) => prev.filter((notificacao) => notificacao.id !== id));

    const supabase = createClient();
    const { error } = await supabase.from('lead_notificacoes').update({ lida: true }).eq('id', id);

    if (error) fetchNotificacoes();
  }

  const quantidade = notificacoes.length;
  const labelQuantidade = useMemo(() => (quantidade > 99 ? '99+' : String(quantidade)), [quantidade]);

  if (userCargo !== 'vendedor') return null;

  return (
    <div className="fixed right-5 top-5 z-50">
      <button
        type="button"
        onClick={() => setAberto((value) => !value)}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-lg hover:bg-gray-50"
        aria-label="Notificações de leads atribuídos"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <path
            d="M15 17H9m9-1v-5a6 6 0 10-12 0v5l-2 2h16l-2-2z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M10 20a2 2 0 004 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {quantidade > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold text-white">
            {labelQuantidade}
          </span>
        )}
      </button>

      {aberto && (
        <div className="mt-2 w-80 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Leads atribuídos</p>
            <p className="text-xs text-gray-500">
              {quantidade === 0 ? 'Nenhuma notificação nova.' : `${quantidade} notificação(ões) pendente(s).`}
            </p>
          </div>

          {quantidade === 0 ? (
            <p className="px-4 py-5 text-sm text-gray-500">Tudo certo por aqui.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {notificacoes.map((notificacao) => {
                const { nome, complemento } = getMensagemParts(notificacao.mensagem);

                return (
                  <div key={notificacao.id} className="border-b border-gray-100 px-4 py-3 last:border-b-0">
                    <p className="text-xs font-medium uppercase text-green-700">{notificacao.titulo}</p>
                    <p className="mt-1 text-sm text-gray-700">
                      <Link
                        href={`/leads?lead=${notificacao.id_lead}`}
                        onClick={() => {
                          marcarComoLida(notificacao.id);
                          setAberto(false);
                        }}
                        className="font-semibold text-primary hover:underline"
                      >
                        {nome}
                      </Link>{' '}
                      {complemento}
                    </p>
                    <button
                      type="button"
                      onClick={() => marcarComoLida(notificacao.id)}
                      className="mt-2 text-xs font-medium text-gray-500 hover:text-gray-800"
                    >
                      Dispensar
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
