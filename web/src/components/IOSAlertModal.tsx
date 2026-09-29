import React, { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export type IOSAlertType = 'error' | 'warning' | 'info' | 'success';

export interface IOSAlertOptions {
  title: string;
  message: string;
  type?: IOSAlertType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  // Ação especial opcional, ex: "Usar Próximo Livre (PED-XXXX)"
  actionText?: string;
  onAction?: () => void;
  shake?: boolean;
}

interface IOSAlertModalProps {
  isOpen: boolean;
  alert: IOSAlertOptions | null;
  onClose: () => void;
}

export const IOSAlertModal: React.FC<IOSAlertModalProps> = ({
  isOpen,
  alert,
  onClose
}) => {
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (isOpen && alert?.type === 'error') {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, alert]);

  if (!isOpen || !alert) return null;

  const type = alert.type || 'error';

  const getIcon = () => {
    switch (type) {
      case 'error':
        return (
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 text-[#FF3B30] dark:text-[#FF453A] flex items-center justify-center mx-auto mb-3 shadow-inner">
            <AlertCircle className="w-7 h-7 stroke-[2.2]" />
          </div>
        );
      case 'warning':
        return (
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-500/20 text-[#FF9500] dark:text-[#FF9F0A] flex items-center justify-center mx-auto mb-3 shadow-inner">
            <AlertTriangle className="w-7 h-7 stroke-[2.2]" />
          </div>
        );
      case 'success':
        return (
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-[#34C759] dark:text-[#30D158] flex items-center justify-center mx-auto mb-3 shadow-inner">
            <CheckCircle2 className="w-7 h-7 stroke-[2.2]" />
          </div>
        );
      case 'info':
      default:
        return (
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-500/20 text-[#007AFF] dark:text-[#0A84FF] flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Info className="w-7 h-7 stroke-[2.2]" />
          </div>
        );
    }
  };

  const handleConfirm = () => {
    if (alert.onConfirm) alert.onConfirm();
    onClose();
  };

  const handleCancel = () => {
    if (alert.onCancel) alert.onCancel();
    onClose();
  };

  const handleAction = () => {
    if (alert.onAction) alert.onAction();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 select-none">
      {/* Backdrop estilo iOS com desfoque profundo */}
      <div 
        className="absolute inset-0 bg-black/40 dark:bg-black/65 backdrop-blur-md transition-opacity duration-200 animate-in fade-in"
        onClick={handleCancel}
      />

      {/* Caixa de Diálogo iOS (Estilo iPhone UIAlertController) */}
      <div 
        className={`relative w-full max-w-[320px] sm:max-w-[340px] bg-white/90 dark:bg-[#1E1E1E]/90 backdrop-blur-2xl rounded-[22px] shadow-2xl border border-white/50 dark:border-white/10 overflow-hidden transform transition-all duration-200 animate-in zoom-in-95 ${
          isShaking ? 'animate-ios-shake' : ''
        }`}
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 1px 1px rgba(255, 255, 255, 0.2) inset'
        }}
      >
        {/* Corpo do Alerta */}
        <div className="px-6 pt-6 pb-5 text-center">
          {getIcon()}
          
          <h3 className="text-[17px] font-semibold text-slate-900 dark:text-white tracking-tight leading-snug">
            {alert.title}
          </h3>
          
          <p className="mt-2 text-[13px] text-slate-600 dark:text-zinc-300 leading-relaxed font-normal whitespace-pre-line text-center">
            {alert.message}
          </p>

          {/* Botão de ação especial (ex: "Usar Próximo Livre") se existir */}
          {alert.actionText && (
            <button
              onClick={handleAction}
              className="mt-4 w-full py-2.5 px-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-[#007AFF] dark:text-[#0A84FF] text-[13px] font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-800/40"
            >
              {alert.actionText}
            </button>
          )}
        </div>

        {/* Separador e Botões estilo iOS */}
        <div className="border-t border-slate-200/80 dark:border-zinc-700/80 divide-y sm:divide-y-0 divide-slate-200/80 dark:divide-zinc-700/80">
          {alert.cancelText ? (
            <div className="grid grid-cols-2 divide-x divide-slate-200/80 dark:divide-zinc-700/80">
              <button
                type="button"
                onClick={handleCancel}
                className="w-full py-3.5 text-[16px] text-slate-600 dark:text-zinc-400 font-normal hover:bg-slate-100/50 dark:hover:bg-white/5 active:bg-slate-200/60 dark:active:bg-white/10 transition-colors"
              >
                {alert.cancelText}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={`w-full py-3.5 text-[16px] font-semibold hover:bg-slate-100/50 dark:hover:bg-white/5 active:bg-slate-200/60 dark:active:bg-white/10 transition-colors ${
                  type === 'error'
                    ? 'text-[#FF3B30] dark:text-[#FF453A]'
                    : 'text-[#007AFF] dark:text-[#0A84FF]'
                }`}
              >
                {alert.confirmText || 'OK'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              className={`w-full py-3.5 text-[16px] font-semibold hover:bg-slate-100/50 dark:hover:bg-white/5 active:bg-slate-200/60 dark:active:bg-white/10 transition-colors ${
                type === 'error'
                  ? 'text-[#FF3B30] dark:text-[#FF453A]'
                  : 'text-[#007AFF] dark:text-[#0A84FF]'
              }`}
            >
              {alert.confirmText || 'OK'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
