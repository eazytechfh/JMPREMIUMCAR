import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Decisão: rotas /api/* NÃO são bloqueadas aqui pelo middleware. Cada API route já valida a
// sessão internamente via supabase server client (ver src/app/api/**), retornando 401/403
// quando necessário. Bloquear /api/* genericamente no middleware impediria, por exemplo, que a
// própria rota decida responder com um JSON de erro apropriado em vez de um redirect HTML.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data } = await supabase.auth.getSession();
  const isAuthenticated = !!data.session;

  const { pathname } = request.nextUrl;

  if (!isAuthenticated && pathname !== '/login') {
    const redirectUrl = new URL('/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthenticated && pathname === '/login') {
    const redirectUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  // Aplica o middleware a tudo, exceto arquivos estáticos do Next (_next/static, _next/image)
  // e o favicon. /api/* permanece coberto intencionalmente (não checamos sessão de cookie ali,
  // mas isso não causa problema pois cada API route valida sessão por conta própria).
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
