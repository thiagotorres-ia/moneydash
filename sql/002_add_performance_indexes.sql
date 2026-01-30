-- Migration: Performance Optimization Indexes
-- Date: 2025-01-25
-- Author: Senior DB Engineer

-- NOTA: 'CREATE INDEX CONCURRENTLY' não pode ser executado dentro de blocos de transação (BEGIN/COMMIT).
-- Execute os comandos abaixo diretamente no SQL Editor do Supabase.

-- 1. Otimização da Tabela TRANSACTIONS (Extrato e Agregações)
-- Otimiza: SELECT ... WHERE user_id = ? ORDER BY date DESC
CREATE INDEX IF NOT EXISTS idx_transactions_user_id_date 
ON public.transactions (user_id, date DESC);

-- Otimiza: JOINs e GROUP BY por envelope (Cálculo de saldo)
CREATE INDEX IF NOT EXISTS idx_transactions_envelope_id 
ON public.transactions (envelope_id);

-- Otimiza: Prevenção de duplicatas em importações volumosas
-- Índice parcial: ignora registros nulos para economizar espaço
CREATE INDEX IF NOT EXISTS idx_transactions_import_hash_partial 
ON public.transactions (import_hash) 
WHERE import_hash IS NOT NULL;


-- 2. Otimização da Tabela ENVELOPES
-- Otimiza: Filtragem por tipo no dashboard
CREATE INDEX IF NOT EXISTS idx_envelopes_user_id_type 
ON public.envelopes (user_id, type_slug);

-- Otimiza: Busca rápida por código (EX: 'ALIM', 'FIX1')
CREATE INDEX IF NOT EXISTS idx_envelopes_code 
ON public.envelopes (code);


-- 3. Otimização de Hierarquias (Categorias/Subcategorias)
-- Otimiza: Listagem de subcategorias de uma categoria
CREATE INDEX IF NOT EXISTS idx_subcategories_category_user 
ON public.subcategories (category_id, user_id);

-- Otimiza: Listagem geral de subcategorias do usuário
CREATE INDEX IF NOT EXISTS idx_subcategories_user_id 
ON public.subcategories (user_id);

-- Otimiza: Listagem de categorias do usuário
CREATE INDEX IF NOT EXISTS idx_categories_user_id 
ON public.categories (user_id);

-- 4. Atualizar estatísticas do planejador de queries
ANALYZE public.transactions;
ANALYZE public.envelopes;
ANALYZE public.categories;
ANALYZE public.subcategories;

-- Comentários para documentação no DB
COMMENT ON INDEX idx_transactions_user_id_date IS 'Otimiza a listagem do extrato financeiro por usuário e data.';
COMMENT ON INDEX idx_transactions_import_hash_partial IS 'Garante performance na verificação de duplicatas durante importação de CSV.';
