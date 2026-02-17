import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown } from 'lucide-react';
import { Envelope } from '../types';

interface SearchableSelectProps {
  options: Envelope[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyOptionLabel?: string;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

const DROPDOWN_PANEL_MAX_HEIGHT = 320;

interface DropdownRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Selecione...",
  emptyOptionLabel,
  className = "",
  autoFocus = false,
  disabled = false
}) => {
  const safeOptions = options ?? [];
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownRect, setDropdownRect] = useState<DropdownRect>({ top: 0, left: 0, width: 220, height: 40 });
  const [openUpward, setOpenUpward] = useState(false);
  const [triggerTop, setTriggerTop] = useState(0);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inTrigger = triggerRef.current?.contains(target);
      const inPanel = panelRef.current?.contains(target);
      if (!inTrigger && !inPanel) {
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

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const upward = spaceBelow < DROPDOWN_PANEL_MAX_HEIGHT;
      setOpenUpward(upward);
      setTriggerTop(rect.top);
      setDropdownRect({
        top: rect.bottom,
        left: rect.left,
        width: Math.max(rect.width, 220),
        height: rect.height
      });
    }
  }, [isOpen]);

  const selectedOption = safeOptions.find(opt => opt.id === value);
  const filteredOptions = safeOptions.filter(opt => {
    const search = searchTerm.toLowerCase();
    return (
      opt.name.toLowerCase().includes(search) ||
      opt.code.toLowerCase().includes(search)
    );
  });

  const handleTriggerClick = () => {
    if (disabled) return;
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const upward = spaceBelow < DROPDOWN_PANEL_MAX_HEIGHT;
      setOpenUpward(upward);
      setTriggerTop(rect.top);
      setDropdownRect({
        top: rect.bottom,
        left: rect.left,
        width: Math.max(rect.width, 220),
        height: rect.height
      });
    }
    setIsOpen(!isOpen);
    setSearchTerm('');
  };

  const panelTop = openUpward
    ? triggerTop - DROPDOWN_PANEL_MAX_HEIGHT - 4
    : dropdownRect.top + 4;

  const panelContent = isOpen ? (
    <div
      ref={panelRef}
      className={`fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in duration-100 ${openUpward ? 'zoom-in-95 origin-bottom' : 'zoom-in-95'}`}
      style={{
        top: panelTop,
        left: dropdownRect.left,
        width: dropdownRect.width,
        maxHeight: DROPDOWN_PANEL_MAX_HEIGHT
      }}
    >
      <div className="p-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou código..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            onClick={(e) => e.stopPropagation()}
            aria-label="Buscar envelope por nome ou código"
          />
        </div>
      </div>
      <div
        className="overflow-y-auto overscroll-contain custom-scrollbar max-h-[280px] min-h-0"
        role="listbox"
      >
        {emptyOptionLabel && (
          <div
            role="option"
            aria-selected={value === ''}
            onClick={() => {
              onChange('');
              setIsOpen(false);
            }}
            className={`
              px-4 py-3 text-sm cursor-pointer transition-colors duration-200 flex items-center border-b border-gray-100 dark:border-gray-700
              ${value === ''
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-semibold'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}
            `}
          >
            {emptyOptionLabel}
          </div>
        )}
        {filteredOptions.length > 0 ? (
          filteredOptions.map(opt => (
            <div
              key={opt.id}
              role="option"
              aria-selected={value === opt.id}
              onClick={() => {
                onChange(opt.id);
                setIsOpen(false);
              }}
              className={`
                px-4 py-3 text-sm cursor-pointer transition-colors duration-200 flex items-center justify-between
                ${value === opt.id
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-semibold'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}
              `}
            >
              <div className="flex flex-col min-w-0 pr-2">
                <span className="truncate">{opt.name}</span>
                {opt.envelope_type_name && (
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">{opt.envelope_type_name}</span>
                )}
              </div>
              <span className="text-xs bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded text-gray-600 dark:text-gray-300 font-mono font-bold flex-shrink-0">
                {opt.code}
              </span>
            </div>
          ))
        ) : !emptyOptionLabel ? (
          <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Nenhum envelope encontrado
          </div>
        ) : null}
      </div>
    </div>
  ) : null;

  return (
    <div className={`relative w-full ${className}`} ref={triggerRef}>
      <div
        onClick={handleTriggerClick}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`
          w-full px-3 py-2.5 rounded-lg border text-sm flex items-center justify-between transition-colors duration-200
          ${disabled ? 'bg-gray-50 dark:bg-gray-900/50 cursor-not-allowed border-gray-200 dark:border-gray-700 opacity-60' : 'cursor-pointer bg-white dark:bg-gray-800'}
          ${isOpen ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}
          focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
        `}
      >
        <span className={`truncate ${!selectedOption && !(emptyOptionLabel && value === '') ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100 font-medium'}`}>
          {selectedOption ? `${selectedOption.code} - ${selectedOption.name}` : emptyOptionLabel && value === '' ? emptyOptionLabel : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 ml-2 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      {panelContent && createPortal(panelContent, document.body)}
    </div>
  );
};
