import { supabase } from '@/shared';
import type { EnvelopeTransferLogEntry } from '../types';

const COLS = [
  'id',
  'user_id',
  'transfer_date',
  'origin_envelope_id',
  'origin_category_id',
  'origin_subcategory_id',
  'dest_envelope_id',
  'dest_category_id',
  'dest_subcategory_id',
  'amount',
  'created_at',
].join(', ');

/**
 * Busca registros de envelope_transfer_log no período (transfer_date entre dateFrom e dateTo).
 * RLS restringe ao usuário logado. Usado pelo relatório de gastos por categoria.
 */
export async function getInPeriod(
  dateFrom: string,
  dateTo: string
): Promise<EnvelopeTransferLogEntry[]> {
  const { data, error } = await supabase
    .from('envelope_transfer_log')
    .select(COLS)
    .gte('transfer_date', dateFrom)
    .lte('transfer_date', dateTo)
    .order('transfer_date', { ascending: false });

  if (error) {
    console.error('[transferLogService.getInPeriod]:', error.message);
    throw error;
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    user_id: row.user_id as string,
    transfer_date: row.transfer_date as string,
    origin_envelope_id: row.origin_envelope_id as string,
    origin_category_id: row.origin_category_id as string | null,
    origin_subcategory_id: row.origin_subcategory_id as string | null,
    dest_envelope_id: row.dest_envelope_id as string,
    dest_category_id: row.dest_category_id as string | null,
    dest_subcategory_id: row.dest_subcategory_id as string | null,
    amount: Number(row.amount) || 0,
    created_at: row.created_at as string,
  }));
}
