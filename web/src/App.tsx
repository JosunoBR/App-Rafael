import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { 
  Sidebar,
  ActiveNavTab
} from './components/Sidebar';
import { 
  Header 
} from './components/Header';
import { 
  HomePage 
} from './components/HomePage';
import { 
  OrderSummaryCards 
} from './components/OrderSummaryCards';
import { 
  OrderHeaderForm 
} from './components/OrderHeaderForm';
import { 
  OrderItemsTable 
} from './components/OrderItemsTable';
import { 
  FiscalPanelModal 
} from './components/FiscalPanelModal';
import { 
  SeparationMatrixModal 
} from './components/SeparationMatrixModal';
import { 
  DashboardView 
} from './components/DashboardView';
import { 
  SeparationPage 
} from './components/SeparationPage';
import { 
  SeparationHistoryPage 
} from './components/SeparationHistoryPage';
import { 
  ProductsCatalogPage 
} from './components/ProductsCatalogPage';
import { 
  SuppliersPage 
} from './components/SuppliersPage';
import { 
  OrderHistoryPage 
} from './components/OrderHistoryPage';
import { 
  FiscalSettingsPage 
} from './components/FiscalSettingsPage';
import { 
  UsersPage 
} from './components/UsersPage';
import { 
  LoginPage 
} from './components/LoginPage';
import { 
  MobilePurchasesView 
} from './components/MobilePurchasesView';
import { 
  MobileSeparationView 
} from './components/MobileSeparationView';
import { 
  FinancialBoletosPage 
} from './components/FinancialBoletosPage';
import { 
  CentralStockPage 
} from './components/CentralStockPage';

import { PurchaseOrder, OrderItem, FiscalConfig, StoreConfig, Supplier, User, Product, PaymentInstallment, CentralStockItem } from './shared/types';
import { 
  getInitialFiscalConfig, 
  getInitialStoresConfig, 
  createNewOrder, 
  loadCurrentOrder, 
  saveCurrentOrder, 
  clearCurrentDraft,
  saveOrderToHistory, 
  loadSavedOrdersList, 
  saveFiscalConfig, 
  saveStoresConfig,
  getSuppliersList,
  getProductsList,
  saveSupplier,
  deleteSupplier,
  saveProduct,
  deleteProduct,
  getNextOrderNumber,
  createRealisticMockOrder,
  loadCentralStock,
  saveCentralStock,
  updateStockBalance,
  createStockTransferOrder
} from './utils/storage';
import { 
  fetchSuppliersFromDb, 
  saveSupplierToDb, 
  deleteSupplierFromDb, 
  fetchProductsFromDb,
  saveProductToDb,
  deleteProductFromDb,
  fetchOrdersFromDb, 
  saveOrderToDb, 
  deleteOrderFromDb,
  updateInstallmentInDb,
  fetchFiscalConfigFromDb,
  saveFiscalConfigToDb,
  fetchNextOrderNumberFromDb
} from './utils/api';
import { exportOrderToExcel } from './utils/excelExporter';
import { exportCommercialOrderPDF, exportRomaneioPDF } from './utils/pdfExporter';
import { calculateOrderNetTotal, generateOrderInstallments } from './utils/installments';
import { calculateItemFiscal } from './shared/fiscalEngine';
import { calculateAutomaticSeparation } from './shared/separationEngine';
import { CheckCircle2, AlertCircle, Monitor, Smartphone, PackageCheck, AlertTriangle, Save, Trash2, Plus } from 'lucide-react';

