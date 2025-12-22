# Pesquisa — Consolidação de migrations (SmartZap)

Este documento resolve as *NEEDS CLARIFICATION* do plano e registra decisões com rationale e alternativas.

## Contexto do repositório (estado atual)

### Existem dois “baselines” hoje

- **`lib/migrations/0001_initial_schema.sql`**
  - SQL consolidado ("Combined Migration") usado por **`app/api/setup/auto-migrate/route.ts`** (aplica via RPC `exec_sql`).
  - Também é o único diretório explicitamente incluído no bundle serverless via `outputFileTracingIncludes` em **`next.config.ts`**.

- **`supabase/migrations/0001_initial_schema.sql`**
  - Também contém um SQL consolidado (não idêntico ao de `lib/`), e a rota do wizard declara que essa pasta é a “fonte única de verdade”.

**Implicação:** há ambiguidade real sobre a “fonte de verdade” do bootstrap.

### O Wizard aplica *todas* as migrations, não só o baseline

- **`app/api/setup/migrate/route.ts`** lê os arquivos `.sql` de `supabase/migrations` (ou faz fallback para `lib/migrations`) e concatena em um SQL único, executando via `pg`.
- A ordem é lexicográfica pelo nome do arquivo.

### Numeração duplicada em `supabase/migrations`

Foram encontrados prefixos duplicados (não timestamps) que podem confundir processos/ferramentas que esperam “versão única”:

- `0006_add_first_templates_tables.sql`
- `0006_add_templates.sql`

- `0018_add_template_projects.sql`
- `0018_add_whatsapp_status_events.sql`

> Observação: a rota do wizard ordena pelo nome completo, então a execução é determinística, mas a duplicidade atrapalha auditoria/histórico.

### Inconsistência na assinatura do RPC `exec_sql`

O repo chama o mesmo RPC com dois formatos:

- Em `app/api/setup/auto-migrate/route.ts`: `{ sql_query: string }`
- Em `scripts/apply-supabase-migration.ts`: `{ sql: string }`

A definição da função `exec_sql` **não está versionada nas migrations** do repo, então não é possível inferir, apenas pelo Git, qual assinatura é correta em cada ambiente.

## Supabase CLI — comportamentos e limitações relevantes (fonte: docs oficiais)

### `supabase db push`

- Aplica migrations locais na base remota e registra na tabela `supabase_migrations.schema_migrations`.
- Suporta flags importantes: `--dry-run`, `--include-all`, `--include-roles`, `--include-seed`.
- Para **mutar o histórico de migrations sem rodar SQL**, a recomendação oficial é usar `supabase migration repair`.

### `supabase migration repair`

- Repara a tabela de histórico remota marcando versões como:
  - **applied** (insere linha), ou
  - **reverted** (remove linha)

Isso é essencial quando se introduz um baseline novo, mas você **não quer** que ambientes existentes re-executem DDL.

### `supabase migration squash`

- Gera um “schema-only dump” equivalente ao estado do banco após aplicar migrations.
- **Limitação importante:** comandos DML (insert/update/delete) são omitidos.
  - Ex.: cron jobs, storage buckets e secrets (vault) precisam ser re-adicionados manualmente (em migration separada ou seed idempotente).

### `supabase db diff`

- Compara schema usando shadow database.
- **Conhecidamente falha** em:
  - mudanças em **publication**,
  - mudanças em **storage buckets**,
  - views com atributo `security_invoker`.

### `supabase db dump` / `supabase db pull`

- Por padrão, excluem schemas gerenciados pelo Supabase (ex.: `auth`, `storage`, extensões). É preciso incluir explicitamente se desejado.

## Decisões

### Decisão 1 — Definir uma única fonte de verdade para bootstrap

**Decisão:** **usar `supabase/migrations/` como fonte de verdade do histórico**, e manter **um único baseline canônico** (primeiro arquivo) *nesta mesma pasta*.

**Rationale:**
- Alinha com o que o Supabase CLI espera (`supabase/migrations`).
- Facilita `db diff`, `db push`, `migration list/repair`.
- Evita dualidade `lib/` vs `supabase/`.

**Alternativas consideradas:**
1. Manter o baseline apenas em `lib/migrations/` (status quo do bundle)
   - Prós: compatível com o setup atual do bundle.
   - Contras: desalinha do Supabase CLI e mantém ambiguidade.
2. Manter dois baselines (um em `lib/` e outro em `supabase/`)
   - Contras: risco operacional e drift inevitável.

**Ação derivada para implementação:** ajustar `next.config.ts` para incluir também `supabase/migrations/**/*` no bundle da rota `/api/setup/migrate`, ou mover de vez o baseline para `supabase/migrations` e remover dependência de `lib/migrations`.

### Decisão 2 — Estratégia de validação (“muitos testes”)

**Decisão:** validar baseline comparando dois bancos efêmeros:

- **DB A:** aplica *apenas* baseline.
- **DB B:** aplica todas as migrations (estado atual).

E comparar por:
- `pg_dump --schema-only` normalizado (comparação principal)
- snapshots adicionais via catálogo para cobrir limites do `db diff`:
  - `pg_publication` / `pg_publication_tables`
  - `pg_policies` + flags de RLS
  - `storage.buckets` (se fizer parte do produto)
  - grants (via `information_schema`)

**Rationale:** cobre drift real e pontos cegos do tooling.

**Alternativas consideradas:**
- Confiar somente em `supabase db diff` (insuficiente pelos casos conhecidos de falha).

### Decisão 3 — Ambientes existentes (staging/prod)

**Decisão:** não aplicar baseline em DB não-vazio. Para “ancorar” o baseline sem reexecutar DDL, usar `supabase migration repair` para alinhar a tabela `supabase_migrations.schema_migrations`.

**Rationale:** é a abordagem recomendada oficialmente e evita risco de DDL destrutivo.

## Pontos que ainda exigem confirmação (mas não bloqueiam o plano)

- Assinatura real do RPC `exec_sql` no(s) banco(s) (nome do parâmetro). Recomendação: versionar a função no baseline/migrations para eliminar ambiguidade.
- Escopo final do que comparar: incluir ou não `auth` e `extensions` (em geral: comparar `public` + objetos do produto, e tratar `auth` como gerenciado pela plataforma).
