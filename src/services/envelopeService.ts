import { supabase } from '../lib/supabase';
import { Envelope } from '../types';
import { transactionService } from './transactionService';

/** Mapeia erros do Supabase/Postgres para mensagens amigáveis (crud-standard: 400, 403, 404, 409, 500). */
function toUserFriendlyError(error: { message?: string; code?: string; details?: string }): Error {
  const msg = error?.message ?? '';
  const code = error?.code ?? '';

  // 42501 = RLS policy violation
  if (
    code === '42501' ||
    msg.toLowerCase().includes('row-level security') ||
    msg.toLowerCase().includes('row level security') ||
    msg.toLowerCase().includes('policy')
  ) {
    return new Error(
      'Permissão negada. Verifique as políticas RLS da tabela envelopes no Supabase (INSERT permitido para o usuário logado).'
    );
  }

  // 23503 = Foreign key violation (ex.: envelope_type_id inválido)
  if (code === '23503') {
    if (msg.includes('envelope_type')) {
      return new Error('Tipo de envelope inválido. Selecione um tipo da lista ou cadastre um em Tipos de Envelope.');
    }
    return new Error('Dados vinculados inválidos. Verifique o tipo do envelope.');
  }

  // 23505 = Unique violation (ex.: código duplicado)
  if (code === '23505') {
    return new Error('Já existe um envelope com este código. Use outro código.');
  }

  // 23502 = Not null violation
  if (code === '23502') {
    return new Error('Preencha todos os campos obrigatórios: código, nome e tipo de envelope.');
  }

  // 22P02 = Invalid UUID (ex.: envelope_type_id malformado)
  if (code === '22P02') {
    return new Error('Tipo de envelope inválido. Selecione um tipo da lista.');
  }

  // Mensagem do servidor quando existir; senão genérica
  return new Error(msg?.trim() || 'Erro ao salvar envelope. Tente novamente.');
}

export const envelopeService = {
  async getAll() {
    const { data, error } = await supabase
      .from('envelopes')
      .select('id, user_id, code, name, amount, envelope_type_id, created_at')
      .order('code', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((env: Record<string, unknown>) => ({
      id: env.id,
      user_id: env.user_id,
      code: env.code,
      name: env.name,
      amount: env.amount,
      envelope_type_id: env.envelope_type_id,
      envelope_type_name: undefined,
      created_at: env.created_at,
    })) as Envelope[];
  },

  async getById(id: string): Promise<Envelope | null> {
    const { data, error } = await supabase
      .from('envelopes')
      .select('id, user_id, code, name, amount, envelope_type_id, created_at')
      .eq('id', id)
      .maybeSingle();
    if (error) throw toUserFriendlyError(error);
    if (!data) return null;
    return {
      id: data.id,
      user_id: data.user_id,
      code: data.code,
      name: data.name,
      amount: data.amount ?? 0,
      envelope_type_id: data.envelope_type_id ?? '',
      envelope_type_name: undefined,
      created_at: data.created_at,
    } as Envelope;
  },

  async create(envelope: Omit<Envelope, 'id' | 'user_id' | 'created_at' | 'envelope_type_name'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const code = envelope.code?.trim();
    const name = envelope.name?.trim();
    const envelopeTypeId = envelope.envelope_type_id?.trim();
    if (!code || !name) throw new Error('Preencha o código e o nome do envelope.');
    if (!envelopeTypeId) throw new Error('Selecione um tipo de envelope.');

    const { data: typeData, error: typeError } = await supabase
      .from('envelope_types')
      .select('slug')
      .eq('id', envelopeTypeId)
      .maybeSingle();
    if (typeError) throw toUserFriendlyError(typeError);
    if (!typeData?.slug) throw new Error('Tipo de envelope não encontrado.');

    const insertPayload: Record<string, unknown> = {
      user_id: user.id,
      code,
      name,
      envelope_type_id: envelopeTypeId,
      amount: envelope.amount ?? 0,
      type_slug: typeData.slug,
    };

    const { data, error } = await supabase
      .from('envelopes')
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      console.error('[envelopeService.create]:', error);
      throw toUserFriendlyError(error);
    }
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      amount: data.amount,
      envelope_type_id: data.envelope_type_id,
    };
  },

  async update(id: string, envelope: Partial<Pick<Envelope, 'code' | 'name' | 'envelope_type_id'>>) {
    const updates: Record<string, unknown> = {};
    if (envelope.code != null) updates.code = envelope.code;
    if (envelope.name != null) updates.name = envelope.name;
    if (envelope.envelope_type_id != null) {
      updates.envelope_type_id = envelope.envelope_type_id;
      const { data: typeData, error: typeError } = await supabase
        .from('envelope_types')
        .select('slug')
        .eq('id', envelope.envelope_type_id)
        .maybeSingle();
      if (typeError) throw toUserFriendlyError(typeError);
      updates.type_slug = typeData?.slug ?? null;
    } else if (envelope.envelope_type_id === null) {
      updates.envelope_type_id = null;
      updates.type_slug = null;
    }

    if (Object.keys(updates).length === 0) return;

    const { error } = await supabase.from('envelopes').update(updates).eq('id', id);

    if (error) {
      console.error('[envelopeService.update]:', error);
      throw toUserFriendlyError(error);
    }
  },

  async delete(id: string) {
    const envelope = await this.getById(id);
    if (!envelope) {
      throw new Error('Envelope não encontrado.');
    }
    if (Number(envelope.amount) !== 0) {
      throw new Error(
        'Não é possível excluir: o envelope possui saldo diferente de zero. Transfira ou ajuste os lançamentos antes de excluir.'
      );
    }

    const { error } = await supabase
      .from('envelopes')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '23503') {
        throw new Error('Não é possível excluir: existem lançamentos vinculados a este envelope.');
      }
      console.error('[envelopeService.delete]:', error);
      throw toUserFriendlyError(error);
    }
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
