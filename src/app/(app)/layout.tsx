import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/Sidebar';
import { fetchBranding } from '@/lib/branding';
import type { Profile } from '@/types/database';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userError ? null : userData.user;

  let profile: Profile | null = null;

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('id, nome, email, cargo, created_at, desativado')
      .eq('id', user.id)
      .single();
    profile = (data as Profile) ?? null;
  }

  const userName = profile?.nome || user?.email || 'Usuario';
  const userCargo = profile?.cargo || 'vendedor';
  const branding = await fetchBranding();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar userName={userName} userCargo={userCargo} logoUrl={branding.logo_url} />
      <main className="h-screen min-w-0 flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
