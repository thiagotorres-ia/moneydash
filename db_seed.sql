-- INSTRUÇÕES DE USO:
-- 1. Copie todo o conteúdo deste arquivo.
-- 2. Cole no "SQL Editor" do seu painel Supabase.
-- 3. Execute o script.

DO $$
DECLARE
    v_user_id UUID;
    v_env_id UUID;
    v_cat_record RECORD;
    v_env_name text;
    v_env_code text;
    v_counter integer;
    v_deposit_amount numeric;
    v_expense_amount numeric;
    
    -- Definição dos envelopes por categoria
    -- Arrays de texto para iterar
    v_types text[] := ARRAY['fixed', 'routine', 'investment', 'temporary', 'income'];
    
    -- Mapeamento manual simples para gerar nomes
    v_fixed_names text[] := ARRAY['Aluguel', 'Energia Elétrica', 'Internet Fibra', 'Condomínio', 'Água/Esgoto'];
    v_routine_names text[] := ARRAY['Supermercado', 'Combustível', 'Farmácia', 'Lazer Fim de Semana', 'Padaria'];
    v_investment_names text[] := ARRAY['Reserva de Emergência', 'Ações', 'Tesouro Direto', 'Criptomoedas', 'Fundo Imobiliário'];
    v_temporary_names text[] := ARRAY['Viagem Férias', 'Presentes Natal', 'IPVA/Seguro', 'Manutenção Carro', 'Roupas Novas'];
    v_income_names text[] := ARRAY['Salário Mensal', 'Freelance', 'Dividendos', 'Venda Online', 'Reembolso'];
    
    v_current_names text[];
    v_prefix text;
BEGIN
    -- 1. Obter o primeiro usuário disponível (assumindo que você já criou uma conta via tela de login)
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Nenhum usuário encontrado. Por favor, crie uma conta na aplicação antes de rodar este script.';
    END IF;

    -- 2. Limpar dados anteriores deste usuário para evitar duplicidade e bagunça
    DELETE FROM transactions WHERE user_id = v_user_id;
    DELETE FROM envelopes WHERE user_id = v_user_id;

    -- 3. Loop para criar Envelopes e Transações
    FOR i IN 1..5 LOOP
        -- Selecionar a lista de nomes e prefixo baseado no tipo
        IF v_types[i] = 'fixed' THEN
            v_current_names := v_fixed_names;
            v_prefix := 'FIX';
        ELSIF v_types[i] = 'routine' THEN
            v_current_names := v_routine_names;
            v_prefix := 'ROT';
        ELSIF v_types[i] = 'investment' THEN
            v_current_names := v_investment_names;
            v_prefix := 'INV';
        ELSIF v_types[i] = 'temporary' THEN
            v_current_names := v_temporary_names;
            v_prefix := 'TMP';
        ELSE
            v_current_names := v_income_names;
            v_prefix := 'INC';
        END IF;

        -- Criar 5 envelopes para o tipo atual
        FOR j IN 1..5 LOOP
            v_env_name := v_current_names[j];
            v_env_code := v_prefix || j;

            -- Inserir Envelope
            INSERT INTO envelopes (user_id, code, name, type_slug, amount)
            VALUES (v_user_id, v_env_code, v_env_name, v_types[i], 0)
            RETURNING id INTO v_env_id;

            -- GERAR TRANSAÇÕES PARA ESTE ENVELOPE --
            
            -- Transação 1: Aporte Inicial (Crédito) - Entre R$ 1000 e R$ 3000
            v_deposit_amount := floor(random() * 2000 + 1000);
            
            INSERT INTO transactions (user_id, date, type, description, amount, envelope_id)
            VALUES (
                v_user_id, 
                CURRENT_DATE - (floor(random() * 30)::int), -- Data nos últimos 30 dias
                'credit', 
                'Aporte Inicial - ' || v_env_name, 
                v_deposit_amount, 
                v_env_id
            );

            -- Transação 2, 3 e 4: Gastos (Débito) - Apenas se não for do tipo 'income' ou 'investment' (opcional, mas vamos gerar para todos para garantir movimento)
            -- Gera 3 débitos aleatórios entre R$ 50 e R$ 200
            FOR k IN 1..3 LOOP
                v_expense_amount := floor(random() * 150 + 50);
                
                INSERT INTO transactions (user_id, date, type, description, amount, envelope_id)
                VALUES (
                    v_user_id, 
                    CURRENT_DATE - (floor(random() * 60)::int), -- Data nos últimos 60 dias
                    'debit', 
                    'Gasto em ' || v_env_name || ' #' || k, 
                    v_expense_amount, 
                    v_env_id
                );
            END LOOP;

        END LOOP;
    END LOOP;

    -- 4. Atualizar os saldos dos envelopes com base nas transações geradas
    -- O app calcula o saldo com base no histórico, mas é boa prática manter a coluna 'amount' sincronizada
    -- Saldo = Soma(Credits) - Soma(Debits)
    UPDATE envelopes e
    SET amount = (
        SELECT COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE -t.amount END), 0)
        FROM transactions t
        WHERE t.envelope_id = e.id
    )
    WHERE e.user_id = v_user_id;

END $$;