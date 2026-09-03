import React from 'react';
import { 
  Save, 
  PlusCircle, 
  FileSpreadsheet, 
  FileText, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Building2,
  Package
} from 'lucide-react';
import { PurchaseOrder } from '../shared/types';
import { calculateOrderNetTotal } from '../utils/installments';

interface OrderActionBarProps {
  order: PurchaseOrder;
  isSaved: boolean;
  hasActiveDraft: boolean;
  onSaveOrder: () => void;
  onNewOrder: () => void;
  onDiscardDraft: () => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
}

export const OrderActionBar: React.FC<OrderActionBarProps> = ({
  order,
  isSaved,
  hasActiveDraft,
  onSaveOrder,
  onNewOrder,
  onDiscardDraft,
  onExportExcel,
  onExportPDF
}) => {
  const netTotal = calculateOrderNetTotal(order);
  const itemCount = order.items?.length || 0;
  const status = order.header.status || 'Rascunho';

  const getStatusBadge = () => {
    if (!isSaved && hasActiveDraft) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Rascunho em Aberto (Não Salvo)
        </span>
      );
    }

    switch (status) {
      case 'Finalizado':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Finalizado / Arquivado
          </span>
        );
      case 'Em Separação':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
            <Clock className="w-3.5 h-3.5" />
            Em Separação na Doca
          </span>
        );
      case 'Aprovado':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Aprovado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Salvo no Banco ({status})
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 sticky top-14 z-15 backdrop-blur-md bg-white/95 dark:bg-slate-900/95 transition-all">
      
      {/* 1. Informações Centrais do Pedido em Edição */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-mono font-black text-xs shadow-md shadow-emerald-500/20 shrink-0">
            {order.header.numeroPedido.replace('PED-', '#') || '#00'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {order.header.numeroPedido || 'Novo Pedido'}
              </h2>
              {getStatusBadge()}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <strong className="text-slate-700 dark:text-slate-200">
                  {order.header.fornecedor || 'Fornecedor não selecionado'}
                </strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-slate-400" />
                {itemCount} {itemCount === 1 ? 'item' : 'itens'}
              </span>
              {netTotal > 0 && (
                <>
                  <span>•</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    Total: R$ {netTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Barra Unificada de Ações & Botões Operacionais */}
      <div className="flex flex-wrap items-center gap-2 self-end lg:self-auto">
        
        {/* Descartar Rascunho (se houver rascunho não salvo) */}
        {hasActiveDraft && !isSaved && (
          <button
            type="button"
            onClick={onDiscardDraft}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent transition flex items-center gap-1.5 cursor-pointer"
            title="Descartar rascunho em memória e zerar tela"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Descartar</span>
          </button>
        )}

        {/* Novo Pedido em Branco */}
        <button
          type="button"
          onClick={onNewOrder}
          className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
          title="Iniciar novo pedido em branco com novo número sequencial"
        >
          <PlusCircle className="w-3.5 h-3.5 text-emerald-500" />
          <span>Novo Pedido</span>
        </button>

        {/* Exportar Excel */}
        <button
          type="button"
          onClick={onExportExcel}
          className="px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition flex items-center gap-1.5 cursor-pointer"
          title="Exportar planilha Excel do pedido e grade de distribuição"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden sm:inline">Excel</span>
        </button>

        {/* Gerar PDF */}
        <button
          type="button"
          onClick={onExportPDF}
          className="px-3 py-2 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900 transition flex items-center gap-1.5 cursor-pointer"
          title="Gerar Romaneio PDF com espelho de caixas para doca"
        >
          <FileText className="w-3.5 h-3.5 text-rose-600" />
          <span className="hidden sm:inline">PDF</span>
        </button>

        {/* Botão Primário: Gravar no SQLite */}
        <button
          type="button"
          onClick={onSaveOrder}
          className="px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/25 hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer hover:scale-102 active:scale-98"
          title="Gravar este pedido no banco de dados SQLite físico"
        >
          <Save className="w-4 h-4" />
          <span>Salvar no SQLite</span>
        </button>

      </div>
    </div>
  );
};
