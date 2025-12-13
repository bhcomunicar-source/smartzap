-- =============================================================================
-- SmartZap v2 - Consolidated Schema for Supabase
-- Combined Migration: All migrations consolidated
-- Updated: 2025-12-11
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- CAMPAIGNS
-- =============================================================================

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY DEFAULT concat('c_', replace(uuid_generate_v4()::text, '-', '')::text),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Rascunho',
  template_name TEXT,
  template_id TEXT,
  template_variables JSONB,
  template_snapshot JSONB,
  template_spec_hash TEXT,
  template_parameter_format TEXT,
  template_fetched_at TIMESTAMPTZ,
  scheduled_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  sent INTEGER DEFAULT 0,
  delivered INTEGER DEFAULT 0,
  read INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0
);

-- Allow adding snapshot columns on existing databases
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS template_snapshot JSONB;

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS template_spec_hash TEXT;

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS template_parameter_format TEXT;

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS template_fetched_at TIMESTAMPTZ;

-- Backfill Pattern: ensure counters exist on existing databases
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS skipped INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at DESC);

-- =============================================================================
-- CONTACTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY DEFAULT concat('ct_', replace(uuid_generate_v4()::text, '-', '')::text),
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  status TEXT DEFAULT 'Opt-in',
  tags JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_custom_fields ON contacts USING GIN (custom_fields);

-- =============================================================================
-- CAMPAIGN CONTACTS (Junction Table)
-- =============================================================================

CREATE TABLE IF NOT EXISTS campaign_contacts (
  id TEXT PRIMARY KEY DEFAULT concat('cc_', replace(uuid_generate_v4()::text, '-', '')::text),
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id TEXT,
  phone TEXT NOT NULL,
  name TEXT,
  email TEXT,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending',
  message_id TEXT,
  sending_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  skipped_at TIMESTAMPTZ,
  error TEXT,
  skip_code TEXT,
  skip_reason TEXT,
  failure_code INTEGER,
  failure_reason TEXT,
  UNIQUE(campaign_id, contact_id)
);

-- Snapshot Pattern: allow adding the column on existing databases
ALTER TABLE campaign_contacts
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

ALTER TABLE campaign_contacts
ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE campaign_contacts
ADD COLUMN IF NOT EXISTS skipped_at TIMESTAMPTZ;

ALTER TABLE campaign_contacts
ADD COLUMN IF NOT EXISTS skip_code TEXT;

ALTER TABLE campaign_contacts
ADD COLUMN IF NOT EXISTS skip_reason TEXT;

ALTER TABLE campaign_contacts
ADD COLUMN IF NOT EXISTS sending_at TIMESTAMPTZ;

COMMENT ON COLUMN campaign_contacts.email IS 'Snapshot do email do contato no momento da criação da campanha';
COMMENT ON COLUMN campaign_contacts.custom_fields IS 'Snapshot dos custom_fields do contato no momento da criação da campanha';
COMMENT ON COLUMN campaign_contacts.skipped_at IS 'Quando o envio foi ignorado pelo pré-check/guard-rail';
COMMENT ON COLUMN campaign_contacts.skip_code IS 'Código estável do motivo de skip (ex.: MISSING_REQUIRED_PARAM)';
COMMENT ON COLUMN campaign_contacts.skip_reason IS 'Motivo legível do skip (para UI e auditoria)';
COMMENT ON COLUMN campaign_contacts.sending_at IS 'Quando o contato foi "claimado" para envio (idempotência/at-least-once)';

CREATE INDEX IF NOT EXISTS idx_campaign_contacts_campaign ON campaign_contacts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_status ON campaign_contacts(status);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_failure ON campaign_contacts(failure_code);

-- Phone é usado para buscas rápidas/idempotência no workflow.
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_campaign_phone ON campaign_contacts(campaign_id, phone);

