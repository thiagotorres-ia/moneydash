import { supabase } from '../lib/supabase';
import { Transaction } from '../types';

export const transactionService = {
  async _syncEnvelopeBalance(envelopeId: string | null) {
    if (!envelopeId) return;

    const { data, error } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('envelope_id', envelopeId);

    if (error) {
      console.error(`❌ Erro ao buscar transações para sincronização do envelope ${envelopeId}:`, error);
      return;
    }

    const newBalance = (data || []).reduce((acc, tx) => {
      const val = Number(tx.amount) || 0;
      return tx.type === 'credit' ? acc + val : acc - val;
    }, 0);

    const finalBalance = Math.round(newBalance * 100) / 100;

    const { error: updateError } = await supabase
      .from('envelopes')
      .update({ amount: finalBalance })
      .eq('id', envelopeId);
      
    if (updateError) {
      console.error(`❌ Erro ao atualizar saldo do envelope ${envelopeId}:`, updateError);
    }
  },

  async getAll() {
    try {
      const pageSize = 1000;
      const allRows: any[] = [];
      let from = 0;

      while (true) {
        const to = from + pageSize - 1;
        const { data, error } = await supabase
          .from('transactions')
          .select('id, user_id, date, type, description, amount, envelope_id, created_at')
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .range(from, to);

        if (error) throw error;
        const page = data || [];
        allRows.push(...page);
        if (page.length < pageSize) break;
        from += pageSize;
      }

      return allRows.map((tx: any) => ({
        id: tx.id,
        user_id: tx.user_id,
        date: tx.date,
        type: tx.type,
        description: tx.description,
        amount: tx.type === 'debit' ? -Math.abs(Number(tx.amount)) : Math.abs(Number(tx.amount)),
        envelopeId: (tx.envelope_id != null && tx.envelope_id !== '') ? tx.envelope_id : null,
        created_at: tx.created_at
      })) as Transaction[];
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
      return [];
    }
  },

  async create(transaction: Omit<Transaction, 'id' | 'user_id' | 'created_at'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const absAmount = Math.abs(Number(transaction.amount));

    const { data, error } = await supabase
      .from('transactions')
      .insert([{
        user_id: user.id,
        date: transaction.date,
        type: transaction.type,
        description: transaction.description,
        amount: absAmount,
        envelope_id: transaction.envelopeId || null
      }])
      .select('*')
      .single();

    if (error) throw error;

    if (data.envelope_id) {
      await this._syncEnvelopeBalance(data.envelope_id);
    }

    return {
      id: data.id,
      date: data.date,
      type: data.type,
      description: data.description,
      amount: data.type === 'debit' ? -Number(data.amount) : Number(data.amount),
      envelopeId: data.envelope_id
    } as Transaction;
  },

  async update(id: string, transaction: Partial<Omit<Transaction, 'id' | 'user_id' | 'created_at'>>) {
    const { data: oldTx } = await supabase
        .from('transactions')
        .select('envelope_id')
        .eq('id', id)
        .single();

    const absAmount = transaction.amount !== undefined ? Math.abs(Number(transaction.amount)) : undefined;

    const { data, error } = await supabase
      .from('transactions')
      .update({
        date: transaction.date,
        type: transaction.type,
        description: transaction.description,
        amount: absAmount,
        envelope_id: transaction.envelopeId
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    const envelopesToSync = new Set<string>();
    if (oldTx?.envelope_id) envelopesToSync.add(oldTx.envelope_id);
    if (data.envelope_id) envelopesToSync.add(data.envelope_id);
    
    for (const envId of envelopesToSync) {
      await this._syncEnvelopeBalance(envId);
    }

    return {
      id: data.id,
      date: data.date,
      type: data.type,
      description: data.description,
      amount: data.type === 'debit' ? -Number(data.amount) : Number(data.amount),
      envelopeId: data.envelope_id
    } as Transaction;
  },

  async delete(id: string) {
    const { data: tx, error: fetchError } = await supabase
        .from('transactions')
        .select('envelope_id')
        .eq('id', id)
        .maybeSingle(); 

    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) throw error;

    if (tx && tx.envelope_id) {
      await this._syncEnvelopeBalance(tx.envelope_id);
    }
  },

  async bulkDelete(ids: string[]) {
    console.log('🔥 transactionService.bulkDelete CHAMADO com:', ids);
    if (!ids || ids.length === 0) return;

    const { data: txs, error: fetchError } = await supabase
        .from('transactions')
        .select('envelope_id')
        .in('id', ids);

    if (fetchError) {
      console.error('❌ Erro ao buscar envelopes para bulk delete:', fetchError);
      throw fetchError;
    }

    const envelopesToRefresh = new Set<string>();
    txs?.forEach(t => { if (t.envelope_id) envelopesToRefresh.add(t.envelope_id); });

    const { error } = await supabase
      .from('transactions')
      .delete()
      .in('id', ids);

    if (error) {
      console.error('❌ Erro no Supabase ao deletar em massa:', error);
      throw error;
    }

    for (const envId of envelopesToRefresh) {
      await this._syncEnvelopeBalance(envId);
    }
    console.log('✅ transactionService.bulkDelete: executado com sucesso');
  },

  async updateEnvelope(transactionId: string, newEnvelopeId: string | null) {
    const { data: oldTx } = await supabase
        .from('transactions')
        .select('envelope_id')
        .eq('id', transactionId)
        .maybeSingle();
    
    const oldEnvelopeId = oldTx?.envelope_id;

    const { error } = await supabase
      .from('transactions')
      .update({ envelope_id: newEnvelopeId || null })
      .eq('id', transactionId);

    if (error) throw error;

    const syncs = [];
    if (oldEnvelopeId) syncs.push(this._syncEnvelopeBalance(oldEnvelopeId));
    if (newEnvelopeId && newEnvelopeId !== oldEnvelopeId) syncs.push(this._syncEnvelopeBalance(newEnvelopeId));
    await Promise.all(syncs);
  },

  async bulkUpdateEnvelope(transactionIds: string[], targetEnvelopeId: string | null) {
    console.log('📝 transactionService.bulkUpdateEnvelope CHAMADO com:', { transactionIds, targetEnvelopeId });
    if (!transactionIds || transactionIds.length === 0) return;

    const { data: originalTransactions, error: fetchError } = await supabase
        .from('transactions')
        .select('envelope_id')
        .in('id', transactionIds);

    if (fetchError) {
      console.error('❌ Erro ao buscar envelopes para bulk update:', fetchError);
      throw fetchError;
    }

    const envelopesToRefresh = new Set<string>();
    originalTransactions?.forEach(tx => {
      if (tx.envelope_id) envelopesToRefresh.add(tx.envelope_id);
    });

    if (targetEnvelopeId) {
      envelopesToRefresh.add(targetEnvelopeId);
    }

    const { error: updateError } = await supabase
        .from('transactions')
        .update({ envelope_id: targetEnvelopeId || null })
        .in('id', transactionIds);

    if (updateError) {
      console.error('❌ Erro no Supabase ao atualizar em massa:', updateError);
      throw updateError;
    }

    const refreshPromises = Array.from(envelopesToRefresh).map(envId => 
      this._syncEnvelopeBalance(envId)
    );

    await Promise.all(refreshPromises);
    console.log('✅ transactionService.bulkUpdateEnvelope: executado com sucesso');
  }
};