export function App() {
  // 1. Estado de Autenticação (RBAC) - Inicia nulo para exigir login obrigatório
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('mega12_user');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email) return parsed;
      } catch {}
    }
    // Sem sessão salva: exige login
    return null;
  });

  // Navigation State: Agora inicia por padrão no Hub / Home
  const [activeNav, setActiveNav] = useState<ActiveNavTab>('home');

  // Modo de visualização: 'desktop' | 'mobile_purchases' | 'mobile_separation'
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile_purchases' | 'mobile_separation'>('desktop');

  // Theme state (Dark/Light)
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('mega12_theme_v1');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Global Configs & Lists
  const [fiscalConfig, setFiscalConfig] = useState<FiscalConfig>(getInitialFiscalConfig);
  const [storeConfigs, setStoreConfigs] = useState<StoreConfig[]>(getInitialStoresConfig);
  const [suppliers, setSuppliers] = useState<Supplier[]>(getSuppliersList);
  const [products, setProducts] = useState<Product[]>(getProductsList);
  const [centralStock, setCentralStock] = useState<CentralStockItem[]>(() => loadCentralStock());
  const [savedOrders, setSavedOrders] = useState<PurchaseOrder[]>(loadSavedOrdersList);

  // Active Purchase Order: carrega rascunho se existir ou inicia limpo
  const [order, setOrder] = useState<PurchaseOrder>(() => {
    const saved = loadCurrentOrder();
    if (saved) return saved;
    return createNewOrder(getInitialFiscalConfig(), getInitialStoresConfig());
  });

  // Identifica se o pedido em memória é um rascunho em aberto não salvo
  const isCurrentOrderSaved = savedOrders.some(o => o.header.id === order.header.id);
  const hasActiveDraft = Boolean(
    order && !isCurrentOrderSaved && (
      (order.items && order.items.length > 0) || 
      (order.header.fornecedor && order.header.fornecedor.trim() !== '')
    )
  );

  // Modais de contexto de item
  const [selectedFiscalItem, setSelectedFiscalItem] = useState<OrderItem | null>(null);
  const [selectedSeparationItem, setSelectedSeparationItem] = useState<OrderItem | null>(null);
  const [selectedCatalogSupplier, setSelectedCatalogSupplier] = useState<string>('all');
  const [selectedSupplierToEdit, setSelectedSupplierToEdit] = useState<string | null>(null);

  // Lista consolidada de pedidos (o pedido em edição em memória sobrepõe a versão antiga salva)
  const effectiveOrders = useMemo(() => {
    const map = new Map<string, PurchaseOrder>();
    savedOrders.forEach(o => {
      if (o?.header?.id) map.set(o.header.id, o);
    });
    if (order && order.header?.id) {
      map.set(order.header.id, order);
    }
    const list = Array.from(map.values());
    return list.length > 0 ? list : [order];
  }, [savedOrders, order]);

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Carregar dados iniciais do banco de dados SQLite
  useEffect(() => {
    async function loadFromSqlite() {
      try {
        const [dbSuppliers, dbProducts, dbOrders, dbFiscal] = await Promise.all([
          fetchSuppliersFromDb().catch(() => null),
          fetchProductsFromDb().catch(() => null),
          fetchOrdersFromDb().catch(() => null),
          fetchFiscalConfigFromDb().catch(() => null)
        ]);

        if (dbSuppliers && dbSuppliers.length > 0) setSuppliers(dbSuppliers);
        if (dbProducts && dbProducts.length > 0) setProducts(dbProducts);
        if (dbOrders && dbOrders.length > 0) setSavedOrders(dbOrders);
        if (dbFiscal) setFiscalConfig(dbFiscal);
      } catch (err) {
        console.warn('Usando armazenamento local de contingência:', err);
      }
    }
    loadFromSqlite();
  }, []);

  // Sync theme with <html> and <body> class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('mega12_theme_v1', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('mega12_theme_v1', 'light');
    }
  }, [isDark]);

  // Auto-save active order in local storage
  useEffect(() => {
    saveCurrentOrder(order);
  }, [order]);

  const toggleTheme = () => setIsDark(prev => !prev);

  const handleLogout = () => {
    localStorage.removeItem('mega12_user');
    setCurrentUser(null);
  };

  // Handlers for Order Header
  const handleHeaderChange = (updatedHeader: typeof order.header) => {
    setOrder(prev => ({ ...prev, header: updatedHeader }));
  };

  // Handlers for Items
  const handleUpdateItem = (itemId: string, updatedFields: Partial<OrderItem>) => {
    setOrder(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === itemId ? { ...item, ...updatedFields } : item)
    }));
  };

  const handleAddItem = (customItem?: OrderItem) => {
    if (customItem) {
      setOrder(prev => ({
        ...prev,
        items: [...prev.items, customItem]
      }));
      showToast(`Produto "${customItem.descricao}" adicionado.`);
      return;
    }
    const defaultItem: OrderItem = {
      id: 'item_' + Date.now(),
      codigo: `PROD-${order.items.length + 1}`,
      descricao: 'Novo Produto',
      qtdPorPacote: 12,
      qtdPacotes: 10,
      qtdTotalUnidades: 120,
      precoUnitario: 5.0,
      valorTotalBruto: 600,
      pdvAlvo: 12.0
    };
    const fiscalRes = calculateItemFiscal(defaultItem.precoUnitario, defaultItem.pdvAlvo, fiscalConfig);
    const sepRes = calculateAutomaticSeparation(defaultItem.qtdTotalUnidades, storeConfigs);
    defaultItem.despesasPdvUnit = fiscalRes.despesasPdvUnit;
    defaultItem.creditoIcmsUnit = fiscalRes.creditoIcmsUnit;
    defaultItem.custoRealEfetivo = fiscalRes.custoRealEfetivo;
    defaultItem.margemRealUnit = fiscalRes.margemRealUnit;
    defaultItem.margemPercentual = fiscalRes.margemPercentual;
    defaultItem.separacaoLojas = sepRes.allocations;
    defaultItem.qtdReservaEstoque = sepRes.reserveStock;

    setOrder(prev => ({
      ...prev,
      items: [...prev.items, defaultItem]
    }));
    showToast('Novo produto adicionado.');
  };

  const handleDeleteItem = (itemId: string) => {
    setOrder(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
    showToast('Item removido do pedido.', 'info');
  };

  const handleDuplicateItem = (itemToClone: OrderItem) => {
    const clonedItem: OrderItem = {
      ...itemToClone,
      id: 'item_' + Date.now(),
      descricao: `${itemToClone.descricao} (Cópia)`
    };

    setOrder(prev => ({
      ...prev,
      items: [...prev.items, clonedItem]
    }));
    showToast('Item duplicado com sucesso!');
  };

  // Iniciar novo pedido em branco
  const handleNewOrder = async () => {
    try {
      const nextNum = await fetchNextOrderNumberFromDb();
      const newOrd = createNewOrder(fiscalConfig, storeConfigs, nextNum);
      setOrder(newOrd);
      setActiveNav('orders');
      setViewMode('desktop');
      showToast(`Novo pedido ${nextNum} em branco iniciado!`);
    } catch (err) {
      const localNum = getNextOrderNumber();
      const newOrd = createNewOrder(fiscalConfig, storeConfigs, localNum);
      setOrder(newOrd);
      setActiveNav('orders');
      setViewMode('desktop');
      showToast(`Novo pedido ${localNum} em branco iniciado!`);
    }
  };

  // Continuar rascunho existente
  const handleContinueDraft = () => {
    setActiveNav('orders');
    setViewMode('desktop');
    showToast(`Continuando edição do pedido ${order.header.numeroPedido}.`);
  };

  // Descartar rascunho
  const handleDiscardDraft = async () => {
    clearCurrentDraft();
    try {
      const nextNum = await fetchNextOrderNumberFromDb();
      const clean = createNewOrder(fiscalConfig, storeConfigs, nextNum);
      setOrder(clean);
    } catch {
      const localNum = getNextOrderNumber();
      const clean = createNewOrder(fiscalConfig, storeConfigs, localNum);
      setOrder(clean);
    }
    showToast('Rascunho descartado. Pedido zerado.', 'info');
  };

  const handleSaveOrder = async () => {
    const savedOrderNumber = order.header.numeroPedido;
    const orderWithInstallments: PurchaseOrder = {
      ...order,
      installments: (order.installments && order.installments.length > 0)
        ? order.installments
        : generateOrderInstallments(order)
    };

    try {
      await saveOrderToDb(orderWithInstallments);
      saveOrderToHistory(orderWithInstallments);
      const updatedOrders = await fetchOrdersFromDb().catch(() => loadSavedOrdersList());
      setSavedOrders(updatedOrders);
      clearCurrentDraft();

      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.75 }
      });

      // Limpa a tela preparando o próximo pedido zerado
      const nextNum = await fetchNextOrderNumberFromDb().catch(() => getNextOrderNumber());
      const cleanOrder = createNewOrder(fiscalConfig, storeConfigs, nextNum);
      setOrder(cleanOrder);

      showToast(`Pedido ${savedOrderNumber} gravado no SQLite! Tela pronta para o próximo pedido.`, 'success');
    } catch (err: any) {
      saveOrderToHistory(orderWithInstallments);
      setSavedOrders(loadSavedOrdersList());
      clearCurrentDraft();

      const nextNum = getNextOrderNumber();
      const cleanOrder = createNewOrder(fiscalConfig, storeConfigs, nextNum);
      setOrder(cleanOrder);

      showToast(`Pedido ${savedOrderNumber} salvo localmente! Tela pronta para o próximo pedido.`, 'info');
    }
  };

  // Atualização direta de parcela / acordo comercial
  const handleUpdateInstallment = async (orderId: string, updatedInstallment: PaymentInstallment) => {
    try {
      await updateInstallmentInDb(updatedInstallment.id, {
        valor: updatedInstallment.valor,
        dataVencimento: updatedInstallment.dataVencimento,
        status: updatedInstallment.status,
        dataPagamento: updatedInstallment.dataPagamento,
        observacao: updatedInstallment.observacao,
        documentoRef: updatedInstallment.documentoRef
      });
    } catch (err) {
      console.warn('Persistência via API de parcela:', err);
    }
  };

  // Salvar pedido atualizado diretamente (ex: pelo módulo financeiro)
  const handleSaveOrderDirect = async (updatedOrder: PurchaseOrder) => {
    setSavedOrders(prev => {
      const idx = prev.findIndex(o => o.header.id === updatedOrder.header.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedOrder;
        return copy;
      }
      return [updatedOrder, ...prev];
    });

    if (order.header.id === updatedOrder.header.id) {
      setOrder(updatedOrder);
      saveCurrentOrder(updatedOrder);
    }
    saveOrderToHistory(updatedOrder);

    try {
      await saveOrderToDb(updatedOrder);
    } catch (err) {
      console.warn('Erro ao salvar no SQLite:', err);
    }
  };

  // Handlers do Módulo de Estoque do Depósito Central
  const handleUpdateStockBalance = (stockId: string, deltaCaixas: number, newLocation?: string) => {
    const updated = updateStockBalance(stockId, deltaCaixas, newLocation);
    setCentralStock([...updated]);
    showToast('Saldo de estoque do depósito atualizado com sucesso!', 'success');
  };

  const handleSaveNewStockItem = (item: CentralStockItem) => {
    const current = loadCentralStock();
    const existingIdx = current.findIndex(s => s.id === item.id || (item.productId && s.productId === item.productId));
    let updated: CentralStockItem[];
    if (existingIdx >= 0) {
      current[existingIdx] = { 
        ...current[existingIdx], 
        ...item, 
        saldoCaixas: current[existingIdx].saldoCaixas + item.saldoCaixas, 
        saldoUnidades: (current[existingIdx].saldoCaixas + item.saldoCaixas) * item.qtdPorPacote 
      };
      updated = current;
    } else {
      updated = [item, ...current];
    }
    saveCentralStock(updated);
    setCentralStock([...updated]);
    showToast(`Produto ${item.descricao} adicionado ao estoque do CD!`, 'success');
  };

  const handleGenerateStockSeparation = (itemsToTransfer: Array<{ stockItem: CentralStockItem; caixasParaSeparar: number }>) => {
    const transfOrder = createStockTransferOrder(itemsToTransfer, storeConfigs, fiscalConfig);
    saveOrderToHistory(transfOrder);
    setSavedOrders(loadSavedOrdersList());
    setOrder(transfOrder);
    setActiveNav('separation');
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    showToast(`Romaneio ${transfOrder.header.numeroPedido} gerado e enviado para a Separação da Doca!`, 'success');
  };

  const handleFinalizeSeparation = async (finalizedOrder: PurchaseOrder) => {
    try {
      // Se for transferência do estoque central, realiza a baixa do estoque do CD
      if (finalizedOrder.header.supplierId === 'cd_matriz') {
        finalizedOrder.items.forEach(it => {
          const stock = loadCentralStock();
          const match = stock.find(s => s.codigo === it.codigo || s.descricao === it.descricao);
          if (match) {
            updateStockBalance(match.id, -(it.qtdPacotes || 0));
          }
        });
        setCentralStock(loadCentralStock());
      }

      await saveOrderToDb(finalizedOrder);
      saveOrderToHistory(finalizedOrder);
      const updatedOrders = await fetchOrdersFromDb().catch(() => loadSavedOrdersList());
      setSavedOrders(updatedOrders);
      setOrder(finalizedOrder);
      
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 }
      });
      
      showToast(`Separação do pedido ${finalizedOrder.header.numeroPedido} FINALIZADA! Arquivado no Histórico.`, 'success');
      setActiveNav('separationHistory');
    } catch (err: any) {
      if (finalizedOrder.header.supplierId === 'cd_matriz') {
        finalizedOrder.items.forEach(it => {
          const stock = loadCentralStock();
          const match = stock.find(s => s.codigo === it.codigo || s.descricao === it.descricao);
          if (match) {
            updateStockBalance(match.id, -(it.qtdPacotes || 0));
          }
        });
        setCentralStock(loadCentralStock());
      }

      saveOrderToHistory(finalizedOrder);
      setSavedOrders(loadSavedOrdersList());
      setOrder(finalizedOrder);
      showToast(`Finalizado localmente: ${err.message}`, 'info');
      setActiveNav('separationHistory');
    }
  };

  const handleUpdateOrderStatus = async (ord: PurchaseOrder, newStatus: string) => {
    const updated: PurchaseOrder = {
      ...ord,
      header: {
        ...ord.header,
        status: newStatus as any,
        updatedAt: new Date().toISOString()
      }
    };
    try {
      await saveOrderToDb(updated);
      saveOrderToHistory(updated);
      setSavedOrders(loadSavedOrdersList());
      if (order.header.numeroPedido === ord.header.numeroPedido || (order.header.id && order.header.id === ord.header.id)) {
        setOrder(updated);
      }
      showToast(`Status do pedido ${ord.header.numeroPedido} alterado para "${newStatus}"!`, 'success');
    } catch (err: any) {
      saveOrderToHistory(updated);
      setSavedOrders(loadSavedOrdersList());
      if (order.header.numeroPedido === ord.header.numeroPedido || (order.header.id && order.header.id === ord.header.id)) {
        setOrder(updated);
      }
      showToast(`Status atualizado para "${newStatus}"!`);
    }
  };

  const handleLoadMockOrder = () => {
    const mock = createRealisticMockOrder(fiscalConfig, storeConfigs);
    setOrder(mock);
    showToast('Exemplo realista carregado com 8 produtos do Bazar!');
  };

  const handleExportExcel = () => {
    exportOrderToExcel(order, storeConfigs, fiscalConfig);
    showToast('Planilha Excel (.xlsx) gerada!', 'success');
  };

  const handleExportCommercialPDF = () => {
    exportCommercialOrderPDF(order);
    showToast('Pedido Comercial PDF (Proposta para Fornecedor) gerado com sucesso!', 'success');
  };

  const handleExportSeparationPDF = () => {
    exportRomaneioPDF(order, storeConfigs);
    showToast('Romaneio PDF de Separação (20 Lojas) gerado com sucesso!', 'success');
  };

  // Supplier Page Handlers
  const handleSaveSupplier = async (sup: Supplier) => {
    try {
      await saveSupplierToDb(sup);
      const updated = await fetchSuppliersFromDb();
      setSuppliers(updated);
      showToast(`Fornecedor "${sup.razaoSocial}" salvo no SQLite.`);
    } catch (err) {
      saveSupplier(sup);
      setSuppliers(getSuppliersList());
      showToast(`Fornecedor "${sup.razaoSocial}" salvo localmente.`);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    try {
      await deleteSupplierFromDb(id);
      const updated = await fetchSuppliersFromDb();
      setSuppliers(updated);
      showToast('Fornecedor removido do SQLite.', 'info');
    } catch (err) {
      deleteSupplier(id);
      setSuppliers(getSuppliersList());
      showToast('Fornecedor removido.', 'info');
    }
  };

  // Product Catalog Handlers
  const handleSaveProduct = async (productToSave: Product) => {
    try {
      await saveProductToDb(productToSave);
      const updated = await fetchProductsFromDb();
      setProducts(updated);
      saveProduct(productToSave);
      showToast(`Produto "${productToSave.descricao}" salvo com foto no SQLite!`);
    } catch (err) {
      const updated = saveProduct(productToSave);
      setProducts(updated);
      showToast(`Produto "${productToSave.descricao}" salvo no catálogo!`);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteProductFromDb(id);
      const updated = await fetchProductsFromDb();
      setProducts(updated);
      showToast('Produto removido do catálogo.', 'info');
    } catch (err) {
      deleteProduct(id);
      setProducts(getProductsList());
      showToast('Produto removido.', 'info');
    }
  };

  const handleSelectSupplierForOrder = (sup: Supplier) => {
    setOrder(prev => ({
      ...prev,
      header: {
        ...prev.header,
        fornecedor: sup.razaoSocial,
        supplierId: sup.id,
        vendedor: sup.vendedorPadrao || prev.header.vendedor,
        contatoVendedor: sup.contatoVendedor || prev.header.contatoVendedor,
        condicaoPagamento: sup.condicaoPagamentoPadrao || prev.header.condicaoPagamento,
        aliquotaSt: sup.aliquotaStPadrao !== undefined ? sup.aliquotaStPadrao : prev.header.aliquotaSt,
        percentualDescontoOff: sup.descontoOffPadrao !== undefined ? sup.descontoOffPadrao : prev.header.percentualDescontoOff,
        observacoesDescarga: sup.observacoesDescarga || prev.header.observacoesDescarga
      }
    }));
    setActiveNav('orders');
    showToast(`Fornecedor "${sup.razaoSocial}" aplicado ao pedido!`);
  };

  // Global Settings Handlers
  const handleSaveGlobalSettings = async (newFiscal: FiscalConfig, newStores: StoreConfig[]) => {
    try {
      await saveFiscalConfigToDb(newFiscal);
      saveFiscalConfig(newFiscal);
      saveStoresConfig(newStores);
      setFiscalConfig(newFiscal);
      setStoreConfigs(newStores);

      // Recalcular itens do pedido ativo com as novas taxas
      setOrder(prev => {
        const recalculatedItems = prev.items.map(item => {
          const fiscalRes = calculateItemFiscal(item.precoUnitario, item.pdvAlvo, newFiscal, item.fiscalOverride);
          const sepRes = item.separacaoManual 
            ? { allocations: item.separacaoLojas || {} } 
            : calculateAutomaticSeparation(item.qtdTotalUnidades, newStores);

          return {
            ...item,
            despesasPdvUnit: fiscalRes.despesasPdvUnit,
            creditoIcmsUnit: fiscalRes.creditoIcmsUnit,
            custoRealEfetivo: fiscalRes.custoRealEfetivo,
            margemRealUnit: fiscalRes.margemRealUnit,
            margemPercentual: fiscalRes.margemPercentual,
            separacaoLojas: sepRes.allocations
          };
        });

        return {
          ...prev,
          fiscalConfig: newFiscal,
          storeConfigs: newStores,
          items: recalculatedItems
        };
      });

      showToast('Configurações fiscais e lojas gravadas no SQLite!', 'success');
    } catch (err: any) {
      showToast(`Erro ao salvar: ${err.message}`, 'error');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await deleteOrderFromDb(orderId);
      const updated = await fetchOrdersFromDb();
      setSavedOrders(updated);
      showToast('Pedido excluído do SQLite.', 'info');
    } catch (err) {
      showToast('Erro ao excluir pedido.', 'error');
    }
  };

  // Se o usuário não estiver logado, exibe a página de login
  if (!currentUser) {
    return <LoginPage onLoginSuccess={setCurrentUser} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans antialiased">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-semibold ${
            toast.type === 'success' 
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-800' 
              : toast.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-800'
              : 'bg-slate-900/90 text-slate-200 border-slate-700'
          }`}>
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Sidebar Lateral de Navegação (6 Páginas + Gestão de Usuários) */}
      <Sidebar
        order={order}
        activeNav={activeNav}
        onSelectNav={(tab) => {
          if (tab === 'orders') {
            // Se o pedido atual for um pedido do histórico/finalizado, reseta para novo pedido em branco
            if (isCurrentOrderSaved || order.header.status === 'Finalizado') {
              const draft = loadCurrentOrder();
              if (draft) {
                setOrder(draft);
              } else {
                fetchNextOrderNumberFromDb().then(nextNum => {
                  setOrder(createNewOrder(fiscalConfig, storeConfigs, nextNum));
                }).catch(() => {
                  setOrder(createNewOrder(fiscalConfig, storeConfigs, getNextOrderNumber()));
                });
              }
            }
          }
          setActiveNav(tab);
          setViewMode('desktop');
        }}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        currentUser={currentUser}
        onLogout={handleLogout}
        hasActiveDraft={hasActiveDraft}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* TopBar Executivo Unificado com Breadcrumbs, Modos e Ações Contextuais */}
        <Header
          activeNav={activeNav}
          order={order}
          currentUser={currentUser}
          viewMode={viewMode}
          onChangeViewMode={setViewMode}
          hasActiveDraft={hasActiveDraft}
          isSavedOrder={isCurrentOrderSaved}
          onNewOrder={handleNewOrder}
          onSaveOrder={handleSaveOrder}
          onDiscardDraft={handleDiscardDraft}
          onExportExcel={handleExportExcel}
          onExportPDF={activeNav === 'separation' ? handleExportSeparationPDF : handleExportCommercialPDF}
          onSelectNav={setActiveNav}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          
          {/* MODO MOBILE 1: COMPRAS EM VIAGENS / FEIRAS */}
          {viewMode === 'mobile_purchases' && (
            <MobilePurchasesView
              order={order}
              suppliers={suppliers}
              products={products}
              stores={storeConfigs}
              fiscalConfig={fiscalConfig}
              onUpdateOrder={setOrder}
              onExportPDF={handleExportCommercialPDF}
              onExportExcel={handleExportExcel}
              onSaveOrder={handleSaveOrder}
              onNewOrder={handleNewOrder}
              onOpenSeparationModal={(item) => setSelectedSeparationItem(item)}
            />
          )}

          {/* MODO MOBILE 2: ROMANEIO DE BOLSO / GALPÃO */}
          {viewMode === 'mobile_separation' && (
            <MobileSeparationView
              order={order}
              orders={savedOrders.length > 0 ? savedOrders : [order]}
              onSelectOrder={setOrder}
              onUpdateOrder={setOrder}
              onFinalizeOrder={handleFinalizeSeparation}
            />
          )}

          {/* MODO DESKTOP TRADICIONAL COM AS PÁGINAS DO MENU */}
          {viewMode === 'desktop' && (
            <>
              {/* PÁGINA 0: HOME / HUB PRINCIPAL */}
              {activeNav === 'home' && (
                <HomePage
                  currentUser={currentUser}
                  savedOrders={savedOrders}
                  draftOrder={hasActiveDraft ? order : null}
                  suppliers={suppliers}
                  stores={storeConfigs}
                  onNavigate={(tab) => {
                    setActiveNav(tab);
                    setViewMode('desktop');
                  }}
                  onNewOrder={handleNewOrder}
                  onContinueDraft={handleContinueDraft}
                  onDiscardDraft={handleDiscardDraft}
                  onSelectOrder={(selected) => {
                    setOrder(selected);
                    setActiveNav('orders');
                    showToast(`Pedido ${selected.header.numeroPedido} aberto.`);
                  }}
                  onSwitchViewMode={(mode) => setViewMode(mode)}
                />
              )}

              {/* PÁGINA 1: COTAÇÃO E PEDIDOS */}
              {activeNav === 'orders' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <OrderSummaryCards order={order} />

                  <OrderHeaderForm 
                    header={order.header} 
                    suppliers={suppliers}
                    onChange={handleHeaderChange} 
                    onOpenSupplierModal={(supToEdit) => {
                      if (supToEdit) {
                        setSelectedSupplierToEdit(supToEdit.id);
                        setActiveNav('suppliers');
                        showToast(`Abrindo cadastro de ${supToEdit.razaoSocial}...`, 'info');
                      } else {
                        setSelectedSupplierToEdit('new');
                        setActiveNav('suppliers');
                      }
                    }}
                    orderTotal={calculateOrderNetTotal(order)}
                  />

                  {/* Banner de Rascunho / Pedido em Aberto acima da Lista de Compras */}
                  {hasActiveDraft && !isCurrentOrderSaved && (
                    <div className="p-3.5 px-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                          Rascunho de Pedido em Andamento ({order.header.numeroPedido}) — não salvo no SQLite
                        </span>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          onClick={handleDiscardDraft}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Descartar / Zerar</span>
                        </button>
                        <button
                          onClick={handleSaveOrder}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Salvar Pedido</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Banner quando visualizando pedido já salvo / finalizado do histórico */}
                  {isCurrentOrderSaved && (
                    <div className="p-3.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Visualizando Pedido Gravado no Sistema ({order.header.numeroPedido}) • Status: <strong className="text-emerald-600 dark:text-emerald-400">{order.header.status}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          onClick={handleNewOrder}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Novo Pedido em Branco</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <OrderItemsTable
                    items={order.items}
                    globalFiscal={fiscalConfig}
                    stores={storeConfigs}
                    products={products}
                    onUpdateItem={handleUpdateItem}
                    onAddItem={handleAddItem}
                    onDuplicateItem={handleDuplicateItem}
                    onDeleteItem={handleDeleteItem}
                    onOpenFiscalModal={(item) => setSelectedFiscalItem(item)}
                    onOpenSeparationModal={(item) => setSelectedSeparationItem(item)}
                    onLoadMockOrder={handleLoadMockOrder}
                  />
                </div>
              )}

              {/* PÁGINA 1.1: GESTÃO DO ESTOQUE DO DEPÓSITO CENTRAL (CD MATRIZ) */}
              {activeNav === 'stock' && (
                <CentralStockPage
                  stockItems={centralStock}
                  products={products}
                  suppliers={suppliers}
                  stores={storeConfigs}
                  fiscalConfig={fiscalConfig}
                  onUpdateStockBalance={handleUpdateStockBalance}
                  onSaveNewStockItem={handleSaveNewStockItem}
                  onGenerateStockSeparation={handleGenerateStockSeparation}
                  onNavigateToSeparation={() => setActiveNav('separation')}
                />
              )}

              {/* PÁGINA 2: CONFERÊNCIA DE SEPARAÇÃO E ROMANEIO (20 LOJAS) */}
              {activeNav === 'separation' && (
                <SeparationPage
                  order={order}
                  orders={savedOrders.length > 0 ? savedOrders : [order]}
                  stores={storeConfigs}
                  onExportPDF={handleExportSeparationPDF}
                  onExportExcel={handleExportExcel}
                  onLoadMockOrder={handleLoadMockOrder}
                  onNavigateToOrders={() => setActiveNav('orders')}
                  onNavigateToHistory={() => setActiveNav('separationHistory')}
                  onChangeOrder={setOrder}
                  onSelectOrder={setOrder}
                  onFinalizeOrder={handleFinalizeSeparation}
                />
              )}

              {/* PÁGINA 2.1: HISTÓRICO DE SEPARAÇÕES & AUDITORIA DE CONFERENTES */}
              {activeNav === 'separationHistory' && (
                <SeparationHistoryPage
                  orders={savedOrders.length > 0 ? savedOrders : [order]}
                  stores={storeConfigs}
                  onSelectOrderForSeparation={(selected) => {
                    setOrder(selected);
                    setActiveNav('separation');
                    showToast(`Romaneio do pedido ${selected.header.numeroPedido} aberto para conferência.`);
                  }}
                  onNavigateToSeparation={() => setActiveNav('separation')}
                />
              )}

              {/* PÁGINA 3: CATÁLOGO & CADASTRO DE PRODUTOS COM FOTOS */}
              {activeNav === 'products' && (
                <ProductsCatalogPage
                  products={products}
                  suppliers={suppliers}
                  initialSupplierId={selectedCatalogSupplier}
                  onSaveProduct={handleSaveProduct}
                  onDeleteProduct={handleDeleteProduct}
                />
              )}

              {/* PÁGINA 4: DASHBOARD EXECUTIVO & BI */}
              {activeNav === 'dashboard' && (
                <DashboardView
                  orders={savedOrders.length > 0 ? savedOrders : [order]}
                  suppliers={suppliers}
                  onSelectOrder={(selected) => {
                    setOrder(selected);
                    setActiveNav('orders');
                    showToast(`Pedido ${selected.header.numeroPedido} aberto.`);
                  }}
                  onNavigateToOrders={() => setActiveNav('orders')}
                />
              )}

              {/* PÁGINA 4.1: GESTÃO FINANCEIRA DE BOLETOS & CONTAS A PAGAR */}
              {activeNav === 'financial' && (
                <FinancialBoletosPage
                  orders={effectiveOrders}
                  suppliers={suppliers}
                  onSelectOrder={(selected) => {
                    setOrder(selected);
                    setActiveNav('orders');
                    showToast(`Pedido ${selected.header.numeroPedido} aberto.`);
                  }}
                  onUpdateInstallment={handleUpdateInstallment}
                  onSaveOrder={handleSaveOrderDirect}
                  showToast={showToast}
                />
              )}

              {/* PÁGINA 5: GESTÃO COMPLETA DE FORNECEDORES */}
              {activeNav === 'suppliers' && (
                <SuppliersPage
                  suppliers={suppliers}
                  products={products}
                  initialSupplierId={selectedSupplierToEdit}
                  onSaveSupplier={async (sup) => {
                    await handleSaveSupplier(sup);
                    setSelectedSupplierToEdit(null);
                  }}
                  onDeleteSupplier={async (supId) => {
                    await handleDeleteSupplier(supId);
                    setSelectedSupplierToEdit(null);
                  }}
                  onSelectSupplierForOrder={handleSelectSupplierForOrder}
                  onSaveProduct={handleSaveProduct}
                  onNavigateToProducts={(supId) => {
                    setSelectedCatalogSupplier(supId || 'all');
                    setActiveNav('products');
                  }}
                />
              )}

              {/* PÁGINA 5: HISTÓRICO & ARQUIVO DE PEDIDOS */}
              {activeNav === 'history' && (
                <OrderHistoryPage
                  orders={savedOrders.length > 0 ? savedOrders : [order]}
                  onSelectOrder={(selected) => {
                    setOrder(selected);
                    setActiveNav('orders');
                    showToast(`Pedido ${selected.header.numeroPedido} carregado com sucesso.`);
                  }}
                  onDeleteOrder={handleDeleteOrder}
                  onNewOrder={handleNewOrder}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onNavigateToSeparation={(selected) => {
                    setOrder(selected);
                    setActiveNav('separation');
                    showToast(`Conferência do pedido ${selected.header.numeroPedido} iniciada.`);
                  }}
                />
              )}

              {/* PÁGINA 6: CONFIGURAÇÕES FISCAIS & PARÂMETROS DA REDE */}
              {activeNav === 'fiscal' && (
                <FiscalSettingsPage
                  fiscalConfig={fiscalConfig}
                  storeConfigs={storeConfigs}
                  onSave={handleSaveGlobalSettings}
                />
              )}

              {/* PÁGINA 7: GESTÃO DE USUÁRIOS & PERMISSÕES (DIRETORIA) */}
              {activeNav === 'users' && (
                <UsersPage currentUser={currentUser} />
              )}
            </>
          )}

        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 py-3 text-center text-xs text-slate-400 dark:text-slate-600 bg-white/50 dark:bg-slate-900/50 shrink-0">
          Rede Mega 12 • Sistema de Gestão de Compras, Engenharia Fiscal & Rateio de Lojas
        </footer>
      </div>

      {/* Modais de Contexto por Linha de Produto */}
      <FiscalPanelModal
        item={selectedFiscalItem}
        globalFiscal={fiscalConfig}
        isOpen={!!selectedFiscalItem}
        onClose={() => setSelectedFiscalItem(null)}
        onApplyChanges={handleUpdateItem}
      />

      <SeparationMatrixModal
        item={selectedSeparationItem}
        stores={storeConfigs}
        isOpen={!!selectedSeparationItem}
        onClose={() => setSelectedSeparationItem(null)}
        onSaveSeparation={(itemId, allocations, isManual, qtdReservaEstoque) => {
          handleUpdateItem(itemId, { 
            separacaoLojas: allocations, 
            separacaoManual: isManual,
            qtdReservaEstoque: qtdReservaEstoque
          });
          showToast('Grade de separação e estoque central salvos!');
        }}
      />

    </div>
  );
}

export default App;
