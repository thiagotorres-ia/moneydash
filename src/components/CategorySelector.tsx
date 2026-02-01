
import React, { useState, useEffect } from 'react';
import { Search, ChevronRight, Loader2, Check, Tag } from 'lucide-react';
import { Category, Subcategory } from '../types';
import { categoryService } from '../services/categoryService';

interface CategorySelectorProps {
  value: { categoryId: string | null; subcategoryId: string | null };
  onChange: (categoryId: string | null, subcategoryId: string | null) => void;
  onClose?: () => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({ 
  value, 
  onChange,
  onClose 
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [step, setStep] = useState<'category' | 'subcategory'>(
    value.categoryId ? 'subcategory' : 'category'
  );
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const cats = await categoryService.getCategories();
        setCategories(cats);
        
        if (value.categoryId) {
          const cat = cats.find(c => c.id === value.categoryId);
          if (cat) {
            setSelectedCat(cat);
            const subs = await categoryService.getSubcategories(cat.id);
            setSubcategories(subs);
          }
        }
      } catch (e) {
        console.error('Erro ao inicializar seletor:', e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [value.categoryId]);

  const handleSelectCategory = async (cat: Category) => {
    setSelectedCat(cat);
    setSearchTerm('');
    setLoadingSubs(true);
    try {
      const subs = await categoryService.getSubcategories(cat.id);
      setSubcategories(subs);
      setStep('subcategory');
    } catch (e) {
      console.error('Erro ao buscar subcategorias:', e);
    } finally {
      setLoadingSubs(false);
    }
  };

  const handleSelectSubcategory = (subId: string | null) => {
    // SEMPRE envia o ID da categoria pai junto com a subcategoria (ou nulo se for o caso)
    onChange(selectedCat?.id || null, subId);
    if (onClose) onClose();
  };

  const handleClear = () => {
    onChange(null, null);
    if (onClose) onClose();
  };

  const filteredItems = step === 'category' 
    ? categories.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : subcategories.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[400px]">
      <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
          {step === 'subcategory' && (
            <button 
              onClick={() => setStep('category')}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            </button>
          )}
          <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase truncate">
            {step === 'category' ? 'Categorias' : selectedCat?.name}
          </span>
        </div>
        <button 
          onClick={handleClear}
          className="text-[10px] text-red-500 hover:text-red-600 font-bold uppercase"
        >
          Limpar
        </button>
      </div>

      <div className="p-2 border-b border-gray-50 dark:border-gray-800">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar..."
            className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-1 focus:ring-primary-500"
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loadingSubs ? (
          <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary-500" /></div>
        ) : filteredItems.length > 0 ? (
          <div className="p-1">
            {step === 'category' ? (
              filteredItems.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-700 group transition-all ${value.categoryId === cat.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Tag className="w-3 h-3 text-primary-500 flex-shrink-0" />
                    <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{cat.name}</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))
            ) : (
              <>
                <button
                  onClick={() => handleSelectSubcategory(null)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-all ${!value.subcategoryId ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
                >
                  <span className="text-xs text-gray-400 italic font-medium">Sem subcategoria</span>
                  {!value.subcategoryId && <Check className="w-3 h-3 text-primary-500" />}
                </button>
                {filteredItems.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => handleSelectSubcategory(sub.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-all ${value.subcategoryId === sub.id ? 'bg-primary-50 dark:bg-primary-900/20 font-bold text-primary-700' : ''}`}
                  >
                    <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{sub.name}</span>
                    {value.subcategoryId === sub.id && <Check className="w-3 h-3 text-primary-500" />}
                  </button>
                ))}
              </>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-gray-400 font-medium">Nenhum resultado</div>
        )}
      </div>
    </div>
  );
};
