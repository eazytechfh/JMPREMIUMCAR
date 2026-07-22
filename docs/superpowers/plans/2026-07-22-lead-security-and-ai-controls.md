# Lead Security and AI Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete safe lead deletion, database-backed AI controls and timestamps, observation feedback, and database-level protection against role self-elevation.

**Architecture:** Keep the existing authenticated Supabase client and local React state updates. Add narrowly scoped database functions/triggers and RLS policies in a new migration, then call the database through a small typed client service so returned IDs, tenant IDs, state transitions, and timestamps are verified before UI state changes.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, Supabase/PostgreSQL, Vitest, Testing Library.

## Global Constraints

- Do not duplicate behavior that already fully satisfies the requirements.
- Do not reload the page, call webhooks/n8n, use service role in the browser, apply remote migrations, commit, push, or deploy.
- Preserve existing user changes and existing functionality.
- Follow RED -> GREEN -> REFACTOR for every behavior change.
- Treat RLS and database triggers as required authorization layers.

---

### Task 1: Test harness and secure database contract

**Files:**
- Modify: `package.json`
- Create: `src/lib/leads.test.ts`
- Create: `supabase/migrations/0020_seguranca_leads_e_controle_ia.sql`
- Create: `supabase/migrations/0020_seguranca_leads_e_controle_ia.test.ts`

**Interfaces:**
- Produces database RPCs that accept a positive lead ID, expected tenant ID, and (for AI) the requested boolean state.
- Produces rows containing verified `id`, `id_empresa`, textual `bot_ativo`, and `bot_ativo_alterado_em`.

- [ ] Write tests asserting input validation, atomic previous-state matching, returned-row verification, timestamp trigger behavior, delete authorization, and role-change protection.
- [ ] Run focused tests and confirm failures caused by missing implementation.
- [ ] Preserve the existing type and values of `bot_ativo`; add only `bot_ativo_alterado_em`, a server-time trigger, authenticated security-invoker RPCs, restricted delete policy, and a `BEFORE UPDATE OF cargo` guard.
- [ ] Run focused tests and confirm they pass.

### Task 2: Typed authenticated lead operations

**Files:**
- Create: `src/lib/leads.ts`
- Modify: `src/types/database.ts`
- Test: `src/lib/leads.test.ts`

**Interfaces:**
- Produces `deleteLead(client, { leadId, idEmpresa }): Promise<number>`.
- Produces `setLeadAiStatus(client, { leadId, idEmpresa, ativo }): Promise<LeadAiState>`.
- Produces `formatLeadAiChangedAt(value): string`.

- [ ] Write failing unit tests for invalid IDs/booleans, empty or mismatched RPC rows, stale transitions, and invalid dates.
- [ ] Run tests and confirm the expected failures.
- [ ] Implement minimal typed operations using only the authenticated client and verified database responses.
- [ ] Run tests and refactor while green.

### Task 3: Drawer behavior and accessibility

**Files:**
- Modify: `src/components/LeadDrawer.tsx`
- Create: `src/components/LeadDrawer.test.tsx`

**Interfaces:**
- Consumes the typed lead operations from Task 2.
- Produces confirmed local updates through existing `onUpdated` and `onDeleted` callbacks.

- [ ] Write failing UI tests for the confirmation modal, disabled loading controls, persistent errors, exact copy, verified deletion, AI non-optimistic updates, status/timestamp rendering, and observation success feedback.
- [ ] Run tests and confirm the expected failures.
- [ ] Complete the existing delete UI, add the AI control, and add confirmed observation success/error states.
- [ ] Run focused tests and keep callbacks free of page reloads.

### Task 4: Query and consumer propagation

**Files:**
- Modify: `src/app/(app)/leads/page.tsx`
- Modify: `src/app/(app)/pipeline/page.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`
- Test: `src/lib/leads.test.ts`

**Interfaces:**
- Every full lead query returns `bot_ativo` and `bot_ativo_alterado_em`.
- Existing callbacks update the selected lead and every local listing by ID.

- [ ] Add a failing source-contract test for all full lead selects.
- [ ] Run it and confirm missing timestamp fields fail.
- [ ] Add the timestamp field to all relevant selects and keep create fallbacks compatible with the new schema.
- [ ] Run tests and TypeScript.

### Task 5: Final verification and security review

**Files:**
- Review all modified files and `git diff`.

- [ ] Run all tests.
- [ ] Run `tsc --noEmit`, lint where supported, the production build, and `git diff --check`.
- [ ] Search the AI flow for webhook, n8n, and external URLs.
- [ ] Review authorization, tenant filtering, RLS preservation, error disclosure, concurrency handling, and duplicate-click prevention; fix Critical and Important findings under TDD.
- [ ] Report existing behavior, completed behavior, files, migration, verification results, and manual migration application steps.