-- Migração segura: alguns bancos antigos podem ter UNIQUE(campaign_id, phone).
-- Isso causa colisões quando o telefone é normalizado. A regra do produto é 1 contato (contact_id) por campanha.

-- 1) Limpa duplicados por (campaign_id, contact_id) mantendo o registro mais "avançado".
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY campaign_id, contact_id
      ORDER BY COALESCE(read_at, delivered_at, sent_at, failed_at, skipped_at, sending_at) DESC NULLS LAST, id DESC
    ) AS rn
  FROM campaign_contacts
  WHERE contact_id IS NOT NULL
)
DELETE FROM campaign_contacts cc
USING ranked r
WHERE cc.id = r.id AND r.rn > 1;

-- 2) Remove qualquer constraint UNIQUE que seja exatamente (campaign_id, phone)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'campaign_contacts'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%(campaign_id, phone)%'
  LOOP
    EXECUTE format('ALTER TABLE campaign_contacts DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- 3) Garante a constraint UNIQUE por (campaign_id, contact_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'campaign_contacts'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%(campaign_id, contact_id)%'
  ) THEN
    ALTER TABLE campaign_contacts
      ADD CONSTRAINT campaign_contacts_campaign_id_contact_id_key UNIQUE (campaign_id, contact_id);
  END IF;
END $$;

-- =============================================================================
-- TEMPLATES
-- =============================================================================

CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY DEFAULT concat('tpl_', replace(uuid_generate_v4()::text, '-', '')::text),
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  language TEXT DEFAULT 'pt_BR',
  status TEXT,
  parameter_format TEXT DEFAULT 'positional',
  components JSONB,
  spec_hash TEXT,
  fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

ALTER TABLE templates
ADD COLUMN IF NOT EXISTS parameter_format TEXT DEFAULT 'positional';

ALTER TABLE templates
ADD COLUMN IF NOT EXISTS spec_hash TEXT;

ALTER TABLE templates
ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_templates_name ON templates(name);
CREATE INDEX IF NOT EXISTS idx_templates_status ON templates(status);

