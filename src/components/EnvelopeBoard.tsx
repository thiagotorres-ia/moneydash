import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowRightLeft, Plus, Pencil, Trash2, LayoutGrid } from 'lucide-react';
import { Category, Envelope, EnvelopeTransferPayload, EnvelopeTypeRecord } from '../types';
import { formatCurrency } from '@/shared';
import { Button, Modal, Input, SearchableSelect } from '@/shared';
import { envelopeTypeService } from '../services/envelopeTypeService';

const BORDER_COLORS = [
  'border-blue-400 dark:border-blue-500',
  'border-emerald-400 dark:border-emerald-500',
  'border-purple-400 dark:border-purple-500',
  'border-indigo-400 dark:border-indigo-500',
  'border-teal-400 dark:border-teal-500',
  'border-amber-400 dark:border-amber-500',
];

// 8 colunas × 3 linhas = máximo 24 itens visíveis por página
const ITEMS_PER_PAGE = 24;

interface EnvelopeProps {
  envelope: Envelope;
  typeIndex: number;
  onEdit: (_envelope: Envelope) => void;
  onDelete: (_envelope: Envelope) => void;
}

const SortableEnvelopeCard: React.FC<EnvelopeProps> = ({
  envelope,
  typeIndex,
  onEdit,
  onDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: envelope.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : undefined,
  };

  const borderColor =
    BORDER_COLORS[typeIndex % BORDER_COLORS.length] ?? 'border-gray-400 dark:border-gray-500';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      title={`${envelope.code} - ${envelope.name}`}
      className={`
        bg-white dark:bg-gray-800 p-1.5 rounded-lg border-l-2 transition-all duration-200 group relative cursor-grab active:cursor-grabbing touch-none
        ${borderColor}
        ${isDragging 
          ? 'shadow-xl ring-2 ring-primary-500/20 scale-105 border-t border-r border-b border-gray-200 dark:border-gray-700' 
          : 'shadow-sm border-t border-r border-b border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
        }
      `}
    >
      <div className="flex justify-between items-start mb-0.5">
        <span className="text-[9px] font-mono font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 px-1 rounded select-none">
            {envelope.code}
        </span>

        <div className="flex gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(envelope);
            }}
            className="p-0.5 bg-gray-50 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300 cursor-pointer"
          >
            <Pencil className="w-2.5 h-2.5" />
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(envelope);
            }}
            className="p-0.5 bg-gray-50 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col h-full justify-between mt-0.5">
        <div>
          <h4 className="text-[11px] leading-tight font-medium text-gray-700 dark:text-gray-300 truncate pr-1 select-none pointer-events-none">
            {envelope.name}
          </h4>
          
          <p className={`text-xs font-bold mt-0.5 select-none pointer-events-none ${
            envelope.amount < 0 ? 'text-red-500' : envelope.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'
          }`}>
            {formatCurrency(envelope.amount)}
          </p>
        </div>
      </div>
    </div>
  );
};

interface EnvelopeBoardProps {
  envelopes: Envelope[];
  setEnvelopes: (_envelopes: Envelope[]) => void;
  categories: Category[];
  onTransfer: (_payload: EnvelopeTransferPayload) => Promise<void>;
  onCreateEnvelope: (_data: { code: string; name: string; envelope_type_id: string }) => void;
  onEditEnvelope: (_id: string, _code: string, _name: string, _envelope_type_id: string) => void;
  onDeleteEnvelope: (_id: string) => void;
  isCreating: boolean;
  isEditing: boolean;
  isDeleting: boolean;
  isTransferring: boolean;
}

const getDefaultTransferDate = () => new Date().toISOString().split('T')[0];

