-- Backfill: preenche type_slug nos envelopes que têm envelope_type_id e type_slug NULL.
-- Execute uma vez no SQL Editor do Supabase (ou já foi aplicado via MCP).
UPDATE public.envelopes e
SET type_slug = et.slug
FROM public.envelope_types et
WHERE e.envelope_type_id = et.id
  AND e.type_slug IS NULL;
