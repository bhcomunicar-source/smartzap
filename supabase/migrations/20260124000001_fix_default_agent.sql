-- Migration: Ensure first AI agent is marked as default
-- This fixes the case where agents were created without the API logic
-- that marks the first agent as default

-- Step 1: If no agent is marked as default, mark the oldest one
UPDATE public.ai_agents
SET is_default = true
WHERE id = (
  SELECT id FROM public.ai_agents
  WHERE NOT EXISTS (
    SELECT 1 FROM public.ai_agents WHERE is_default = true
  )
  ORDER BY created_at ASC
  LIMIT 1
);

-- Step 2: Create a trigger to auto-mark first agent as default on insert
CREATE OR REPLACE FUNCTION public.ensure_default_ai_agent()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is the first agent (no others exist), mark as default
  IF NOT EXISTS (
    SELECT 1 FROM public.ai_agents WHERE id != NEW.id
  ) THEN
    NEW.is_default := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS ensure_default_ai_agent_trigger ON public.ai_agents;

CREATE TRIGGER ensure_default_ai_agent_trigger
  BEFORE INSERT ON public.ai_agents
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_default_ai_agent();

-- Comment for documentation
COMMENT ON FUNCTION public.ensure_default_ai_agent() IS 'Ensures the first AI agent is always marked as default';
