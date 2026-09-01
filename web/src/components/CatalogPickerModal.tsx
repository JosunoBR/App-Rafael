import React, { useState } from 'react';
import { Package, X, Search, ImageIcon, Building2, Plus } from 'lucide-react';
import { Product } from '../shared/types';

interface CatalogPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  currentSupplierId?: string;
  currentSupplierName?: string;
  onSelectProduct: (product: Product) => void;
}

export const CatalogPickerModal: React.FC<CatalogPickerModalProps> = ({
  isOpen,
  onClose,
  products,
  currentSupplierId,
  currentSupplierName,
  onSelectProduct
}) => {
  const [catalogSearch, setCatalogSearch] = useState('');

  if (!isOpen) return null;

  const filteredProducts = products.filter(p => {
    const s = catalogSearch.toLowerCase();
    const desc = p.descricao.toLowerCase();
    const codInt = (p.codigoInterno || p.codigo || '').toLowerCase();
    const codForn = (p.codigoFornecedor || '').toLowerCase();
    const cat = (p.categoria || '').toLowerCase();
    const matchSearch = desc.includes(s) || codInt.includes(s) || codForn.includes(s) || cat.includes(s);
    
    const matchSupplier = currentSupplierId
      ? (p.supplierId === currentSupplierId || (p.nomeFornecedor === currentSupplierName))
      : true;
    
    return matchSearch && matchSupplier;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        
        {/* Header do Modal */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Selecionar Produto do Catálogo
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {currentSupplierId 
                  ? `Exibindo apenas produtos do fornecedor: ${currentSupplierName}` 
                  : 'Clique em um produto cadastrado com foto para adicioná-lo ao pedido'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Busca no modal */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              placeholder="Pesquisar por nome, código ou categoria..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
              autoFocus
            />
          </div>
        </div>

        {/* Lista de Produtos com Fotos */}
        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredProducts.map(prod => (
            <div
              key={prod.id}
              onClick={() => onSelectProduct(prod)}
              className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 hover:border-indigo-500 dark:hover:border-indigo-500 bg-white dark:bg-slate-800/80 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition cursor-pointer flex items-center gap-3.5 group shadow-xs hover:shadow-md"
            >
              {/* Foto */}
              <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-900 overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center relative">
                {prod.fotoUrl ? (
                  <img src={prod.fotoUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-slate-400" />
                )}
              </div>

              {/* Dados */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span className="text-[10px] font-bold font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/60" title="Código Interno">
                    {prod.codigoInterno || prod.codigo}
                  </span>
                  {prod.codigoFornecedor && (
                    <span className="text-[9px] font-bold font-mono text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800" title="Código do Fornecedor">
                      Ref: {prod.codigoFornecedor}
                    </span>
                  )}
                  {prod.categoria && (
                    <span className="text-[10px] text-slate-400 truncate">
                      {prod.categoria}
                    </span>
                  )}
                  {prod.nomeFornecedor && (
                    <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.5 rounded-md flex items-center gap-1 truncate max-w-[150px]">
                      <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{prod.nomeFornecedor}</span>
                    </span>
                  )}
                </div>

                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate mb-1.5" title={prod.descricao}>
                  {prod.descricao}
                </h4>

                {/* Preço em Grande Destaque e Embalagem */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-baseline gap-1 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 shadow-2xs">
                    <span className="text-[11px] font-bold tracking-normal opacity-80">R$</span>
                    <span className="text-base sm:text-lg font-black font-mono tracking-tight leading-none">
                      {Number(prod.precoUnitarioPadrao || 0).toFixed(2)}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600/80 dark:text-emerald-400/80">/un</span>
                  </span>

                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
                    Emb: <strong className="text-slate-800 dark:text-slate-200">{prod.qtdPorPacote} un/cx</strong>
                  </span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/60 group-hover:bg-indigo-600 group-hover:text-white text-slate-400 transition shrink-0">
                <Plus className="w-4 h-4" />
              </div>
            </div>
          ))}

          {filteredProducts.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium">Nenhum produto encontrado no catálogo.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
