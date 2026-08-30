import React, { useState, useMemo } from 'react';
import { 
  Warehouse, 
  Boxes, 
  Search, 
  Plus, 
  Minus, 
  PackageCheck, 
  ArrowRight, 
  TrendingUp, 
  Building2, 
  Sparkles, 
  Eye, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  Send, 
  FileSpreadsheet, 
  Layers,
  X,
  PlusCircle
} from 'lucide-react';
import { CentralStockItem, StoreConfig, FiscalConfig, Product, Supplier, PurchaseOrder } from '../shared/types';

interface CentralStockPageProps {
  stockItems: CentralStockItem[];
  products: Product[];
  suppliers: Supplier[];
  stores: StoreConfig[];
  fiscalConfig: FiscalConfig;
  onUpdateStockBalance: (stockId: string, deltaCaixas: number, newLocation?: string) => void;
  onSaveNewStockItem: (item: CentralStockItem) => void;
  onGenerateStockSeparation: (itemsToTransfer: Array<{ stockItem: CentralStockItem; caixasParaSeparar: number }>) => void;
  onNavigateToSeparation: () => void;
}

export const CentralStockPage: React.FC<CentralStockPageProps> = ({
  stockItems,
  products,
  suppliers,
  stores,
  fiscalConfig,
  onUpdateStockBalance,
  onSaveNewStockItem,
  onGenerateStockSeparation,
  onNavigateToSeparation
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Itens selecionados para o Romaneio de Transferência: { [stockId]: caixasAEnviar }
  const [selectedTransferItems, setSelectedTransferItems] = useState<Record<string, number>>({});
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  
  // Modal de Ajuste / Entrada de Estoque
  const [editingStockItem, setEditingStockItem] = useState<CentralStockItem | null>(null);
  const [adjustCaixasDelta, setAdjustCaixasDelta] = useState<string>('10');
  const [adjustLocation, setAdjustLocation] = useState<string>('');
  
  // Modal de Novo Item no CD
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>('');
  const [newSaldoCaixas, setNewSaldoCaixas] = useState<string>('20');
  const [newLocationGalpao, setNewLocationGalpao] = useState<string>('Rua A - Palete 01');

  // Modal de Zoom de Imagem
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);

  // Lista de Categorias
  const categories = useMemo(() => {
    const set = new Set<string>();
    stockItems.forEach(it => {
      if (it.categoria) set.add(it.categoria);
    });
    return Array.from(set);
  }, [stockItems]);

  // Itens Filtrados
  const filteredStock = useMemo(() => {
    return stockItems.filter(item => {
      const s = searchTerm.toLowerCase();
      const codInt = (item.codigoInterno || item.codigo || '').toLowerCase();
      const codForn = (item.codigoFornecedor || '').toLowerCase();
      const codBarras = (item.codigoBarras || '').toLowerCase();
      const desc = item.descricao.toLowerCase();
      const forn = (item.fornecedorOrigem || '').toLowerCase();
      const loc = (item.localizacaoGalpao || '').toLowerCase();

      const matchesSearch = 
        desc.includes(s) ||
        codInt.includes(s) ||
        codForn.includes(s) ||
        codBarras.includes(s) ||
        forn.includes(s) ||
        loc.includes(s);

      const matchesCat = selectedCategory === 'all' || item.categoria === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [stockItems, searchTerm, selectedCategory]);

  // KPIs de Estoque
  const metrics = useMemo(() => {
    const totalCaixas = stockItems.reduce((acc, it) => acc + (it.saldoCaixas || 0), 0);
    const totalPecas = stockItems.reduce((acc, it) => acc + (it.saldoUnidades || 0), 0);
    const valorPatrimonial = stockItems.reduce((acc, it) => acc + ((it.saldoUnidades || 0) * (it.precoUnitario || 0)), 0);
    const itensComSaldoBaixo = stockItems.filter(it => it.saldoCaixas <= 5).length;

    return { totalCaixas, totalPecas, valorPatrimonial, itensComSaldoBaixo };
  }, [stockItems]);

  // Contagem de itens no carrinho de transferência
  const selectedCount = Object.keys(selectedTransferItems).length;
  const totalCaixasTransferencia = Object.values(selectedTransferItems).reduce((sum, q) => sum + (q || 0), 0);

  const toggleItemSelection = (item: CentralStockItem) => {
    setSelectedTransferItems(prev => {
      const next = { ...prev };
      if (next[item.id] !== undefined) {
        delete next[item.id];
      } else {
        // Quantidade padrão de caixas para enviar: 10 caixas ou o saldo disponível
        next[item.id] = Math.min(10, Math.max(1, item.saldoCaixas));
      }
      return next;
    });
  };

  const handleTransferBoxChange = (stockId: string, boxes: number, maxBoxes: number) => {
    const validBoxes = Math.max(1, Math.min(boxes, maxBoxes));
    setSelectedTransferItems(prev => ({
      ...prev,
      [stockId]: validBoxes
    }));
  };

  const handleConfirmTransferOrder = () => {
    const itemsToTransfer: Array<{ stockItem: CentralStockItem; caixasParaSeparar: number }> = [];

    Object.entries(selectedTransferItems).forEach(([stockId, caixas]) => {
      const stockItem = stockItems.find(s => s.id === stockId);
      if (stockItem && caixas > 0) {
        itemsToTransfer.push({
          stockItem,
          caixasParaSeparar: caixas
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
    const delta = parseInt(adjustCaixasDelta, 10) || 0;
    onUpdateStockBalance(editingStockItem.id, delta, adjustLocation.trim() || undefined);
    setEditingStockItem(null);
  };

  const handleAddNewItemToStock = () => {
    const prod = products.find(p => p.id === selectedProductToAdd);
    if (!prod) return;

    const caixas = parseInt(newSaldoCaixas, 10) || 10;
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
      qtdPorPacote: prod.qtdPorPacote || 12,
      saldoCaixas: caixas,
      saldoUnidades: caixas * (prod.qtdPorPacote || 12),
      precoUnitario: prod.precoUnitarioPadrao || 0,
      pdvSugerido: prod.pdvSugerido || 0,
      localizacaoGalpao: newLocationGalpao.trim() || 'Rua A - Palete 01',
      fornecedorOrigem: prod.nomeFornecedor || 'Fornecedor Cadastrado',
      dataUltimaEntrada: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString()
    };

    onSaveNewStockItem(newItem);
    setIsNewItemModalOpen(false);
    setSelectedProductToAdd('');
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
                {stockItems.length} Itens Estocados
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Gerencie saldos em caixas/peças no galpão, endereçamento e crie romaneios de separação para distribuição às 20 lojas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsNewItemModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-emerald-500" />
            <span>Dar Entrada / Novo Item</span>
          </button>

          {selectedCount > 0 ? (
            <button
              onClick={() => setIsTransferModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/30 transition flex items-center gap-2 cursor-pointer animate-pulse hover:scale-102"
            >
              <Send className="w-4 h-4" />
              <span>Gerar Romaneio ({selectedCount} itens • {totalCaixasTransferencia} cx)</span>
            </button>
          ) : (
            <button
              onClick={onNavigateToSeparation}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition flex items-center gap-1.5 cursor-pointer"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Ver Fila de Separação Doca</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Cards de Métricas de Patrimônio e Volume */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Caixas */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
            <span>Saldo em Caixas</span>
            <Boxes className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {metrics.totalCaixas.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-400">cx</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Prontas para carregamento
          </span>
        </div>

        {/* Total Peças */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
            <span>Total de Peças / Unidades</span>
            <Layers className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {metrics.totalPecas.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-400">un</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Volume físico fracionável
          </span>
        </div>

        {/* Valor Patrimonial */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
            <span>Valor Patrimonial (Custo)</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            R$ {metrics.valorPatrimonial.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Capital estocado no depósito
          </span>
        </div>

        {/* Alerta de Estoque Baixo */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
            <span>Atenção / Saldo Baixo</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {metrics.itensComSaldoBaixo} <span className="text-xs font-normal text-slate-400">itens</span>
          </div>
          <span className="text-[11px] text-rose-500 font-semibold mt-0.5 block">
            Saldo ≤ 5 caixas no galpão
          </span>
        </div>

      </div>

      {/* 3. Barra de Busca & Filtros */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código, descrição, localização (rua/palete) ou fornecedor..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
          />
        </div>

        {/* Filtro por Categoria */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Todas ({stockItems.length})
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
                <th className="py-3 px-3 text-center min-w-[80px] whitespace-nowrap">Peças/CX</th>
                <th className="py-3 px-3 text-right min-w-[110px] whitespace-nowrap bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300">
                  Saldo Caixas
                </th>
                <th className="py-3 px-3 text-right min-w-[110px] whitespace-nowrap">Saldo Peças</th>
                <th className="py-3 px-3 text-right min-w-[110px] whitespace-nowrap">Custo Unit.</th>
                <th className="py-3 px-3 text-right min-w-[130px] whitespace-nowrap font-bold">Valor Total</th>
                <th className="py-3 px-3 text-center min-w-[110px] whitespace-nowrap">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStock.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    Nenhum produto em estoque encontrado com o filtro aplicado.
                  </td>
                </tr>
              ) : (
                filteredStock.map((item) => {
                  const isSelected = selectedTransferItems[item.id] !== undefined;
                  const valorTotalItem = item.saldoUnidades * item.precoUnitario;
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
                          disabled={item.saldoCaixas <= 0}
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

                      {/* Peças por Caixa */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {item.qtdPorPacote} un/cx
                      </td>

                      {/* Saldo em Caixas */}
                      <td className="py-3 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20 whitespace-nowrap text-sm">
                        {item.saldoCaixas.toLocaleString('pt-BR')} cx
                      </td>

                      {/* Saldo em Peças */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {item.saldoUnidades.toLocaleString('pt-BR')} un
                      </td>

                      {/* Custo Unitário */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        R$ {item.precoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                              setAdjustCaixasDelta('10');
                              setAdjustLocation(item.localizacaoGalpao || '');
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                            title="Ajustar saldo de caixas ou localização"
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
                    Defina quantas caixas de cada item serão distribuídas proporcionalmente entre as 20 lojas
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

              {Object.entries(selectedTransferItems).map(([stockId, caixas]) => {
                const item = stockItems.find(s => s.id === stockId);
                if (!item) return null;

                const totalPecas = caixas * item.qtdPorPacote;

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
                          Saldo CD: <strong className="text-slate-700 dark:text-slate-300">{item.saldoCaixas} cx</strong> • {item.qtdPorPacote} un/cx
                        </div>
                      </div>
                    </div>

                    {/* Controle de Caixas a Transferir */}
                    <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => handleTransferBoxChange(stockId, caixas - 1, item.saldoCaixas)}
                          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={item.saldoCaixas}
                          value={caixas}
                          onChange={(e) => handleTransferBoxChange(stockId, parseInt(e.target.value, 10) || 1, item.saldoCaixas)}
                          className="w-14 text-center font-mono font-bold text-xs bg-transparent text-slate-900 dark:text-white outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => handleTransferBoxChange(stockId, caixas + 1, item.saldoCaixas)}
                          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-right min-w-[70px]">
                        <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 block">
                          {totalPecas} un
                        </span>
                        <span className="text-[10px] text-slate-400">Total peças</span>
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
                  {totalCaixasTransferencia} caixas totais para rateio entre 20 lojas
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
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-500">Saldo Atual no CD:</span>
                <strong className="text-slate-900 dark:text-white font-mono text-sm">{editingStockItem.saldoCaixas} cx ({editingStockItem.saldoUnidades} un)</strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Adicionar (+) ou Remover (-) Caixas:
              </label>
              <input
                type="number"
                value={adjustCaixasDelta}
                onChange={(e) => setAdjustCaixasDelta(e.target.value)}
                placeholder="Ex: +10 para entrada ou -5 para baixa"
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Novo saldo final resultante: <strong>{Math.max(0, editingStockItem.saldoCaixas + (parseInt(adjustCaixasDelta, 10) || 0))} cx</strong>
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
                className="p-1 text-slate-400 hover:text-slate-600"
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
                    {p.codigo} - {p.descricao} ({p.qtdPorPacote} un/cx)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Quantidade Inicial de Caixas:
              </label>
              <input
                type="number"
                min="1"
                value={newSaldoCaixas}
                onChange={(e) => setNewSaldoCaixas(e.target.value)}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-xl w-full bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl p-2">
            <img
              src={zoomedImage.url}
              alt={zoomedImage.title}
              className="w-full h-auto max-h-[75vh] object-contain rounded-2xl mx-auto"
            />
            <div className="p-3 text-center">
              <p className="text-sm font-bold text-white">{zoomedImage.title}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
