-- Fix: Corrigir Supabase Realtime e permissões anon para JOINs.
--
-- Problemas resolvidos:
-- 1. contacts, templates, flows e account_alerts não estavam na publicação
--    supabase_realtime — canais Realtime falhavam silenciosamente
-- 2. campaign_contacts tinha REPLICA IDENTITY DEFAULT (só PK), impedindo
--    filtros por campaign_id no Realtime
-- 3. anon não tinha GRANT SELECT em campaign_contacts — a função
--    realtime.subscription_check_filters usa has_column_privilege()
--    para validar filtros, rejeitando com "invalid column for filter"
-- 4. Server Actions (createClient/publishable key) usam role anon para
--    queries com JOINs. Tabelas sem GRANT SELECT para anon causavam
--    falha silenciosa nos JOINs (inbox vazio, agente não encontrado)

-- Adicionar tabelas à publicação (idempotente com IF NOT EXISTS via DO block)
DO $$
BEGIN
  -- contacts
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'contacts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE contacts;
  END IF;

  -- templates
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'templates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE templates;
  END IF;

  -- flows
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'flows'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE flows;
  END IF;

  -- account_alerts
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'account_alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE account_alerts;
  END IF;
END;
$$;

-- Habilitar REPLICA IDENTITY FULL em campaign_contacts
-- Permite que o Supabase Realtime filtre por qualquer coluna (ex: campaign_id)
-- Trade-off: aumenta levemente o volume de WAL, mas campaign_contacts tem
-- volume controlado (ligado ao tamanho das campanhas)
ALTER TABLE campaign_contacts REPLICA IDENTITY FULL;

-- Conceder SELECT ao anon para satisfazer has_column_privilege() no Realtime,
-- mas bloquear leitura direta via REST API com RLS USING(false).
-- O Realtime recebe eventos via WAL (server-side, não passa por RLS),
-- então o filtro campaign_id funciona normalmente.
GRANT SELECT ON campaign_contacts TO anon;

CREATE POLICY deny_anon_select ON campaign_contacts
  FOR SELECT TO anon USING (false);

-- Permitir JOINs em Server Actions (role anon) para tabelas usadas
-- em queries do inbox e agentes. GRANT SELECT satisfaz o PostgREST
-- para embedded resources, mas RLS USING(false) bloqueia leitura
-- direta via REST API.
GRANT SELECT ON inbox_conversation_labels TO anon;
GRANT SELECT ON inbox_labels TO anon;
GRANT SELECT ON ai_agents TO anon;

CREATE POLICY deny_anon_select ON inbox_conversation_labels
  FOR SELECT TO anon USING (false);

CREATE POLICY deny_anon_select ON inbox_labels
  FOR SELECT TO anon USING (false);

CREATE POLICY deny_anon_select ON ai_agents
  FOR SELECT TO anon USING (false);

-- Permitir JOINs em Server Actions de campaigns (role anon).
-- campaigns/actions.ts usa createClient() com JOINs para folders e tags.
GRANT SELECT ON campaign_folders TO anon;
GRANT SELECT ON campaign_tag_assignments TO anon;
GRANT SELECT ON campaign_tags TO anon;

CREATE POLICY deny_anon_select ON campaign_folders
  FOR SELECT TO anon USING (false);

CREATE POLICY deny_anon_select ON campaign_tag_assignments
  FOR SELECT TO anon USING (false);

CREATE POLICY deny_anon_select ON campaign_tags
  FOR SELECT TO anon USING (false);

-- REPLICA IDENTITY FULL em inbox_messages para permitir filtros Realtime
-- por conversation_id e direction (usados em useConversation e useUnreadCount).
ALTER TABLE inbox_messages REPLICA IDENTITY FULL;

-- template_project_items: publicação + REPLICA IDENTITY FULL + GRANT/RLS
-- useTemplateProjects filtra por project_id=eq.{id} via Realtime.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'template_project_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE template_project_items;
  END IF;
END;
$$;

ALTER TABLE template_project_items REPLICA IDENTITY FULL;

GRANT SELECT ON template_project_items TO anon;

CREATE POLICY deny_anon_select ON template_project_items
  FOR SELECT TO anon USING (false);

-- template_projects: publicação + GRANT/RLS (sem filtro, não precisa FULL).
-- useTemplateProjects lista projetos via Realtime sem filtro.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'template_projects'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE template_projects;
  END IF;
END;
$$;

GRANT SELECT ON template_projects TO anon;

CREATE POLICY deny_anon_select ON template_projects
  FOR SELECT TO anon USING (false);

-- flow_submissions: publicação + REPLICA IDENTITY FULL + GRANT/RLS.
-- CampaignFlowPanel filtra por campaign_id=eq.{id} via Realtime.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'flow_submissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE flow_submissions;
  END IF;
END;
$$;

ALTER TABLE flow_submissions REPLICA IDENTITY FULL;

GRANT SELECT ON flow_submissions TO anon;

CREATE POLICY deny_anon_select ON flow_submissions
  FOR SELECT TO anon USING (false);
