# Pesquisa: Supabase CLI e consolidação (squash) de migrations

> Objetivo: mapear limitações/edge cases de `supabase db diff`, `supabase db dump` e `supabase db pull` que impactam **consolidar migrations** (ex.: “squash”/“baseline migration”), e registrar **decisões, racional, alternativas, riscos e mitigação**.


## Decisões (com racional e alternativas)

- **Decisão: tratar a consolidação como “baseline de DDL” + “capas extras” (DML/config).**
  - **Racional:** o próprio `supabase migration squash` gera algo equivalente a um *schema-only dump* e **omite DML** (insert/update/delete). Isso inevitavelmente deixa de fora coisas que, no mundo Supabase, são “estado/config” (ex.: buckets, cron, secrets), mesmo que você tenha criado via SQL ou Dashboard.
  - **Alternativas:**
    - Manter histórico completo de migrations (sem squash) e aceitar ruído/dívida.
    - Fazer baseline com `pg_dump`/`db dump` + “handwritten migrations” para o que é estado/config.

- **Decisão: definir e documentar explicitamente o *escopo de schema* do “baseline”** (ex.: `public` +, opcionalmente, `extensions`).
  - **Racional:** os comandos variam em *quais schemas incluem por padrão*:
    - `db diff`: por padrão, diffa “todos os schemas” do banco alvo, o que pode incluir muita coisa que você não quer versionar.
    - `db dump`: executa `pg_dump` com flags que **excluem schemas gerenciados pela Supabase** (inclui `auth`, `storage` e schemas criados por extensões).
    - `db pull`: **exclui `auth` e `storage` por padrão** e recomenda rodar novamente com `--schema auth,storage` para incluí-los.
  - **Alternativas:**
    - “Tudo do banco”: aumenta chance de drift/ruído e captura muita coisa que é plataforma/infra.
    - “Somente `public`”: mais estável, mas você precisa garantir que objetos necessários não estejam em outros schemas.

- **Decisão: assumir que *diff tooling* é “best effort” e sempre terá lacunas** (principalmente para recursos não puramente DDL).
  - **Racional:** a própria documentação do `db diff` lista classes de mudanças onde “é conhecido falhar”: publicação, buckets e views `security_invoker`.
  - **Alternativas:**
    - “Confiar cegamente no diff”: rápido, mas perigoso.
    - Acrescentar validações específicas (queries/checagens) para classes conhecidas de falha.


## `supabase db diff` — comportamento, limitações e mitigação

### Como funciona (implicações para squash)
- O `supabase db diff` roda **migra** dentro de um container para comparar:
  - o “banco alvo” (local/linked/db-url)
  - versus um **shadow database** construído aplicando as migrations locais.
- Por padrão, **diffa todos os schemas** do banco alvo. Você pode restringir com `--schema`.
- Há seletores de engine: `--use-migra`, `--use-pg-schema` (Stripe `pg-schema-diff`), `--use-pgadmin`.

### Limitações/edge cases documentadas (impacto direto)
- **Publications (replicação):** mudanças em publicação podem não ser capturadas.
- **Storage buckets:** mudanças em buckets podem não ser capturadas.
- **Views com `security_invoker`:** pode falhar/não capturar corretamente.

### Riscos típicos ao consolidar migrations
- Você “squasha” e o novo baseline não recria corretamente:
  - configurações de publicação (replicação/realtime)
  - buckets/policies relacionadas
  - atributos de view (especialmente `security_invoker`)

### Mitigações recomendadas
- **Mitigação A — separar “DDL baseline” de “estado/config”**
  - DDL baseline: tabelas, índices, constraints, funções, triggers, views (com cuidado).
  - Estado/config: buckets, cron, secrets, e publicações (tratar como passos explícitos pós-baseline).

- **Mitigação B — checklist pós-diff para classes conhecidas de falha**
  - Publicações: validar manualmente (ou por query) se publicações/replication slots relevantes existem e batem com esperado.
  - Buckets: usar seed/config específico (ver `supabase seed buckets`).
  - Views `security_invoker`: revisar o SQL final gerado e comparar no banco.

- **Mitigação C — reduzir escopo via `--schema`**
  - Use `--schema` para impedir que objetos “plataforma” poluam o diff.
  - Se você precisar realmente versionar algo em `auth`/`storage`, faça isso conscientemente e em migrations separadas.

### Observação importante: engine padrão (migra) e manutenção
- A doc do Supabase descreve `db diff` como rodando **`djrobstep/migra`**.
- O repositório `migra` está **oficialmente deprecated** (último release em 2022). O autor aponta o projeto `results` como sucessor, com comando equivalente `results dbdiff`.
  - Implicação prática: mesmo que a Supabase pinne/vendore uma versão estável, você deve esperar **edge cases não corrigidos** em migra e depender mais de mitigação/checagens.


## `supabase db pull` — comportamento, limitações e mitigação

### Como funciona (implicações para squash)
- O `db pull` cria uma **nova migration** em `supabase/migrations/` baseada no remoto.
- Se **não houver entradas** na tabela de histórico remoto (`supabase_migrations.schema_migrations`), ele usa `pg_dump` para capturar o conteúdo dos schemas remotos “que você criou”.
- Se houver histórico, ele “diffa mudanças” de modo similar a `db diff --linked`.

