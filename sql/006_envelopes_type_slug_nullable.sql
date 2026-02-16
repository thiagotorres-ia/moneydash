-- Permite que inserts/updates não enviem type_slug (campo legado; app usa envelope_type_id).
-- Execute no SQL Editor do Supabase se a migration não tiver sido aplicada via MCP/cli.
ALTER TABLE public.envelopes
ALTER COLUMN type_slug DROP NOT NULL;
