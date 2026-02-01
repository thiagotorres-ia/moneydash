import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Navbar } from '../components/Navbar';
import { envelopeTypeService } from '../services/envelopeTypeService';
import { EnvelopeTypeRecord } from '../types';
import { useToast } from '../contexts/ToastContext';
import { Loader2, Pencil, Trash2, Layers, GripVertical, AlertTriangle, Tag } from 'lucide-react';
import { Button } from '../components/Button';
import { EnvelopeTypeModal } from '../components/EnvelopeTypeModal';
import { Modal } from '../components/Modal';

interface SortableTypeRowProps {
  item: EnvelopeTypeRecord;
  onEdit: (item: EnvelopeTypeRecord) => void;
  onDelete: (item: EnvelopeTypeRecord) => void;
}

const SortableTypeRow: React.FC<SortableTypeRowProps> = ({ item, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
    >
      <button
        type="button"
        className="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-grab active:cursor-grabbing touch-none"
        aria-label="Arrastar para reordenar"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-5 h-5" />
      </button>
      <span className="flex-1 font-medium text-gray-900 dark:text-white">{item.name}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
          title="Editar"
          aria-label="Editar tipo"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(item)}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          title="Excluir"
          aria-label="Excluir tipo"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const EnvelopeTypeManagement: React.FC = () => {
  const { addToast } = useToast();
  const [types, setTypes] = useState<EnvelopeTypeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<EnvelopeTypeRecord | null>(null);
  const [deletingType, setDeletingType] = useState<EnvelopeTypeRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [draftOrder, setDraftOrder] = useState<EnvelopeTypeRecord[]>([]);

  const fetchTypes = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setIsLoading(true);
      setHasError(false);
    }
    try {
      const data = await envelopeTypeService.getAll();
      setTypes(data ?? []);
      setIsEditingOrder(false);
      setDraftOrder([]);
    } catch (err) {
      console.error('[EnvelopeTypeManagement] Erro ao buscar tipos:', err);
      if (!isSilent) setHasError(true);
      addToast('Não foi possível carregar os tipos de envelope.', 'error');
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id === over?.id) return;

    const currentList = isEditingOrder ? draftOrder : types;
    const oldIndex = currentList.findIndex((t) => t.id === active.id);
    const newIndex = currentList.findIndex((t) => t.id === over?.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(currentList, oldIndex, newIndex);
    if (isEditingOrder) {
      setDraftOrder(reordered);
    } else {
      setTypes(reordered);
    }
  };

  const handleSaveOrder = async () => {
    const listToSave = isEditingOrder ? draftOrder : types;
    if (listToSave.length === 0) return;
    setIsReordering(true);
    try {
      await envelopeTypeService.updateOrder(listToSave.map((t) => t.id));
      addToast('Ordem atualizada!', 'success');
      setIsEditingOrder(false);
      setDraftOrder([]);
      await fetchTypes(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar ordem.';
      addToast(message, 'error');
    } finally {
      setIsReordering(false);
    }
  };

  const handleCancelEditOrder = () => {
    setIsEditingOrder(false);
    setDraftOrder([]);
    fetchTypes(true);
  };

  const handleDeleteClick = (item: EnvelopeTypeRecord) => {
    setDeletingType(item);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingType) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await envelopeTypeService.delete(deletingType.id);
      addToast('Tipo excluído.', 'success');
      setDeletingType(null);
      fetchTypes(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível excluir.';
      setDeleteError(message);
      addToast(message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl text-primary-600 dark:text-primary-400 shadow-sm">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Gerenciar Tipos de Envelope
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Organize os tipos usados nos envelopes
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              setEditingType(null);
              setIsModalOpen(true);
            }}
          >
            Novo tipo
          </Button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 animate-pulse">
              Carregando tipos...
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
            <Button variant="outline" onClick={fetchTypes}>
              Tentar Novamente
            </Button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {types.length > 0 && (
              <div className="flex justify-end gap-2 p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                {isEditingOrder ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleCancelEditOrder}
                      disabled={isReordering}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveOrder} isLoading={isReordering}>
                      Salvar ordem
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => {
                    setIsEditingOrder(true);
                    setDraftOrder([...types]);
                  }}>
                    Editar ordem
                  </Button>
                )}
              </div>
            )}
            {types.length === 0 ? (
              <div className="p-20 text-center flex flex-col items-center gap-4">
                <Tag className="w-12 h-12 text-gray-200 dark:text-gray-700" />
                <div className="space-y-1">
                  <p className="text-gray-500 dark:text-gray-400 font-medium">
                    Nenhum tipo de envelope encontrado.
                  </p>
                  <p className="text-xs text-gray-400">
                    Comece criando seu primeiro tipo (ex: Rotina, Receitas, Investimentos).
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingType(null);
                    setIsModalOpen(true);
                  }}
                  className="mt-2"
                >
                  Criar Agora
                </Button>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={isEditingOrder ? draftOrder : types}
                  strategy={verticalListSortingStrategy}
                >
                  <div className={isReordering ? 'opacity-70 pointer-events-none' : ''}>
                    {(isEditingOrder ? draftOrder : types).map((item) => (
                      <SortableTypeRow
                        key={item.id}
                        item={item}
                        isEditingOrder={isEditingOrder}
                        onEdit={(t) => {
                          setEditingType(t);
                          setIsModalOpen(true);
                        }}
                        onDelete={handleDeleteClick}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        )}
      </main>

      <EnvelopeTypeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchTypes(true)}
        envelopeType={editingType}
      />

      <Modal
        isOpen={!!deletingType}
        onClose={() => !isDeleting && setDeletingType(null)}
        title="Excluir Tipo de Envelope"
      >
        <div className="space-y-4">
          {deleteError ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {deleteError}
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-300">
              Tem certeza que deseja excluir o tipo <strong>{deletingType?.name}</strong>?
              {deletingType && ' Não é possível excluir se existirem envelopes vinculados.'}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setDeletingType(null)} disabled={isDeleting}>
              Cancelar
            </Button>
            {!deleteError && (
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConfirmDelete}
                isLoading={isDeleting}
              >
                Excluir
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EnvelopeTypeManagement;
