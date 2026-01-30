
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { Envelope } from '../types';

interface SearchableSelectProps {
  options: Envelope[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({ 
  options, 
  value, 
  onChange, 
  placeholder = "Selecione...", 
  className = "",
  autoFocus = false,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (autoFocus && !disabled) {
      setIsOpen(true);
    }
  }, [autoFocus, disabled]);

  const selectedOption = options.find(opt => opt.id === value);
  const filteredOptions = options.filter(opt => {
    const search = searchTerm.toLowerCase();
    return (
      opt.name.toLowerCase().includes(search) || 
      opt.code.toLowerCase().includes(search)
    );
  });

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <div 
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setSearchTerm('');
          }
        }}
        className={`
          w-full px-3 py-2.5 rounded-lg border text-sm flex items-center justify-between transition-all
          ${disabled ? 'bg-gray-50 dark:bg-gray-900/50 cursor-not-allowed border-gray-200 dark:border-gray-700 opacity-60' : 'cursor-pointer bg-white dark:bg-gray-800'}
          ${isOpen ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}
        `}
      >
        <span className={`truncate ${!selectedOption ? 'text-gray-400' : 'text-gray-900 dark:text-gray-200 font-medium'}`}>
          {selectedOption ? `${selectedOption.code} - ${selectedOption.name}` : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 ml-2 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-[100] w-full min-w-[220px] mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-64 overflow-hidden flex flex-col left-0 top-full animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 sticky top-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome ou código..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => (
                <div
                  key={opt.id}
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`
                    px-4 py-3 text-sm cursor-pointer transition-colors flex items-center justify-between
                    ${value === opt.id 
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-semibold' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}
                  `}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="truncate">{opt.name}</span>
                    <span className="text-[10px] text-gray-400 font-mono">{opt.type.toUpperCase()}</span>
                  </div>
                  <span className="text-xs bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded text-gray-500 dark:text-gray-300 font-mono font-bold flex-shrink-0">
                    {opt.code}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-sm text-gray-400">
                Nenhum envelope encontrado
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
