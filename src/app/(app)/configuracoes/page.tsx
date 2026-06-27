'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Cargo, Etiqueta, Profile, Vendedor } from '@/types/database';
import { Avatar } from '@/components/Avatar';

type Tab = 'novo-usuario' | 'usuarios' | 'etiquetas' | 'fila' | 'credenciais';

const TABS: { id: Tab; label: string }[] = [
  { id: 'novo-usuario', label: 'Criar novo usuário' },
  { id: 'usuarios', label: 'Gerenciar usuários' },
  { id: 'etiquetas', label: 'Etiquetas' },
  { id: 'fila', label: 'Fila de atendimento' },
  { id: 'credenciais', label: 'Credenciais' },
];

function mask(value: string): string {
  if (!value) return '—';
  if (value.length <= 8) return '•'.repeat(value.length);
  return `${value.slice(0, 4)}${'•'.repeat(Math.max(4, value.length - 8))}${value.slice(-4)}`;
}

export default function ConfiguracoesPage() {
  const [tab, setTab] = useState<Tab>('novo-usuario');
  const [meuProfile, setMeuProfile] = useState<Profile | null>(null);

  useEffect(() => {
    async function fetchMeuProfile() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase
        .from('profiles')
        .select('id, nome, email, cargo, created_at')
        .eq('id', userData.user.id)
        .single();
      const profile = (data as Profile) ?? null;
      setMeuProfile(profile);
      if (profile?.cargo === 'vendedor') setTab('etiquetas');
    }
    fetchMeuProfile();
  }, []);

  const isAdminMaster = meuProfile?.cargo === 'admin_master';
  const podeGerenciarUsuarios =
    meuProfile?.cargo === 'admin_master' || meuProfile?.cargo === 'admin' || meuProfile?.cargo === 'gerente';

  const visibleTabs = TABS.filter((t) => {
    if (t.id === 'credenciais') return isAdminMaster;
    if (t.id === 'novo-usuario' || t.id === 'usuarios') return podeGerenciarUsuarios;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition ${
              tab === t.id
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'novo-usuario' && <CriarUsuarioTab />}
      {tab === 'usuarios' && <GerenciarUsuariosTab />}
      {tab === 'etiquetas' && <EtiquetasTab />}
      {tab === 'fila' && <FilaAtendimentoTab />}
      {tab === 'credenciais' && isAdminMaster && <CredenciaisTab />}
    </div>
  );
}

