import React, { useState } from 'react';
import { Calendar, DollarSign, Tag, AlignLeft, CreditCard } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { SearchableSelect } from './SearchableSelect';
import { Envelope, TransactionType } from '../types';
import { useToast } from '../contexts/ToastContext';

interface CreateTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => Promise<void>;
  envelopes: Envelope[];
  isLoading?: boolean;
}

export const CreateTransactionModal: React.FC<CreateTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  envelopes,
  isLoading = false
}) => {
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'debit' as TransactionType,
    amount: '',
    description: '',
    envelopeId: '' as string | null
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!formData.description.trim()) {
      addToast('A descrição é obrigatória.', 'error');
      return;
    }

    const value = parseFloat(formData.amount);
    if (isNaN(value) || value <= 0) {
      addToast('O valor deve ser maior que zero.', 'error');
      return;
    }

    try {
      await onSuccess({
        date: formData.date,
        type: formData.type,
        amount: value,
        description: formData.description.trim(),
        envelopeId: formData.envelopeId || null
      });
      
      // Resetar formulário após sucesso
      setFormData({
        date: new Date().toISOString().split('T')[0],
        type: 'debit',
        amount: '',
        description: '',
        envelopeId: ''
      });
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nova Transação">
      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Seletor de Tipo (Crédito/Débito) */}
        <div className="flex p-1 bg-gray-100 dark:bg-gray-900 rounded-xl">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, type: 'debit' })}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${
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
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${
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

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Envelope (Opcional)
          </label>
          <SearchableSelect
            options={envelopes}
            value={formData.envelopeId || ''}
            onChange={(val) => setFormData({ ...formData, envelopeId: val })}
            placeholder="Vincular a um envelope..."
            disabled={isLoading}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button variant="ghost" onClick={onClose} type="button" disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading} fullWidth className="sm:w-auto">
            Salvar Lançamento
          </Button>
        </div>
      </form>
    </Modal>
  );
};