-- =============================================================================
-- SETTINGS (Key-Value Store)
-- =============================================================================

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ACCOUNT ALERTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS account_alerts (
  id TEXT PRIMARY KEY DEFAULT concat('alert_', replace(uuid_generate_v4()::text, '-', '')::text),
  type TEXT NOT NULL,
  code INTEGER,
  message TEXT NOT NULL,
  details JSONB,
  dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_alerts_type ON account_alerts(type);
CREATE INDEX IF NOT EXISTS idx_account_alerts_dismissed ON account_alerts(dismissed);
CREATE INDEX IF NOT EXISTS idx_account_alerts_dismissed_created ON account_alerts(dismissed, created_at DESC);

-- =============================================================================
-- TEMPLATE PROJECTS (Factory)
-- =============================================================================

CREATE TABLE IF NOT EXISTS template_projects (
  id TEXT PRIMARY KEY DEFAULT concat('tp_', replace(uuid_generate_v4()::text, '-', '')::text),
  user_id TEXT,
  title TEXT NOT NULL,
  prompt TEXT,
  status TEXT DEFAULT 'draft',
  template_count INTEGER DEFAULT 0,
  approved_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_template_projects_status ON template_projects(status);

-- =============================================================================
-- TEMPLATE PROJECT ITEMS
-- =============================================================================

CREATE TABLE IF NOT EXISTS template_project_items (
  id TEXT PRIMARY KEY DEFAULT concat('tpi_', replace(uuid_generate_v4()::text, '-', '')::text),
  project_id TEXT NOT NULL REFERENCES template_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT DEFAULT 'pt_BR',
  category TEXT DEFAULT 'UTILITY',
  status TEXT DEFAULT 'draft',
  meta_id TEXT,
  meta_status TEXT,
  rejected_reason TEXT,
  submitted_at TIMESTAMPTZ,
  components JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_template_project_items_project ON template_project_items(project_id);
CREATE INDEX IF NOT EXISTS idx_template_project_items_status ON template_project_items(status);

-- =============================================================================
-- CUSTOM FIELD DEFINITIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id TEXT PRIMARY KEY DEFAULT concat('cfd_', replace(uuid_generate_v4()::text, '-', '')::text),
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  options JSONB,
  entity_type TEXT NOT NULL DEFAULT 'contact',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_type, key)
);

CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_entity ON custom_field_definitions(entity_type);

GRANT ALL ON custom_field_definitions TO postgres, anon, authenticated, service_role;

-- =============================================================================
-- RPC FUNCTIONS
-- =============================================================================

-- Dashboard Stats
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_sent bigint;
  total_delivered bigint;
  total_read bigint;
  total_failed bigint;
  active_campaigns bigint;
  delivery_rate integer;
BEGIN
  SELECT 
    coalesce(sum(sent), 0),
    coalesce(sum(delivered), 0),
    coalesce(sum(read), 0),
    coalesce(sum(failed), 0)
  INTO 
    total_sent,
    total_delivered,
    total_read,
    total_failed
  FROM campaigns;

  SELECT count(*)
  INTO active_campaigns
  FROM campaigns
  WHERE status in ('Enviando', 'Agendado');

  IF total_sent > 0 THEN
    delivery_rate := round((total_delivered::numeric / total_sent::numeric) * 100);
  ELSE
    delivery_rate := 0;
  END IF;

  RETURN json_build_object(
    'totalSent', total_sent,
    'totalDelivered', total_delivered,
    'totalRead', total_read,
    'totalFailed', total_failed,
    'activeCampaigns', active_campaigns,
    'deliveryRate', delivery_rate
  );
END;
$$;

-- Atomic Campaign Stat Increment
CREATE OR REPLACE FUNCTION increment_campaign_stat(
  campaign_id_input TEXT,
  field TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF field = 'sent' THEN
    UPDATE campaigns SET sent = COALESCE(sent, 0) + 1 WHERE id = campaign_id_input;
  ELSIF field = 'delivered' THEN
    UPDATE campaigns SET delivered = COALESCE(delivered, 0) + 1 WHERE id = campaign_id_input;
  ELSIF field = 'read' THEN
    UPDATE campaigns SET read = COALESCE(read, 0) + 1 WHERE id = campaign_id_input;
  ELSIF field = 'failed' THEN
    UPDATE campaigns SET failed = COALESCE(failed, 0) + 1 WHERE id = campaign_id_input;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_campaign_stat TO service_role;
GRANT EXECUTE ON FUNCTION increment_campaign_stat TO authenticated;
GRANT EXECUTE ON FUNCTION increment_campaign_stat TO anon;

-- =============================================================================
-- ENABLE REALTIME
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'campaigns') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE campaigns;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'campaign_contacts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE campaign_contacts;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'contacts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE contacts;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'template_projects') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE template_projects;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'template_project_items') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE template_project_items;
  END IF;
END $$;

-- =============================================================================
-- PERMISSIONS (IMPORTANT)
-- =============================================================================
-- Quando você cria tabelas via SQL Editor, é comum faltar GRANTs para os roles
-- usados pelo PostgREST (anon/authenticated). Sem isso, a API retorna 403
-- (PostgREST error=42501) "permission denied for table ...".
--
-- ⚠️ Segurança:
-- - Se você pretende expor o banco ao frontend, habilite RLS e crie policies.
-- - O SmartZap usa rotas de API no servidor + senha mestra, mas ainda assim
--   estas permissões tornam as tabelas acessíveis via PostgREST com a chave pública.
--   Ajuste conforme seu modelo de segurança.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL PRIVILEGES ON TABLE campaigns TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE contacts TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE campaign_contacts TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE templates TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE settings TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE account_alerts TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE template_projects TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE template_project_items TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE custom_field_definitions TO anon, authenticated, service_role;
