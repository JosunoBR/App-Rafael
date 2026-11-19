import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | 'full';
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = '2xl',
  showCloseButton = true
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl',
    full: 'max-w-[96vw]'
  }[maxWidth];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
        aria-hidden="true" 
      />
      <div className={`relative w-full ${maxWidthClass} max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl z-10 overflow-hidden animate-in zoom-in-95 duration-200`}>
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div>
              {typeof title === 'string' ? (
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                  {title}
                </h3>
              ) : (
                title
              )}
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Fechar (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
