
import React from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  type = 'warning',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const config = {
    danger: {
      icon: XCircle,
      iconColor: 'text-red-500',
      buttonBg: 'bg-red-600 hover:bg-red-700',
      borderColor: 'border-red-500',
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-yellow-500',
      buttonBg: 'bg-yellow-600 hover:bg-yellow-700',
      borderColor: 'border-yellow-500',
    },
    info: {
      icon: Info,
      iconColor: 'text-blue-500',
      buttonBg: 'bg-blue-600 hover:bg-blue-700',
      borderColor: 'border-blue-500',
    },
    success: {
      icon: CheckCircle,
      iconColor: 'text-green-500',
      buttonBg: 'bg-green-600 hover:bg-green-700',
      borderColor: 'border-green-500',
    },
  };

  const { icon: Icon, iconColor, buttonBg, borderColor } = config[type];

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4 animate-fadeIn"
      onClick={onCancel}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 border-t-4 ${borderColor} animate-slideIn overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 flex items-start gap-4">
          <div className={`flex-shrink-0 ${iconColor}`}>
            <Icon className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 flex gap-3 justify-end border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            type="button"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-6 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-sm ${buttonBg}`}
            type="button"
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
