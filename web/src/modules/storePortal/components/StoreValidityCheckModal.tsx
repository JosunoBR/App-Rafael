import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Package,
  Calendar,
  User,
  ShoppingBag,
  FileText
} from 'lucide-react';
import { StoreProductValidity } from '../types/validity.types';

interface StoreValidityCheckModalProps {
  item: StoreProductValidity;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (itemId: string, isSoldOut: boolean, remaining: number | null, notes: string, confirmedBy: string) => void;
}

export const StoreValidityCheckModal: React.FC<StoreValidityCheckModalProps> = ({
  item,
  isOpen,
  onClose,
  onConfirm
}) => {
  const [isSoldOut, setIsSoldOut] = useState<boolean>(item.alert15dStatus === 'esgotado');
  const [remainingUnits, setRemainingUnits] = useState<string>(
    item.stockRemaining !== undefined && item.stockRemaining !== null ? String(item.stockRemaining) : ''
  );
  const [notes, setNotes] = useState<string>(item.storeNotes || '');
  const [confirmedBy, setConfirmedBy] = useState<string>(item.alert15dConfirmedBy || 'Amanda (Gerente)');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalRemaining = isSoldOut ? 0 : (parseInt(remainingUnits, 10) || 0);
    onConfirm(item.id, isSoldOut, finalRemaining, notes.trim(), confirmedBy.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white dark:bg-[#0B132B] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
                Conferência de Validade Física
              </h3>
              <p className="text-xs text-slate-500 truncate">
                {item.storeName} • {item.cidade}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Card Resumo do Produto */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  {item.categoria} • Cód: {item.productCode}
                </span>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  {item.productName}
                </h4>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                Lote {item.batchNumber || 'Padrão'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Data de Validade:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 font-mono">
                  <Calendar className="w-3 h-3" />
                  {item.expirationDate.split('-').reverse().join('/')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Cota Enviada pela Doca:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Package className="w-3 h-3 text-slate-400" />
                  {item.quantityAllocated} unidades
                </span>
              </div>
            </div>
          </div>

          {/* Seleção do Estado do Estoque */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Qual é a situação atual deste produto na loja?
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setIsSoldOut(true)}
                className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                  isSoldOut
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                  isSoldOut ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {isSoldOut && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <div className="text-xs font-black">100% Vendido / Esgotado</div>
                  <div className="text-[10px] text-slate-400">Não há peças na loja</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsSoldOut(false)}
                className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                  !isSoldOut
                    ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                  !isSoldOut ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {!isSoldOut && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <div className="text-xs font-black">Ainda Restam Peças</div>
                  <div className="text-[10px] text-slate-400">Há saldo na gôndola/estoque</div>
                </div>
              </button>
            </div>
          </div>

          {/* Quantidade Restante (se houver estoque) */}
          {!isSoldOut && (
            <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-2 animate-in fade-in duration-150">
              <label className="block text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Quantas unidades foram contadas fisicamente?</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max={item.quantityAllocated}
                required={!isSoldOut}
                placeholder="Ex: 12"
                value={remainingUnits}
                onChange={e => setRemainingUnits(e.target.value)}
                className="w-full py-2 px-3 text-sm font-bold font-mono rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-[10px] text-amber-700 dark:text-amber-400 block">
                Total recebido da matriz: {item.quantityAllocated} unidades.
              </span>
            </div>
          )}

          {/* Observação / Providência da Loja */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Observação / Providência Comercial:</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Colocado em queima na frente de caixa com desconto"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Responsável pela Conferência */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Colaboradora que conferiu na loja:</span>
            </label>
            <input
              type="text"
              required
              value={confirmedBy}
              onChange={e => setConfirmedBy(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Rodapé com Botões */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 flex items-center gap-1.5 transition cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar Conferência</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
