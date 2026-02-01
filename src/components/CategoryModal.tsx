
import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import { categoryService } from '../services/categoryService';
import { useToast } from '../contexts/ToastContext';
import { Category } from '../types';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  category?: Category | null;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, onSuccess, category }) => {
  const { addToast } = useToast();
  const [name, setName] = useState('');
  const [subCategories, setSubCategories] = useState<{ name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (category) {
        setName(category.name);
        if (category.sub_categories && category.sub_categories.length > 0) {
          setSubCategories(category.sub_categories.map(s => ({ name: s.name })));
        } else {
          setSubCategories([{ name: '' }]);
        }
      } else {
        setName('');
        setSubCategories([{ name: '' }]);
      }
    }
  }, [isOpen, category]);

  const handleAddSub = () => {
    setSubCategories([...subCategories, { name: '' }]);
  };

  const handleRemoveSub = (index: number) => {
    if (subCategories.length === 1) {
      setSubCategories([{ name: '' }]);
      return;
    }
    setSubCategories(subCategories.filter((_, i) => i !== index));
  };

  const handleSubChange = (index: number, val: string) => {
    const newSubs = [...subCategories];
    newSubs[index].name = val;
    setSubCategories(newSubs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('O nome da categoria é obrigatório.', 'error');
      return;
    }

    const filteredSubs = subCategories
      .map(s => s.name.trim())
      .filter(n => n !== '');
    
    setIsLoading(true);
    try {
      if (category) {
        await categoryService.update(category.id, name.trim(), filteredSubs);
        addToast('Categoria atualizada!', 'success');
      } else {
        await categoryService.create(name.trim(), filteredSubs);
        addToast('Categoria criada com sucesso!', 'success');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao processar categoria:', err);
      addToast(err.message || 'Erro ao processar categoria.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={category ? "Editar Categoria" : "Nova Categoria"}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input 
          label="Nome da Categoria" 
          placeholder="Ex: Alimentação" 
          value={name} 
          onChange={e => setName(e.target.value)} 
          required 
          disabled={isLoading}
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Subcategorias (Opcional)
            </label>
            <button 
              type="button" 
              onClick={handleAddSub}
              disabled={isLoading}
              className="text-xs flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
            >
              <Plus className="w-3 h-3" /> Adicionar
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar border border-gray-100 dark:border-gray-700 rounded-lg p-2">
            {subCategories.map((sub, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Nome da subcategoria"
                  value={sub.name}
                  onChange={e => handleSubChange(index, e.target.value)}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-50"
                  disabled={isLoading}
                />
                <button 
                  type="button" 
                  onClick={() => handleRemoveSub(index)}
                  disabled={isLoading}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button variant="ghost" onClick={onClose} type="button" disabled={isLoading}>Cancelar</Button>
          <Button type="submit" isLoading={isLoading}>
            {category ? "Salvar Alterações" : "Criar Categoria"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
