import React, { useState, useMemo } from 'react';
import { 
  Warehouse, 
  Boxes, 
  Search, 
  Plus, 
  Minus, 
  PackageCheck, 
  TrendingUp, 
  AlertCircle, 
  MapPin, 
  Send, 
  Edit3,
  Layers,
  X,
  PlusCircle
} from 'lucide-react';
import { CentralStockItem, StoreConfig, FiscalConfig, Product, Supplier } from '../shared/types';

interface CentralStockPageProps {
  stockItems: CentralStockItem[];
  products: Product[];
  suppliers: Supplier[];
  stores: StoreConfig[];
  fiscalConfig: FiscalConfig;
  onUpdateStockBalance: (stockId: string, deltaUnidades: number, newLocation?: string) => void;
  onSaveNewStockItem: (item: CentralStockItem) => void;
  onGenerateStockSeparation: (itemsToTransfer: Array<{ stockItem: CentralStockItem; caixasParaSeparar: number }>) => void;
  onNavigateToSeparation: () => void;
}

export const CentralStockPage: React.FC<CentralStockPageProps> = ({
  stockItems = [],
  products = [],
  suppliers = [],
  stores = [],
  fiscalConfig,
  onUpdateStockBalance,
  onSaveNewStockItem,
  onGenerateStockSeparation,
  onNavigateToSeparation
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Itens selecionados para o Romaneio de Transferência: { [stockId]: unidadesAEnviar }
  const [selectedTransferItems, setSelectedTransferItems] = useState<Record<string, number>>({});
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  
  // Modal de Ajuste / Entrada de Estoque
  const [editingStockItem, setEditingStockItem] = useState<CentralStockItem | null>(null);
  const [adjustUnidadesDelta, setAdjustUnidadesDelta] = useState<string>('100');
  const [adjustLocation, setAdjustLocation] = useState<string>('');
  
  // Modal de Novo Item no CD
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>('');
  const [newSaldoUnidades, setNewSaldoUnidades] = useState<string>('120');
  const [newLocationGalpao, setNewLocationGalpao] = useState<string>('Rua A - Palete 01');

  // Modal de Zoom de Imagem
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);

  // Lista de Categorias
  const categories = useMemo(() => {
    const set = new Set<string>();
    (stockItems || []).forEach(it => {
      if (it?.categoria) set.add(it.categoria);
    });
    return Array.from(set);
  }, [stockItems]);

  // Itens Filtrados
  const filteredStock = useMemo(() => {
    return (stockItems || []).filter(item => {
      if (!item) return false;
      const s = (searchTerm || '').toLowerCase();
      const codInt = (item.codigoInterno || item.codigo || '').toLowerCase();
      const codForn = (item.codigoFornecedor || '').toLowerCase();
      const codBarras = (item.codigoBarras || '').toLowerCase();
      const desc = (item.descricao || '').toLowerCase();
      const forn = (item.fornecedorOrigem || '').toLowerCase();
      const loc = (item.localizacaoGalpao || '').toLowerCase();

      const matchSearch = !s || codInt.includes(s) || codForn.includes(s) || codBarras.includes(s) || desc.includes(s) || forn.includes(s) || loc.includes(s);
      const matchCat = selectedCategory === 'all' || item.categoria === selectedCategory;

      return matchSearch && matchCat;
    });
  }, [stockItems, searchTerm, selectedCategory]);

  // Métricas Consolidadas (KPIs)
  const metrics = useMemo(() => {
    const list = stockItems || [];
    const totalItens = list.length;
    const totalUnidades = list.reduce((sum, item) => sum + (Number(item?.saldoUnidades) || 0), 0);
    const valorPatrimonial = list.reduce((sum, item) => sum + ((Number(item?.saldoUnidades) || 0) * (Number(item?.precoUnitario) || 0)), 0);
    const valorTotalPdv = list.reduce((sum, item) => sum + ((Number(item?.saldoUnidades) || 0) * (Number(item?.pdvSugerido) || 12.0)), 0);
    const itensComSaldoBaixo = list.filter(item => (Number(item?.saldoUnidades) || 0) <= 60).length;

    return {
      totalItens,
      totalUnidades,
      totalPecas: totalUnidades,
      valorPatrimonial,
      valorTotalPdv,
      lucroPotencial: valorTotalPdv - valorPatrimonial,
      itensComSaldoBaixo
    };
  }, [stockItems]);

  // Total selecionado para transferência
  const selectedCount = Object.keys(selectedTransferItems).length;
  const totalUnidadesTransferencia = Object.values(selectedTransferItems).reduce((sum, val) => sum + (Number(val) || 0), 0);

  // Handlers de Seleção e Transferência
  const toggleItemSelection = (item: CentralStockItem) => {
    setSelectedTransferItems(prev => {
      const next = { ...prev };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = Math.min(Math.max(1, item.saldoUnidades), 100);
      }
      return next;
    });
  };

  const handleTransferUnitsChange = (stockId: string, units: number, maxUnits: number) => {
    const validUnits = Math.max(1, Math.min(units, maxUnits));
    setSelectedTransferItems(prev => ({
      ...prev,
      [stockId]: validUnits
    }));
  };

  const handleConfirmTransferOrder = () => {
    const itemsToTransfer: Array<{ stockItem: CentralStockItem; caixasParaSeparar: number }> = [];

    Object.entries(selectedTransferItems).forEach(([stockId, units]) => {
      const stockItem = stockItems.find(s => s.id === stockId);
      if (stockItem && units > 0) {
        itemsToTransfer.push({
          stockItem,
          caixasParaSeparar: units
        });
      }
    });

    if (itemsToTransfer.length === 0) return;

    onGenerateStockSeparation(itemsToTransfer);
    setIsTransferModalOpen(false);
    setSelectedTransferItems({});
  };

  const handleSaveStockAdjustment = () => {
    if (!editingStockItem) return;
    const delta = parseInt(adjustUnidadesDelta, 10) || 0;
    onUpdateStockBalance(editingStockItem.id, delta, adjustLocation.trim() || undefined);
    setEditingStockItem(null);
  };

  const handleAddNewItemToStock = () => {
    const prod = products.find(p => p.id === selectedProductToAdd);
    if (!prod) return;

    const unidades = parseInt(newSaldoUnidades, 10) || 120;
    const codInterno = prod.codigoInterno || prod.codigo || '';
    const newItem: CentralStockItem = {
      id: 'stock_' + Date.now(),
      productId: prod.id,
      codigo: codInterno,
      codigoInterno: codInterno,
      codigoFornecedor: prod.codigoFornecedor,
      codigoBarras: prod.codigoBarras || prod.eanBarcode,
      descricao: prod.descricao,
      categoria: prod.categoria || 'Geral',
      fotoUrl: prod.fotoUrl,
      saldoUnidades: unidades,
      precoUnitario: prod.precoUnitarioPadrao || 0,
      pdvSugerido: prod.pdvSugerido || 12.0,
      localizacaoGalpao: newLocationGalpao.trim() || 'Rua A - Palete 01',
      fornecedorOrigem: prod.nomeFornecedor || 'Fornecedor Cadastrado',
      dataUltimaEntrada: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString()
    };

    onSaveNewStockItem(newItem);
    setIsNewItemModalOpen(false);
    setSelectedProductToAdd('');
    setNewSaldoUnidades('120');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header do Módulo do Depósito Central */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0">
            <Warehouse className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Estoque do Depósito Central (CD Matriz)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800">
                {metrics.totalItens} Itens Estocados
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Gerencie saldos em peças/unidades no galpão, endereçamento e crie ordens de separação para distribuição às lojas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsNewItemModalOpen(true)}
            className="h-8 px-3 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>Dar Entrada / Novo Item</span>
          </button>

          {selectedCount > 0 ? (
            <button
              onClick={() => setIsTransferModalOpen(true)}
              className="h-8 px-3.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/30 transition flex items-center gap-2 cursor-pointer animate-pulse"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gerar Romaneio ({selectedCount} itens • {totalUnidadesTransferencia.toLocaleString('pt-BR')} peças)</span>
            </button>
          ) : (
            <button
              onClick={onNavigateToSeparation}
              className="h-8 px-3 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition flex items-center gap-1.5 cursor-pointer"
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>Ver Fila de Separação Doca</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Barra Unificada de Métricas de Patrimônio e Volume */}
      <div className="bg-white dark:bg-slate-900 py-2.5 px-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 text-xs">
        
        {/* Total Unidades */}
        <div className="flex items-center gap-2.5 min-w-0" title="Saldo Total em Unidades">
          <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Boxes className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Saldo Unidades</span>
            <div className="font-mono font-black text-slate-900 dark:text-white text-xs truncate">
              {metrics.totalUnidades.toLocaleString('pt-BR')}
            </div>
          </div>
        </div>

        <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

        {/* Total Peças / Itens */}
        <div className="flex items-center gap-2.5 min-w-0" title="Total de Peças Fracionáveis">
          <div className="p-1 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Total de Peças</span>
            <div className="font-mono font-black text-slate-900 dark:text-white text-xs truncate">
              {metrics.totalPecas.toLocaleString('pt-BR')}
            </div>
          </div>
        </div>

        <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

        {/* Valor Patrimonial */}
        <div className="flex items-center gap-2.5 min-w-0" title="Valor Patrimonial Total em Estoque">
          <div className="p-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Patrimônio (Custo)</span>
            <div className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs truncate">
              R$ {metrics.valorPatrimonial.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

        {/* Saldo Baixo */}
        <div className="flex items-center gap-2.5 min-w-0" title="Itens com estoque baixo (≤ 60 un)">
          <div className="p-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
            <AlertCircle className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Atenção / Saldo Baixo</span>
            <div className="font-mono font-black text-xs truncate text-slate-900 dark:text-white">
              {metrics.itensComSaldoBaixo} <span className="text-[10px] font-normal text-slate-400 font-sans">itens</span>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Barra de Busca & Filtros */}
      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por descrição, código interno, EAN, fornecedor ou posição no galpão..."
            className="w-full h-8 pl-8 pr-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Filtro de Categoria */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Todas as Categorias
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. Tabela de Estoque Físico do Depósito Central */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-3.5 text-center w-12">
                  <span className="sr-only">Seleção</span>
                </th>
                <th className="py-3 px-2 w-14 text-center">Foto</th>
                <th className="py-3 px-3 min-w-[120px] whitespace-nowrap">Cód. Interno</th>
                <th className="py-3 px-3 min-w-[130px] whitespace-nowrap">Cód. Barras (EAN)</th>
                <th className="py-3 px-3 min-w-[220px]">Descrição do Produto</th>
                <th className="py-3 px-3 min-w-[140px]">Endereço / Galpão</th>
                <th className="py-3 px-3 text-right min-w-[110px] whitespace-nowrap bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 font-extrabold">
                  Saldo Unidades
                </th>
                <th className="py-3 px-3 text-right min-w-[110px] whitespace-nowrap">Custo Unit.</th>
                <th className="py-3 px-3 text-right min-w-[130px] whitespace-nowrap font-bold">Valor Total</th>
                <th className="py-3 px-3 text-center min-w-[110px] whitespace-nowrap">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStock.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Nenhum produto em estoque encontrado com o filtro aplicado.
                  </td>
                </tr>
              ) : (
                filteredStock.map((item) => {
                  const isSelected = selectedTransferItems[item.id] !== undefined;
                  const valorTotalItem = (item.saldoUnidades || 0) * (item.precoUnitario || 0);
                  const matchedProd = products.find(p => p.id === item.productId || (p.codigoInterno && p.codigoInterno === item.codigo) || p.codigo === item.codigo);
                  const barcode = item.codigoBarras || matchedProd?.codigoBarras || matchedProd?.eanBarcode || '';

                  return (
                    <tr 
                      key={item.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition ${
                        isSelected ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                      }`}
                    >
                      {/* Checkbox de Seleção para Romaneio */}
                      <td className="py-3 px-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleItemSelection(item)}
                          disabled={(item.saldoUnidades || 0) <= 0}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* Foto / Imagem */}
                      <td className="py-3 px-2 text-center">
                        {item.fotoUrl ? (
                          <img
                            src={item.fotoUrl}
                            alt={item.descricao}
                            onClick={() => setZoomedImage({ url: item.fotoUrl!, title: item.descricao })}
                            className="w-10 h-10 object-cover rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:scale-105 transition mx-auto"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto text-[10px] font-bold">
                            SEM FOTO
                          </div>
                        )}
                      </td>

                      {/* Código Interno */}
                      <td className="py-3 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        {item.codigoInterno || item.codigo}
                      </td>

                      {/* Código de Barras (EAN) */}
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap text-[11px]">
                        {barcode ? (
                          <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {barcode}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Descrição & Fornecedor */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.descricao}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>{item.categoria || 'Geral'}</span>
                          {item.fornecedorOrigem && (
                            <>
                              <span>•</span>
                              <span className="truncate">{item.fornecedorOrigem}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Localização no Galpão */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="font-mono text-[11px]">{item.localizacaoGalpao || 'Geral CD'}</span>
                        </div>
                      </td>

                      {/* Saldo em Unidades */}
                      <td className="py-3 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20 whitespace-nowrap text-sm">
                        {(item.saldoUnidades || 0).toLocaleString('pt-BR')} un
                      </td>

                      {/* Custo Unitário */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        R$ {(item.precoUnitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Valor Total */}
                      <td className="py-3 px-3 text-right font-mono font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                        R$ {valorTotalItem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingStockItem(item);
                              setAdjustUnidadesDelta('50');
                              setAdjustLocation(item.localizacaoGalpao || '');
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                            title="Ajustar saldo de unidades ou localização"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => toggleItemSelection(item)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                              isSelected
                                ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                            }`}
                            title={isSelected ? 'Remover do romaneio' : 'Incluir no romaneio'}
                          >
                            {isSelected ? 'Remover' : '+ Romaneio'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL DE CONFIRMAÇÃO DO ROMANEIO DE TRANSFERÊNCIA */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-950/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Gerar Romaneio de Transferência do Depósito
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Defina quantas unidades de cada item serão distribuídas proporcionalmente entre as lojas
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Lista de Itens Selecionados */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                Produtos Selecionados ({selectedCount})
              </div>

              {Object.entries(selectedTransferItems).map(([stockId, unidades]) => {
                const item = stockItems.find(s => s.id === stockId);
                if (!item) return null;

                return (
                  <div 
                    key={stockId}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {item.fotoUrl && (
                        <img
                          src={item.fotoUrl}
                          alt={item.descricao}
                          className="w-12 h-12 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <span className="font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">
                          {item.codigo}
                        </span>
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {item.descricao}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Saldo Disponível no CD: <strong className="text-slate-700 dark:text-slate-300">{(item.saldoUnidades || 0).toLocaleString('pt-BR')} un</strong>
                        </div>
                      </div>
                    </div>

                    {/* Controle de Unidades a Transferir */}
                    <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => handleTransferUnitsChange(stockId, unidades - 10, item.saldoUnidades)}
                          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={item.saldoUnidades}
                          value={unidades}
                          onChange={(e) => handleTransferUnitsChange(stockId, parseInt(e.target.value, 10) || 1, item.saldoUnidades)}
                          className="w-16 text-center font-mono font-bold text-xs bg-transparent text-slate-900 dark:text-white outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => handleTransferUnitsChange(stockId, unidades + 10, item.saldoUnidades)}
                          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-right min-w-[70px]">
                        <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 block">
                          {unidades} un
                        </span>
                        <span className="text-[10px] text-slate-400">Rateio lojas</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">Resumo do Romaneio:</span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                  {totalUnidadesTransferencia.toLocaleString('pt-BR')} unidades totais para rateio entre as lojas
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmTransferOrder}
                  className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/30 transition flex items-center gap-2 cursor-pointer hover:scale-102"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Enviar para Separação na Doca</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 6. MODAL DE AJUSTE / ENTRADA DE ESTOQUE NO CD */}
      {editingStockItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Ajustar Saldo no Depósito
                  </h3>
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    {editingStockItem.codigo} • {editingStockItem.descricao}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setEditingStockItem(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-500">Saldo Atual no CD:</span>
                <strong className="text-slate-900 dark:text-white font-mono text-sm">{(editingStockItem.saldoUnidades || 0).toLocaleString('pt-BR')} un</strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Adicionar (+) ou Remover (-) Unidades:
              </label>
              <input
                type="number"
                value={adjustUnidadesDelta}
                onChange={(e) => setAdjustUnidadesDelta(e.target.value)}
                placeholder="Ex: +50 para entrada ou -20 para baixa"
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Novo saldo final resultante: <strong>{Math.max(0, (editingStockItem.saldoUnidades || 0) + (parseInt(adjustUnidadesDelta, 10) || 0))} un</strong>
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Endereçamento / Posição no Galpão:
              </label>
              <input
                type="text"
                value={adjustLocation}
                onChange={(e) => setAdjustLocation(e.target.value)}
                placeholder="Ex: Rua B - Palete 14"
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingStockItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveStockAdjustment}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition cursor-pointer"
              >
                Salvar Ajuste
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL DE NOVO ITEM NO CD (VINCULADO AO CATÁLOGO) */}
      {isNewItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Dar Entrada de Produto no CD
                  </h3>
                  <p className="text-xs text-slate-400">Vincule um produto do catálogo ao galpão</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewItemModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Selecione o Produto do Catálogo:
              </label>
              <select
                value={selectedProductToAdd}
                onChange={(e) => setSelectedProductToAdd(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium cursor-pointer"
              >
                <option value="">Selecione um produto...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.codigoInterno || p.codigo} - {p.descricao}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Quantidade Inicial de Unidades:
              </label>
              <input
                type="number"
                min="1"
                value={newSaldoUnidades}
                onChange={(e) => setNewSaldoUnidades(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Localização / Posição no Galpão:
              </label>
              <input
                type="text"
                value={newLocationGalpao}
                onChange={(e) => setNewLocationGalpao(e.target.value)}
                placeholder="Ex: Rua A - Palete 01"
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewItemModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!selectedProductToAdd}
                onClick={handleAddNewItemToStock}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 shadow-xs transition cursor-pointer"
              >
                Confirmar Entrada
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL DE ZOOM DE IMAGEM */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 p-2" onClick={(e) => e.stopPropagation()}>
            <img 
              src={zoomedImage.url} 
              alt={zoomedImage.title} 
              className="max-h-[65vh] w-auto mx-auto object-contain rounded-2xl" 
            />
            <div className="p-4 flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                {zoomedImage.title}
              </span>
              <button
                onClick={() => setZoomedImage(null)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