### Edge case crítico: schemas excluídos por padrão
- A CLI indica explicitamente que **`auth` e `storage` são excluídos** por padrão.
- Ela recomenda: rodar novamente com `--schema auth,storage` se você quer diffar esses schemas.

### Riscos típicos ao consolidar migrations
- Você roda `db pull` para gerar um “baseline” e acha que está completo, mas:
  - `auth`/`storage` não entraram
  - itens de estado/config (ex.: buckets) continuam fora

### Mitigações recomendadas
- **Mitigação A — tratar `db pull` como “baseline do que está no Postgres”**, não do que está em serviços adjacentes.
- **Mitigação B — rodar `db pull` em múltiplos passes de schema (quando fizer sentido)**
  - Ex.: baseline do app em `public` e (se necessário) outro migration/arquivo para `auth,storage`.
- **Mitigação C — alinhar/repair do histórico de migrations antes de consolidar**
  - Se o histórico remoto/local estiver divergente, a família de comandos de `migration repair`/`migration list` vira parte do workflow para evitar que `db pull` escolha o “modo errado” (dump completo vs diff incremental).


## `supabase db dump` — comportamento, limitações e mitigação

### Como funciona (implicações para squash)
- Roda `pg_dump` em container com flags extras para **excluir schemas gerenciados pela Supabase**.
- A doc explicita que os schemas ignorados incluem:
  - `auth`
  - `storage`
  - schemas criados por extensões
- Por padrão, o dump:
  - **não inclui dados**
  - **não inclui roles**
  - você precisa pedir explicitamente via `--data-only` e/ou `--role-only`.

### Riscos típicos ao consolidar migrations
- **Falso senso de completude:** `db dump` é ótimo para baseline, mas vai omitir o que a Supabase considera “gerenciado” (e possivelmente coisas que seu app assume existir).

### Mitigações recomendadas
- **Mitigação A — use `--schema` como contrato de escopo**
  - Regra de ouro: seu baseline deve dizer “quais schemas versionamos”.
- **Mitigação B — se seu baseline precisa de roles/dados, trate como artefatos separados**
  - DDL baseline (schema-only) vs seed data vs roles.
- **Mitigação C — atenção ao `--exclude`**
  - A flag `-x/--exclude` é para `--data-only` (lista `schema.tables` a excluir do dump de dados). Não é um “exclude geral” de DDL.


## `supabase migration squash` — o que quebra e como corrigir

- O `supabase migration squash` gera uma migration “equivalente a um schema-only dump” do banco local após aplicar as migrations existentes.
- **Limitação central:** omite **DML** (insert/update/delete). A doc lista explicitamente exemplos do que isso inclui:
  - **cron jobs**
  - **storage buckets**
  - **encrypted secrets no vault**

### Mitigação prática
- Depois do squash, crie migrations adicionais para repor o que é DML/estado/config.
- Para buckets especificamente, existe `supabase seed buckets` (baseado em config) — usar isso como parte do “bootstrap” do ambiente reduz drift.


## Alternativas (quando `db diff/pull/dump` não são suficientes)

- **`supabase db diff --use-pg-schema` (Stripe `pg-schema-diff`)**
  - Pró: foca em gerar um plano de migração mais “online”, com preocupações de locks/tempo (zero/minimal downtime).
  - Contra (relevante): a própria tool lista **migrations não suportadas**, incluindo:
    - privilégios (planned)
    - types (apenas enums suportados)
    - renames (tratados como drop+add)
  - Tradução para consolidação: bom como “validador/planejador”, mas não elimina necessidade de review manual.

- **`results dbdiff` (sucessor do migra, fora do Supabase CLI)**
  - Útil como ferramenta externa para comparar schemas e gerar SQL.
  - Traz flags interessantes (ex.: `--exclude-schema`, `--with-privileges`).
  - Atenção: o próprio README ressalta que *diffing* é estrutural (não trata data moves/renames complexos automaticamente).

- **`pg_dump` direto (fora do Supabase CLI)**
  - Pró: baseline muito fiel ao Postgres.
  - Contra: mais ruído, menos “opinião Supabase”, e ainda não resolve “estado fora do Postgres” (buckets etc).


## Warnings rápidos (coláveis em PR/Checklist)

- [ ] Definimos explicitamente quais schemas entram no baseline (`--schema ...`)?
- [ ] Validamos que `auth`/`storage` não eram necessários (ou incluímos conscientemente via `--schema auth,storage`)?
- [ ] Verificamos manualmente **publicações**, **buckets** e **views `security_invoker`** (sabemos que `db diff` pode falhar nesses casos)?
- [ ] Pós-`migration squash`, reintroduzimos DML necessário (cron/buckets/vault secrets etc) em migrations extras?


## Fontes (primárias)

- Supabase CLI `db diff`: https://supabase.com/docs/reference/cli/supabase-db-diff
- Supabase CLI `db dump`: https://supabase.com/docs/reference/cli/supabase-db-dump
- Supabase CLI `db pull`: https://supabase.com/docs/reference/cli/supabase-db-pull
- Supabase CLI `migration squash`: https://supabase.com/docs/reference/cli/supabase-migration-squash
- Supabase CLI `seed buckets`: https://supabase.com/docs/reference/cli/supabase-seed-buckets
- migra (deprecated): https://github.com/djrobstep/migra
- results (migra successor, `dbdiff`): https://github.com/djrobstep/results
- pg-schema-diff (Stripe): https://github.com/stripe/pg-schema-diff
