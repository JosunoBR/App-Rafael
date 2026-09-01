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
import { 
  OrderPipelineStepper 
} from './components/OrderPipelineStepper';

import { PurchaseOrder, OrderItem, FiscalConfig, StoreConfig, Supplier, User, Product, CentralStockItem } from './shared/types';
import { 
  getInitialFiscalConfig, 
  getInitialStoresConfig, 
  createNewOrder, 
  loadCurrentOrder, 
  saveCurrentOrder, 
  clearCurrentDraft,
  loadSavedOrdersList, 
  saveFiscalConfig, 
  saveStoresConfig,
  getSuppliersList,
  getProductsList,
  saveSupplier,
  getNextOrderNumber,
  createRealisticMockOrder,
  loadCentralStock,
  saveSavedOrdersList
} from './utils/storage';
import { 
  fetchSuppliersFromDb, 
  saveSupplierToDb,
  fetchProductsFromDb,
  fetchOrdersFromDb, 
  fetchFiscalConfigFromDb,
  saveFiscalConfigToDb,
  fetchNextOrderNumberFromDb,
  fetchStoresFromDb,
  fetchStockFromDb
} from './utils/api';
import { exportOrderToExcel } from './utils/excelExporter';
import { exportCommercialOrderPDF, exportRomaneioPDF } from './utils/pdfExporter';
import { calculateOrderNetTotal } from './utils/installments';
import { calculateItemFiscal } from './shared/fiscalEngine';
import { calculateAutomaticSeparation } from './shared/separationEngine';
import { ensureTrailingBlankItem, isOrderItemBlank } from './utils/orderItemUtils';
import { useOrderOperations } from './hooks/useOrderOperations';
import { useCatalogOperations } from './hooks/useCatalogOperations';
import { CheckCircle2, AlertCircle, Save, Trash2, Plus } from 'lucide-react';

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
    const initFiscal = getInitialFiscalConfig();
    const initStores = getInitialStoresConfig();
    if (saved) {
      return {
        ...saved,
        items: ensureTrailingBlankItem(saved.items || [], initFiscal, initStores)
      };
    }
    const newOrd = createNewOrder(initFiscal, initStores);
    return {
      ...newOrd,
      items: ensureTrailingBlankItem(newOrd.items || [], initFiscal, initStores)
    };
  });

  // Identifica se o pedido em memória é um rascunho em aberto não salvo
  const isCurrentOrderSaved = savedOrders.some(o => o.header.id === order.header.id);
  const hasValidItems = order.items && order.items.some(it => !isOrderItemBlank(it));
  const hasActiveDraft = Boolean(
    order && !isCurrentOrderSaved && (
      hasValidItems || 
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
        const [dbSuppliers, dbProducts, dbOrders, dbFiscal, dbStores, dbStock] = await Promise.all([
          fetchSuppliersFromDb().catch(() => null),
          fetchProductsFromDb().catch(() => null),
          fetchOrdersFromDb().catch(() => null),
          fetchFiscalConfigFromDb().catch(() => null),
          fetchStoresFromDb().catch(() => null),
          fetchStockFromDb().catch(() => null)
        ]);

        if (dbSuppliers && dbSuppliers.length > 0) setSuppliers(dbSuppliers);
        if (dbProducts && dbProducts.length > 0) setProducts(dbProducts);
        if (dbStores && dbStores.length > 0) setStoreConfigs(dbStores);
        if (dbFiscal) setFiscalConfig(dbFiscal);
        if (dbStock && dbStock.length > 0) setCentralStock(dbStock);

        if (dbOrders && dbOrders.length > 0) {
          const currentFiscal = dbFiscal || getInitialFiscalConfig();
          const currentStores = (dbStores && dbStores.length > 0) ? dbStores : getInitialStoresConfig();
          const hydratedOrders = dbOrders.map((o: PurchaseOrder) => ({
            ...o,
            storeConfigs: o.storeConfigs && o.storeConfigs.length > 0 ? o.storeConfigs : currentStores,
            fiscalConfig: o.fiscalConfig || currentFiscal
          }));
          setSavedOrders(hydratedOrders);
          saveSavedOrdersList(hydratedOrders);
        }
      } catch (_err) {
        console.warn('Usando armazenamento local de contingência:', _err);
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
    setActiveNav('home');
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'separacao') {
      setActiveNav('separation');
    } else {
      setActiveNav('home');
    }
  };

  // Handlers for Order Header
  const handleHeaderChange = (updatedHeader: typeof order.header) => {
    setOrder(prev => ({ ...prev, header: updatedHeader }));
  };

  // Handlers for Items
  const handleUpdateItem = (itemId: string, updatedFields: Partial<OrderItem>) => {
    setOrder(prev => {
      const updatedItems = prev.items.map(item => item.id === itemId ? { ...item, ...updatedFields } : item);
      return {
        ...prev,
        items: ensureTrailingBlankItem(updatedItems, fiscalConfig, storeConfigs)
      };
    });
  };

  const handleAddItem = (customItem?: OrderItem) => {
    if (customItem) {
      setOrder(prev => {
        const newItems = [...prev.items];
        if (newItems.length > 0 && isOrderItemBlank(newItems[newItems.length - 1])) {
          newItems[newItems.length - 1] = customItem;
        } else {
          newItems.push(customItem);
        }
        return {
          ...prev,
          items: ensureTrailingBlankItem(newItems, fiscalConfig, storeConfigs)
        };
      });
      showToast(`Produto "${customItem.descricao}" adicionado.`);
      return;
    }
    setOrder(prev => ({
      ...prev,
      items: ensureTrailingBlankItem(prev.items, fiscalConfig, storeConfigs)
    }));
  };

  const handleDeleteItem = (itemId: string) => {
    setOrder(prev => {
      const filtered = prev.items.filter(item => item.id !== itemId);
      return {
        ...prev,
        items: ensureTrailingBlankItem(filtered, fiscalConfig, storeConfigs)
      };
    });
    showToast('Item removido do pedido.', 'info');
  };

  const handleDuplicateItem = (itemToClone: OrderItem) => {
    const clonedItem: OrderItem = {
      ...itemToClone,
      id: 'item_' + Date.now(),
      descricao: `${itemToClone.descricao} (Cópia)`
    };

    setOrder(prev => {
      const nonTrailing = prev.items.filter((_, idx) => idx < prev.items.length - 1 || !isOrderItemBlank(prev.items[idx]));
      return {
        ...prev,
        items: ensureTrailingBlankItem([...nonTrailing, clonedItem], fiscalConfig, storeConfigs)
      };
    });
    showToast('Item duplicado com sucesso!');
  };

  // Iniciar novo pedido em branco
  const handleNewOrder = async () => {
    try {
      const nextNum = await fetchNextOrderNumberFromDb();
      const newOrd = createNewOrder(fiscalConfig, storeConfigs, nextNum);
      setOrder({
        ...newOrd,
        items: ensureTrailingBlankItem(newOrd.items || [], fiscalConfig, storeConfigs)
      });
      setActiveNav('orders');
      setViewMode('desktop');
      showToast(`Novo pedido ${nextNum} em branco iniciado!`);
    } catch (_err) {
      const localNum = getNextOrderNumber();
      const newOrd = createNewOrder(fiscalConfig, storeConfigs, localNum);
      setOrder({
        ...newOrd,
        items: ensureTrailingBlankItem(newOrd.items || [], fiscalConfig, storeConfigs)
      });
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
      setOrder({
        ...clean,
        items: ensureTrailingBlankItem(clean.items || [], fiscalConfig, storeConfigs)
      });
    } catch {
      const localNum = getNextOrderNumber();
      const clean = createNewOrder(fiscalConfig, storeConfigs, localNum);
      setOrder({
        ...clean,
        items: ensureTrailingBlankItem(clean.items || [], fiscalConfig, storeConfigs)
      });
    }
    showToast('Rascunho descartado. Pedido zerado.', 'info');
  };

  // Identificar fornecedor ativo no pedido e seu Pedido Padrão / Template
  const activeSupplier = useMemo(() => {
    return suppliers.find(s => 
      (order.header.supplierId && s.id === order.header.supplierId) || 
      s.razaoSocial.toLowerCase() === (order.header.fornecedor || '').toLowerCase()
    );
  }, [suppliers, order.header.supplierId, order.header.fornecedor]);

  const activeSupplierTemplate = useMemo(() => {
    if (!activeSupplier) return null;
    let template = activeSupplier.pedidoPadrao;
    if (!template && activeSupplier.pedidoPadraoJson) {
      try {
        template = JSON.parse(activeSupplier.pedidoPadraoJson);
      } catch {}
    }
    return template || null;
  }, [activeSupplier]);

  // Salvar pedido atual como Compra Padrão do Fornecedor
  const handleSaveAsSupplierTemplate = async () => {
    const validItems = order.items.filter(it => !isOrderItemBlank(it));
    if (validItems.length === 0) {
      showToast('Adicione ao menos 1 item com quantidade e preço antes de salvar como compra padrão.', 'error');
      return;
    }

    if (!activeSupplier) {
      showToast('Selecione ou cadastre o fornecedor antes de definir a compra padrão.', 'error');
      return;
    }

    const templateData = {
      items: validItems,
      condicaoPagamento: order.header.condicaoPagamento,
      aliquotaSt: order.header.aliquotaSt,
      descontoOff: order.header.percentualDescontoOff,
      percentualNota: order.header.percentualNota,
      observacoes: order.header.observacoesDescarga,
      savedAt: new Date().toISOString()
    };

    const updatedSup: Supplier = {
      ...activeSupplier,
      pedidoPadrao: templateData,
      pedidoPadraoJson: JSON.stringify(templateData),
      updatedAt: new Date().toISOString()
    };

    saveSupplier(updatedSup);
    setSuppliers(prev => prev.map(s => s.id === updatedSup.id ? updatedSup : s));

    try {
      await saveSupplierToDb(updatedSup);
    } catch (_err) {
      console.warn('Persistido localmente. Aviso SQLite:', _err);
    }

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 }
    });

    showToast(`⭐ Pedido salvo como Compra Padrão para "${activeSupplier.razaoSocial}" (${validItems.length} itens)!`, 'success');
  };

  // Carregar Compra Padrão do Fornecedor para a grade
  const handleLoadSupplierTemplate = (targetSupplierId?: string) => {
    const targetSup = targetSupplierId 
      ? (suppliers.find(s => s.id === targetSupplierId) || activeSupplier)
      : activeSupplier;

    if (!targetSup) {
      showToast('Fornecedor não selecionado.', 'error');
      return;
    }

    let template = targetSup.pedidoPadrao;
    if (!template && targetSup.pedidoPadraoJson) {
      try {
        template = JSON.parse(targetSup.pedidoPadraoJson);
      } catch {}
    }

    if (!template || !template.items || template.items.length === 0) {
      showToast(`O fornecedor "${targetSup.razaoSocial}" ainda não possui um pedido padrão cadastrado.`, 'info');
      return;
    }

    // Clona os itens recalculando impostos e rateio de 20 lojas
    const clonedItems: OrderItem[] = template.items.map((it: OrderItem, idx: number) => {
      const fiscal = calculateItemFiscal(it.precoUnitario, 12.00, fiscalConfig, it.fiscalOverride);
      const separation = calculateAutomaticSeparation(it.qtdTotalUnidades, storeConfigs, it.qtdReservaEstoque || 0);

      return {
        ...it,
        id: `item_${Date.now()}_${idx + 1}`,
        pdvAlvo: 12.00,
        despesasPdvUnit: fiscal.despesasPdvUnit,
        creditoIcmsUnit: fiscal.creditoIcmsUnit,
        custoRealEfetivo: fiscal.custoRealEfetivo,
        margemRealUnit: fiscal.margemRealUnit,
        margemPercentual: fiscal.margemPercentual,
        separacaoLojas: it.separacaoManual ? it.separacaoLojas : separation.allocations,
        qtdReservaEstoque: it.separacaoManual ? it.qtdReservaEstoque : separation.reserveStock
      };
    });

    const itemsWithBlank = ensureTrailingBlankItem(clonedItems, fiscalConfig, storeConfigs);

    setOrder(prev => ({
      ...prev,
      header: {
        ...prev.header,
        fornecedor: targetSup.razaoSocial,
        supplierId: targetSup.id,
        vendedor: targetSup.vendedorPadrao || prev.header.vendedor,
        contatoVendedor: targetSup.contatoVendedor || prev.header.contatoVendedor,
        condicaoPagamento: template.condicaoPagamento || targetSup.condicaoPagamentoPadrao || prev.header.condicaoPagamento,
        aliquotaSt: template.aliquotaSt !== undefined ? template.aliquotaSt : (targetSup.aliquotaStPadrao || 0),
        percentualDescontoOff: template.descontoOff !== undefined ? template.descontoOff : (targetSup.descontoOffPadrao || 0),
        percentualNota: template.percentualNota !== undefined ? template.percentualNota : (targetSup.percentualNotaPadrao || 100),
        observacoesDescarga: template.observacoes || prev.header.observacoesDescarga
      },
      items: itemsWithBlank
    }));

    showToast(`📦 Compra Padrão de "${targetSup.razaoSocial}" carregada (${template.items.length} itens)!`, 'success');
  };

  // Hook de Operações de Pedidos (Ciclo de Vida / Aprovação / Separação / Exclusão)
  const {
    handleSaveOrder,
    handleApproveOrder,
    handleReleaseToSeparation,
    handleFinalizeSeparation,
    handleUpdateOrderStatus,
    handleUpdateInstallment,
    handleSaveOrderDirect,
    handleDeleteOrder,
    handleGenerateStockSeparation
  } = useOrderOperations({
    order,
    setOrder,
    setSavedOrders,
    centralStock,
    setCentralStock,
    fiscalConfig,
    storeConfigs,
    currentUser,
    showToast,
    setActiveNav
  });

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

  // Hook de Operações de Catálogo (Produtos / Fornecedores / Estoque CD)
  const {
    handleSaveSupplier,
    handleDeleteSupplier,
    handleSaveProduct,
    handleDeleteProduct,
    handleUpdateStockBalance,
    handleSaveNewStockItem
  } = useCatalogOperations({
    setSuppliers,
    setProducts,
    setCentralStock,
    showToast
  });

  const handleSelectSupplierForOrder = (sup: Supplier, forceLoadTemplate: boolean = false) => {
    let template = sup.pedidoPadrao;
    if (!template && sup.pedidoPadraoJson) {
      try {
        template = JSON.parse(sup.pedidoPadraoJson);
      } catch {}
    }

    const isCurrentBlank = order.items.every(it => isOrderItemBlank(it));

    if ((forceLoadTemplate || isCurrentBlank) && template && template.items && template.items.length > 0) {
      handleLoadSupplierTemplate(sup.id);
      setActiveNav('orders');
      return;
    }

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

  // Se o usuário não estiver logado, exibe a página de login
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
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

                  {/* Esteira Operacional Visual do Pedido (Compras ➔ Depósito ➔ Separação ➔ Finalizado) */}
                  <OrderPipelineStepper
                    order={order}
                    currentUser={currentUser}
                    onApproveOrder={handleApproveOrder}
                    onOpenDistribution={(ord) => {
                      setOrder(ord);
                      setActiveNav('separation');
                    }}
                    onReleaseToSeparation={handleReleaseToSeparation}
                    onOpenSeparation={(ord) => {
                      setOrder(ord);
                      setActiveNav('separation');
                    }}
                    onFinalizeSeparation={handleFinalizeSeparation}
                  />

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
                    onSaveAsSupplierTemplate={handleSaveAsSupplierTemplate}
                    onLoadSupplierTemplate={handleLoadSupplierTemplate}
                    hasSupplierTemplate={Boolean(activeSupplierTemplate)}
                    supplierTemplateItemsCount={activeSupplierTemplate?.items?.length || 0}
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
                    currentSupplierName={order.header.fornecedor}
                    currentSupplierId={order.header.supplierId}
                    onUpdateItem={handleUpdateItem}
                    onAddItem={handleAddItem}
                    onDuplicateItem={handleDuplicateItem}
                    onDeleteItem={handleDeleteItem}
                    onOpenFiscalModal={(item) => setSelectedFiscalItem(item)}
                    onOpenSeparationModal={(item) => setSelectedSeparationItem(item)}
                    onLoadMockOrder={handleLoadMockOrder}
                    onSaveProduct={handleSaveProduct}
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
                  currentUser={currentUser}
                  onExportPDF={handleExportSeparationPDF}
                  onExportExcel={handleExportExcel}
                  onLoadMockOrder={handleLoadMockOrder}
                  onNavigateToOrders={() => setActiveNav('orders')}
                  onNavigateToHistory={() => setActiveNav('separationHistory')}
                  onChangeOrder={setOrder}
                  onSelectOrder={setOrder}
                  onFinalizeOrder={handleFinalizeSeparation}
                  onReleaseToSeparation={handleReleaseToSeparation}
                  onApproveOrder={handleApproveOrder}
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
