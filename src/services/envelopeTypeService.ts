import { supabase } from '@/shared';
import { EnvelopeTypeRecord } from '../types';

function toUserFriendlyError(error: { message?: string; code?: string }): Error {
  const msg = error?.message ?? '';
  const code = error?.code ?? '';
  const isRls =
    code === '42501' ||
    msg.toLowerCase().includes('row-level security') ||
    msg.toLowerCase().includes('row level security') ||
    msg.toLowerCase().includes('policy');
  if (isRls) {
    return new Error(
      'Permissão negada. Verifique se as políticas RLS da tabela envelope_types estão configuradas (execute sql/004_envelope_types_rls_policies.sql no Supabase).'
    );
  }
  if (code === '23505') {
    return new Error('Já existe um tipo com esse nome ou ordem. Altere o nome ou a ordem.');
  }
  if (code === '23502') {
    return new Error('Preencha o nome do tipo.');
  }
  if (code === '22P02') {
    return new Error('Dados inválidos. Verifique o formulário.');
  }
  return new Error(msg || 'Erro ao processar operação.');
}

function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export const envelopeTypeService = {
  async getAll(): Promise<EnvelopeTypeRecord[]> {
    const { data, error } = await supabase
      .from('envelope_types')
      .select('id, name, slug, relative_order')
      .order('relative_order', { ascending: true });

    if (error) throw error;
    return (data ?? []) as EnvelopeTypeRecord[];
  },

  async create(name: string): Promise<EnvelopeTypeRecord> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Nome é obrigatório.');

    const { data: existing } = await supabase
      .from('envelope_types')
      .select('relative_order')
      .order('relative_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = existing?.relative_order != null ? existing.relative_order + 1 : 0;
    const slug = slugFromName(trimmed);

    const { data, error } = await supabase
      .from('envelope_types')
      .insert([{ name: trimmed, slug, relative_order: nextOrder }])
      .select('id, name, slug, relative_order')
      .single();

    if (error) {
      console.error('[envelopeTypeService.create]:', error);
      throw toUserFriendlyError(error);
    }
    return data as EnvelopeTypeRecord;
  },

  async update(id: string, payload: { name?: string }): Promise<void> {
    const updates: Record<string, unknown> = {};
    if (payload.name != null) {
      const trimmed = payload.name.trim();
      if (!trimmed) throw new Error('Nome é obrigatório.');
      updates.name = trimmed;
      updates.slug = slugFromName(trimmed);
    }

    if (Object.keys(updates).length === 0) return;

    const { error } = await supabase
      .from('envelope_types')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('[envelopeTypeService.update]:', error);
      throw toUserFriendlyError(error);
    }
  },

  async updateOrder(orderedIds: string[]): Promise<void> {
    const offset = 1000;
    // Passo 1: atualizar todos para relative_order temporário (índice + offset) para evitar duplicata durante os UPDATEs (constraint UNIQUE em relative_order).
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase
        .from('envelope_types')
        .update({ relative_order: i + offset })
        .eq('id', orderedIds[i]);

      if (error) {
        console.error('[envelopeTypeService.updateOrder]:', error);
        throw toUserFriendlyError(error);
      }
    }
    // Passo 2: atualizar todos para a ordem final (0, 1, 2, ...).
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase
        .from('envelope_types')
        .update({ relative_order: i })
        .eq('id', orderedIds[i]);

      if (error) {
        console.error('[envelopeTypeService.updateOrder]:', error);
        throw toUserFriendlyError(error);
      }
    }
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('envelope_types').delete().eq('id', id);

    if (error) {
      if (error.code === '23503') {
        throw new Error('Não é possível excluir: existem envelopes vinculados a este tipo.');
      }
      console.error('[envelopeTypeService.delete]:', error);
      throw toUserFriendlyError(error);
    }
  },
};
