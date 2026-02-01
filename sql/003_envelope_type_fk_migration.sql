-- Migration: Relacionamento envelopes ↔ envelope_type por FK (envelope_type_id)
-- Objetivo: criar a tabela envelope_type (se não existir), popular a partir dos type_slug
-- existentes em envelopes e substituir vínculo indireto por FK envelope_type_id (1:N).
-- Execute no SQL Editor do Supabase ANTES da implementação do CRUD de Tipo de Envelope.

-- 1) Criar tabela envelope_type (se não existir)
CREATE TABLE IF NOT EXISTS public.envelope_type (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text,
  relative_order integer NOT NULL DEFAULT 0
);

-- 2) Popular envelope_type com os valores distintos de type_slug já usados em envelopes
-- (só insere slugs que ainda não existem em envelope_type)
INSERT INTO public.envelope_type (name, slug, relative_order)
SELECT d.type_slug AS name, d.type_slug AS slug, (row_number() OVER (ORDER BY d.type_slug))::integer - 1 AS relative_order
FROM (SELECT DISTINCT type_slug FROM public.envelopes WHERE type_slug IS NOT NULL) d
WHERE NOT EXISTS (SELECT 1 FROM public.envelope_type et WHERE et.slug = d.type_slug);

-- 3) Adicionar coluna envelope_type_id em envelopes (nullable inicialmente)
ALTER TABLE public.envelopes
ADD COLUMN IF NOT EXISTS envelope_type_id uuid REFERENCES public.envelope_type(id) ON DELETE RESTRICT;

-- 4) Popular envelope_type_id a partir de type_slug (join por envelope_type.slug)
UPDATE public.envelopes e
SET envelope_type_id = et.id
FROM public.envelope_type et
WHERE e.type_slug IS NOT NULL
  AND et.slug = e.type_slug
  AND e.envelope_type_id IS NULL;

-- 5) Opcional: tratar envelopes órfãos (type_slug sem correspondência em envelope_type)
-- Se houver type_slug que não existe em envelope_type, você pode:
--   - Inserir registros em envelope_type para esses slugs, ou
--   - Atribuir um tipo padrão (ex.: primeiro id de envelope_type).
-- Exemplo para tipo padrão (descomente e ajuste se necessário):
-- UPDATE public.envelopes
-- SET envelope_type_id = (SELECT id FROM public.envelope_type ORDER BY relative_order ASC LIMIT 1)
-- WHERE envelope_type_id IS NULL AND type_slug IS NOT NULL;

-- 6) Garantir que não restem envelopes sem tipo (ajuste conforme política desejada)
-- Se quiser NOT NULL, descomente após garantir que todos tenham envelope_type_id:
-- ALTER TABLE public.envelopes
-- ALTER COLUMN envelope_type_id SET NOT NULL;

-- 7) Remover índice antigo em type_slug (se existir)
DROP INDEX IF EXISTS public.idx_envelopes_user_id_type;

-- 8) Criar índice para filtragem por user_id e tipo
CREATE INDEX IF NOT EXISTS idx_envelopes_user_id_envelope_type_id
ON public.envelopes (user_id, envelope_type_id);

-- 9) Remover coluna type_slug (executar apenas após validar migração e deploy do código)
-- ALTER TABLE public.envelopes
-- DROP COLUMN IF EXISTS type_slug;

-- NOTA: O passo 9 (DROP type_slug) deve ser executado somente após o código da aplicação
-- estar usando apenas envelope_type_id. Recomenda-se fazer em uma segunda migração após o deploy.
