-- Migração: Tabela de log de transferências entre envelopes
-- Permite rastrear transferências sem criar lançamentos em transactions.
-- Execute no SQL Editor do Supabase ou via MCP apply_migration.

CREATE TABLE public.envelope_transfer_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transfer_date date NOT NULL,
  origin_envelope_id uuid NOT NULL REFERENCES envelopes(id) ON DELETE RESTRICT,
  origin_category_id uuid NULL REFERENCES categories(id) ON DELETE SET NULL,
  origin_subcategory_id uuid NULL REFERENCES subcategories(id) ON DELETE SET NULL,
  dest_envelope_id uuid NOT NULL REFERENCES envelopes(id) ON DELETE RESTRICT,
  dest_category_id uuid NULL REFERENCES categories(id) ON DELETE SET NULL,
  dest_subcategory_id uuid NULL REFERENCES subcategories(id) ON DELETE SET NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_envelope_transfer_log_user_id ON envelope_transfer_log(user_id);
CREATE INDEX idx_envelope_transfer_log_transfer_date ON envelope_transfer_log(transfer_date);

ALTER TABLE envelope_transfer_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY envelope_transfer_log_insert_own ON envelope_transfer_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY envelope_transfer_log_select_own ON envelope_transfer_log
  FOR SELECT USING (auth.uid() = user_id);
