-- Políticas RLS para envelope_types (tipos globais, acessíveis a usuários autenticados)
-- Execute no SQL Editor do Supabase para habilitar INSERT, UPDATE e DELETE na tabela envelope_types.
-- O script 003 cria a tabela mas não define políticas RLS; sem elas, operações de escrita são bloqueadas.

ALTER TABLE public.envelope_types ENABLE ROW LEVEL SECURITY;

-- Permite leitura para usuários autenticados
CREATE POLICY "Allow read for authenticated" ON public.envelope_types
  FOR SELECT TO authenticated USING (true);

-- Permite inserção para usuários autenticados
CREATE POLICY "Allow insert for authenticated" ON public.envelope_types
  FOR INSERT TO authenticated WITH CHECK (true);

-- Permite atualização para usuários autenticados
CREATE POLICY "Allow update for authenticated" ON public.envelope_types
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Permite exclusão para usuários autenticados
CREATE POLICY "Allow delete for authenticated" ON public.envelope_types
  FOR DELETE TO authenticated USING (true);
