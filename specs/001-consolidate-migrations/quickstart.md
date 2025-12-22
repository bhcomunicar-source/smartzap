# Quickstart — Consolidação de migrations

Este guia descreve como gerar/validar a migration baseline e como rodar o “parity check” (baseline vs full chain).

> Este feature é focado em **não fazer merda**. Logo, o fluxo recomendado é sempre: gerar baseline → comparar schema → só então mexer em histórico/produção.

## Pré-requisitos

- Node.js 20+
- Docker (para Supabase CLI / Postgres local)
- Supabase CLI (para comandos `db diff`, `db dump`, `migration repair/squash`), quando aplicável

## Conceitos

- **Baseline**: um único arquivo SQL capaz de criar o schema completo em banco vazio.
- **Full chain**: aplicação de todas as migrations incrementais.
- **Parity check**: prova automatizada de que baseline == full chain.

## Fluxo local recomendado (alto nível)

1. Suba um banco local/efêmero.
2. Crie dois bancos:
   - **DB A**: aplica somente baseline
   - **DB B**: aplica todas as migrations (full chain)
3. Faça dump “schema-only” de A e B e compare.
4. Rode snapshots adicionais de catálogo (publications, policies, buckets, grants) e compare.

## Como lidar com limitações do tooling

- `supabase db diff` pode falhar em:
  - publication
  - storage buckets
  - views com `security_invoker`

Por isso, o parity check deve incluir:

- dump via `pg_dump --schema-only`
- snapshots SQL do catálogo (ver `contracts/schema-snapshots.sql`)

## Ambientes existentes (staging/prod): regra de ouro

- **Não aplique baseline** em banco com dados.
- Para alinhar histórico sem executar DDL, use `supabase migration repair`.

Checklist seguro:

1. Backup antes.
2. Verificar drift contra o repo (diff/dump) antes de “repair”.
3. Aplicar `migration repair` para marcar baseline como aplicada (sem rodar SQL).
4. Rodar o parity check em modo read-only.

## Onde estão os arquivos do plano

- `specs/001-consolidate-migrations/plan.md`
- `specs/001-consolidate-migrations/research.md`
- `specs/001-consolidate-migrations/data-model.md`
- `specs/001-consolidate-migrations/contracts/`
- `specs/001-consolidate-migrations/tasks.md`
