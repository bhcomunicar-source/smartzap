# Tasks — Consolidação de migrations

Esta lista foca em passos pequenos e verificáveis.

## 1) Definir e aplicar “fonte única de verdade”

- [ ] Escolher o diretório canônico para migrations (decisão proposta no `research.md`: `supabase/migrations`).
- [ ] Eliminar baseline duplicado (`lib/migrations/0001_initial_schema.sql` vs `supabase/migrations/0001_initial_schema.sql`):
  - opção A: mover e manter apenas um arquivo
  - opção B: gerar baseline novo e remover o outro
- [ ] Ajustar `next.config.ts` para garantir que a rota `/api/setup/migrate` tenha acesso à pasta canônica no bundle serverless.

**DoD:** há um único baseline e ele é o caminho oficial de bootstrap.

## 2) Padronizar a execução de SQL via RPC `exec_sql`

- [ ] Descobrir/confirmar a assinatura real do RPC no banco (nome do parâmetro).
- [ ] Versionar/criar a função `exec_sql` dentro das migrations (para eliminar dependência “mágica” do ambiente).
- [ ] Padronizar os callers no repo (`sql_query` vs `sql`).

**DoD:** callers usam 1 assinatura e a função está versionada.

## 3) Normalizar versões duplicadas em migrations

- [ ] Resolver duplicidades `0006_*` e `0018_*`:
  - renomear com prefixos/timestamps únicos e ordenação explícita
  - garantir que a ordem final reflita dependências reais

**DoD:** não existem versões ambíguas e a ordenação é estável.

## 4) Implementar o parity check automatizado ("muitos testes")

### 4.1 Harness (DB A vs DB B)

- [ ] Criar rotina automatizada que:
  - cria DB A (baseline-only)
  - cria DB B (full chain)
  - aplica SQL por caminhos suportados no repo (via `pg` e/ou Supabase CLI)

### 4.2 Comparação

- [ ] Comparar dumps `pg_dump --schema-only` (normalizados)
- [ ] Rodar snapshots adicionais via `contracts/schema-snapshots.sql`
- [ ] Gerar relatório legível (diff + resumo)

**DoD:** o teste falha com divergência e aponta diferenças com clareza.

## 5) Segurança operacional (staging/prod)

- [ ] Documentar procedimento de `supabase migration repair` (baseline como aplicada) e quando usar.
- [ ] Garantir que o processo não permite “reset”/baseline em DB não-vazio sem confirmação explícita.

**DoD:** documentação evita caminhos destrutivos e define rollback/backup.

## 6) Gates de qualidade

- [ ] `npm run lint` passa
- [ ] `npm run build` passa
- [ ] `npm run test` passa
- [ ] Parity check passa (novo gate)

