
import { createClient } from '@supabase/supabase-js';

// Em um ambiente de produção real, estas variáveis estariam em um arquivo .env
// e não hardcoded no código. Como estamos usando um ambiente simulado de arquivo único,
// usaremos as constantes fornecidas.

const SUPABASE_URL = 'https://zgqcjrqpxlblywmprqhb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o3rcSemTpbrYtZTXOV9Gcg_pFwrJ8pd';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