export const EnvelopeBoard: React.FC<EnvelopeBoardProps> = ({
  envelopes,
  setEnvelopes,
  categories,
  onTransfer,
  onCreateEnvelope,
  onEditEnvelope,
  onDeleteEnvelope,
  isCreating,
  isEditing,
  isDeleting,
  isTransferring,
}) => {
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferDate, setTransferDate] = useState(getDefaultTransferDate);
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferOriginCategoryId, setTransferOriginCategoryId] = useState('');
  const [transferOriginSubcategoryId, setTransferOriginSubcategoryId] = useState('');
  const [transferDestCategoryId, setTransferDestCategoryId] = useState('');
  const [transferDestSubcategoryId, setTransferDestSubcategoryId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [showTransferConfirmation, setShowTransferConfirmation] = useState(false);

  const [envelopeTypes, setEnvelopeTypes] = useState<EnvelopeTypeRecord[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEnvelope, setEditingEnvelope] = useState<Envelope | null>(null);
  const [envCode, setEnvCode] = useState('');
  const [envName, setEnvName] = useState('');
  const [envTypeId, setEnvTypeId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchEnvelopeTypes = useCallback(async () => {
    try {
      const types = await envelopeTypeService.getAll();
      setEnvelopeTypes(types);
      setEnvTypeId((prev) => (prev || types[0]?.id) ?? '');
    } catch (err) {
      console.error('[EnvelopeBoard] Erro ao buscar tipos:', err);
    }
  }, []);

  useEffect(() => {
    fetchEnvelopeTypes();
  }, [fetchEnvelopeTypes]);

  useEffect(() => {
    if (isTransferModalOpen) {
      setTransferDate(getDefaultTransferDate());
      setTransferFrom('');
      setTransferTo('');
      setTransferOriginCategoryId('');
      setTransferOriginSubcategoryId('');
      setTransferDestCategoryId('');
      setTransferDestSubcategoryId('');
      setTransferAmount('');
      setShowTransferConfirmation(false);
    }
  }, [isTransferModalOpen]);

  useEffect(() => {
    setTransferOriginSubcategoryId('');
  }, [transferOriginCategoryId]);

  useEffect(() => {
    setTransferDestSubcategoryId('');
  }, [transferDestCategoryId]);

  const [deletingEnvelope, setDeletingEnvelope] = useState<Envelope | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const typeOrderMap = useMemo(() => {
    const m = new Map<string, number>();
    envelopeTypes.forEach((t, i) => m.set(t.id, i));
    return m;
  }, [envelopeTypes]);

  // 1. Ordenação: primeiro por tipo (relative_order), depois por nome (alfabético pt-BR)
  const sortedEnvelopes = useMemo(() => {
    return [...envelopes].sort((a, b) => {
      const orderA = typeOrderMap.get(a.envelope_type_id) ?? 999;
      const orderB = typeOrderMap.get(b.envelope_type_id) ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  }, [envelopes, typeOrderMap]);

  // 2. Paginação: slice da lista ordenada para a página atual
  const sortedAndPaginatedEnvelopes = useMemo(() => {
    const startIndex = currentPage * ITEMS_PER_PAGE;
    return sortedEnvelopes.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedEnvelopes, currentPage]);

  const envelopesWithBalance = useMemo(
    () =>
      sortedEnvelopes.map((e) => ({
        ...e,
        name: `${e.name} (${formatCurrency(e.amount)})`,
      })),
    [sortedEnvelopes]
  );

  const sortedCategories = useMemo(
    () => [...(categories ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [categories]
  );

  const originSubcategories = useMemo(() => {
    if (!transferOriginCategoryId) return [];
    const cat = sortedCategories.find((c) => c.id === transferOriginCategoryId);
    const subs = cat?.sub_categories ?? [];
    return [...subs].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [transferOriginCategoryId, sortedCategories]);

  const destSubcategories = useMemo(() => {
    if (!transferDestCategoryId) return [];
    const cat = sortedCategories.find((c) => c.id === transferDestCategoryId);
    const subs = cat?.sub_categories ?? [];
    return [...subs].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [transferDestCategoryId, sortedCategories]);

  const totalPages = useMemo(
    () => Math.ceil(envelopes.length / ITEMS_PER_PAGE),
    [envelopes.length]
  );

  useEffect(() => {
    setCurrentPage(0);
  }, [envelopes.length]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = envelopes.findIndex((e) => e.id === active.id);
      const newIndex = envelopes.findIndex((e) => e.id === over?.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        setEnvelopes(arrayMove(envelopes, oldIndex, newIndex));
      }
    }
  };

  const openEditModal = (env: Envelope) => {
    setEditingEnvelope(env);
    setEnvCode(env.code);
    setEnvName(env.name);
    setEnvTypeId(env.envelope_type_id);
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingEnvelope(null);
    setEnvCode('');
    setEnvName('');
    setEnvTypeId(envelopeTypes[0]?.id ?? '');
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const DELETE_BALANCE_MESSAGE =
    'Não é possível excluir: o envelope possui saldo diferente de zero. Transfira ou ajuste os lançamentos antes de excluir.';

  const requestDelete = (env: Envelope) => {
    if (Number(env.amount) !== 0) {
      setDeleteError(DELETE_BALANCE_MESSAGE);
    } else {
      setDeleteError(null);
    }
    setDeletingEnvelope(env);
  };

  const confirmDelete = async () => {
    if (!deletingEnvelope) return;
    try {
      await onDeleteEnvelope(deletingEnvelope.id);
      setDeleteError(null);
      setDeletingEnvelope(null);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Não foi possível excluir.');
    }
  };

  const deletingEnvelopeBalanceNonZero = deletingEnvelope ? Number(deletingEnvelope.amount) !== 0 : false;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!envCode.trim() || !envName.trim() || !envTypeId) {
      setFormError('Preencha todos os campos.');
      return;
    }
    if (editingEnvelope) {
      await onEditEnvelope(editingEnvelope.id, envCode.trim(), envName.trim(), envTypeId);
    } else {
      await onCreateEnvelope({ code: envCode.trim(), name: envName.trim(), envelope_type_id: envTypeId });
    }
    setIsCreateModalOpen(false);
  };

  const handleTransferConferir = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmitTransfer && !insufficientBalance) {
      setShowTransferConfirmation(true);
    }
  };

  const executeTransfer = async () => {
    if (!transferFrom || !transferTo || !transferAmount) return;

    const amountNum = Number(transferAmount);
    if (amountNum <= 0) return;

    const originEnv = sortedEnvelopes.find((e) => e.id === transferFrom);
    if (originEnv && Number(originEnv.amount) < amountNum) return;

    try {
      await onTransfer({
        transferDate,
        originEnvelopeId: transferFrom,
        originCategoryId: transferOriginCategoryId || null,
        originSubcategoryId: transferOriginSubcategoryId || null,
        destEnvelopeId: transferTo,
        destCategoryId: transferDestCategoryId || null,
        destSubcategoryId: transferDestSubcategoryId || null,
        amount: amountNum,
      });
      setIsTransferModalOpen(false);
    } catch (err) {
      console.error('[EnvelopeBoard] Erro na transferência:', err);
    }
  };

  const canSubmitTransfer =
    transferFrom &&
    transferTo &&
    transferAmount &&
    Number(transferAmount) > 0 &&
    transferFrom !== transferTo;
  const originBalance = sortedEnvelopes.find((e) => e.id === transferFrom)?.amount ?? 0;
  const transferAmountNum = Number(transferAmount) || 0;
  const insufficientBalance = canSubmitTransfer && Number(originBalance) < transferAmountNum;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
        <div className="flex items-center gap-3">
           <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-indigo-100 dark:ring-indigo-800">
             <LayoutGrid className="w-6 h-6" />
           </div>
           <div className="flex flex-col">
             <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
               Distribuição de Lançamentos
             </h2>
             <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
               Arraste e organize seus envelopes de gastos
             </p>
           </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={openCreateModal}
              className="text-xs h-9 whitespace-nowrap flex-1 sm:flex-none"
              disabled={envelopeTypes.length === 0}
              title={envelopeTypes.length === 0 ? 'Cadastre um tipo em Tipos de Envelope primeiro' : undefined}
            >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Novo Envelope
            </Button>
            <Button variant="outline" onClick={() => setIsTransferModalOpen(true)} className="text-xs h-9 whitespace-nowrap flex-1 sm:flex-none">
                <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
                Transferir
            </Button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortedAndPaginatedEnvelopes} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5">
            {sortedAndPaginatedEnvelopes.map((env) => (
              <SortableEnvelopeCard
                key={env.id}
                envelope={env}
                typeIndex={typeOrderMap.get(env.envelope_type_id) ?? 0}
                onEdit={openEditModal}
                onDelete={requestDelete}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setCurrentPage(p => p - 1)}
            disabled={currentPage === 0}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            type="button"
          >
            ← Anterior
          </button>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Página {currentPage + 1} de {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => p + 1)}
            disabled={currentPage === totalPages - 1}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            type="button"
          >
            Próxima →
          </button>
        </div>
      )}

      {/* Transfer Modal */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => !isTransferring && setIsTransferModalOpen(false)}
        title="Transferência entre Envelopes"
      >
        {showTransferConfirmation ? (
          <div className="space-y-6">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Deseja realmente transferir o valor <strong>{formatCurrency(transferAmountNum)}</strong> de{' '}
              <strong>
                {sortedEnvelopes.find((e) => e.id === transferFrom)?.code} - {sortedEnvelopes.find((e) => e.id === transferFrom)?.name}
              </strong>{' '}
              para{' '}
              <strong>
                {sortedEnvelopes.find((e) => e.id === transferTo)?.code} - {sortedEnvelopes.find((e) => e.id === transferTo)?.name}
              </strong>
              ?
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => setShowTransferConfirmation(false)} disabled={isTransferring}>
                Voltar
              </Button>
              <Button type="button" onClick={executeTransfer} disabled={isTransferring} isLoading={isTransferring}>
                Confirmar
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleTransferConferir} className="space-y-5">
            {/* Bloco 1 - Dados da Transferência */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 p-4 sm:p-5 space-y-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Dados da Transferência</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Data"
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  required
                  id="transfer-date"
                  disabled={isTransferring}
                />
                <Input
                  label="Valor (R$)"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="0,00"
                  required
                  id="transfer-amount"
                  disabled={isTransferring}
                />
              </div>
            </div>

            {/* Bloco 2 - Dados de Origem */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 p-4 sm:p-5 space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Dados de Origem</h4>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Envelope Origem</label>
                <SearchableSelect
                  options={envelopesWithBalance}
                  value={transferFrom}
                  onChange={setTransferFrom}
                  placeholder="Pesquisar envelope de saída..."
                  disabled={isTransferring}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="transfer-origin-category" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Categoria Origem (opcional)
                </label>
                <select
                  id="transfer-origin-category"
                  value={transferOriginCategoryId}
                  onChange={(e) => setTransferOriginCategoryId(e.target.value)}
                  disabled={isTransferring}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none cursor-pointer transition-colors duration-200"
                  aria-label="Categoria de origem"
                >
                  <option value="">Sem categoria</option>
                  {sortedCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="transfer-origin-subcategory" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Subcategoria Origem (opcional)
                </label>
                <select
                  id="transfer-origin-subcategory"
                  value={transferOriginSubcategoryId}
                  onChange={(e) => setTransferOriginSubcategoryId(e.target.value)}
                  disabled={isTransferring || !transferOriginCategoryId}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none cursor-pointer disabled:opacity-50 transition-colors duration-200"
                  aria-label="Subcategoria de origem"
                >
                  <option value="">Sem categoria</option>
                  {originSubcategories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bloco 3 - Dados de Destino */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 p-4 sm:p-5 space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Dados de Destino</h4>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Envelope Destino</label>
                <SearchableSelect
                  options={envelopesWithBalance.filter((e) => e.id !== transferFrom)}
                  value={transferTo}
                  onChange={setTransferTo}
                  placeholder="Pesquisar envelope de destino..."
                  disabled={isTransferring}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="transfer-dest-category" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Categoria Destino (opcional)
                </label>
                <select
                  id="transfer-dest-category"
                  value={transferDestCategoryId}
                  onChange={(e) => setTransferDestCategoryId(e.target.value)}
                  disabled={isTransferring}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none cursor-pointer transition-colors duration-200"
                  aria-label="Categoria de destino"
                >
                  <option value="">Sem categoria</option>
                  {sortedCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="transfer-dest-subcategory" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Subcategoria Destino (opcional)
                </label>
                <select
                  id="transfer-dest-subcategory"
                  value={transferDestSubcategoryId}
                  onChange={(e) => setTransferDestSubcategoryId(e.target.value)}
                  disabled={isTransferring || !transferDestCategoryId}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none cursor-pointer disabled:opacity-50 transition-colors duration-200"
                  aria-label="Subcategoria de destino"
                >
                  <option value="">Sem categoria</option>
                  {destSubcategories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {insufficientBalance && (
              <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                Saldo insuficiente no envelope de origem.
              </p>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsTransferModalOpen(false)} disabled={isTransferring}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!canSubmitTransfer || insufficientBalance || isTransferring}
              >
                Conferir
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Create / Edit Envelope Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => !isCreating && !isEditing && setIsCreateModalOpen(false)}
        title={editingEnvelope ? "Editar Envelope" : "Novo Envelope"}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label htmlFor="envelope-type-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tipo do Envelope
              </label>
              <select
                id="envelope-type-select"
                value={envTypeId}
                onChange={(e) => setEnvTypeId(e.target.value)}
                required
                disabled={isCreating || isEditing || envelopeTypes.length === 0}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                aria-label="Selecione o tipo do envelope"
              >
                {envelopeTypes.length === 0 ? (
                  <option value="">Cadastre tipos em Gerenciar Tipos de Envelope</option>
                ) : (
                  envelopeTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <Input label="Código" placeholder="Ex: ALIM" value={envCode} onChange={(e) => setEnvCode(e.target.value.toUpperCase())} required maxLength={6} disabled={isCreating || isEditing} />
            <Input label="Nome do Envelope" placeholder="Ex: Alimentação" value={envName} onChange={(e) => setEnvName(e.target.value)} required disabled={isCreating || isEditing} />
            {formError && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/10 p-2 rounded">{formError}</div>}
            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
                <Button type="submit" isLoading={isCreating || isEditing}>Confirmar</Button>
            </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={!!deletingEnvelope} onClose={() => !isDeleting && setDeletingEnvelope(null)} title="Excluir Envelope">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Saldo atual: <strong>{formatCurrency(Number(deletingEnvelope?.amount) || 0)}</strong>.
            Só é possível excluir quando o saldo for zero.
          </p>
          {deletingEnvelopeBalanceNonZero && (
            <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
              {DELETE_BALANCE_MESSAGE}
            </p>
          )}
          {deleteError && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-300 text-sm">{deleteError}</div>
          )}
          {!deletingEnvelopeBalanceNonZero && !deleteError && (
            <p className="text-gray-600 dark:text-gray-300">Tem certeza que deseja excluir o envelope <strong>{deletingEnvelope?.name}</strong>?</p>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setDeletingEnvelope(null)} disabled={isDeleting}>Fechar</Button>
            {!deleteError && (
              <Button className="bg-red-600 text-white" onClick={confirmDelete} isLoading={isDeleting} disabled={deletingEnvelopeBalanceNonZero}>
                Excluir
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
