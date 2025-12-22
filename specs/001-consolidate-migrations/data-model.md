# Data Model — Consolidação de migrations

Este feature é de infra/schema; o “modelo” aqui descreve artefatos e estados envolvidos no processo de migração e validação.

## Entidades

### 1) BaselineMigration

**Descrição:** arquivo SQL canônico capaz de inicializar o schema completo do produto a partir de um banco vazio.

**Campos (conceituais):**

- `path: string` — caminho do arquivo (ex.: `supabase/migrations/0001_initial_schema.sql`)
- `version: string` — identificador de versão (timestamp ou número)
- `checksum: string` — hash do conteúdo (para auditoria)
- `scope: string[]` — schemas cobertos (ex.: `public`, `storage`)
- `containsDML: boolean` — se inclui inserts (ex.: buckets/cron) ou se isso fica em seed/migration separada

**Regras:**

- Deve ser executável em banco vazio.
- Deve ser idempotente ou falhar cedo sem efeitos parciais (preferência: idempotente com `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` quando seguro).

### 2) IncrementalMigration

**Descrição:** migrations subsequentes que evoluem o schema após o baseline.

**Campos:**

- `path: string`
- `version: string` — deve ser único dentro da cadeia
- `dependsOn?: string[]` — dependências implícitas (por ordem ou objetos)

**Regras:**

- Ordem de execução deve ser determinística.
- Evitar versões duplicadas (ex.: `0006_*` repetido) para reduzir ambiguidade.

### 3) MigrationHistoryEntry (Supabase)

**Descrição:** representa uma linha em `supabase_migrations.schema_migrations` (histórico remoto do Supabase).

**Campos (alto nível):**

- `version: string` — timestamp/version
- `applied_at: timestamp`

**Regras:**

- `db push` cria/atualiza essa tabela automaticamente.
- `migration repair` pode marcar versões como `applied` (inserir) ou `reverted` (remover) sem rodar SQL.

### 4) SchemaSnapshot

**Descrição:** uma representação determinística do schema para comparação automatizada.

**Campos:**

- `ddlDump: string` — saída de `pg_dump --schema-only` normalizada
- `catalogSnapshots: Record<string, unknown>` — JSONs derivados de consultas (publications, policies, buckets, grants…)

**Regras:**

- Deve ser comparável byte-a-byte (ordenação estável).
- Deve cobrir pontos cegos conhecidos do tooling (publications, buckets, `security_invoker`).

### 5) ValidationReport

**Descrição:** relatório de diferenças entre snapshots.

**Campos:**

- `status: 'pass' | 'fail'`
- `summary: string`
- `diffs: Array<{ area: string; details: string }>`
- `artifacts: { baselineDumpPath?: string; fullDumpPath?: string; diffPath?: string }`

## Estados e transições

### ParityCheckRun

Estados:

- `not_started`
- `db_a_ready` (baseline aplicado)
- `db_b_ready` (full chain aplicado)
- `snapshots_taken`
- `compared`
- `passed` | `failed`

Transição principal:

$$
not\_started \to db\_a\_ready \to db\_b\_ready \to snapshots\_taken \to compared \to (passed \mid failed)
$$

## Observações

- O repo hoje possui dois caminhos de execução (runtime Next.js e scripts). O plano considera ambos no desenho do teste.
- O contrato de validação (API) é opcional: é possível executar toda validação em CI/script, sem endpoint exposto.
