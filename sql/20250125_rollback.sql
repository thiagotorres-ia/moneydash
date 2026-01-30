-- Rollback: Restore Categories to Transactions
-- Date: 2025-01-25

BEGIN;

-- 1. Re-add columns
ALTER TABLE IF EXISTS public.transactions 
    ADD COLUMN IF NOT EXISTS category_id uuid,
    ADD COLUMN IF NOT EXISTS sub_category_id uuid,
    ADD COLUMN IF NOT EXISTS subcategory_id uuid;

-- 2. Re-add Foreign Key Constraints
-- Note: This assumes 'categories' and 'subcategories' tables still exist.
ALTER TABLE IF EXISTS public.transactions
    ADD CONSTRAINT transactions_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.transactions
    ADD CONSTRAINT transactions_subcategory_id_fkey 
    FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id) ON DELETE SET NULL;

DO $$ BEGIN RAISE NOTICE 'Rollback successful. Category columns restored.'; END $$;

COMMIT;