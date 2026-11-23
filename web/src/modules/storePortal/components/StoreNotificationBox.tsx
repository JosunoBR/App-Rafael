import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, ChevronRight, Clock } from 'lucide-react';
import { DailyCashClosing } from '../types/storePortal.types';

interface StoreNotificationBoxProps {
  urgentReturned: DailyCashClosing | null;
  onFixClosing: (dateStr: string) => void;
}

const ONE_HOUR_MS = 60 * 60 * 1000; // 1 hora em milissegundos (60 minutos)

/**
 * Notificação Flutuante de Caixa Devolvido (Overlay / Box por cima)
 * Aparece flutuando no topo da tela com alta prioridade visual,
 * e reaparece periodicamente a cada 1 hora caso seja dispensado até a regularização.
 */
export const StoreNotificationBox: React.FC<StoreNotificationBoxProps> = ({
  urgentReturned,
  onFixClosing
}) => {
  if (!urgentReturned) return null;

  return (
    <StoreNotificationBoxInner
      key={urgentReturned.data}
      urgentReturned={urgentReturned}
      onFixClosing={onFixClosing}
    />
  );
};

const StoreNotificationBoxInner: React.FC<{
  urgentReturned: DailyCashClosing;
  onFixClosing: (dateStr: string) => void;
}> = ({ urgentReturned, onFixClosing }) => {
  const [isSnoozed, setIsSnoozed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(`mega12_snooze_alert_${urgentReturned.data}`);
      if (stored) {
        const ts = Number(stored);
        return Date.now() - ts < ONE_HOUR_MS;
      }
    } catch {
      // fallback caso localStorage esteja bloqueado
    }
    return false;
  });

  // Temporizador para reabrir exatamente após completar 1 hora (60 minutos)
  useEffect(() => {
    if (!isSnoozed) return;

    let remaining = ONE_HOUR_MS;
    try {
      const stored = localStorage.getItem(`mega12_snooze_alert_${urgentReturned.data}`);
      if (stored) {
        const elapsed = Date.now() - Number(stored);
        remaining = Math.max(1000, ONE_HOUR_MS - elapsed);
      }
    } catch {
      // fallback
    }

    const timer = setTimeout(() => {
      try {
        localStorage.removeItem(`mega12_snooze_alert_${urgentReturned.data}`);
      } catch {
        // fallback
      }
      setIsSnoozed(false);
    }, remaining);

    return () => clearTimeout(timer);
  }, [isSnoozed, urgentReturned.data]);

  // Ação de dispensar temporariamente por 1 hora
  const handleSnooze = () => {
    try {
      localStorage.setItem(`mega12_snooze_alert_${urgentReturned.data}`, Date.now().toString());
    } catch {
      // fallback
    }
    setIsSnoozed(true);
  };

  if (isSnoozed) return null;

  const diaFormatado = `${urgentReturned.data.split('-')[2]}/${urgentReturned.data.split('-')[1]}`;

  return (
    <div className="fixed top-4 right-4 sm:top-5 sm:right-6 w-[calc(100%-2rem)] sm:w-[380px] z-50 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-white dark:bg-[#0B1325] border border-rose-500/70 dark:border-rose-500/80 rounded-2xl p-3.5 sm:p-4 shadow-xl shadow-rose-950/30 relative backdrop-blur-md">
        
        {/* Botão fechar (X) no topo direito - adia por 1 hora */}
        <button
          type="button"
          onClick={handleSnooze}
          className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          title="Dispensar alerta por 1 hora"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Cabeçalho do Box */}
        <div className="flex items-start gap-2.5 pr-5">
          <div className="p-2 rounded-xl bg-rose-500 text-white shrink-0 shadow-sm shadow-rose-500/30 animate-pulse">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Atenção: Conferência Devolvida
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                Dia {diaFormatado}
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 leading-snug">
              {urgentReturned.motivoDevolucao || 'O financeiro solicitou correção no fechamento deste dia.'}
            </p>
          </div>
        </div>

        {/* Informação do ciclo horário */}
        <div className="mt-2.5 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 flex items-center gap-1.5 text-[10px] text-rose-800 dark:text-rose-300 font-medium">
          <Clock className="w-3 h-3 text-rose-500 shrink-0" />
          <span>Este aviso reaparece a cada 1 hora até a conferência ser corrigida.</span>
        </div>

        {/* Rodapé de Ações do Box */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleSnooze}
            className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition cursor-pointer"
            title="Adiar notificação por 60 minutos"
          >
            Lembrar em 1h
          </button>
          
          <button
            type="button"
            onClick={() => onFixClosing(urgentReturned.data)}
            className="px-3 py-1.5 text-[11px] font-black rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 active:scale-95 text-white shadow-sm shadow-rose-600/30 transition cursor-pointer flex items-center gap-1"
          >
            <span>Corrigir Caixa Agora</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

      </div>
    </div>
  );
};
