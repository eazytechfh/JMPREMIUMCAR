# CRM Automotivo JM Premium Car Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replicar notificações, venda fechada, animação, auditoria, estoque e loading do CRM automotivo de referência.

**Architecture:** Manter o Supabase como fonte de verdade, usar Realtime para eventos entre máquinas e polling de três minutos somente como contingência. Concentrar regras críticas também no PostgreSQL para impedir bypass por automações ou clientes antigos.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, Supabase/PostgreSQL, Vitest.

## Global Constraints

- Não editar migrations existentes; criar somente `0021_crm_automotivo_auditoria_realtime.sql`.
- Não aplicar migrations automaticamente no banco compartilhado.
- Usar apenas arquivos de áudio locais em `public/effects`.
- A celebração dura exatamente 5 segundos.
- O som do motor começa no segundo 11 e o dinheiro no segundo 5.
- Realtime é o mecanismo principal; fallback máximo uma vez a cada 180 segundos.

---

### Task 1: Cobertura de regressão

**Files:**
- Create: `src/lib/crm-automotivo.test.ts`

- [x] Escrever testes de contrato para todos os requisitos.
- [x] Executar o teste e confirmar falha pela ausência das funcionalidades.

### Task 2: Notificação entre máquinas

**Files:**
- Modify: `src/components/LeadAssignmentNotifications.tsx`
- Create: `public/effects/lead-assigned.mp3`

- [x] Substituir polling de 10 segundos por Realtime.
- [x] Tocar o áudio somente em novas notificações após o baseline.
- [x] Disparar evento local para atualização das listas.

### Task 3: Fechamento e celebração

**Files:**
- Modify: `src/app/(app)/pipeline/page.tsx`
- Create: `src/components/SaleCelebration.tsx`
- Create: `public/effects/sale-engine.mp3`
- Create: `public/effects/sale-money.mp3`
- Create: `public/effects/sale-car-neon.png`

- [x] Exigir nome e valor positivo antes do estágio `fechado`.
- [x] Persistir antes de atualizar a UI.
- [x] Exibir carro neon e os dois áudios por 5 segundos.

### Task 4: Auditoria e estoque

**Files:**
- Modify: `src/components/LeadDrawer.tsx`
- Modify: `src/app/(app)/estoque/page.tsx`
- Create: `supabase/migrations/0021_crm_automotivo_auditoria_realtime.sql`

- [x] Exibir autoria da observação, histórico rolável e logs gerais.
- [x] Mostrar por padrão apenas disponíveis e permitir todos os filtros.
- [x] Permitir alteração confirmada entre Disponível, Indisponível e Vendido.
- [x] Criar auditoria persistente sem FK cascade.

### Task 5: Loading, documentação e validação

**Files:**
- Create: `src/components/AutomotiveLoading.tsx`
- Modify: `src/app/globals.css`
- Create: `docs/PROMPT-UNIVERSAL-CRM-AUTOMOTIVO-GPT-5.6-SOL.md`

- [x] Aplicar loading automotivo nas telas principais.
- [ ] Executar todos os testes, TypeScript e build.
