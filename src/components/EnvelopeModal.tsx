import React, { useState, useEffect, useRef } from 'react';
import { Modal, Input, Button, useToast } from '@/shared';
import { envelopeService } from '../services/envelopeService';
import { Envelope, EnvelopeTypeRecord } from '../types';

interface EnvelopeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  envelope: Envelope | null;
  envelopeTypes: EnvelopeTypeRecord[];
}

export const EnvelopeModal: React.FC<EnvelopeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  envelope,
  envelopeTypes,
}) => {
  const { addToast } = useToast();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [envelopeTypeId, setEnvelopeTypeId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setCode(envelope?.code ?? '');
      setName(envelope?.name ?? '');
      setEnvelopeTypeId(envelope?.envelope_type_id ?? envelopeTypes[0]?.id ?? '');
      setFormError(null);
      isSubmittingRef.current = false;
    }
  }, [isOpen, envelope, envelopeTypes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();
    if (!trimmedCode || !trimmedName) {
      setFormError('Preencha o código e o nome do envelope.');
      return;
    }
    if (!envelopeTypeId) {
      setFormError('Selecione um tipo de envelope.');
      return;
    }

    isSubmittingRef.current = true;
    setIsLoading(true);
    setFormError(null);
    try {
      if (envelope) {
        await envelopeService.update(envelope.id, {
          code: trimmedCode,
          name: trimmedName,
          envelope_type_id: envelopeTypeId,
        });
        addToast('Envelope atualizado!', 'success');
      } else {
        await envelopeService.create({
          code: trimmedCode,
          name: trimmedName,
          envelope_type_id: envelopeTypeId,
          amount: 0,
        });
        addToast('Envelope criado com sucesso!', 'success');
      }
      onClose();
      onSuccess();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ?? 'Erro ao processar envelope.';
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
      title={envelope ? 'Editar Envelope' : 'Novo Envelope'}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="envelope-modal-type"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Tipo do Envelope
          </label>
          <select
            id="envelope-modal-type"
            value={envelopeTypeId}
            onChange={(e) => setEnvelopeTypeId(e.target.value)}
            required
            disabled={isLoading || envelopeTypes.length === 0}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-50"
            aria-label="Selecione o tipo do envelope"
          >
            {envelopeTypes.length === 0 ? (
              <option value="">Cadastre tipos em Tipos de Envelope</option>
            ) : (
              envelopeTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))
            )}
          </select>
        </div>
        <Input
          label="Código"
          placeholder="Ex: ALIM"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          required
          maxLength={6}
          disabled={isLoading}
          id="envelope-modal-code"
        />
        <Input
          label="Nome do Envelope"
          placeholder="Ex: Alimentação"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={isLoading}
          id="envelope-modal-name"
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
            {envelope ? 'Salvar Alterações' : 'Criar Envelope'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
