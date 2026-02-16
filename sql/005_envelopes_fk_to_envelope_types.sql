-- Migration: Corrigir FK de envelopes.envelope_type_id para envelope_types(id)
-- Contexto: A aplicação e os dados usam a tabela envelope_types (plural). Se a coluna
-- envelope_type_id foi criada pela 003 com REFERENCES public.envelope_type(id), o INSERT
-- falha com 23503 (foreign key violation) porque os IDs vêm de envelope_types.
-- Execute no SQL Editor do Supabase após confirmar que a tabela de tipos é envelope_types.

-- 1) Descobrir o nome da constraint atual (opcional; rode e use o conname no DROP se necessário):
-- SELECT conname FROM pg_constraint
-- WHERE conrelid = 'public.envelopes'::regclass AND contype = 'f'
--   AND pg_get_constraintdef(oid) LIKE '%envelope_type%';

-- 2) Remover a FK que aponta para envelope_type (singular)
ALTER TABLE public.envelopes
DROP CONSTRAINT IF EXISTS envelopes_envelope_type_id_fkey;

-- 3) Criar a nova FK apontando para envelope_types (plural)
ALTER TABLE public.envelopes
ADD CONSTRAINT envelopes_envelope_type_id_fkey
FOREIGN KEY (envelope_type_id) REFERENCES public.envelope_types(id) ON DELETE RESTRICT;

-- 4) Verificar órfãos (opcional): envelopes com envelope_type_id que não existe em envelope_types.
-- Se retornar linhas, atualize ou exclua antes de exigir NOT NULL na coluna:
-- SELECT id, user_id, code, envelope_type_id FROM public.envelopes e
-- WHERE e.envelope_type_id IS NOT NULL
--   AND NOT EXISTS (SELECT 1 FROM public.envelope_types et WHERE et.id = e.envelope_type_id);

-- =============================================================================
-- 5) RLS na tabela envelopes (execute se ainda não houver políticas de INSERT)
-- =============================================================================
-- Confira no Supabase (Table Editor → envelopes → RLS) se já existem políticas.
-- Se o INSERT em envelopes retornar 42501 (policy violation), habilite RLS e crie as políticas abaixo.

ALTER TABLE public.envelopes ENABLE ROW LEVEL SECURITY;

-- SELECT: usuário vê apenas seus envelopes
DROP POLICY IF EXISTS "Users can read own envelopes" ON public.envelopes;
CREATE POLICY "Users can read own envelopes" ON public.envelopes
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT: usuário pode criar envelope para si
DROP POLICY IF EXISTS "Users can insert own envelopes" ON public.envelopes;
CREATE POLICY "Users can insert own envelopes" ON public.envelopes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: usuário pode atualizar apenas seus envelopes
DROP POLICY IF EXISTS "Users can update own envelopes" ON public.envelopes;
CREATE POLICY "Users can update own envelopes" ON public.envelopes
  FOR UPDATE USING (auth.uid() = user_id);

-- DELETE: usuário pode excluir apenas seus envelopes
DROP POLICY IF EXISTS "Users can delete own envelopes" ON public.envelopes;
CREATE POLICY "Users can delete own envelopes" ON public.envelopes
  FOR DELETE USING (auth.uid() = user_id);
