import React from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** 'large' = max-w-xl, 'xlarge' = max-w-2xl for forms with many fields (e.g. transaction edit). */
  size?: 'default' | 'large' | 'xlarge';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, size = 'default' }) => {
  if (!isOpen) return null;

  const maxWidthClass = size === 'xlarge' ? 'max-w-2xl' : size === 'large' ? 'max-w-xl' : 'max-w-lg';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full ${maxWidthClass} max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors duration-200 cursor-pointer p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
          {children}
        </div>

        {footer && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 rounded-b-xl flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};