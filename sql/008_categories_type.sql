-- Migração: tipo de categoria (Despesa / Receita)
-- Execute no SQL Editor do Supabase.
-- Categorias existentes recebem type = 'despesa' por causa do DEFAULT.

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'despesa';

ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_type_check;

ALTER TABLE public.categories
  ADD CONSTRAINT categories_type_check CHECK (type IN ('despesa', 'receita'));

COMMENT ON COLUMN public.categories.type IS 'Tipo da categoria: despesa ou receita. Subcategorias herdam o tipo da categoria mãe.';
