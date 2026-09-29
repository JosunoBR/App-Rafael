import React, { useEffect } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { IOSAlertType } from './IOSAlertModal';

export interface IOSBannerMessage {
  id?: string;
  title?: string;
  message: string;
  type: IOSAlertType;
  duration?: number;
}

interface IOSNotificationBannerProps {
  notification: IOSBannerMessage | null;
  onClose: () => void;
}

export const IOSNotificationBanner: React.FC<IOSNotificationBannerProps> = ({
  notification,
  onClose
}) => {
  useEffect(() => {
    if (notification) {
      const dur = notification.duration || (notification.type === 'error' ? 5500 : 4000);
      const timer = setTimeout(onClose, dur);
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  if (!notification) return null;

  const { title, message, type } = notification;

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-5 h-5 text-[#FF3B30] dark:text-[#FF453A] shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-[#FF9500] dark:text-[#FF9F0A] shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-[#34C759] dark:text-[#30D158] shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-[#007AFF] dark:text-[#0A84FF] shrink-0" />;
    }
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99998] w-full max-w-[92vw] sm:max-w-[420px] pointer-events-none select-none">
      <div 
        className="pointer-events-auto flex items-center gap-3 py-3 px-4 rounded-full bg-white/90 dark:bg-[#1E1E1E]/90 backdrop-blur-2xl shadow-xl border border-white/50 dark:border-white/10 text-slate-800 dark:text-zinc-100 animate-in slide-in-from-top-4 fade-in duration-300 transition-all hover:scale-[1.01]"
        style={{
          boxShadow: '0 12px 32px -4px rgba(0, 0, 0, 0.25), 0 0 1px 1px rgba(255, 255, 255, 0.15) inset'
        }}
      >
        {getIcon()}
        
        <div className="flex-1 min-w-0 pr-1">
          {title && (
            <p className="text-[13px] font-semibold tracking-tight text-slate-900 dark:text-white truncate">
              {title}
            </p>
          )}
          <p className="text-[12px] text-slate-600 dark:text-zinc-300 line-clamp-2 leading-tight">
            {message}
          </p>
        </div>

        <button 
          onClick={onClose}
          className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
          aria-label="Fechar notificação"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
