---

description: "Implementation Plan — Consolidação de migrations"
---

# Implementation Plan: Consolidação de migrations

**Branch**: `001-consolidate-migrations` | **Date**: 2025-12-22 | **Spec**: `specs/001-consolidate-migrations/spec.md`
**Input**: Feature specification from `/specs/001-consolidate-migrations/spec.md`

## Summary

Objetivo: reduzir risco e complexidade do setup do banco, criando uma **única migration baseline canônica** (bootstrap) e uma **validação automatizada de equivalência de schema** (baseline vs full chain), com guard-rails para evitar uso acidental em bancos existentes.

Escopo (derivado do `spec.md`):

- P1: criar ambiente do zero com uma única migration consolidada.
- P2: provar automaticamente que baseline representa o schema atual (comparação robusta + relatório legível).
- P3: proteger staging/prod (não aplicar baseline em DB não-vazio; alinhar histórico via “repair”).

## Technical Context

**Language/Version**: TypeScript (Next.js 16+, Node.js 20+)  
**Primary Dependencies**: Next.js (App Router) + React 19, Supabase (Postgres), Upstash (Redis/QStash)  
**Storage**: Supabase Postgres (migrations em `supabase/migrations`)  
**Testing**: Vitest (repo possui `vitest.config.ts`) + scripts/CLI para validação de schema  
**Target Platform**: Vercel (serverless), CI (GitHub Actions/runner)

## Project Structure

```text
specs/001-consolidate-migrations/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

## Constitution Check

### Compatibilidade com a “SmartZap Constitution”

- **Arquitetura (Page → Hook → Service → API Route → DB)**: este feature é majoritariamente de **infra/schema e tooling** (migrations, scripts, validações). Quando envolver mudanças de runtime (ex.: rotas API de setup/validação), manteremos o padrão de API Routes e utilitários em `lib/`.
- **Separação View/Controller**: não aplicável (nenhuma UI planejada neste plano).
- **API-first**: mantida (toda operação de banco em runtime deve seguir rotas `/app/api/...`). Para CI, scripts podem usar conexão direta (fora do app runtime).
- **Type Safety**: manter TS estrito e validações de input (Zod) caso seja criado endpoint de validação.

### Divergência detectada (NEEDS AMENDMENT)

A constituição afirma **Turso/LibSQL** como banco “não negociável”, mas o repositório e a operação atual usam **Supabase/Postgres** (com pasta `supabase/`, clientes Supabase e rotas de setup/migrate).

**Decisão:** tratar isso como documentação desatualizada, sem bloquear este plano. **Follow-up recomendado**: atualizar a constituição para refletir Supabase/Postgres (fora do escopo deste feature).

## Gates (must-pass)

- Não pode existir “duas fontes de verdade” para baseline: **um único baseline canônico**.
- Não pode existir ambiguidade de ordenação/versão em migrations: remover/renomear duplicidades (`0006_*`, `0018_*`).
- Validação automatizada deve falhar com divergência relevante e produzir relatório legível.
- Segurança operacional: baseline **não executa** em banco não-vazio (falha cedo) ou exige confirmação explícita.
- Qualidade: `npm run lint`, `npm run build` e suite de testes existentes passam.

## Phase 0 — Outline & Research (done)

Pesquisa consolidada em `specs/001-consolidate-migrations/research.md`.

Decisões já tomadas (resumo):

1. Fonte única de verdade para bootstrap: **`supabase/migrations`**.
2. Parity check: **DB A (baseline-only) vs DB B (full chain)**, comparando `pg_dump --schema-only` + snapshots de catálogo (para cobrir pontos cegos do tooling).
3. Ambientes existentes: não aplicar baseline; alinhar histórico via **`supabase migration repair`**.

## Phase 1 — Design & Contracts (done)

Artefatos gerados:

- `specs/001-consolidate-migrations/data-model.md`
- `specs/001-consolidate-migrations/contracts/openapi.yaml`
- `specs/001-consolidate-migrations/contracts/schema-snapshots.sql`
- `specs/001-consolidate-migrations/quickstart.md`

## Phase 1 — Agent Context Update (blocked → fixed in this plan)

O repositório estava sem `.specify/scripts/bash/update-agent-context.sh`. Este plano adiciona o script (copiado do scaffold em `tmp/.specify/`) e executa para atualizar o contexto do Copilot.

## Phase 2 — Implementation Planning (stop here)

O detalhamento executável do trabalho está em `specs/001-consolidate-migrations/tasks.md`.

Escopo de implementação esperado (alto nível):

1) Unificar baseline canônico e corrigir bundling/serverless para incluir migrations canônicas.  
2) Padronizar e versionar o RPC `exec_sql` (assinat. única).  
3) Normalizar versões duplicadas em `supabase/migrations`.  
4) Implementar parity check automatizado com artefatos de diff.  
5) Documentar e travar caminhos destrutivos em staging/prod.

## Post-Design Constitution Re-check

- Nenhuma UI/Hook/Service foi adicionada nesta fase (apenas documentação/contratos), então não houve violação de View/Controller.
- A divergência Turso vs Supabase permanece como **documentação desatualizada**; não bloqueia a entrega deste plano.

