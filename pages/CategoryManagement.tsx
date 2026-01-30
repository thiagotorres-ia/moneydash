
import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '../components/Navbar';
import { categoryService } from '../services/categoryService';
import { Category } from '../types';
import { useToast } from '../contexts/ToastContext';
import { Loader2, Pencil, Trash2, ChevronDown, ChevronRight, FolderTree, Tag, AlertTriangle } from 'lucide-react';
import { Button } from '../components/Button';
import { CategoryModal } from '../components/CategoryModal';

const CategoryManagement: React.FC = () => {
  const { addToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const data = await categoryService.getAll();
      setCategories(data || []);
    } catch (err) {
      console.error('Erro ao buscar categorias:', err);
      setHasError(true);
      addToast('Não foi possível carregar as categorias.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir esta categoria e todas as suas subcategorias?')) return;
    try {
      await categoryService.delete(id);
      addToast('Categoria removida com sucesso!', 'success');
      fetchCategories();
    } catch (err) {
      addToast('Erro ao remover categoria.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl text-primary-600 dark:text-primary-400 shadow-sm">
              <FolderTree className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gerenciar Categorias</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Organize seus lançamentos por tipo e subtipo</p>
            </div>
          </div>
          <Button onClick={() => { setEditingCategory(null); setIsModalOpen(true); }}>
            Nova Categoria
          </Button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 animate-pulse">Sincronizando com banco...</p>
          </div>
        ) : hasError ? (
          <div className="bg-white dark:bg-gray-800 p-12 rounded-2xl border border-red-100 dark:border-red-900/20 text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/10 rounded-full flex items-center justify-center mx-auto text-red-500">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Erro ao carregar dados</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Pode haver um problema de conexão ou permissão.</p>
            <Button variant="outline" onClick={fetchCategories}>Tentar Novamente</Button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {categories.length === 0 ? (
              <div className="p-20 text-center flex flex-col items-center gap-4">
                <Tag className="w-12 h-12 text-gray-200 dark:text-gray-700" />
                <div className="space-y-1">
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhuma categoria encontrada.</p>
                    <p className="text-xs text-gray-400">Comece criando sua primeira categoria de gastos.</p>
                </div>
                <Button variant="outline" onClick={() => { setEditingCategory(null); setIsModalOpen(true); }} className="mt-2">
                    Criar Agora
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {categories.map(cat => (
                  <div key={cat.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer"
                      onClick={() => toggleExpand(cat.id)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {expandedIds.has(cat.id) ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                        <span className="font-semibold text-gray-900 dark:text-white">{cat.name}</span>
                        <span className="text-[10px] font-bold bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-500 dark:text-gray-400 uppercase">
                          {cat.sub_categories?.length || 0} subcategorias
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingCategory(cat); setIsModalOpen(true); }}
                          className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(cat.id); }}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {expandedIds.has(cat.id) && (
                      <div className="px-12 pb-4 space-y-1 animate-in slide-in-from-top-1 duration-200">
                        {cat.sub_categories?.length === 0 ? (
                           <p className="text-xs text-gray-400 italic py-2">Sem subcategorias vinculadas.</p>
                        ) : cat.sub_categories?.map(sub => (
                          <div key={sub.id} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 py-1.5 border-l-2 border-gray-100 dark:border-gray-700 pl-4 group hover:border-primary-400 transition-colors">
                            <Tag className="w-3 h-3 text-gray-300 dark:text-gray-600 group-hover:text-primary-400" />
                            {sub.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <CategoryModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchCategories}
        category={editingCategory}
      />
    </div>
  );
};

export default CategoryManagement;
