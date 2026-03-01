import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Input, SearchableSelect } from '@/shared';
import { Category, Envelope, Transaction, TransactionType } from '../types';
import { useToast } from '@/shared';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (_data: any, _id?: string) => Promise<void>;
  envelopes: Envelope[];
  categories: Category[];
  transaction?: Transaction | null;
  isLoading?: boolean;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  envelopes,
  categories = [],
  transaction = null,
  isLoading = false
}) => {
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'debit' as TransactionType,
    amount: '',
    description: '',
    envelopeId: '' as string | null,
    categoryId: '',
    subcategoryId: ''
  });

  const sortedEnvelopes = useMemo(
    () => [...(envelopes ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [envelopes]
  );

  const categoryOptionsForSelect = useMemo(() => {
    return [...(categories ?? [])]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({ id: c.id, name: c.name, code: '', amount: 0, envelope_type_id: '', envelope_type_name: undefined }));
  }, [categories]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === formData.categoryId),
    [categories, formData.categoryId]
  );
  const subcategoryOptionsForSelect = useMemo(() => {
    if (!selectedCategory?.sub_categories?.length) return [];
    return selectedCategory.sub_categories
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((s) => ({ id: s.id, name: s.name, code: '', amount: 0, envelope_type_id: '', envelope_type_name: undefined }));
  }, [selectedCategory]);

  // Sincronizar dados quando o modal abre ou a transação muda
  useEffect(() => {
    if (isOpen) {
      if (transaction) {
        setFormData({
          date: transaction.date,
          type: transaction.type,
          amount: Math.abs(transaction.amount).toString(),
          description: transaction.description,
          envelopeId: transaction.envelopeId ?? '',
          categoryId: transaction.categoryId ?? '',
          subcategoryId: transaction.subcategoryId ?? ''
        });
      } else {
        setFormData({
          date: new Date().toISOString().split('T')[0],
          type: 'debit',
          amount: '',
          description: '',
          envelopeId: '',
          categoryId: '',
          subcategoryId: ''
        });
      }
    }
  }, [isOpen, transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description.trim()) {
      addToast('A descrição é obrigatória.', 'error');
      return;
    }

    const value = parseFloat(formData.amount);
    if (isNaN(value) || value <= 0) {
      addToast('O valor deve ser maior que zero.', 'error');
      return;
    }

    if (formData.categoryId && !formData.subcategoryId) {
      addToast('Selecione uma subcategoria da categoria escolhida.', 'error');
      return;
    }

    try {
      const payload = {
        date: formData.date,
        type: formData.type,
        amount: value,
        description: formData.description.trim(),
        envelopeId: formData.envelopeId || null,
        categoryId: formData.categoryId || null,
        subcategoryId: formData.subcategoryId || null
      };

      await onSuccess(payload, transaction?.id);
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  const footer = (
    <div className="flex justify-end gap-3">
      <Button variant="ghost" onClick={onClose} type="button" disabled={isLoading}>
        Cancelar
      </Button>
      <Button type="submit" form="transaction-modal-form" isLoading={isLoading} fullWidth className="sm:w-auto min-h-[44px]">
        {transaction ? "Atualizar" : "Salvar Lançamento"}
      </Button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={transaction ? "Editar Transação" : "Nova Transação"} size="xlarge" footer={footer}>
      <form id="transaction-modal-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="flex p-1 bg-gray-100 dark:bg-gray-900 rounded-xl">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, type: 'debit' })}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 min-h-[44px] text-sm font-bold rounded-lg transition-colors duration-200 cursor-pointer ${
              formData.type === 'debit'
                ? 'bg-white dark:bg-gray-800 text-red-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${formData.type === 'debit' ? 'bg-red-500' : 'bg-gray-400'}`} />
            DÉBITO
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, type: 'credit' })}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 min-h-[44px] text-sm font-bold rounded-lg transition-colors duration-200 cursor-pointer ${
              formData.type === 'credit'
                ? 'bg-white dark:bg-gray-800 text-emerald-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${formData.type === 'credit' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            CRÉDITO
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Data"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
            disabled={isLoading}
          />
          <Input
            label="Valor (R$)"
            type="number"
            step="0.01"
            placeholder="0,00"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required
            disabled={isLoading}
          />
        </div>

        <Input
          label="Descrição"
          placeholder="Ex: Aluguel, Supermercado..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
          disabled={isLoading}
        />

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 p-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Classificação (opcional)</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Envelope</label>
              <SearchableSelect
                options={sortedEnvelopes}
                value={formData.envelopeId || ''}
                onChange={(val) => setFormData({ ...formData, envelopeId: val })}
                placeholder="Vincular a um envelope..."
                emptyOptionLabel="Sem envelope"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Categoria</label>
              <SearchableSelect
                options={categoryOptionsForSelect as Envelope[]}
                value={formData.categoryId || ''}
                onChange={(val) => setFormData({ ...formData, categoryId: val, subcategoryId: '' })}
                placeholder="Selecione uma categoria..."
                emptyOptionLabel="Nenhuma"
                disabled={isLoading}
              />
              {formData.categoryId && (
                <div className="space-y-2 pt-0">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Subcategoria</label>
                  <SearchableSelect
                    options={subcategoryOptionsForSelect as Envelope[]}
                    value={formData.subcategoryId || ''}
                    onChange={(val) => setFormData({ ...formData, subcategoryId: val })}
                    placeholder="Selecione uma subcategoria..."
                    emptyOptionLabel="Nenhuma"
                    disabled={isLoading}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};