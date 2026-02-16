import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Navbar } from '../components/Navbar';
import { envelopeService } from '../services/envelopeService';
import { envelopeTypeService } from '../services/envelopeTypeService';
import { Envelope, EnvelopeTypeRecord } from '../types';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency } from '../utils/format';
import { Loader2, Pencil, Trash2, Eye, LayoutGrid, AlertTriangle, Wallet, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/Button';
import { EnvelopeModal } from '../components/EnvelopeModal';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';

type BalanceFilter = 'all' | 'zero' | 'positive' | 'negative';
const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50] as const;

const EnvelopeManagement: React.FC = () => {
  const { addToast } = useToast();
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [envelopeTypes, setEnvelopeTypes] = useState<EnvelopeTypeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEnvelope, setEditingEnvelope] = useState<Envelope | null>(null);
  const [deletingEnvelope, setDeletingEnvelope] = useState<Envelope | null>(null);
  const [viewingEnvelope, setViewingEnvelope] = useState<Envelope | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>('all');
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState(1);

  const typeNameMap = useMemo(() => {
    const m = new Map<string, string>();
    envelopeTypes.forEach((t) => m.set(t.id, t.name));
    return m;
  }, [envelopeTypes]);

  const { totalFiltered, totalPages, paginatedList } = useMemo(() => {
    const byBalance =
      balanceFilter === 'all'
        ? envelopes
        : envelopes.filter((env) => {
            const amt = Number(env.amount) || 0;
            if (balanceFilter === 'zero') return amt === 0;
            if (balanceFilter === 'positive') return amt > 0;
            return amt < 0;
          });
    const term = searchText.trim().toLowerCase();
    const bySearch = term
      ? byBalance.filter(
          (env) =>
            (env.code ?? '').toLowerCase().includes(term) ||
            (env.name ?? '').toLowerCase().includes(term) ||
            (typeNameMap.get(env.envelope_type_id) ?? '').toLowerCase().includes(term)
        )
      : byBalance;
    const sorted = [...bySearch].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'pt-BR'));
    const total = sorted.length;
    const pages = Math.ceil(total / pageSize) || 1;
    const start = (currentPage - 1) * pageSize;
    const paginated = sorted.slice(start, start + pageSize);
    return {
      totalFiltered: total,
      totalPages: pages,
      paginatedList: paginated,
    };
  }, [envelopes, balanceFilter, searchText, typeNameMap, pageSize, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, balanceFilter, pageSize]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const fetchTypes = useCallback(async () => {
    try {
      const data = await envelopeTypeService.getAll();
      setEnvelopeTypes(data ?? []);
    } catch (err) {
      console.error('[EnvelopeManagement] Erro ao buscar tipos:', err);
    }
  }, []);

  const fetchEnvelopes = useCallback(
    async (silent = false) => {
      if (!silent) {
        setIsLoading(true);
        setHasError(false);
      }
      try {
        const data = await envelopeService.getAll();
        setEnvelopes(data ?? []);
      } catch (err) {
        console.error('[EnvelopeManagement] Erro ao buscar envelopes:', err);
        if (silent) {
          addToast('Envelope salvo, mas a lista não pôde ser atualizada. Tente recarregar.', 'error');
        } else {
          setHasError(true);
          addToast('Não foi possível carregar os envelopes.', 'error');
        }
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [addToast]
  );

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  useEffect(() => {
    fetchEnvelopes();
  }, [fetchEnvelopes]);

  const handleDeleteClick = (env: Envelope) => {
    setDeletingEnvelope(env);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingEnvelope) return;
    if (Number(deletingEnvelope.amount) !== 0) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await envelopeService.delete(deletingEnvelope.id);
      addToast('Envelope excluído.', 'success');
      setDeletingEnvelope(null);
      fetchEnvelopes(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível excluir.';
      setDeleteError(message);
      addToast(message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const deletingEnvelopeBalanceNonZero = deletingEnvelope ? Number(deletingEnvelope.amount) !== 0 : false;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl text-primary-600 dark:text-primary-400 shadow-sm">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Gerenciar Envelopes
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Crie, edite e exclua envelopes para organizar seus gastos
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              setEditingEnvelope(null);
              setIsModalOpen(true);
            }}
            disabled={envelopeTypes.length === 0}
            title={envelopeTypes.length === 0 ? 'Cadastre tipos em Tipos de Envelope primeiro' : undefined}
          >
            Novo Envelope
          </Button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 animate-pulse">
              Carregando envelopes...
            </p>
          </div>
        ) : hasError ? (
          <div className="bg-white dark:bg-gray-800 p-12 rounded-2xl border border-red-100 dark:border-red-900/20 text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/10 rounded-full flex items-center justify-center mx-auto text-red-500">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Erro ao carregar dados
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Pode haver um problema de conexão ou permissão.
            </p>
            <Button variant="outline" onClick={() => fetchEnvelopes()}>
              Tentar Novamente
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <Input
                  id="envelope-search"
                  label="Buscar"
                  placeholder="Buscar por código, nome ou tipo"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  aria-label="Buscar por código, nome ou tipo"
                />
              </div>
              <div className="flex flex-col gap-1.5 w-full sm:w-48">
                <label htmlFor="balance-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Saldo
                </label>
                <select
                  id="balance-filter"
                  value={balanceFilter}
                  onChange={(e) => setBalanceFilter(e.target.value as BalanceFilter)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                >
                  <option value="all">Todos</option>
                  <option value="zero">Com valor zero</option>
                  <option value="positive">Com valor positivo</option>
                  <option value="negative">Com valor negativo</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <label htmlFor="page-size" className="text-sm text-gray-600 dark:text-gray-400">
                  Registros por página
                </label>
                <select
                  id="page-size"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm min-h-[44px]"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {totalFiltered === 0
                    ? '0 registros'
                    : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, totalFiltered)} de ${totalFiltered} registros`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  aria-label="Página anterior"
                  className="p-2 min-h-[44px]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages || totalPages === 0}
                  aria-label="Próxima página"
                  className="p-2 min-h-[44px]"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {envelopes.length === 0 ? (
              <div className="p-20 text-center flex flex-col items-center gap-4">
                <LayoutGrid className="w-12 h-12 text-gray-200 dark:text-gray-700" />
                <div className="space-y-1">
                  <p className="text-gray-500 dark:text-gray-400 font-medium">
                    Nenhum envelope encontrado.
                  </p>
                  <p className="text-xs text-gray-400">
                    Crie envelopes para distribuir seus lançamentos (ex.: Alimentação, Transporte).
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingEnvelope(null);
                    setIsModalOpen(true);
                  }}
                  className="mt-2"
                  disabled={envelopeTypes.length === 0}
                >
                  Criar Agora
                </Button>
              </div>
            ) : totalFiltered === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  Nenhum envelope encontrado para os filtros aplicados.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {paginatedList.map((env) => (
                  <div
                    key={env.id}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                          {env.code}
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {env.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {typeNameMap.get(env.envelope_type_id) ?? '—'}
                        </span>
                      </div>
                      <p
                        className={`text-sm font-medium mt-0.5 ${
                          (Number(env.amount) || 0) < 0
                            ? 'text-red-500 dark:text-red-400'
                            : (Number(env.amount) || 0) > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-gray-400'
                        }`}
                      >
                        {formatCurrency(Number(env.amount) || 0)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setViewingEnvelope(env)}
                        className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                        title="Ver detalhes"
                        aria-label="Ver detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEnvelope(env);
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                        title="Editar"
                        aria-label="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(env)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Excluir"
                        aria-label="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </>
        )}
      </main>

      <EnvelopeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchEnvelopes(true)}
        envelope={editingEnvelope}
        envelopeTypes={envelopeTypes}
      />

      <Modal
        isOpen={!!deletingEnvelope}
        onClose={() => !isDeleting && setDeletingEnvelope(null)}
        title="Excluir Envelope"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Saldo atual:{' '}
            <strong
              className={
                (Number(deletingEnvelope?.amount) || 0) < 0
                  ? 'text-red-500 dark:text-red-400'
                  : (Number(deletingEnvelope?.amount) || 0) > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : ''
              }
            >
              {formatCurrency(Number(deletingEnvelope?.amount) || 0)}
            </strong>
            . Só é possível excluir quando o saldo for zero.
          </p>
          {deletingEnvelopeBalanceNonZero && (
            <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
              Não é possível excluir: o envelope possui saldo diferente de zero. Transfira ou ajuste os lançamentos antes de excluir.
            </p>
          )}
          {deleteError && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {deleteError}
            </div>
          )}
          {!deletingEnvelopeBalanceNonZero && !deleteError && (
            <p className="text-gray-600 dark:text-gray-300">
              Tem certeza que deseja excluir o envelope <strong>{deletingEnvelope?.name}</strong>?
              Não é possível excluir se existirem lançamentos vinculados.
            </p>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => setDeletingEnvelope(null)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            {!deleteError && (
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConfirmDelete}
                isLoading={isDeleting}
                disabled={deletingEnvelopeBalanceNonZero}
              >
                Excluir
              </Button>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!viewingEnvelope}
        onClose={() => setViewingEnvelope(null)}
        title="Detalhes do Envelope"
      >
        {viewingEnvelope && (
          <div className="space-y-4">
            <dl className="grid grid-cols-1 gap-3 text-sm">
              <div>
                <dt className="text-gray-500 dark:text-gray-400 font-medium">Código</dt>
                <dd className="font-mono text-gray-900 dark:text-white">{viewingEnvelope.code}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400 font-medium">Nome</dt>
                <dd className="text-gray-900 dark:text-white">{viewingEnvelope.name}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400 font-medium">Tipo</dt>
                <dd className="text-gray-900 dark:text-white">
                  {typeNameMap.get(viewingEnvelope.envelope_type_id) ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400 font-medium">Saldo</dt>
                <dd
                  className={`font-medium ${
                    (Number(viewingEnvelope.amount) || 0) < 0
                      ? 'text-red-500 dark:text-red-400'
                      : (Number(viewingEnvelope.amount) || 0) > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {formatCurrency(Number(viewingEnvelope.amount) || 0)}
                </dd>
              </div>
              {viewingEnvelope.created_at && (
                <div>
                  <dt className="text-gray-500 dark:text-gray-400 font-medium">Criado em</dt>
                  <dd className="text-gray-900 dark:text-white">
                    {new Date(viewingEnvelope.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </dd>
                </div>
              )}
            </dl>
            <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
              <Button variant="ghost" onClick={() => setViewingEnvelope(null)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EnvelopeManagement;