function CriarUsuarioTab() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargo, setCargo] = useState<Cargo>('vendedor');
  const [telefone, setTelefone] = useState('');
  const [mensagem, setMensagem] = useState<{ tipo: 'erro' | 'sucesso'; texto: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMensagem(null);

    const response = await fetch('/api/users/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, password, novoCargo: cargo, telefone }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMensagem({ tipo: 'erro', texto: data.error ?? 'Erro ao criar usuário.' });
      return;
    }

    setMensagem({ tipo: 'sucesso', texto: 'Usuário criado com sucesso.' });
    setNome('');
    setEmail('');
    setPassword('');
    setTelefone('');
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4 rounded-xl bg-card p-5 shadow-sm">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Nome</label>
        <input
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">E-mail</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Senha provisória</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Telefone</label>
        <input
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Cargo</label>
        <select
          value={cargo}
          onChange={(e) => setCargo(e.target.value as Cargo)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="vendedor">Vendedor</option>
          <option value="gerente">Gerente</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {mensagem && (
        <p className={`text-sm ${mensagem.tipo === 'erro' ? 'text-red-600' : 'text-green-600'}`}>
          {mensagem.texto}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {loading ? 'Criando...' : 'Criar usuário'}
      </button>
    </form>
  );
}

function GerenciarUsuariosTab() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfiles() {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('id, nome, email, cargo, created_at')
        .order('created_at', { ascending: false });
      setProfiles((data as Profile[]) ?? []);
      setLoading(false);
    }
    fetchProfiles();
  }, []);

  async function alterarCargo(id: string, novoCargo: Cargo) {
    const supabase = createClient();
    const { error } = await supabase.from('profiles').update({ cargo: novoCargo }).eq('id', id);
    if (!error) {
      setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, cargo: novoCargo } : p)));
    }
  }

  async function desativar(id: string) {
    await fetch(`/api/users/${id}/ban`, { method: 'POST' });
  }

  async function resetarSenha(id: string) {
    await fetch(`/api/users/${id}/reset-password`, { method: 'POST' });
  }

  if (loading) return <p className="text-sm text-gray-500">Carregando...</p>;

  return (
    <div className="overflow-x-auto rounded-xl bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
            <th className="px-4 py-3">Nome</th>
            <th className="px-4 py-3">E-mail</th>
            <th className="px-4 py-3">Cargo</th>
            <th className="px-4 py-3">Ações</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => (
            <tr key={p.id} className="border-b border-gray-100">
              <td className="px-4 py-3">{p.nome ?? '—'}</td>
              <td className="px-4 py-3">{p.email}</td>
              <td className="px-4 py-3">
                <select
                  value={p.cargo}
                  onChange={(e) => alterarCargo(p.id, e.target.value as Cargo)}
                  disabled={p.cargo === 'admin_master'}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-xs disabled:opacity-60"
                >
                  <option value="vendedor">Vendedor</option>
                  <option value="gerente">Gerente</option>
                  <option value="admin">Admin</option>
                  {p.cargo === 'admin_master' && <option value="admin_master">Admin Master</option>}
                </select>
              </td>
              <td className="px-4 py-3 space-x-2">
                <button
                  type="button"
                  onClick={() => resetarSenha(p.id)}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                >
                  Resetar senha
                </button>
                <button
                  type="button"
                  onClick={() => desativar(p.id)}
                  className="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  Desativar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EtiquetasTab() {
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState('#3b82f6');

  useEffect(() => {
    async function fetchEtiquetas() {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase.from('etiquetas').select('id, nome, cor, created_at').order('id');
      setEtiquetas((data as Etiqueta[]) ?? []);
      setLoading(false);
    }
    fetchEtiquetas();
  }, []);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from('etiquetas')
      .insert({ nome, cor })
      .select('id, nome, cor, created_at')
      .single();
    if (!error && data) {
      setEtiquetas((prev) => [...prev, data as Etiqueta]);
      setNome('');
    }
  }

  async function remover(id: number) {
    const supabase = createClient();
    const { error } = await supabase.from('etiquetas').delete().eq('id', id);
    if (!error) {
      setEtiquetas((prev) => prev.filter((e) => e.id !== id));
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <form onSubmit={adicionar} className="flex items-end gap-2 rounded-xl bg-card p-4 shadow-sm">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-gray-700">Nome</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Cor</label>
          <input
            type="color"
            value={cor}
            onChange={(e) => setCor(e.target.value)}
            className="h-10 w-14 rounded-lg border border-gray-300"
          />
        </div>
        <button type="submit" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white">
          Adicionar
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : (
        <ul className="space-y-2">
          {etiquetas.map((etq) => (
            <li
              key={etq.id}
              className="flex items-center justify-between rounded-xl bg-card p-3 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: etq.cor }} />
                <span className="text-sm text-gray-800">{etq.nome}</span>
              </div>
              <button
                type="button"
                onClick={() => remover(etq.id)}
                className="text-xs text-red-600 hover:underline"
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilaAtendimentoTab() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFila() {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('VENDEDORES')
        .select('id, created_at, vendedor, telefone, atender, quantos_lead, id_click, id_empresa')
        .order('id', { ascending: true });

      if (error) {
        console.error('Erro ao buscar fila de atendimento:', error.message);
        setVendedores([]);
      } else {
        setVendedores((data as Vendedor[]) ?? []);
      }
      setLoading(false);
    }
    fetchFila();
  }, []);

  if (loading) return <p className="text-sm text-gray-500">Carregando...</p>;

  // A coluna "atender" da tabela VENDEDORES indica a posição de cada vendedor na fila de
  // distribuição de leads: "vez" é quem recebe o próximo lead, "espera" é quem está aguardando
  // a próxima rodada. A ordem de espera segue o id de cadastro (não há coluna de posição
  // explícita na tabela hoje).
  const normalizado = (v: string | null) => (v ?? '').toLowerCase().trim();
  const daVez = vendedores.filter((v) => normalizado(v.atender) === 'vez');
  const emEspera = vendedores.filter((v) => normalizado(v.atender) === 'espera');
  const outros = vendedores.filter(
    (v) => !['vez', 'espera'].includes(normalizado(v.atender))
  );

  return (
    <div className="max-w-2xl space-y-6">
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Vendedor da vez
        </h2>
        {daVez.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum vendedor está marcado como &quot;vez&quot; agora.</p>
        ) : (
          <div className="space-y-2">
            {daVez.map((v) => (
              <div
                key={v.id}
                className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4"
              >
                <Avatar name={v.vendedor ?? '?'} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">{v.vendedor}</p>
                  <p className="text-xs text-gray-500">{v.telefone ?? '—'}</p>
                </div>
                <span className="rounded-full bg-green-600 px-3 py-1 text-xs font-medium text-white">
                  Na vez
                </span>
                <span className="text-xs text-gray-500">{v.quantos_lead ?? 0} leads</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Em espera
        </h2>
        {emEspera.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum vendedor em espera.</p>
        ) : (
          <ol className="space-y-2">
            {emEspera.map((v, index) => (
              <li
                key={v.id}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-card p-3"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                  {index + 1}
                </span>
                <Avatar name={v.vendedor ?? '?'} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{v.vendedor}</p>
                  <p className="text-xs text-gray-500">{v.telefone ?? '—'}</p>
                </div>
                <span className="text-xs text-gray-500">{v.quantos_lead ?? 0} leads</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {outros.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Sem status de fila definido
          </h2>
          <ul className="space-y-2">
            {outros.map((v) => (
              <li
                key={v.id}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
              >
                <Avatar name={v.vendedor ?? '?'} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{v.vendedor}</p>
                  <p className="text-xs text-gray-500">{v.telefone ?? '—'}</p>
                </div>
                <span className="text-xs text-gray-400">atender: {v.atender ?? '—'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {vendedores.length === 0 && (
        <p className="text-sm text-gray-400">Nenhum vendedor cadastrado ainda.</p>
      )}
    </div>
  );
}

function CredenciaisTab() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  const [uazapiToken, setUazapiToken] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const [qrcode, setQrcode] = useState<string | null>(null);
  const [conectando, setConectando] = useState(false);
  const [desconectando, setDesconectando] = useState(false);
  const [statusConexao, setStatusConexao] = useState<string | null>(null);
  const [instanceStatus, setInstanceStatus] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function checarStatus() {
    const response = await fetch('/api/whatsapp/status');
    const data = await response.json();
    if (response.ok) setInstanceStatus(data.status ?? null);
  }

  useEffect(() => {
    async function fetchSettings() {
      const supabase = createClient();
      const { data } = await supabase
        .from('app_settings')
        .select('uazapi_token, uazapi_base_url')
        .eq('id', 1)
        .single();
      const token = (data as { uazapi_token: string | null } | null)?.uazapi_token;
      setUazapiToken(token ?? '');
      if (token) checarStatus();
    }
    fetchSettings();

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  async function salvarToken() {
    setSalvando(true);
    setMensagem(null);
    const supabase = createClient();
    const { error } = await supabase
      .from('app_settings')
      .update({ uazapi_token: uazapiToken, updated_at: new Date().toISOString() })
      .eq('id', 1);
    setSalvando(false);
    setMensagem(error ? 'Erro ao salvar token.' : 'Token salvo com sucesso.');
  }

  async function conectarWhatsapp() {
    setConectando(true);
    setQrcode(null);
    setStatusConexao(null);

    const response = await fetch('/api/whatsapp/connect', { method: 'POST' });
    const data = await response.json();

    if (!response.ok) {
      setStatusConexao(data.error ?? 'Erro ao conectar.');
      setConectando(false);
      return;
    }

    setQrcode(data.qrcode);

    // Polling de status até a instância ficar conectada, com timeout de 60s para não rodar
    // indefinidamente caso o usuário nunca escaneie o QR code.
    const startedAt = Date.now();
    const TIMEOUT_MS = 60_000;

    pollingRef.current = setInterval(async () => {
      if (Date.now() - startedAt > TIMEOUT_MS) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setConectando(false);
        setStatusConexao('Tempo esgotado. Tente novamente.');
        return;
      }

      const statusResponse = await fetch('/api/whatsapp/status');
      const statusData = await statusResponse.json();

      if (statusResponse.ok && statusData.status === 'connected') {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setConectando(false);
        setStatusConexao('Conectado com sucesso.');
        setInstanceStatus('connected');
        setQrcode(null);
      }
    }, 3000);
  }

  async function desconectarWhatsapp() {
    setDesconectando(true);
    setStatusConexao(null);

    const response = await fetch('/api/whatsapp/disconnect', { method: 'POST' });
    const data = await response.json();

    setDesconectando(false);

    if (!response.ok) {
      setStatusConexao(data.error ?? 'Erro ao desconectar.');
      return;
    }

    setInstanceStatus('disconnected');
    setStatusConexao('Desconectado com sucesso.');
  }

  return (
    <div className="max-w-md space-y-6">
      <div className="rounded-xl bg-card p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Supabase</h2>
        <p className="text-xs text-gray-500">URL</p>
        <p className="mb-2 text-sm text-gray-800">{mask(supabaseUrl)}</p>
        <p className="text-xs text-gray-500">Anon Key</p>
        <p className="text-sm text-gray-800">{mask(supabaseAnonKey)}</p>
      </div>

      <div className="rounded-xl bg-card p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Token uazapi</h2>
        <input
          value={uazapiToken}
          onChange={(e) => setUazapiToken(e.target.value)}
          className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          placeholder="Token da instância uazapi"
        />
        <button
          type="button"
          onClick={salvarToken}
          disabled={salvando}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {salvando ? 'Salvando...' : 'Salvar token'}
        </button>
        {mensagem && <p className="mt-2 text-xs text-gray-500">{mensagem}</p>}
      </div>

      <div className="rounded-xl bg-card p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">WhatsApp</h2>
        <p className="mb-3 text-xs text-gray-500">
          Status:{' '}
          <span
            className={
              instanceStatus === 'connected'
                ? 'font-medium text-green-600'
                : instanceStatus === 'connecting'
                  ? 'font-medium text-amber-600'
                  : 'font-medium text-gray-600'
            }
          >
            {instanceStatus === 'connected'
              ? 'Conectado'
              : instanceStatus === 'connecting'
                ? 'Conectando'
                : instanceStatus === 'disconnected'
                  ? 'Desconectado'
                  : 'Desconhecido'}
          </span>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={conectarWhatsapp}
            disabled={conectando || instanceStatus === 'connected'}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {conectando ? 'Conectando...' : 'Conectar WhatsApp'}
          </button>
          {instanceStatus === 'connected' && (
            <button
              type="button"
              onClick={desconectarWhatsapp}
              disabled={desconectando}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 disabled:opacity-60"
            >
              {desconectando ? 'Desconectando...' : 'Desconectar'}
            </button>
          )}
        </div>
        {statusConexao && <p className="mt-2 text-xs text-gray-500">{statusConexao}</p>}
      </div>

      {qrcode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setQrcode(null)}
        >
          <div className="rounded-xl bg-white p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 text-sm text-gray-700">Escaneie o QR code com o WhatsApp</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- imagem base64 dinâmica do QR code, não compatível com otimização do next/image */}
            <img src={qrcode} alt="QR code de conexão do WhatsApp" className="mx-auto h-64 w-64" />
            <button
              type="button"
              onClick={() => setQrcode(null)}
              className="mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
