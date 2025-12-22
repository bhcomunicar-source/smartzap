# Feature Specification: Consolidação de migrations

**Feature Branch**: `001-consolidate-migrations`  
**Created**: 2025-12-22  
**Status**: Draft  
**Input**: User description: "Analise todas as migrations e consolide elas em uma unica migration, faca muitos testes, pra nao fazer merda"

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Criar ambiente de banco do zero (Priority: P1)

Como pessoa desenvolvedora (ou CI), eu quero criar um ambiente de banco “do zero” usando uma única migration consolidada, para reduzir falhas de setup, tempo de onboarding e inconsistências entre ambientes.

**Why this priority**: Sem um bootstrap confiável, qualquer dev/CI fica travado. É a base para todo o restante.

**Independent Test**: Pode ser testado criando um banco vazio e executando apenas a migration consolidada; o ambiente deve ficar pronto para uso sem passos manuais adicionais.

**Acceptance Scenarios**:

1. **Given** um banco vazio, **When** a migration consolidada é executada, **Then** o esquema completo do produto é criado e o processo termina sem erro.
2. **Given** um banco vazio, **When** a migration consolidada é executada duas vezes, **Then** a segunda execução não altera o estado final e não causa falhas (ou falha de forma segura e explícita, sem mudanças parciais).

---

### User Story 2 - Validar equivalência do esquema (Priority: P2)

Como mantenedor(a) do produto, eu quero uma validação automatizada que confirme que a migration consolidada representa exatamente o esquema atual do banco, para reduzir o risco de regressão e “drift” de schema.

**Why this priority**: Consolidar sem uma verificação robusta é uma receita para desastre silencioso. A validação é o cinto de segurança.

**Independent Test**: Pode ser testado executando a rotina de comparação de esquema e verificando que ela passa quando não há diferenças e falha quando há qualquer discrepância relevante.

**Acceptance Scenarios**:

1. **Given** uma referência do esquema atual, **When** a validação de equivalência é executada, **Then** ela aprova somente se não houver diferenças em objetos e regras relevantes (tabelas, colunas, índices, constraints, funções, triggers, políticas e permissões aplicáveis).
2. **Given** uma alteração proposital no esquema gerado pela migration consolidada, **When** a validação é executada, **Then** ela falha e apresenta um relatório legível com as diferenças.

---

### User Story 3 - Proteger ambientes existentes (Priority: P3)

Como operador(a) / time de engenharia, eu quero que o processo de consolidação não cause risco para ambientes existentes (staging/produção), para evitar interrupção, perda de dados ou comportamento inesperado.

**Why this priority**: O valor é alto (menos complexidade), mas o risco operacional é maior. Precisa de guard-rails.

**Independent Test**: Pode ser testado apontando a execução para um banco que já possui dados/objetos e verificando que não há alteração destrutiva nem execução “pela metade”.

**Acceptance Scenarios**:

1. **Given** um banco que já possui objetos e/ou dados do produto, **When** alguém tenta aplicar o bootstrap consolidado nesse banco, **Then** o sistema impede a execução (ou exige uma confirmação explícita) e não causa mudanças parciais.
2. **Given** um banco existente, **When** a validação de equivalência é executada, **Then** ela pode comprovar que o esquema atual corresponde ao esperado sem exigir recriar o banco.

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

- Colisão/duplicidade de versões ou nomes de migrations (ordem não determinística) e como isso é resolvido na consolidação.
- Banco “semi-criado” (execução interrompida) e rerun do bootstrap: evitar estado corrompido.
- Objetos já existentes (extensões, schemas auxiliares, funções/triggers/políticas) e dependências de ordem de criação.
- Diferenças de ambiente (ex.: permissões/roles disponíveis) que possam afetar políticas e grants.
- Migrações antigas contendo correções “defensivas” (ex.: blocos condicionais) e como manter o mesmo comportamento esperado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE ter uma única migration “canônica” capaz de criar o esquema completo do banco a partir de um banco vazio.
- **FR-002**: A migration canônica DEVE representar o estado atual do banco (fonte de verdade), incluindo objetos e regras relevantes: tabelas, colunas, tipos, índices, constraints, funções, triggers, políticas e permissões aplicáveis.
- **FR-003**: O repositório DEVE evitar ambiguidade de ordem/versão (ex.: numeração duplicada); após a consolidação, não pode existir mais de um caminho “oficial” para bootstrap do esquema.
- **FR-004**: O processo DEVE incluir uma validação automatizada que compare o esquema criado pela migration canônica com uma referência do esquema atual e falhe em caso de divergência relevante.
- **FR-005**: A validação automatizada DEVE gerar um relatório entendível para revisão (o que mudou e onde), para facilitar auditoria.
- **FR-006**: A execução em bancos não vazios DEVE ser segura: ou é idempotente (sem alterações indevidas) ou falha cedo com mensagem clara e sem efeitos parciais.
- **FR-007**: A documentação do projeto DEVE orientar como criar um ambiente novo usando a migration canônica e como rodar a validação de equivalência antes de merge.

### Key Entities *(include if feature involves data)*

- **Migração Canônica (Bootstrap)**: artefato versionado que descreve o esquema completo necessário para iniciar o produto em um banco vazio.
- **Esquema de Referência**: representação do “estado atual esperado” do banco (fonte de verdade para comparação).
- **Relatório de Diferenças de Esquema**: saída legível que descreve divergências entre o schema gerado e o schema de referência.
- **Ambiente de Banco (Novo vs. Existente)**: contexto onde a migration é aplicada; determina regras de segurança e guard-rails.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma pessoa desenvolvedora consegue criar um ambiente de banco novo (do zero) com uma única execução, com taxa de sucesso de pelo menos 90% na primeira tentativa (medido por checklist/guia de setup).
- **SC-002**: A validação automatizada detecta 100% das divergências relevantes de esquema entre o bootstrap e a referência (qualquer diferença relevante bloqueia o merge).
- **SC-003**: O tempo total de preparação de um ambiente novo de banco (incluindo validação básica) fica abaixo de 5 minutos em ambiente padrão de desenvolvimento/CI.
- **SC-004**: Reduzir em pelo menos 50% as ocorrências de falhas/bugs relacionados a inconsistência de esquema entre ambientes, ao longo de 30 dias após adoção.

## Assumptions

- O objetivo principal é reduzir complexidade e risco em setups novos e em CI; ambientes existentes não devem exigir “recriação total” para continuar funcionando.
- A consolidação trata do esquema (estrutura e regras). Migração de dados (transformações de conteúdo) não é objetivo primário, exceto quando indispensável para manter compatibilidade.
- O repositório deve manter rastreabilidade do histórico anterior (via versionamento), mas somente uma migration deve ser considerada “oficial” para bootstrap.

## Out of Scope

- Alterar regras de negócio, modelos de dados ou comportamento do produto além do necessário para refletir o esquema atual.
- Criar novas funcionalidades de aplicação (UI/APIs). O escopo é a confiabilidade do setup e validação do esquema.
