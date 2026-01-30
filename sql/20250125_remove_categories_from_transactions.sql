-- Migration: Remove Categories from Transactions
-- Date: 2025-01-25
-- Reason: Stabilization of financial core and architectural simplification.

BEGIN;

-- 1. Notify start of migration
DO $$ BEGIN RAISE NOTICE 'Starting migration to remove category columns from transactions...'; END $$;

-- 2. Drop Foreign Key Constraints
-- Checking for existence to make it idempotent
ALTER TABLE IF EXISTS public.transactions 
    DROP CONSTRAINT IF EXISTS transactions_category_id_fkey,
    DROP CONSTRAINT IF EXISTS transactions_subcategory_id_fkey;

-- 3. Drop Category Related Columns
-- category_id, sub_category_id, subcategory_id
ALTER TABLE IF EXISTS public.transactions 
    DROP COLUMN IF EXISTS category_id,
    DROP COLUMN IF EXISTS sub_category_id,
    DROP COLUMN IF EXISTS subcategory_id;

-- 4. Verify state
DO $$ 
BEGIN 
    RAISE NOTICE 'Migration successful. Category columns removed from public.transactions.'; 
END $$;

COMMIT;