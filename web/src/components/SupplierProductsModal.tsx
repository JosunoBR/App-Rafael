import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Package, 
  Calendar, 
  Truck, 
  Clock, 
  Store, 
  Building2, 
  CheckCircle2, 
  Filter,
  FileSpreadsheet,
  Activity,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';
import { SupplierMovementSummary, SupplierProductMovementDetail } from '../utils/productMovementsAnalytics';

interface SupplierProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: SupplierMovementSummary | null;
  storeName?: string;
  year: number;
}

export const SupplierProductsModal: React.FC<SupplierProductsModalProps> = ({
  isOpen,
  onClose,
  supplier,
  storeName,
  year
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'delivered' | 'pending'>('all');

  // Filtra os produtos com base na busca e status
  const filteredProducts = useMemo(() => {
    if (!supplier) return [];
    let list = supplier.produtos;

    if (statusFilter === 'delivered') {
      list = list.filter(p => p.isDelivered);
    } else if (statusFilter === 'pending') {
      list = list.filter(p => !p.isDelivered);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p => 
        p.productDescription.toLowerCase().includes(q) ||
        p.productCode.toLowerCase().includes(q) ||
        (p.productBarcode && p.productBarcode.toLowerCase().includes(q)) ||
        p.orderNumber.toLowerCase().includes(q)
      );
    }

    return list;
  }, [supplier, statusFilter, searchTerm]);

  // Contagem de peças filtradas
  const totalPecasFiltradas = useMemo(() => {
    return filteredProducts.reduce((sum, p) => sum + p.quantidadeLoja, 0);
  }, [filteredProducts]);

  if (!isOpen || !supplier) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Cabeçalho do Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-850/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                  {supplier.supplierName}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                  {year}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Destino:</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {storeName || 'Todas as Lojas da Rede'}
                </strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
            title="Fechar (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Indicadores Físicos do Fornecedor */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Total Físico
            </span>
            <div className="font-mono font-black text-slate-900 dark:text-white text-base">
              {supplier.totalPecas.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-400">un</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-0.5">
              Peças Entregues
            </span>
            <div className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">
              {supplier.pecasEntregues.toLocaleString('pt-BR')} <span className="text-xs font-normal text-emerald-500/70">un</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
              Previstas na Esteira
            </span>
            <div className="font-mono font-black text-slate-700 dark:text-slate-300 text-base">
              {supplier.pecasPrevistas.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-400">un</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Variedade & Pedidos
            </span>
            <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">
              {supplier.totalProdutosDistintos} itens • {supplier.pedidosCount} pedidos
            </div>
          </div>
        </div>

        {/* Termômetro de Confiabilidade (Pontualidade nas Entregas & Rupturas) */}
        {supplier.reliability && (
          <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-850/60 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${
                supplier.reliability.nivelConfiabilidade === 'excelente'
                  ? 'bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-950'
                  : supplier.reliability.nivelConfiabilidade === 'atencao'
                  ? 'bg-amber-500 ring-2 ring-amber-200 dark:ring-amber-950'
                  : 'bg-rose-500 ring-2 ring-rose-200 dark:ring-rose-950'
              }`} />
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-slate-400" />
                Termômetro de Confiabilidade:
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                supplier.reliability.nivelConfiabilidade === 'excelente'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                  : supplier.reliability.nivelConfiabilidade === 'atencao'
                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                  : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
              }`}>
                {supplier.reliability.labelConfiabilidade}
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-600 dark:text-slate-300">
              <span title={`${supplier.reliability.pedidosNoPrazo} pedidos entregues rigorosamente no prazo`}>
                Pontualidade: <strong className="text-slate-900 dark:text-white">{supplier.reliability.taxaPontualidade}%</strong>
                {supplier.reliability.pedidosAtrasados > 0 && (
                  <span className="text-slate-400 ml-1">
                    ({supplier.reliability.pedidosAtrasados} atrasados)
                  </span>
                )}
              </span>

              {supplier.reliability.mediaDiasAtraso > 0 && (
                <span className="text-amber-700 dark:text-amber-400">
                  Méd. Atraso: <strong>+{supplier.reliability.mediaDiasAtraso}d</strong>
                </span>
              )}

              <span>
                Cortes/Rupturas: <strong className={supplier.reliability.taxaRuptura > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                  {supplier.reliability.taxaRuptura}%
                </strong>
                {supplier.reliability.pecasCortadas > 0 && (
                  <span className="text-slate-400 ml-1">
                    ({supplier.reliability.pecasCortadas.toLocaleString('pt-BR')} un)
                  </span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Toolbar de Busca e Filtros */}
        <div className="p-3 sm:px-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/40 dark:bg-slate-900/60">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por descrição, referência, código ou nº pedido..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            />
          </div>

          {/* Filtro de Status das Peças */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Todos ({supplier.produtos.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('delivered')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                statusFilter === 'delivered'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Entregues
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                statusFilter === 'pending'
                  ? 'bg-slate-700 dark:bg-slate-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Na Esteira
            </button>
          </div>
        </div>

        {/* Lista de Produtos Enviados */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Package className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-xs font-medium">Nenhum produto localizado com os filtros selecionados.</p>
            </div>
          ) : (
            filteredProducts.map((prod, idx) => (
              <div 
                key={`${prod.orderId}_${prod.itemId}_${idx}`}
                className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 p-2 rounded-xl transition"
              >
                {/* Lado Esquerdo: Imagem + Detalhes do Produto */}
                <div className="flex items-center gap-3 min-w-0">
                  {/* Foto do Produto ou Ícone Sóbrio */}
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                    {prod.photoUrl ? (
                      <img 
                        src={prod.photoUrl} 
                        alt={prod.productDescription} 
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Package className="w-5 h-5 text-slate-400" />
                    )}
                  </div>

                  {/* Descrição, Código e Pedido */}
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate" title={prod.productDescription}>
                      {prod.productDescription}
                    </h4>
                    
                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                        Cód: {prod.productCode}
                      </span>
                      {prod.productBarcode && (
                        <span className="font-mono text-[10px] text-slate-400">
                          EAN: {prod.productBarcode}
                        </span>
                      )}
                      <span>•</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        Pedido #{prod.orderNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11px]">
                      <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 font-mono">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {prod.dateType}: <strong className="text-slate-700 dark:text-slate-200">{prod.orderDateBr}</strong>
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md uppercase tracking-wider ${
                        prod.isDelivered
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                      }`}>
                        {prod.orderStatus}
                      </span>
                      {prod.isRuptura && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
                          Corte / Ruptura
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lado Direito: Quantidade Destinada em Destaque */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 border-t sm:border-t-0 pt-1.5 sm:pt-0 border-slate-100 dark:border-slate-800">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-medium text-slate-400 block">
                      {storeName ? `Qtd para ${storeName}` : 'Qtd Enviada'}
                    </span>
                    <span className="font-mono text-base font-black text-slate-900 dark:text-white">
                      {prod.quantidadeLoja.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-400">un</span>
                    </span>
                  </div>

                  {prod.quantidadeTotalPedido > prod.quantidadeLoja && (
                    <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                      de {prod.quantidadeTotalPedido.toLocaleString('pt-BR')} un do pedido
                    </span>
                  )}
                </div>

              </div>
            ))
          )}
        </div>

        {/* Rodapé com Totalizador Físico e Botão de Fechar */}
        <div className="p-3 sm:px-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-between text-xs">
          <div className="text-slate-500 font-mono">
            Exibindo <strong className="text-slate-800 dark:text-slate-200">{filteredProducts.length}</strong> remessas • Total: <strong className="text-emerald-600 dark:text-emerald-400">{totalPecasFiltradas.toLocaleString('pt-BR')} un</strong>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
