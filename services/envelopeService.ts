
import { supabase } from '../lib/supabase';
import { Envelope, EnvelopeType } from '../types';
import { transactionService } from './transactionService';

export const envelopeService = {
  async getAll() {
    const { data, error } = await supabase
      .from('envelopes')
      .select('*')
      .order('code', { ascending: true });
    
    if (error) throw error;
    
    return data.map((env: any) => ({
      id: env.id,
      user_id: env.user_id,
      code: env.code,
      name: env.name,
      amount: env.amount,
      type: env.type_slug as EnvelopeType,
      created_at: env.created_at
    })) as Envelope[];
  },

  async create(envelope: Omit<Envelope, 'id' | 'user_id' | 'created_at'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('envelopes')
      .insert([{
        user_id: user.id,
        code: envelope.code,
        name: envelope.name,
        type_slug: envelope.type,
        amount: envelope.amount || 0
      }])
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      amount: data.amount,
      type: data.type_slug as EnvelopeType
    };
  },

  async update(id: string, envelope: Partial<Envelope>) {
    const updates: any = {};
    if (envelope.code) updates.code = envelope.code;
    if (envelope.name) updates.name = envelope.name;
    if (envelope.type) updates.type_slug = envelope.type;

    const { error } = await supabase
      .from('envelopes')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('envelopes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Transfere saldo entre envelopes.
   * Cria dois lançamentos para garantir que o saldo seja recalculado corretamente e haja histórico.
   */
  async transfer(fromId: string, toId: string, amount: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data: envs } = await supabase
      .from('envelopes')
      .select('id, name, code')
      .in('id', [fromId, toId]);

    const fromEnv = envs?.find(e => e.id === fromId);
    const toEnv = envs?.find(e => e.id === toId);

    if (!fromEnv || !toEnv) throw new Error('Envelopes não encontrados');

    const today = new Date().toISOString().split('T')[0];

    // 1. Cria a transação de DÉBITO no envelope de origem
    await transactionService.create({
      date: today,
      type: 'debit',
      description: `Transferência PARA: ${toEnv.code} - ${toEnv.name}`,
      amount: amount,
      envelopeId: fromId
    });

    // 2. Cria a transação de CRÉDITO no envelope de destino
    await transactionService.create({
      date: today,
      type: 'credit',
      description: `Transferência DE: ${fromEnv.code} - ${fromEnv.name}`,
      amount: amount,
      envelopeId: toId
    });
    
    // O transactionService.create já chama internamente o _syncEnvelopeBalance para cada envelope.
  }
};
