
import React from 'react';
import { Category, Subcategory } from '../types';
import { Tag } from 'lucide-react';

interface CategoryBadgeProps {
  category: Category | null | undefined;
  subcategory: Subcategory | null | undefined;
  onClick?: () => void;
  className?: string;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ 
  category, 
  subcategory, 
  onClick,
  className = "" 
}) => {
  if (!category) {
    return (
      <div 
        onClick={onClick}
        className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${className}`}
      >
        Não categorizado
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 cursor-pointer hover:brightness-95 transition-all truncate max-w-full ${className}`}
      title={`${category.name}${subcategory ? ` > ${subcategory.name}` : ''}`}
    >
      <Tag className="w-2.5 h-2.5 mr-1 flex-shrink-0" />
      <span className="truncate">
        {category.name}
        {subcategory && (
          <span className="opacity-60 ml-1">
            › {subcategory.name}
          </span>
        )}
      </span>
    </div>
  );
};
