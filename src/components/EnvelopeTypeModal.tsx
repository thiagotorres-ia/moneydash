import React, { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import { envelopeTypeService } from '../services/envelopeTypeService';
import { useToast } from '../contexts/ToastContext';
import { EnvelopeTypeRecord } from '../types';

interface EnvelopeTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  envelopeType?: EnvelopeTypeRecord | null;
}

export const EnvelopeTypeModal: React.FC<EnvelopeTypeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  envelopeType,
}) => {
  const { addToast } = useToast();
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setName(envelopeType?.name ?? '');
      setFormError(null);
      isSubmittingRef.current = false;
    }
  }, [isOpen, envelopeType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError('O nome é obrigatório.');
      return;
    }

    isSubmittingRef.current = true;
    setIsLoading(true);
    setFormError(null);
    try {
      if (envelopeType) {
        await envelopeTypeService.update(envelopeType.id, { name: trimmed });
        addToast('Tipo atualizado!', 'success');
      } else {
        await envelopeTypeService.create(trimmed);
        addToast('Tipo criado com sucesso!', 'success');
      }
      onClose();
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao processar tipo.';
      addToast(message, 'error');
      setFormError(message);
    } finally {
      isSubmittingRef.current = false;
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={envelopeType ? 'Editar Tipo de Envelope' : 'Novo Tipo de Envelope'}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Nome"
          placeholder="Ex: Rotina"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={isLoading}
          id="envelope-type-name"
        />
        {formError && (
          <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/10 p-2 rounded">
            {formError}
          </div>
        )}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button variant="ghost" onClick={onClose} type="button" disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {envelopeType ? 'Salvar Alterações' : 'Criar Tipo'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
