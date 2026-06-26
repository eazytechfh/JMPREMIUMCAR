# EazyClick CRM

CRM para concessionárias de veículos, construído com Next.js (App Router), TypeScript, Tailwind CSS e Supabase.

## Configuração

1. Copie o arquivo de exemplo de variáveis de ambiente:

   ```
   cp .env.local.example .env.local
   ```

   Preencha `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` com os valores do seu projeto Supabase, e `UAZAPI_BASE_URL` com a URL da instância uazapi (padrão: `https://eazytech.uazapi.com`).

2. Aplique a migration SQL em `supabase/migrations/0001_init.sql` no seu projeto Supabase:

   - **Via Supabase Dashboard**: abra o SQL Editor do projeto, cole o conteúdo do arquivo `supabase/migrations/0001_init.sql` e execute.
   - **Via Supabase CLI**: com o projeto linkado (`supabase link --project-ref <ref>`), rode `supabase db push`.

3. Instale as dependências e rode o servidor de desenvolvimento:

   ```
   npm install
   npm run dev
   ```

## Build de produção

```
npm run build
npm run start
```
