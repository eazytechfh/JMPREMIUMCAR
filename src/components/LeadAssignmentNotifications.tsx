'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { LeadNotificacao } from '@/types/database';

interface LeadAssignmentNotificationsProps {
  userCargo: string;
}

export function LeadAssignmentNotifications({ userCargo }: LeadAssignmentNotificationsProps) {
  const [notificacoes, setNotificacoes] = useState<LeadNotificacao[]>([]);

  const fetchNotificacoes = useCallback(async () => {
    if (userCargo !== 'vendedor') return;

    const supabase = createClient();
    const { data } = await supabase
      .from('lead_notificacoes')
      .select('id, id_usuario, id_lead, titulo, mensagem, lida, created_at')
      .eq('lida', false)
      .order('created_at', { ascending: false })
      .limit(5);

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

  if (userCargo !== 'vendedor' || notificacoes.length === 0) return null;

  return (
    <div className="fixed right-5 top-5 z-50 w-full max-w-sm space-y-2">
      {notificacoes.map((notificacao) => (
        <div
          key={notificacao.id}
          className="rounded-lg border border-green-200 bg-white p-4 shadow-lg"
        >
          <div className="flex items-start gap-3">
            <span className="mt-1 h-2.5 w-2.5 rounded-full bg-green-500" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{notificacao.titulo}</p>
              <p className="mt-1 text-sm text-gray-600">{notificacao.mensagem}</p>
              <div className="mt-3 flex items-center gap-3">
                <Link
                  href="/leads"
                  onClick={() => marcarComoLida(notificacao.id)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Ver leads
                </Link>
                <button
                  type="button"
                  onClick={() => marcarComoLida(notificacao.id)}
                  className="text-xs font-medium text-gray-500 hover:text-gray-800"
                >
                  Dispensar
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
