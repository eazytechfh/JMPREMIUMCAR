import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/Sidebar';
import type { Profile } from '@/types/database';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();

  let profile: Profile | null = null;

  if (userData.user) {
    const { data } = await supabase
      .from('profiles')
      .select('id, nome, email, cargo, created_at')
      .eq('id', userData.user.id)
      .single();
    profile = (data as Profile) ?? null;
  }

  const userName = profile?.nome || userData.user?.email || 'Usuário';
  const userCargo = profile?.cargo || 'vendedor';

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userName={userName} userCargo={userCargo} />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
