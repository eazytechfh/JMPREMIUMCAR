import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: '#f5f6f8',
        card: '#ffffff',
        // Tokens de status reutilizáveis para o pipeline de leads e badges em geral.
        // Cada estágio do funil mapeia para uma cor semântica consistente em toda a UI.
        status: {
          novo: '#22c55e', // verde
          atendimento: '#3b82f6', // azul
          qualificado: '#38bdf8', // azul claro
          proposta: '#a855f7', // roxo
          negociacao: '#f97316', // laranja
          fechado: '#16a34a', // verde escuro (sucesso)
          perdido: '#ef4444', // vermelho
          neutro: '#6b7280', // cinza
        },
      },
    },
  },
  plugins: [],
};

export default config;
