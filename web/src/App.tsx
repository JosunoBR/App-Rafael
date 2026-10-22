import React, { useState, useEffect, useMemo, useRef, startTransition } from 'react';
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
  OrderFiscalCard 
} from './components/OrderFiscalCard';
import { 
  OrderItemsTable 
} from './components/OrderItemsTable';
import { 
  OrderFiscalAdjustmentCard 
} from './components/OrderFiscalAdjustmentCard';
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
  ProductMovementsBI
} from './components/ProductMovementsBI';
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
  SupplierModal 
} from './components/SupplierModal';
import {
  OrderImportModal
} from './modules/excelImporter';
import { 
  OrderHistoryPage 
} from './components/OrderHistoryPage';
import {
  ReceiptConfirmationModal
} from './components/ReceiptConfirmationModal';
import {
  RescheduleDeliveryModal
} from './components/RescheduleDeliveryModal';
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
import { 
  DeleteOrderConfirmModal 
} from './components/DeleteOrderConfirmModal';
import { 
  OrderAuditModal 
} from './components/OrderAuditModal';
import { 
  OrderTrashModal 
} from './components/OrderTrashModal';
import { 
  IOSAlertModal, 
  IOSAlertOptions, 
  IOSAlertType 
} from './components/IOSAlertModal';
import { 
  IOSNotificationBanner, 
  IOSBannerMessage 
} from './components/IOSNotificationBanner';

import { PurchaseOrder, OrderItem, RemovedOrderItem, FiscalConfig, StoreConfig, Supplier, User, Product, PaymentInstallment, CentralStockItem, SeparationPreset, FiscalPreset } from './shared/types';
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
  isBogusOrderNumber,
  loadCentralStock,
  saveCentralStock,
  updateStockBalance,
  createStockTransferOrder,
  StockTransferPayloadItem,
  getInitialSeparationPresets,
  saveSeparationPresetsList,
  getInitialFiscalPresets,
  saveFiscalPresetsList,
  saveSavedOrdersList,
  saveBatchProductsToStorage,
  saveSuppliersList,
  saveProductsList,
  safeSetItem
} from './utils/storage';
import { 
  fetchSuppliersFromDb, 
  saveSupplierToDb, 
  deleteSupplierFromDb, 
  fetchProductsFromDb,
  saveProductToDb,
  saveProductsBatchToDb,
  deleteProductFromDb,
  fetchNextProductCodeFromDb,
  fetchOrdersFromDb, 
  saveOrderToDb, 
  deleteOrderFromDb,
  updateInstallmentInDb,
  fetchFiscalConfigFromDb,
  saveFiscalConfigToDb,
  fetchNextOrderNumberFromDb,
  fetchStoresFromDb,
  saveStoresToDb,
  fetchStockFromDb,
  saveStockItemToDb,
  updateStockBalanceInDb,
  clearAllStockFromDb,
  fetchSeparationPresetsFromDb,
  saveSeparationPresetToDb,
  deleteSeparationPresetFromDb,
  fetchFiscalPresetsFromDb,
  saveFiscalPresetToDb,
  deleteFiscalPresetFromDb,
  fetchPaymentConditionsFromDb,
  isOfflineError,
  fetchHealth,
  duplicateOrderInDb,
  verifyServerSession,
  isJwtExpired,
  confirmReceiptInDb,
  authorizeFinancialInDb,
  sendOrderToDistributionApi,
  releaseOrderToSeparationApi,
  sendOrderToFaturamentoApi,
  finalizeOrderPipelineApi,
  checkOrderNumberInDb,
  importOrderPackageToDb,
  rescheduleOrderDeliveryApi
} from './utils/api';
import { exportCommercialOrderPDF, exportRomaneioPDF } from './utils/pdfExporter';
import { exportOrderToExcel } from './utils/excelExporter';
import { calculateOrderNetTotal, calculateOrderMerchandiseTotal, generateOrderInstallments, rescheduleOrderDelivery } from './utils/installments';
import { toBrDate } from './utils/masks';
import { calculateItemFiscal, normalizeRateToDecimal } from './shared/fiscalEngine';
import { DEFAULT_FISCAL_CONFIG } from './shared/constants';
import { calculateAutomaticSeparation } from './shared/separationEngine';
import { ensureTrailingBlankItem, isOrderItemBlank, createBlankOrderItem, generateNextProductCode } from './utils/orderItemUtils';
import { CheckCircle2, AlertCircle, Plus, Lock, ShieldCheck, RefreshCw, X } from 'lucide-react';
import { canAccessTab, canAuthorizeFinancialRelease, canCreateOrEditOrders, getDefaultNavForRole, canEditSpecificOrder } from './shared/permissions';
import { 
  calculateOrderTotals, 
  distributeFiscalAdjustmentToItems, 
  restoreOriginalItemPrices 
} from './shared/orderCalculationEngine';
import { fetchOrderByIdFromDb } from './utils/api';
import { useOrderWatcher } from './hooks/useOrderWatcher';
import { threeWayMergeOrder, OrderMergeResult } from './utils/orderMerge';
import { OrderConflictResolutionModal } from './components/OrderConflictResolutionModal';

export function App() {
  // 1. Estado de Autenticação (RBAC) - Validação prévia de expiração local
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('mega12_user');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email && parsed.token && !isJwtExpired(parsed.token)) {
          if (parsed.nome) {
            parsed.nome = parsed.nome.replace(/\s*\([^)]*\)/g, '').trim();
          }
          return parsed;
        } else if (parsed && parsed.token && isJwtExpired(parsed.token)) {
          localStorage.removeItem('mega12_user');
        }
      } catch {}
    }
    // Sem sessão salva ou token expirado: exige login
    return null;
  });

  // Navigation State: Agora inicia por padrão no Hub / Home ou rota autorizada para o perfil
  const [activeNav, setActiveNav] = useState<ActiveNavTab>(() => {
    const saved = localStorage.getItem('mega12_user');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (parsed && parsed.role && parsed.token && !isJwtExpired(parsed.token)) {
          return getDefaultNavForRole(parsed.role);
        }
      } catch {}
    }
    return 'home';
  });

  // Proteção e contenção de rota ativa contra acesso não autorizado
  useEffect(() => {
    if (currentUser && !canAccessTab(currentUser, activeNav)) {
      setActiveNav(getDefaultNavForRole(currentUser.role));
    }
  }, [currentUser, activeNav]);

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
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [localSaveNotice, setLocalSaveNotice] = useState<{ orderNumber: string; savedAt: string } | null>(() => {
    try {
      const raw = localStorage.getItem('mega12_local_save_pending');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [separationPresets, setSeparationPresets] = useState<SeparationPreset[]>(getInitialSeparationPresets);
  const [fiscalPresets, setFiscalPresets] = useState<FiscalPreset[]>(getInitialFiscalPresets);

  // Active Purchase Order: carrega rascunho se existir ou inicia limpo
  const [order, setOrder] = useState<PurchaseOrder>(() => {
    const saved = loadCurrentOrder();
    const initFiscal = getInitialFiscalConfig();
    const initStores = getInitialStoresConfig();
    const today = new Date().toISOString().split('T')[0];
    if (saved) {
      let cleanNum = (saved.header?.numeroPedido || '').trim();
      if (!cleanNum || cleanNum.toUpperCase().includes('FORNECEDOR') || cleanNum.toUpperCase().includes('IMPORTADO') || cleanNum.toUpperCase().includes('FORNEC')) {
        cleanNum = getNextOrderNumber();
      }
      return {
        ...saved,
        header: {
          ...saved.header,
          numeroPedido: cleanNum,
          dataPedido: saved.header.dataPedido || saved.header.dataEmissao || today,
          dataEmissao: saved.header.dataEmissao || saved.header.dataPedido || today
        },
        items: ensureTrailingBlankItem(saved.items || [], initFiscal, initStores)
      };
    }
    const newOrd = createNewOrder(initFiscal, initStores);
    return {
      ...newOrd,
      items: ensureTrailingBlankItem(newOrd.items || [], initFiscal, initStores)
    };
  });

  // Snapshot base para Three-Way Merge e controle de concorrência
  const baseOrderRef = useRef<PurchaseOrder | null>(null);
  const [isSyncingRemote, setIsSyncingRemote] = useState(false);
  const [conflictMergeData, setConflictMergeData] = useState<{
    remote: PurchaseOrder;
    mergeResult: OrderMergeResult;
  } | null>(null);

  // Hook de detecção ativa de concorrência e co-presença em tempo real
  const { activeViewers, remoteInfo, hasNewerVersion, dismissAlert } = useOrderWatcher({
    orderId: order?.header?.id,
    currentVersion: Number(order?.header?.version || 1),
    currentUserId: currentUser?.id,
    enabled: Boolean(order?.header?.id && activeNav === 'orders'),
    intervalMs: 15000,
    onViewerJoined: (viewer) => {
      showToast(`👋 ${viewer.userName} (${viewer.userRole}) acabou de acessar este pedido.`, 'info');
    },
    onViewerLeft: (viewer) => {
      showToast(`${viewer.userName} saiu deste pedido.`, 'info');
    }
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
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState<boolean>(false);
  const [supplierModalEditTarget, setSupplierModalEditTarget] = useState<Supplier | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [receiptModalOrder, setReceiptModalOrder] = useState<PurchaseOrder | null>(null);
  const [rescheduleModalOrder, setRescheduleModalOrder] = useState<PurchaseOrder | null>(null);
  const [pipelineAuditOrder, setPipelineAuditOrder] = useState<PurchaseOrder | null>(null);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState<boolean>(false);

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

  // 📱 Sistema de Alertas & Notificações Estilo iPhone (iOS Design System)
  const [iosAlert, setIosAlert] = useState<IOSAlertOptions | null>(null);
  const [iosBanner, setIosBanner] = useState<IOSBannerMessage | null>(null);

  const triggerIOSAlert = (options: IOSAlertOptions) => {
    setIosAlert(options);
  };

  const triggerIOSBanner = (message: string, type: IOSAlertType = 'success', title?: string) => {
    setIosBanner({ message, type, title });
  };

  // Toast e Mensagens: Nenhum erro pode ser silencioso. Se for erro, abre o modal iOS!
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    if (type === 'error') {
      triggerIOSAlert({
        title: 'Atenção',
        message: message,
        type: 'error',
        confirmText: 'Entendi'
      });
    } else {
      triggerIOSBanner(message, type);
    }
  };

  const showPersistenceError = (err: any, action: string) => {
    const status = Number(err?.status || 0);
    const code = String(err?.code || '');
    let title = 'Falha ao salvar no banco';
    let guidance = 'Nenhuma alteração operacional foi confirmada. Revise os dados e tente novamente.';

    if (status === 401) {
      title = 'Sessão expirada';
      guidance = 'Entre novamente no sistema antes de repetir a operação.';
    } else if (status === 403) {
      title = 'Operação recusada';
      guidance = 'Seu usuário não possui permissão para concluir esta ação. A alteração não foi salva.';
    } else if (status === 409 || code.includes('CONFLICT') || code.includes('CONCURRENT')) {
      title = '⚠️ Pedido alterado por outra pessoa';
      guidance = err?.lastModifier
        ? `Alterado e salvo recentemente por ${err.lastModifier}${err.lastModifiedAt ? ` às ${err.lastModifiedAt}` : ''}. Recarregue o pedido para carregar a versão mais recente.`
        : 'Atualize o pedido para carregar a versão mais recente antes de tentar novamente.';
    } else if (isOfflineError(err)) {
      title = 'Servidor indisponível';
      guidance = 'Verifique a conexão. Etapas operacionais não são concluídas apenas no navegador.';
    }

    const shouldLoginAgain = status === 401;
    triggerIOSAlert({
      title,
      message: `${action}: ${err?.message || 'o servidor recusou a gravação.'}\n\n${guidance}`,
      type: 'error',
      confirmText: 'Fechar',
      actionText: shouldLoginAgain ? 'Entrar novamente' : 'Recarregar dados',
      onAction: shouldLoginAgain
        ? () => setCurrentUser(null)
        : () => { void loadFromSqlite(); }
    });
  };

  const markLocalSavePending = (orderNumber: string) => {
    const notice = { orderNumber, savedAt: new Date().toISOString() };
    localStorage.setItem('mega12_local_save_pending', JSON.stringify(notice));
    setLocalSaveNotice(notice);
  };

  const clearLocalSavePending = () => {
    localStorage.removeItem('mega12_local_save_pending');
    setLocalSaveNotice(null);
  };
  
  // Carregar dados oficiais do banco de dados SQLite (prioridade máxima)
  const loadFromSqlite = async () => {
    try {
      const [dbSuppliers, dbProducts, dbOrders, dbFiscal, dbStores, dbStock, dbPresets, dbFiscalPresets, dbPaymentConditions] = await Promise.all([
        fetchSuppliersFromDb().catch(err => { console.warn('Fornecedores DB:', err); return null; }),
        fetchProductsFromDb().catch(err => { console.warn('Produtos DB:', err); return null; }),
        fetchOrdersFromDb().catch(err => { console.warn('Pedidos DB:', err); return null; }),
        fetchFiscalConfigFromDb().catch(err => { console.warn('Fiscal DB:', err); return null; }),
        fetchStoresFromDb().catch(err => { console.warn('Lojas DB:', err); return null; }),
        fetchStockFromDb().catch(err => { console.warn('Estoque DB:', err); return null; }),
        fetchSeparationPresetsFromDb().catch(err => { console.warn('Presets DB:', err); return null; }),
        fetchFiscalPresetsFromDb().catch(err => { console.warn('Fiscal Presets DB:', err); return null; }),
        fetchPaymentConditionsFromDb().catch(err => { console.warn('Condições Pagamento DB:', err); return null; })
      ]);

      if (dbSuppliers !== null) {
        const supMap = new Map<string, Supplier>();
        dbSuppliers.forEach(s => supMap.set(s.id, s));
        if (dbProducts) {
          dbProducts.forEach(p => {
            if (p.supplierId && !supMap.has(p.supplierId)) {
              supMap.set(p.supplierId, {
                id: p.supplierId,
                razaoSocial: p.nomeFornecedor || 'Fornecedor',
                nomeFantasia: p.nomeFornecedor || 'Fornecedor',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
            }
          });
        }
        const consolidatedSuppliers = Array.from(supMap.values());
        setSuppliers(consolidatedSuppliers);
        saveSuppliersList(consolidatedSuppliers);
      }

      if (dbProducts !== null) {
        setProducts(dbProducts);
      }

      if (dbStores && dbStores.length > 0) {
        setStoreConfigs(dbStores);
        saveStoresConfig(dbStores);
      }

      if (dbFiscal) {
        setFiscalConfig(dbFiscal);
        saveFiscalConfig(dbFiscal);
      }

      if (dbStock !== null) {
        setCentralStock(dbStock);
        saveCentralStock(dbStock);
      }

      if (dbPresets && dbPresets.length > 0) {
        setSeparationPresets(dbPresets);
        saveSeparationPresetsList(dbPresets);
      }

      if (dbFiscalPresets && dbFiscalPresets.length > 0) {
        setFiscalPresets(dbFiscalPresets);
        saveFiscalPresetsList(dbFiscalPresets);
      }

      if (dbPaymentConditions && Array.isArray(dbPaymentConditions) && dbPaymentConditions.length > 0) {
        safeSetItem('mega12_payment_conditions', JSON.stringify(dbPaymentConditions));
      }

      if (dbOrders !== null) {
        const currentFiscal = dbFiscal || getInitialFiscalConfig();
        const currentStores = (dbStores && dbStores.length > 0) ? dbStores : getInitialStoresConfig();
        const hydratedOrders = dbOrders.map((o: PurchaseOrder) => {
          let cleanNum = (o.header?.numeroPedido || '').trim();
          if (!cleanNum || cleanNum.toUpperCase().includes('FORNECEDOR') || cleanNum.toUpperCase().includes('IMPORTADO') || cleanNum.toUpperCase().includes('FORNEC')) {
            cleanNum = getNextOrderNumber(dbOrders);
          }
          return {
            ...o,
            header: {
              ...o.header,
              numeroPedido: cleanNum
            },
            storeConfigs: o.storeConfigs && o.storeConfigs.length > 0 ? o.storeConfigs : currentStores,
            fiscalConfig: o.fiscalConfig || currentFiscal
          };
        });
        setSavedOrders(hydratedOrders);

        // 🛡️ Sincroniza a sequência global de pedidos com os dados do banco
        getNextOrderNumber(hydratedOrders);

        // Se o pedido em edição for uma transferência de CD ou colidir com pedido existente
        setOrder(currentOrder => {
          const isTransfer = 
            currentOrder.header?.supplierId === 'cd_matriz' || 
            String(currentOrder.header?.numeroPedido || '').startsWith('CD-') ||
            String(currentOrder.header?.id || '').startsWith('order_transf_cd_') ||
            (currentOrder.header?.fornecedor && currentOrder.header.fornecedor.toLowerCase().includes('transferência'));

          const isSaved = hydratedOrders.some(o => o.header.id === currentOrder.header.id || o.header.numeroPedido === currentOrder.header.numeroPedido);

          // Se for uma transferência excluída ou se a cotação estiver presa com dados de romaneio de CD: limpa a tela de cotação!
          if (isTransfer && !isSaved) {
            clearCurrentDraft();
            const nextFreeNum = getNextOrderNumber(hydratedOrders);
            const cleanOrd = createNewOrder(currentFiscal, currentStores, nextFreeNum);
            return {
              ...cleanOrd,
              items: ensureTrailingBlankItem(cleanOrd.items || [], currentFiscal, currentStores)
            };
          }

          const validItems = (currentOrder.items || []).filter(it => !isOrderItemBlank(it));
          const hasWork = validItems.length > 0 || (currentOrder.header.fornecedor && currentOrder.header.fornecedor.trim() !== '');
          const currentNum = (currentOrder.header?.numeroPedido || '').trim().toUpperCase();
          const collision = hydratedOrders.some(o => o.header.id !== currentOrder.header.id && o.header.numeroPedido?.trim().toUpperCase() === currentNum);

          if (!isSaved && (!hasWork || collision)) {
            const nextFreeNum = getNextOrderNumber(hydratedOrders);
            return {
              ...currentOrder,
              header: {
                ...currentOrder.header,
                numeroPedido: nextFreeNum
              }
            };
          }

          // 🛡️ Sincroniza versão mais recente caso o pedido já exista no banco (evita falso conflito de versão)
          const matchingSaved = hydratedOrders.find(o => o.header.id === currentOrder.header.id);
          if (matchingSaved && matchingSaved.header) {
            return {
              ...currentOrder,
              header: {
                ...currentOrder.header,
                version: matchingSaved.header.version || (matchingSaved as any).version || currentOrder.header.version || 1
              }
            };
          }

          return currentOrder;
        });
      }
    } catch (err: any) {
      console.warn('Usando armazenamento local de contingência:', err);
    } finally {
      setIsInitialLoading(false);
    }
  };

  // 🛡️ Salvaguarda contra contaminação da tela de Cotação Comercial:
  // Se o pedido ativo for uma transferência que foi excluída ou se a tela de cotação estiver presa com dados de CD, limpa imediatamente!
  useEffect(() => {
    const isOrderTransfer = 
      order.header?.supplierId === 'cd_matriz' || 
      String(order.header?.numeroPedido || '').startsWith('CD-') ||
      String(order.header?.id || '').startsWith('order_transf_cd_') ||
      (order.header?.fornecedor && order.header.fornecedor.toLowerCase().includes('transferência'));

    if (isOrderTransfer) {
      const existsInSaved = savedOrders.some(
        o => o.header.id === order.header.id || o.header.numeroPedido === order.header.numeroPedido
      );
      if (!existsInSaved || activeNav === 'orders') {
        clearCurrentDraft();
        fetchNextOrderNumberFromDb().then(nextNum => {
          const clean = createNewOrder(fiscalConfig, storeConfigs, nextNum);
          setOrder({
            ...clean,
            items: ensureTrailingBlankItem(clean.items || [], fiscalConfig, storeConfigs)
          });
        }).catch(() => {
          const localNum = getNextOrderNumber();
          const clean = createNewOrder(fiscalConfig, storeConfigs, localNum);
          setOrder({
            ...clean,
            items: ensureTrailingBlankItem(clean.items || [], fiscalConfig, storeConfigs)
          });
        });
      }
    }
  }, [activeNav, savedOrders, order.header?.id, order.header?.numeroPedido, order.header?.supplierId]);

  // 1. Validação DIRETA no servidor (SQLite /api/auth/me) na montagem do App
  useEffect(() => {
    let isMounted = true;
    async function checkServerSession() {
      const saved = localStorage.getItem('mega12_user');
      if (!saved) return;

      const session = await verifyServerSession();
      if (!isMounted) return;

      if (!session.valid) {
        if (session.expired) {
          showToast('Sua sessão expirou no servidor. Por favor faça login novamente.', 'error');
        }
        setCurrentUser(null);
      } else if (session.user) {
        // Atualiza perfil oficial e consistente vindo do servidor
        setCurrentUser(session.user);
      }
    }

    checkServerSession();
    return () => { isMounted = false; };
  }, []);

  // 2. Escuta evento global de sessão expirada disparado pelo apiFetch ao tomar 401 do servidor
  useEffect(() => {
    const handleSessionExpired = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      showToast(detail?.message || 'Sua sessão expirou no servidor. Por favor faça login novamente.', 'error');
      setCurrentUser(null);
    };

    window.addEventListener('auth:session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth:session_expired', handleSessionExpired);
    };
  }, []);

  useEffect(() => {
    loadFromSqlite();
  }, []);

  // Prevenção global: impede que o navegador abra a imagem em tela cheia se for solta fora de caixas de upload
  useEffect(() => {
    const handleGlobalDrag = (e: DragEvent) => {
      if (e.dataTransfer?.types && Array.from(e.dataTransfer.types).includes('Files')) {
        e.preventDefault();
      }
    };
    window.addEventListener('dragover', handleGlobalDrag);
    window.addEventListener('drop', handleGlobalDrag);
    return () => {
      window.removeEventListener('dragover', handleGlobalDrag);
      window.removeEventListener('drop', handleGlobalDrag);
    };
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

  // Registro automático de produtos novos no catálogo ao salvar pedidos
  const autoRegisterProductsFromOrder = async (validItems: OrderItem[]) => {
    const itemsToAutoRegister = validItems.filter(it => it.descricao && it.descricao.trim().length > 0);
    if (itemsToAutoRegister.length === 0) return;

    const newProdsToRegister: Product[] = [];
    const prodsToUpdate: Product[] = [];
    let currentProds = [...products];

    // Índices em memória para busca instantânea O(1) escopados por fornecedor
    const existingDescSet = new Map<string, Product>();
    const existingCodeSet = new Map<string, Product>();
    currentProds.forEach(p => {
      const supKey = (p.supplierId || '').trim();
      if (p.descricao) {
        existingDescSet.set(`${supKey}:::${p.descricao.trim().toLowerCase()}`, p);
      }
      if (p.codigo) existingCodeSet.set(p.codigo.trim().toLowerCase(), p);
      if (p.codigoInterno) existingCodeSet.set(p.codigoInterno.trim().toLowerCase(), p);
    });

    for (const it of itemsToAutoRegister) {
      const cleanDesc = it.descricao.trim().toLowerCase();
      const code = (it.codigo || it.codigoInterno || '').trim().toLowerCase();
      const fallbackSupplier = suppliers[0];
      const assignedSupplierId = order.header.supplierId || fallbackSupplier?.id || '';
      const assignedSupplierNome = order.header.fornecedor || fallbackSupplier?.razaoSocial || '';

      // 🛡️ Se o item já tiver código próprio informado, busca estritamente por esse código.
      // Se NÃO tiver código, busca por descrição. Isso permite que produtos com a mesma descrição mas códigos distintos sejam produtos separados no catálogo.
      const existing = code 
        ? existingCodeSet.get(code) 
        : (cleanDesc ? (existingDescSet.get(`${assignedSupplierId}:::${cleanDesc}`) || existingDescSet.get(`:::${cleanDesc}`)) : undefined);

      if (!existing) {
        const codInterno = it.codigoInterno || it.codigo || `PRD-${String(currentProds.length + 1).padStart(3, '0')}`;
        const newProd: Product = {
          id: 'prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          codigoInterno: codInterno,
          codigo: codInterno,
          codigoFornecedor: it.codigoFornecedor || '',
          codigoBarras: '',
          eanBarcode: '',
          descricao: it.descricao.trim(),
          categoria: 'Geral',
          fotoUrl: it.fotoUrl || '',
          qtdPorPacote: it.qtdNoPacote || it.qtdPorPacote || 1,
          precoUnitarioPadrao: it.precoUnitario || 0,
          pdvSugerido: it.pdvAlvo || 0,
          ncm: '',
          supplierId: assignedSupplierId,
          nomeFornecedor: assignedSupplierNome,
          ativo: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        newProdsToRegister.push(newProd);
        currentProds.push(newProd);
      } else if (!existing.supplierId || !existing.nomeFornecedor) {
        existing.supplierId = assignedSupplierId;
        existing.nomeFornecedor = assignedSupplierNome;
        existing.updatedAt = new Date().toISOString();
        prodsToUpdate.push(existing);
      }
    }

    const prodsToSync = [...newProdsToRegister, ...prodsToUpdate];
    if (prodsToSync.length > 0) {
      try {
        await saveProductsBatchToDb(prodsToSync);
      } catch {
        for (const p of prodsToSync) {
          await saveProductToDb(p).catch(() => {});
        }
      }
      try {
        saveBatchProductsToStorage(prodsToSync);
      } catch (storageErr) {
        console.warn('Aviso: falha ao sincronizar produtos no cache local:', storageErr);
      }
      const refreshed = await fetchProductsFromDb().catch(() => getProductsList());
      setProducts(refreshed);
    }
  };

  // Salva o pedido silenciosamente exclusivamente em memória e localStorage para contingência local
  const saveOrderSilently = async (targetOrder: PurchaseOrder) => {
    // 🛡️ Autosave de rede desativado para testes de estabilidade operacional.
    // Preserva no armazenamento local do navegador sem disparar requisições HTTP ou gerar falsos conflitos de versão.
    try {
      saveOrderToHistory(targetOrder);
      saveCurrentOrder(targetOrder);
    } catch (err) {
      console.warn('Aviso ao salvar contingência local:', err);
    }
  };

  // Salva o rascunho do pedido ativo exclusivamente no armazenamento local (localStorage) a cada alteração
  useEffect(() => {
    saveCurrentOrder(order);
  }, [order]);

  const toggleTheme = () => setIsDark(prev => !prev);

  const handleLogout = () => {
    localStorage.removeItem('mega12_user');
    setCurrentUser(null);
    setActiveNav('home');
  };

  const handleLoginSuccess = async (user: User) => {
    const cleanUser = {
      ...user,
      nome: (user.nome || '').replace(/\s*\([^)]*\)/g, '').trim()
    };
    setCurrentUser(cleanUser);
    localStorage.setItem('mega12_user', JSON.stringify(cleanUser));
    // Carrega na hora os dados do banco usando o token do usuário logado
    await loadFromSqlite();
    setActiveNav(getDefaultNavForRole(cleanUser.role));
  };

  // Sincroniza o frete proporcional ao total de produtos quando a alíquota percentual estiver definida
  const syncOrderFreteAndItems = (
    prev: PurchaseOrder, 
    newItems: OrderItem[], 
    activeFiscal?: FiscalConfig
  ): { items: OrderItem[]; header: typeof prev.header } => {
    const rawValorFrete = Number(prev.header?.valorFrete ?? prev.header?.valorFreteGlobal) || 0;
    let effectiveTipoFrete = prev.header?.tipoFrete;
    if (rawValorFrete > 0 && (!effectiveTipoFrete || effectiveTipoFrete === 'CIF')) {
      effectiveTipoFrete = 'FOB';
    }
    const isCif = String(effectiveTipoFrete || 'CIF').toUpperCase().includes('CIF') && rawValorFrete <= 0;
    let updatedHeader = effectiveTipoFrete !== prev.header?.tipoFrete ? { ...prev.header, tipoFrete: effectiveTipoFrete } : prev.header;

    if (isCif) {
      if (prev.header?.valorFrete !== 0 || prev.header?.valorFreteGlobal !== 0) {
        updatedHeader = {
          ...prev.header,
          valorFrete: 0,
          valorFreteGlobal: 0
        };
      }
    } else {
      // Se não for CIF (ex: FOB), sincroniza somente se já havia frete definido pelo usuário
      const fiscal = activeFiscal || prev.fiscalConfig || fiscalConfig || DEFAULT_FISCAL_CONFIG;
      const freteRate = normalizeRateToDecimal(fiscal.freteAliquota, 0);
      const totalMerc = calculateOrderMerchandiseTotal({ ...prev, items: newItems });

      if (freteRate > 0 && Number(prev.header?.valorFrete) > 0) {
        const novoValorFrete = Number((totalMerc * freteRate).toFixed(2));
        updatedHeader = {
          ...prev.header,
          valorFrete: novoValorFrete,
          valorFreteGlobal: novoValorFrete
        };
      }
    }

    return { items: newItems, header: updatedHeader };
  };

  // Handlers for Order Header
  const handleHeaderChange = (updatedHeader: typeof order.header) => {
    setOrder(prev => {
      let newFiscal = prev.fiscalConfig || fiscalConfig;
      let updatedItems = prev.items;

      const isExplicitCif = String(updatedHeader?.tipoFrete || '').toUpperCase() === 'CIF';
      const rawValorFrete = isExplicitCif ? 0 : (Number(updatedHeader?.valorFrete ?? updatedHeader?.valorFreteGlobal) || 0);
      let effectiveTipoFrete = isExplicitCif ? 'CIF' : updatedHeader?.tipoFrete;
      if (!isExplicitCif && rawValorFrete > 0 && (!effectiveTipoFrete || effectiveTipoFrete === 'CIF')) {
        effectiveTipoFrete = 'FOB';
        updatedHeader = { ...updatedHeader, tipoFrete: 'FOB' };
      }
      const isCif = isExplicitCif || (String(effectiveTipoFrete || 'CIF').toUpperCase().includes('CIF') && rawValorFrete <= 0);
      if (isCif) {
        updatedHeader = {
          ...updatedHeader,
          tipoFrete: 'CIF',
          valorFrete: 0,
          valorFreteGlobal: 0
        };
      }

      // Se alterou o percentual de desconto OFF no cabeçalho/condições de pagamento
      const oldOff = prev.header.percentualDescontoOff ?? 0;
      const newOff = updatedHeader.percentualDescontoOff ?? 0;

      if (newOff !== oldOff) {
        updatedHeader = { ...updatedHeader, aplicarDescontoOff: true };
        const descPct = Math.max(0, Math.min(100, newOff));
        updatedItems = (prev.items || []).map(it => {
          if (!it.descricao && !it.codigo && !it.precoUnitario) return it;
          const pecas = Number(it.qtdTotalUnidades) || ((Number(it.qtdNoPacote) || 1) * (Number(it.qtdPacotes) || 0)) || 0;
          const preco = Number(it.precoUnitario) || 0;
          const totalBruto = pecas * preco;
          const valorDesc = Number((totalBruto * (descPct / 100)).toFixed(2));
          const valorLiquido = Number((totalBruto - valorDesc).toFixed(2));
          const precoEfetivo = preco * (1 - descPct / 100);
          const pdv = it.pdvAlvo || 0;
          const f = calculateItemFiscal(precoEfetivo, pdv, newFiscal, it.fiscalOverride);

          return {
            ...it,
            percentualDesconto: descPct,
            valorDescontoItem: valorDesc,
            valorTotalLiquido: valorLiquido,
            custoLoja: f.custoLoja,
            custoFornecedor: f.custoFornecedor,
            despesasPdvUnit: f.despesasPdvUnit,
            creditoIcmsUnit: f.creditoIcmsUnit,
            custoRealEfetivo: f.custoRealEfetivo,
            margemRealUnit: f.margemRealUnit,
            margemPercentual: f.margemPercentual
          };
        });
      }

      // Se o usuário digitou ou alterou o valor do frete em R$ manualmente no cabeçalho (apenas se não for CIF)
      if (!isCif && updatedHeader.valorFrete !== prev.header.valorFrete) {
        const tempOrder = { ...prev, header: updatedHeader, items: updatedItems };
        const totalMerc = calculateOrderMerchandiseTotal(tempOrder);
        const newRate = totalMerc > 0 ? Number(((updatedHeader.valorFrete || 0) / totalMerc).toFixed(4)) : 0;
        newFiscal = {
          ...newFiscal,
          freteAliquota: newRate
        };
      }

      let nextInstallments = updatedHeader.importadoDePlanilha && !updatedHeader.dataPedido && !updatedHeader.dataEntregaPrevista
        ? []
        : generateOrderInstallments({ ...prev, header: updatedHeader, items: updatedItems }, undefined, undefined, true);
      if (isCif) {
        nextInstallments = nextInstallments.filter(inst => !inst.isBoletoFrete && inst.tipoTitulo !== 'frete' && !inst.observacao?.toLowerCase().includes('frete'));
      }

      let newOrder: PurchaseOrder = { 
        ...prev, 
        header: updatedHeader,
        fiscalConfig: newFiscal,
        items: updatedItems,
        installments: nextInstallments
      };

      if (
        updatedHeader.dataEntregaPrevista !== prev.header.dataEntregaPrevista &&
        (updatedHeader.dataEntregaPrevista?.length === 10 || !updatedHeader.dataEntregaPrevista)
      ) {
        try {
          const rescheduleRes = rescheduleOrderDelivery(
            { ...prev, header: updatedHeader, items: updatedItems, fiscalConfig: newFiscal },
            {
              newDeliveryDate: updatedHeader.dataEntregaPrevista,
              adjustPendingInstallments: true,
              reason: 'Ajuste manual no cabeçalho do pedido',
              userName: currentUser?.nome || currentUser?.email || 'Comprador'
            }
          );
          newOrder = rescheduleRes.updatedOrder;
          saveCurrentOrder(newOrder);
          saveOrderToHistory(newOrder);
          setSavedOrders(loadSavedOrdersList());
          saveOrderSilently(newOrder).catch(() => {});
          const daysText = rescheduleRes.diffDays !== 0 ? ` (${rescheduleRes.diffDays > 0 ? '+' : ''}${rescheduleRes.diffDays} dias)` : '';
          const boletosMsg = rescheduleRes.installmentsAdjustedCount > 0 
            ? ` ${rescheduleRes.installmentsAdjustedCount} boleto(s) em aberto ajustado(s)!` 
            : ' Boletos recalculados!';
          showToast(`Previsão de entrega atualizada para ${toBrDate(updatedHeader.dataEntregaPrevista) || 'A definir'}${daysText}.${boletosMsg}`, 'info');
        } catch {
          saveCurrentOrder(newOrder);
          saveOrderToHistory(newOrder);
          setSavedOrders(loadSavedOrdersList());
          saveOrderSilently(newOrder).catch(() => {});
        }
      }

      return newOrder;
    });
  };

  // Handler para configuração fiscal individual do pedido
  const handleOrderFiscalConfigChange = (newFiscal: FiscalConfig) => {
    setOrder(prev => {
      const stValue = newFiscal.aliquotaSt !== undefined 
        ? Number((newFiscal.aliquotaSt > 1 ? newFiscal.aliquotaSt : newFiscal.aliquotaSt * 100).toFixed(2)) 
        : prev.header.aliquotaSt;

      const totalMerc = calculateOrderMerchandiseTotal(prev);
      const rawValorFrete = Number(prev.header?.valorFrete ?? prev.header?.valorFreteGlobal) || 0;
      let effectiveTipoFrete = prev.header?.tipoFrete;
      if (rawValorFrete > 0 && (!effectiveTipoFrete || effectiveTipoFrete === 'CIF')) {
        effectiveTipoFrete = 'FOB';
      }
      const isCif = String(effectiveTipoFrete || 'CIF').toUpperCase().includes('CIF') && rawValorFrete <= 0;
      const freteRate = normalizeRateToDecimal(newFiscal.freteAliquota, 0);
      const novoValorFrete = (!isCif && rawValorFrete > 0 && freteRate > 0)
        ? Number((totalMerc * freteRate).toFixed(2))
        : (isCif ? 0 : rawValorFrete);
      
      const updatedHeader = {
        ...prev.header,
        tipoFrete: effectiveTipoFrete || prev.header?.tipoFrete || 'CIF',
        aliquotaSt: stValue,
        valorFrete: novoValorFrete,
        valorFreteGlobal: novoValorFrete
      };

      const updatedItems = (prev.items || []).map(it => {
        if (!it.precoUnitario && !it.descricao) return it;
        const descPct = it.percentualDesconto || 0;
        const precoEfetivo = it.precoUnitario * (1 - descPct / 100);
        const pdv = it.pdvAlvo || 0;
        const f = calculateItemFiscal(precoEfetivo, pdv, newFiscal, it.fiscalOverride);
        return {
          ...it,
          custoLoja: f.custoLoja,
          custoFornecedor: f.custoFornecedor,
          despesasPdvUnit: f.despesasPdvUnit,
          creditoIcmsUnit: f.creditoIcmsUnit,
          custoRealEfetivo: f.custoRealEfetivo,
          margemRealUnit: f.margemRealUnit,
          margemPercentual: f.margemPercentual
        };
      });

      return {
        ...prev,
        fiscalConfig: newFiscal,
        header: updatedHeader,
        items: updatedItems,
        installments: generateOrderInstallments({ ...prev, header: updatedHeader, items: updatedItems }, undefined, undefined, true)
      };
    });
  };

  // Média de preço dos itens e PDV para a simulação ao vivo do card fiscal
  const averageItemPrice = useMemo(() => {
    const validItems = (order.items || []).filter(it => it.descricao && it.precoUnitario > 0);
    if (validItems.length === 0) return 0;
    const sum = validItems.reduce((acc, it) => acc + (it.precoUnitario || 0), 0);
    return Number((sum / validItems.length).toFixed(2));
  }, [order.items]);

  const samplePdv = useMemo(() => {
    const validItems = (order.items || []).filter(it => it.descricao && it.pdvAlvo > 0);
    if (validItems.length === 0) return 0;
    const sum = validItems.reduce((acc, it) => acc + (it.pdvAlvo || 0), 0);
    return Number((sum / validItems.length).toFixed(2));
  }, [order.items]);

  // Handlers for Items
  const handleUpdateItem = (itemId: string, updatedFields: Partial<OrderItem>) => {
    setOrder(prev => {
      const updatedItems = prev.items.map(item => item.id === itemId ? { ...item, ...updatedFields } : item);
      const cleanItems = ensureTrailingBlankItem(updatedItems, fiscalConfig, storeConfigs);
      const synced = syncOrderFreteAndItems(prev, cleanItems);
      const newOrder: PurchaseOrder = {
        ...prev,
        header: synced.header,
        items: synced.items
      };
      if (updatedFields.ruptura !== undefined) {
        newOrder.installments = generateOrderInstallments(newOrder);
      }
      return newOrder;
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
        const cleanItems = ensureTrailingBlankItem(newItems, fiscalConfig, storeConfigs);
        const synced = syncOrderFreteAndItems(prev, cleanItems);
        return {
          ...prev,
          header: synced.header,
          items: synced.items
        };
      });
      showToast(`Produto "${customItem.descricao}" adicionado.`);
      return;
    }
    setOrder(prev => {
      const cleanItems = ensureTrailingBlankItem(prev.items, fiscalConfig, storeConfigs);
      const synced = syncOrderFreteAndItems(prev, cleanItems);
      return {
        ...prev,
        header: synced.header,
        items: synced.items
      };
    });
  };

  const handleDeleteItem = (itemId: string) => {
    const itemToDelete = order.items.find(item => item.id === itemId);
    const isBlank = itemToDelete ? isOrderItemBlank(itemToDelete) : false;

    setOrder(prev => {
      const filtered = prev.items.filter(item => item.id !== itemId);
      const cleanItems = ensureTrailingBlankItem(filtered, fiscalConfig, storeConfigs);
      const synced = syncOrderFreteAndItems(prev, cleanItems);

      let updatedRemovedItems = prev.removedItems || [];
      if (itemToDelete && !isBlank) {
        const removedEntry: RemovedOrderItem = {
          id: 'rmv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          itemOriginal: { ...itemToDelete },
          removidoPor: currentUser?.nome || currentUser?.email || 'Usuário',
          dataRemocao: new Date().toISOString()
        };
        updatedRemovedItems = [removedEntry, ...updatedRemovedItems];
      }

      return {
        ...prev,
        header: synced.header,
        items: synced.items,
        removedItems: updatedRemovedItems
      };
    });

    if (itemToDelete && !isBlank) {
      showToast(`Item "${itemToDelete.descricao || 'Produto'}" movido para a lixeira do pedido.`, 'info');
    } else {
      showToast('Item removido.', 'info');
    }
  };

  const handleRestoreItem = (removedId: string) => {
    if (order.header.status === 'Finalizado') {
      showToast('Este pedido já foi Finalizado. Itens não podem ser restaurados para manter a integridade fiscal e de estoque.', 'error');
      return;
    }

    const removedEntry = (order.removedItems || []).find(r => r.id === removedId);
    if (!removedEntry) return;

    setOrder(prev => {
      const currentRemoved = prev.removedItems || [];
      const updatedRemoved = currentRemoved.filter(r => r.id !== removedId);

      const existingIds = new Set(prev.items.map(it => it.id));
      const restoredItem: OrderItem = { ...removedEntry.itemOriginal };
      if (existingIds.has(restoredItem.id)) {
        restoredItem.id = 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      }

      const itemsWithoutTrailing = prev.items.filter(it => !isOrderItemBlank(it));
      const newItems = [...itemsWithoutTrailing, restoredItem];
      const cleanItems = ensureTrailingBlankItem(newItems, fiscalConfig, storeConfigs);
      const synced = syncOrderFreteAndItems(prev, cleanItems);

      return {
        ...prev,
        header: synced.header,
        items: synced.items,
        removedItems: updatedRemoved
      };
    });

    showToast(`Produto "${removedEntry.itemOriginal.descricao || 'Produto'}" restaurado com sucesso ao pedido!`, 'success');
  };

  const handleDuplicateItem = (itemToClone: OrderItem) => {
    // 🛡️ Gera um novo código interno único e sequencial para prevenir colisão de sabores ou produtos diferentes
    const newCode = generateNextProductCode(products, order.items);
    const clonedItem: OrderItem = {
      ...itemToClone,
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      codigo: newCode,
      codigoInterno: newCode,
      codigoFornecedor: '', // limpa para obrigar ref correta do fornecedor ou evitar duplicidade
      descricao: itemToClone.descricao
    };

    setOrder(prev => {
      const nonTrailing = prev.items.filter((_, idx) => idx < prev.items.length - 1 || !isOrderItemBlank(prev.items[idx]));
      const cleanItems = ensureTrailingBlankItem([...nonTrailing, clonedItem], fiscalConfig, storeConfigs);
      const synced = syncOrderFreteAndItems(prev, cleanItems);
      return {
        ...prev,
        header: synced.header,
        items: synced.items
      };
    });
    showToast(`Item duplicado com novo código (${newCode})! Ajuste a descrição ou sabor conforme necessário.`, 'success');
  };

  // Iniciar novo pedido em branco (com proteção automática para não perder rascunho anterior em digitação)
  const handleNewOrder = async () => {
    const validItems = (order.items || []).filter(it => !isOrderItemBlank(it));
    const hasWork = validItems.length > 0 || (order.header.fornecedor && order.header.fornecedor.trim() !== '');
    if (hasWork && !isCurrentOrderSaved) {
      await saveOrderSilently(order);
      showToast(`Pedido anterior ${order.header.numeroPedido} salvo em espera.`, 'info');
    }

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
    } catch (err) {
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

  // Estado para modal de confirmação de exclusão da tela de cotação
  const [orderToDeleteFromHeader, setOrderToDeleteFromHeader] = useState<PurchaseOrder | null>(null);

  // Solicitar descarte ou exclusão do pedido ativo na cotação com proteção por senha de diretoria
  const handleRequestDiscardOrDelete = () => {
    const validItems = (order.items || []).filter(it => !isOrderItemBlank(it));
    const hasWork = validItems.length > 0 || (order.header.fornecedor && order.header.fornecedor.trim() !== '');
    const isSaved = savedOrders.some(o => o.header.id === order.header.id || o.header.numeroPedido === order.header.numeroPedido);

    // Se o pedido tiver itens, valores ou já estiver salvo no SQLite, exige confirmação por senha de diretoria
    if (hasWork || isSaved) {
      setOrderToDeleteFromHeader(order);
    } else {
      // Se estiver totalmente vazio e nunca salvo, apenas zera o formulário
      handleDiscardDraft();
    }
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
    } catch (err) {
      console.warn('Persistido localmente. Aviso SQLite:', err);
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

    setOrder(prev => {
      const newHeader = {
        ...prev.header,
        fornecedor: targetSup.razaoSocial,
        supplierId: targetSup.id,
        vendedor: targetSup.vendedorPadrao || prev.header.vendedor,
        contatoVendedor: targetSup.contatoVendedor || prev.header.contatoVendedor,
        condicaoPagamento: template.condicaoPagamento || targetSup.condicaoPagamentoPadrao || prev.header.condicaoPagamento,
        aliquotaSt: template.aliquotaSt !== undefined ? template.aliquotaSt : (targetSup.aliquotaStPadrao || 0),
        percentualDescontoOff: template.descontoOff !== undefined ? template.descontoOff : 0,
        percentualNota: template.percentualNota !== undefined ? template.percentualNota : (targetSup.percentualNotaPadrao || 100),
        observacoesDescarga: template.observacoes || prev.header.observacoesDescarga
      };
      const synced = syncOrderFreteAndItems({ ...prev, header: newHeader }, itemsWithBlank);
      return {
        ...prev,
        header: synced.header,
        items: synced.items
      };
    });

    showToast(`📦 Compra Padrão de "${targetSup.razaoSocial}" carregada (${template.items.length} itens)!`, 'success');
  };

  // 🛡️ Aplica o Ajuste Fiscal da Entrega (Conciliação com o Valor da NF)
  const handleApplyFiscalAdjustment = async (targetNfValue: number) => {
    if (targetNfValue <= 0) return;

    const adjResult = distributeFiscalAdjustmentToItems(
      order.items,
      targetNfValue,
      order.header,
      order.fiscalConfig || fiscalConfig
    );

    const updatedHeader = {
      ...order.header,
      valorNotaFiscalEntregue: targetNfValue,
      ajusteFiscalDiferenca: adjResult.diferencaTotal,
      ajusteFiscalData: new Date().toISOString(),
      ajusteFiscalUsuario: currentUser?.nome || currentUser?.email || 'Usuário'
    };

    const candidateOrder: PurchaseOrder = {
      ...order,
      header: updatedHeader,
      items: adjResult.updatedItems
    };

    // Regenera parcelas/boletos com o novo total da NF para o faturamento liberar sem divergência
    let updatedInstallments = generateOrderInstallments(candidateOrder, undefined, undefined, false);
    if (order.installments && order.installments.length > 0) {
      updatedInstallments = updatedInstallments.map(newInst => {
        const prev = order.installments?.find(p => p.numeroParcela === newInst.numeroParcela && p.isBoletoFrete === newInst.isBoletoFrete);
        if (prev && prev.status === 'Pago') {
          return {
            ...newInst,
            status: 'Pago',
            dataPagamento: prev.dataPagamento
          };
        }
        return newInst;
      });
    }

    const finalOrder: PurchaseOrder = {
      ...candidateOrder,
      installments: updatedInstallments
    };

    setOrder(finalOrder);
    saveOrderToHistory(finalOrder);
    setSavedOrders(prev => {
      const idx = prev.findIndex(o => o.header.id === finalOrder.header.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = finalOrder;
        return next;
      }
      return [finalOrder, ...prev];
    });

    try {
      await saveOrderToDb(finalOrder);
    } catch (e) {
      console.warn('Aviso ao sincronizar ajuste fiscal no SQLite:', e);
    }

    const tipoAjuste = adjResult.diferencaTotal >= 0 ? 'Acréscimo' : 'Desconto';
    const sinal = adjResult.diferencaTotal >= 0 ? '+' : '-';
    showToast(
      `Ajuste Fiscal aplicado: ${tipoAjuste} de ${sinal}R$ ${Math.abs(adjResult.diferencaTotal).toFixed(2).replace('.', ',')} direto no valor final do pedido. Total da NF: R$ ${targetNfValue.toFixed(2).replace('.', ',')}. Produtos 100% inalterados.`,
      'success'
    );
  };

  // 🛡️ Restaura os preços unitários originais dos produtos antes do Ajuste Fiscal
  const handleRestoreFiscalAdjustment = async () => {
    const restResult = restoreOriginalItemPrices(
      order.items,
      order.header,
      order.fiscalConfig || fiscalConfig
    );

    const updatedHeader = {
      ...order.header,
      valorNotaFiscalEntregue: undefined,
      ajusteFiscalDiferenca: undefined,
      ajusteFiscalData: undefined,
      ajusteFiscalUsuario: undefined
    };

    const candidateOrder: PurchaseOrder = {
      ...order,
      header: updatedHeader,
      items: restResult.updatedItems
    };

    let updatedInstallments = generateOrderInstallments(candidateOrder, undefined, undefined, false);
    if (order.installments && order.installments.length > 0) {
      updatedInstallments = updatedInstallments.map(newInst => {
        const prev = order.installments?.find(p => p.numeroParcela === newInst.numeroParcela && p.isBoletoFrete === newInst.isBoletoFrete);
        if (prev && prev.status === 'Pago') {
          return {
            ...newInst,
            status: 'Pago',
            dataPagamento: prev.dataPagamento
          };
        }
        return newInst;
      });
    }

    const finalOrder: PurchaseOrder = {
      ...candidateOrder,
      installments: updatedInstallments
    };

    setOrder(finalOrder);
    saveOrderToHistory(finalOrder);
    setSavedOrders(prev => {
      const idx = prev.findIndex(o => o.header.id === finalOrder.header.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = finalOrder;
        return next;
      }
      return [finalOrder, ...prev];
    });

    try {
      await saveOrderToDb(finalOrder);
    } catch (e) {
      console.warn('Aviso ao sincronizar restauração fiscal no SQLite:', e);
    }

    const totalOriginal = calculateOrderTotals(restResult.updatedItems, updatedHeader, order.fiscalConfig || fiscalConfig).totalGeral;
    showToast(`Ajuste Fiscal removido. Total do pedido restabelecido para R$ ${totalOriginal.toFixed(2).replace('.', ',')}.`, 'info');
  };

  // Carrega com segurança e resposta instantânea (0ms) o pedido selecionado
  const handleOpenSelectedOrder = (selected: PurchaseOrder, destinationTab: ActiveNavTab = 'orders') => {
    // 1. Ao trocar de pedido, se havia trabalho no pedido atual, preserva silenciosamente no banco SQLite
    if (order && order.header.id !== selected.header.id) {
      const validItems = (order.items || []).filter(it => !isOrderItemBlank(it));
      const hasWork = validItems.length > 0 || (order.header.fornecedor && order.header.fornecedor.trim() !== '');

      if (hasWork) {
        const orderSnapshot = { ...order };
        saveOrderSilently(orderSnapshot).catch(err => {
          console.warn('Aviso ao salvar pedido em background:', err);
        });
      }
    }

    // 2. Carrega e renderiza IMEDIATAMENTE o pedido selecionado sem qualquer bloqueio de rede ou do thread principal
    const today = new Date().toISOString().split('T')[0];
    const targetDate = selected.header.dataPedido || selected.header.dataEmissao || today;
    const sanitizedItems = (selected.items || []).map(it => ({
      ...it,
      descricao: it.descricao ? it.descricao.replace(/\s*\([Cc][óo]pia\)\s*$/g, '').trim() : ''
    }));

    // Preenche fornecedor/supplierId se puder ser resolvido antecipadamente para evitar efeito em cascata no OrderHeaderForm
    let resolvedSupplierId = selected.header.supplierId;
    if (!resolvedSupplierId && selected.header.fornecedor) {
      const fornLower = selected.header.fornecedor.toLowerCase();
      const matchingSup = suppliers.find(s => 
        (s.razaoSocial && s.razaoSocial.toLowerCase() === fornLower) ||
        (s.nomeFantasia && s.nomeFantasia.toLowerCase() === fornLower)
      );
      if (matchingSup) {
        resolvedSupplierId = matchingSup.id;
      }
    }

    let cleanNum = (selected.header?.numeroPedido || '').trim();
    if (isBogusOrderNumber(cleanNum)) {
      cleanNum = getNextOrderNumber();
    }

    // Recupera frete das parcelas se o cabeçalho estiver zerado
    const existingFreteInst = Array.isArray(selected.installments)
      ? selected.installments.find(inst => inst.isBoletoFrete || inst.tipoTitulo === 'frete' || inst.observacao?.toLowerCase().includes('frete'))
      : undefined;

    let selectedFreteVal = Number(selected.header.valorFrete ?? selected.header.valorFreteGlobal) || 0;
    if (selectedFreteVal <= 0 && existingFreteInst && existingFreteInst.valor > 0) {
      selectedFreteVal = existingFreteInst.valor;
    }
    let selectedTipoFrete = selected.header.tipoFrete;
    if (selectedFreteVal > 0 && (!selectedTipoFrete || selectedTipoFrete === 'CIF')) {
      selectedTipoFrete = 'FOB';
    }

    const updatedOrder: PurchaseOrder = {
      ...selected,
      header: {
        ...selected.header,
        numeroPedido: cleanNum,
        supplierId: resolvedSupplierId || selected.header.supplierId,
        tipoFrete: selectedTipoFrete || (selectedFreteVal > 0 ? 'FOB' : (selected.header.tipoFrete || 'CIF')),
        valorFrete: selectedFreteVal,
        valorFreteGlobal: selectedFreteVal,
        dataPedido: targetDate,
        dataEmissao: selected.header.dataEmissao || targetDate
      },
      items: ensureTrailingBlankItem(sanitizedItems, fiscalConfig, storeConfigs)
    };

    let targetTab = destinationTab;
    const isTransfer = 
      selected.header.supplierId === 'cd_matriz' || 
      String(selected.header.numeroPedido || '').startsWith('CD-') || 
      String(selected.header.id || '').startsWith('order_transf_cd_') ||
      (selected.header.fornecedor && selected.header.fornecedor.toLowerCase().includes('transferência'));

    if (isTransfer && targetTab === 'orders') {
      targetTab = 'separation';
    }

    if (!canAccessTab(currentUser, targetTab)) {
      targetTab = getDefaultNavForRole(currentUser?.role);
    }

    // startTransition garante prioridade máxima para a resposta de clique do usuário
    startTransition(() => {
      baseOrderRef.current = JSON.parse(JSON.stringify(updatedOrder));
      setOrder(updatedOrder);
      setViewMode('desktop');
      if (activeNav !== targetTab) {
        setActiveNav(targetTab);
      }
    });

    showToast(`Pedido ${cleanNum} carregado com sucesso.`);
  };

  // 🔄 Sincronização Granular com o Servidor (Three-Way Merge)
  const handleSyncWithRemote = async () => {
    if (!order?.header?.id) return;
    setIsSyncingRemote(true);
    try {
      const remote = await fetchOrderByIdFromDb(order.header.id);
      const mergeResult = threeWayMergeOrder(baseOrderRef.current, remote, order);
      if (mergeResult.hasConflicts) {
        setConflictMergeData({ remote, mergeResult });
      } else {
        const mergedWithBlank = {
          ...mergeResult.mergedOrder,
          items: ensureTrailingBlankItem(mergeResult.mergedOrder.items || [], fiscalConfig, storeConfigs)
        };
        setOrder(mergedWithBlank);
        baseOrderRef.current = JSON.parse(JSON.stringify(remote));
        dismissAlert();
        triggerIOSBanner(mergeResult.summary, 'success');
      }
    } catch (err: any) {
      triggerIOSAlert({
        title: 'Erro na Sincronização',
        message: err?.message || 'Não foi possível buscar a versão mais recente do servidor.',
        type: 'error',
        confirmText: 'OK'
      });
    } finally {
      setIsSyncingRemote(false);
    }
  };

  // ✅ Resolução de Conflitos Específicos Campo a Campo
  const handleResolveConflicts = (resolutions: Record<string, 'local' | 'remote'>) => {
    if (!conflictMergeData) return;
    const { remote, mergeResult } = conflictMergeData;
    const resolvedOrder: PurchaseOrder = JSON.parse(JSON.stringify(mergeResult.mergedOrder));

    mergeResult.conflicts.forEach((conflict, index) => {
      const key = `${conflict.identifier || conflict.field}_${index}`;
      const choice = resolutions[key] || 'local';

      if (conflict.domain === 'financial') {
        if (conflict.field === 'installments') {
          resolvedOrder.installments = choice === 'remote' ? conflict.remoteValue : conflict.localValue;
        } else if (choice === 'remote') {
          (resolvedOrder.header as any)[conflict.field] = conflict.remoteValue;
        } else {
          (resolvedOrder.header as any)[conflict.field] = conflict.localValue;
        }
      } else if (conflict.domain === 'items') {
        const item = resolvedOrder.items.find(i => (i.id || i.codigoInterno || i.descricao) === conflict.identifier);
        if (item) {
          (item as any)[conflict.field] = choice === 'remote' ? conflict.remoteValue : conflict.localValue;
        }
      }
    });

    const finalizedOrder = {
      ...resolvedOrder,
      items: ensureTrailingBlankItem(resolvedOrder.items || [], fiscalConfig, storeConfigs)
    };

    setOrder(finalizedOrder);
    baseOrderRef.current = JSON.parse(JSON.stringify(remote));
    setConflictMergeData(null);
    dismissAlert();
    triggerIOSBanner('Conflitos resolvidos e pedido sincronizado com sucesso!', 'success');
  };

  // 1. Salvar Pedido em Rascunho / Espera (mantém o pedido na tela para continuar editando)
  const handleSaveDraftOrder = async () => {
    const validItems = order.items.filter(it => !isOrderItemBlank(it));
    if (validItems.length === 0 && (!order.header.fornecedor || order.header.fornecedor.trim() === '')) {
      triggerIOSAlert({
        title: 'Pedido Totalmente Vazio',
        message: 'Não é possível salvar um pedido sem nenhum fornecedor ou produto preenchido.',
        type: 'error',
        confirmText: 'Entendi'
      });
      return;
    }

    const cleanNum = (order.header.numeroPedido || '').trim().toUpperCase();
    if (!cleanNum) {
      triggerIOSAlert({
        title: 'Número Obrigatório',
        message: 'O número do pedido é obrigatório. Por favor, informe um número de pedido antes de salvar.',
        type: 'error',
        confirmText: 'Ajustar'
      });
      return;
    }

    // 🛡️ Validação Estrita de Unicidade em tempo real (Local e no SQLite)
    let conflict = savedOrders.find(o => 
      o.header.id !== order.header.id && 
      o.header.numeroPedido && 
      o.header.numeroPedido.trim().toUpperCase() === cleanNum
    );

    let conflictFornecedor = conflict?.header?.fornecedor;

    if (!conflict) {
      try {
        const dbCheck = await checkOrderNumberInDb(cleanNum, order.header.id);
        if (!dbCheck.available) {
          conflict = true as any;
          conflictFornecedor = (dbCheck as any).conflictFornecedor || 'outro fornecedor';
        }
      } catch {}
    }

    // ⛔ BLOQUEIO TOTAL: Não permite salvar enquanto o número duplicado não for ajustado!
    if (conflict) {
      const nextFree = await fetchNextOrderNumberFromDb().catch(() => getNextOrderNumber(savedOrders));
      triggerIOSAlert({
        title: 'Número de Pedido Duplicado',
        message: `Não é possível salvar este pedido!\n\nO número "${order.header.numeroPedido}" já pertence ao pedido do fornecedor "${conflictFornecedor || 'já cadastrado'}".\n\nNúmeros de pedido devem ser únicos. Por favor, ajuste o número do pedido no cabeçalho antes de prosseguir.`,
        type: 'error',
        confirmText: 'Ajustar Manualmente',
        actionText: nextFree ? `⚡ Usar Próximo Livre (${nextFree}) e Salvar` : undefined,
        onAction: nextFree ? async () => {
          const renumberedOrder: PurchaseOrder = {
            ...order,
            header: {
              ...order.header,
              numeroPedido: nextFree
            }
          };
          setOrder(renumberedOrder);
          try {
            const saveRes = await saveOrderToDb(renumberedOrder, { autoAssignNextOnConflict: false });
            const effectiveOrder: PurchaseOrder = saveRes?.order ? {
              ...saveRes.order,
              items: ensureTrailingBlankItem(validItems, fiscalConfig, storeConfigs)
            } : renumberedOrder;
            try { saveOrderToHistory(effectiveOrder); } catch {}
            const updatedOrders = await fetchOrdersFromDb().catch(() => loadSavedOrdersList());
            setSavedOrders(updatedOrders);
            setOrder(effectiveOrder);
            clearLocalSavePending();
            triggerIOSBanner(`Pedido salvo com sucesso como ${nextFree}!`, 'success');
          } catch (retryErr: any) {
            triggerIOSAlert({
              title: 'Erro ao Salvar Pedido',
              message: retryErr.message || 'Falha ao salvar com o próximo número sequencial livre.',
              type: 'error',
              confirmText: 'OK'
            });
          }
        } : undefined
      });
      return; // IMPEDE O SALVAMENTO!
    }

    await autoRegisterProductsFromOrder(validItems);

    const today = new Date().toISOString().split('T')[0];
    const targetDate = order.header.dataPedido || order.header.dataEmissao || today;

    const isClosed = Boolean(
      order.header.status && 
      order.header.status !== 'Em Cotação' && 
      order.header.status !== 'Rascunho'
    );

    // 🛡️ Regra Oficial de Negócio: Enquanto o pedido NÃO tiver recebimento físico confirmado na Matriz (!recebidoMatriz),
    // a alteração da previsão de entrega e ajustes operacionais são plenamente autorizados na esteira.
    const isReceiptConfirmed = Boolean(order.header.recebidoMatriz);
    const canSaveThisClosedOrder = currentUser?.role === 'diretoria' || 
                                   currentUser?.role === 'faturamento' || 
                                   (currentUser?.role as any) === 'root' || 
                                   !isReceiptConfirmed ||
                                   canEditSpecificOrder(currentUser, order.header.status);

    if (isClosed && isReceiptConfirmed && !canSaveThisClosedOrder) {
      triggerIOSAlert({
        title: 'Pedido Bloqueado na Esteira',
        message: 'Este pedido já teve o recebimento físico confirmado na Matriz. Alterações nesta fase são restritas à Diretoria e Faturamento.',
        type: 'error',
        confirmText: 'OK'
      });
      return;
    }

    const orderToSave: PurchaseOrder = {
      ...order,
      items: validItems,
      header: {
        ...order.header,
        dataPedido: targetDate,
        dataEmissao: order.header.dataEmissao || targetDate,
        isDraft: isClosed ? false : true,
        status: isClosed ? order.header.status : (order.header.status || 'Em Cotação'),
        updatedAt: new Date().toISOString()
      }
    };

    const orderWithInstallments: PurchaseOrder = {
      ...orderToSave,
      installments: generateOrderInstallments(orderToSave, undefined, undefined, true)
    };

    try {
      // autoAssignNextOnConflict: false para respeitar a decisão consciente do usuário
      const saveRes = await saveOrderToDb(orderWithInstallments, { autoAssignNextOnConflict: false });
      const effectiveOrder: PurchaseOrder = saveRes?.order ? {
        ...saveRes.order,
        items: ensureTrailingBlankItem(validItems, fiscalConfig, storeConfigs)
      } : {
        ...orderWithInstallments,
        header: {
          ...orderWithInstallments.header,
          numeroPedido: orderWithInstallments.header.numeroPedido
        },
        items: ensureTrailingBlankItem(validItems, fiscalConfig, storeConfigs)
      };

      try {
        saveOrderToHistory(effectiveOrder);
      } catch (localErr) {
        console.warn('Aviso: cópia em localStorage não pôde ser salva (cota):', localErr);
      }
      const updatedOrders = await fetchOrdersFromDb().catch(() => loadSavedOrdersList());
      setSavedOrders(updatedOrders);
      setOrder(effectiveOrder);
      baseOrderRef.current = JSON.parse(JSON.stringify(effectiveOrder));
      clearLocalSavePending();

      if (isClosed) {
        const updaterRole = currentUser?.role === 'faturamento' ? 'pelo Faturamento' : 'pela Diretoria';
        triggerIOSBanner(`Pedido ${effectiveOrder.header.numeroPedido} atualizado ${updaterRole}!`, 'success');
      } else {
        triggerIOSBanner(`Pedido ${effectiveOrder.header.numeroPedido} salvo com sucesso em espera!`, 'success');
      }

      if (saveRes?.warnings && Array.isArray(saveRes.warnings) && saveRes.warnings.length > 0) {
        const warningLines = saveRes.warnings.map((w: any) => typeof w === 'string' ? w : (w.message || w.code)).join('\n\n');
        triggerIOSAlert({
          title: 'Aviso de Auditoria Financeira',
          message: `O pedido foi salvo, mas foram identificados alertas que necessitam de conferência:\n\n${warningLines}`,
          type: 'warning',
          confirmText: 'Entendido'
        });
      }
    } catch (err: any) {
      console.error('Erro ao salvar pedido no servidor:', err);
      if (err?.code === 'ORDER_CONCURRENT_MODIFICATION' || (err?.status === 409 && err?.code === 'ORDER_CONCURRENT_MODIFICATION')) {
        const modifier = err.lastModifier || 'outro operador';
        const time = err.lastModifiedAt ? ` às ${err.lastModifiedAt}` : '';

        // 🧠 Auto-Recuperação Inteligente via Three-Way Merge
        try {
          if (order?.header?.id) {
            triggerIOSBanner('Mesclando alterações com o servidor...', 'info');
            const remote = await fetchOrderByIdFromDb(order.header.id);
            const mergeResult = threeWayMergeOrder(baseOrderRef.current, remote, orderWithInstallments);

            if (!mergeResult.hasConflicts) {
              // Conflito de domínios resolvido com sucesso (ex: colega salvou faturamento e usuário salvou compras)!
              const autoSaveRes = await saveOrderToDb(mergeResult.mergedOrder, { autoAssignNextOnConflict: false, forceOverwrite: true });
              const effectiveOrder: PurchaseOrder = autoSaveRes?.order ? {
                ...autoSaveRes.order,
                items: ensureTrailingBlankItem(autoSaveRes.order.items || validItems, fiscalConfig, storeConfigs)
              } : mergeResult.mergedOrder;

              try { saveOrderToHistory(effectiveOrder); } catch {}
              const updatedOrders = await fetchOrdersFromDb().catch(() => loadSavedOrdersList());
              setSavedOrders(updatedOrders);
              setOrder(effectiveOrder);
              baseOrderRef.current = JSON.parse(JSON.stringify(effectiveOrder));
              clearLocalSavePending();

              triggerIOSAlert({
                title: '✨ Sincronização Inteligente Concluída',
                message: `As alterações de ${modifier}${time} foram unificadas com as suas alterações sem perda de dados!\n\n${mergeResult.summary}`,
                type: 'info',
                confirmText: 'Excelente'
              });
              return;
            } else {
              // Conflitos no mesmo campo específico: abre modal ergonômico de resolução
              setConflictMergeData({ remote, mergeResult });
              return;
            }
          }
        } catch (autoMergeErr) {
          console.error('Falha na tentativa de auto-merge:', autoMergeErr);
        }

        triggerIOSAlert({
          title: '⚠️ Conflito de Edição Simultânea',
          message: `Atenção: Este pedido foi alterado e salvo no servidor por ${modifier}${time} enquanto você o editava.\n\nPara não sobrescrever acidentalmente as alterações de ${modifier}, escolha uma das opções:`,
          type: 'warning',
          confirmText: '🔄 Sincronizar e Mesclar Dados',
          actionText: '⚠️ Sobrescrever Mesmo Assim',
          onConfirm: async () => {
            await handleSyncWithRemote();
          },
          onAction: async () => {
            try {
              const forceRes = await saveOrderToDb(orderWithInstallments, { autoAssignNextOnConflict: false, forceOverwrite: true });
              const effectiveOrder: PurchaseOrder = forceRes?.order ? {
                ...forceRes.order,
                items: ensureTrailingBlankItem(validItems, fiscalConfig, storeConfigs)
              } : orderWithInstallments;
              try { saveOrderToHistory(effectiveOrder); } catch {}
              const updatedOrders = await fetchOrdersFromDb().catch(() => loadSavedOrdersList());
              setSavedOrders(updatedOrders);
              setOrder(effectiveOrder);
              baseOrderRef.current = JSON.parse(JSON.stringify(effectiveOrder));
              clearLocalSavePending();
              triggerIOSBanner(`Pedido ${effectiveOrder.header.numeroPedido} salvo (sobrescrita confirmada)!`, 'success');
            } catch (forceErr: any) {
              triggerIOSAlert({
                title: 'Erro ao Forçar Gravação',
                message: forceErr?.message || 'Falha ao forçar o salvamento do pedido.',
                type: 'error',
                confirmText: 'OK'
              });
            }
          }
        });
        return;
      }
      if (err?.code === 'ORDER_NUMBER_CONFLICT' || (!err?.code && err?.status === 409 && (err?.suggestedNextNumber || err?.message?.toLowerCase().includes('número')))) {
        const nextFree = err.suggestedNextNumber || await fetchNextOrderNumberFromDb().catch(() => getNextOrderNumber(savedOrders));
        const conflictForn = err.conflictDetails?.conflictFornecedor;
        const msgDetail = conflictForn 
          ? `O número "${order.header.numeroPedido}" já pertence a outro pedido registrado no sistema (Fornecedor: ${conflictForn}).`
          : (err.message || 'Este número de pedido já está em uso.');

        triggerIOSAlert({
          title: 'Número de Pedido Duplicado',
          message: `${msgDetail}\n\nHá o próximo número sequencial livre disponível:\n👉 ${nextFree}\n\nDeseja aplicar este número e salvar o pedido agora no sistema?`,
          type: 'error',
          confirmText: 'Ajustar Manualmente',
          actionText: nextFree ? `⚡ Usar Próximo Livre (${nextFree}) e Salvar` : undefined,
          onAction: nextFree ? async () => {
            const renumberedOrder: PurchaseOrder = {
              ...orderWithInstallments,
              header: {
                ...orderWithInstallments.header,
                numeroPedido: nextFree
              }
            };
            setOrder(renumberedOrder);
            try {
              const res = await saveOrderToDb(renumberedOrder, { autoAssignNextOnConflict: false });
              const effective: PurchaseOrder = res?.order ? {
                ...res.order,
                items: ensureTrailingBlankItem(validItems, fiscalConfig, storeConfigs)
              } : renumberedOrder;
              try { saveOrderToHistory(effective); } catch {}
              const updatedOrders = await fetchOrdersFromDb().catch(() => loadSavedOrdersList());
              setSavedOrders(updatedOrders);
              setOrder(effective);
              triggerIOSBanner(`Pedido salvo com sucesso como ${nextFree}!`, 'success');
            } catch (retryErr: any) {
              triggerIOSAlert({
                title: 'Erro ao Salvar Pedido',
                message: retryErr.message || 'Não foi possível salvar o pedido reatribuído.',
                type: 'error',
                confirmText: 'OK'
              });
            }
          } : undefined
        });
        return;
      }
      if (isOfflineError(err)) {
        saveCurrentOrder(orderWithInstallments);
        setOrder({
          ...orderWithInstallments,
          items: ensureTrailingBlankItem(validItems, fiscalConfig, storeConfigs)
        });
        markLocalSavePending(order.header.numeroPedido);
        triggerIOSAlert({
          title: 'Salvo somente neste dispositivo',
          message: `O rascunho ${order.header.numeroPedido} foi preservado localmente, mas NÃO foi salvo no banco de dados.\n\nData: ${new Date().toLocaleString('pt-BR')}`,
          type: 'warning',
          confirmText: 'Fechar',
          actionText: 'Tentar enviar novamente',
          onAction: () => { void handleSaveDraftOrder(); }
        });
        return;
      }
      triggerIOSAlert({
        title: 'Erro ao Salvar no Servidor',
        message: err.message || 'Não foi possível salvar o pedido no banco de dados do sistema.',
        type: 'error',
        confirmText: 'OK'
      });
    }
  };

  // Helper para execução do fechamento de pedido com persistência oficial
  const executeCloseOrder = async (targetOrderNumber: string, validItems: OrderItem[]) => {
    await autoRegisterProductsFromOrder(validItems);

    const today = new Date().toISOString().split('T')[0];
    const orderDate = order.header.dataPedido || order.header.dataEmissao || today;

    const closedOrder: PurchaseOrder = {
      ...order,
      items: validItems,
      header: {
        ...order.header,
        numeroPedido: targetOrderNumber,
        dataPedido: orderDate,
        dataEmissao: order.header.dataEmissao || orderDate,
        status: 'Aprovado',
        aprovadoPor: currentUser?.nome || 'Comprador',
        dataAprovacao: new Date().toISOString(),
        isDraft: false,
        updatedAt: new Date().toISOString()
      }
    };

    const orderWithInstallments: PurchaseOrder = {
      ...closedOrder,
      installments: generateOrderInstallments(closedOrder, undefined, undefined, true)
    };

    try {
      const saveRes = await saveOrderToDb(orderWithInstallments, { autoAssignNextOnConflict: false });
      const effectiveNum = saveRes?.newNumber || targetOrderNumber;
      const orderToPersist = saveRes?.order || {
        ...orderWithInstallments,
        header: { ...orderWithInstallments.header, numeroPedido: effectiveNum }
      };

      try {
        saveOrderToHistory(orderToPersist);
      } catch (localErr) {
        console.warn('Aviso: cópia em localStorage não pôde ser salva (cota):', localErr);
      }
      const updatedOrders = await fetchOrdersFromDb().catch(() => loadSavedOrdersList());
      setSavedOrders(updatedOrders);
      clearCurrentDraft();

      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.65 }
      });

      const nextNum = await fetchNextOrderNumberFromDb().catch(() => getNextOrderNumber());
      const cleanOrder = createNewOrder(fiscalConfig, storeConfigs, nextNum);
      setOrder({
        ...cleanOrder,
        items: ensureTrailingBlankItem(cleanOrder.items || [], fiscalConfig, storeConfigs)
      });

      triggerIOSBanner(`Pedido ${effectiveNum} FECHADO e gravado no Banco de Dados!`, 'success');
      clearLocalSavePending();
    } catch (err: any) {
      console.error('Erro ao fechar pedido no servidor:', err);
      if (err?.code === 'ORDER_CONCURRENT_MODIFICATION' || (err?.status === 409 && err?.code === 'ORDER_CONCURRENT_MODIFICATION')) {
        const modifier = err.lastModifier || 'outro operador';
        const time = err.lastModifiedAt ? ` às ${err.lastModifiedAt}` : '';
        triggerIOSAlert({
          title: '⚠️ Conflito de Edição Simultânea',
          message: `Atenção: Este pedido foi alterado e salvo no servidor por ${modifier}${time} enquanto você o finalizava.\n\nPara não sobrescrever acidentalmente as alterações de ${modifier}, escolha uma das opções:`,
          type: 'warning',
          confirmText: '🔄 Recarregar Dados Mais Recentes',
          actionText: '⚠️ Fechar e Sobrescrever Mesmo Assim',
          onConfirm: async () => {
            const refreshedOrders = await fetchOrdersFromDb().catch(() => loadSavedOrdersList());
            setSavedOrders(refreshedOrders);
            const latest = refreshedOrders.find(o => o.header.id === order.header.id);
            if (latest) {
              setOrder({
                ...latest,
                items: ensureTrailingBlankItem(latest.items || [], fiscalConfig, storeConfigs)
              });
              triggerIOSBanner(`Pedido recarregado com a versão mais recente de ${modifier}!`, 'info');
            }
          },
          onAction: async () => {
            try {
              const forceRes = await saveOrderToDb(orderWithInstallments, { autoAssignNextOnConflict: false, forceOverwrite: true });
              const effectiveNum = forceRes?.newNumber || targetOrderNumber;
              const orderToPersist = forceRes?.order || {
                ...orderWithInstallments,
                header: { ...orderWithInstallments.header, numeroPedido: effectiveNum }
              };
              try { saveOrderToHistory(orderToPersist); } catch {}
              const updatedOrders = await fetchOrdersFromDb().catch(() => loadSavedOrdersList());
              setSavedOrders(updatedOrders);
              clearCurrentDraft();
              triggerIOSBanner(`Pedido ${effectiveNum} FECHADO (sobrescrita confirmada)!`, 'success');
              clearLocalSavePending();
            } catch (forceErr: any) {
              triggerIOSAlert({
                title: 'Erro ao Forçar Fechamento',
                message: forceErr?.message || 'Falha ao forçar o fechamento do pedido.',
                type: 'error',
                confirmText: 'OK'
              });
            }
          }
        });
        return;
      }
      if (err?.code === 'ORDER_NUMBER_CONFLICT' || (!err?.code && err?.status === 409 && (err?.suggestedNextNumber || err?.message?.toLowerCase().includes('número')))) {
        const nextFree = err.suggestedNextNumber || await fetchNextOrderNumberFromDb().catch(() => getNextOrderNumber(savedOrders));
        const conflictForn = err.conflictDetails?.conflictFornecedor;
        const msgDetail = conflictForn 
          ? `O número "${targetOrderNumber}" já pertence a outro pedido registrado no sistema (Fornecedor: ${conflictForn}).`
          : (err.message || 'Este número de pedido já está em uso.');

        triggerIOSAlert({
          title: 'Número de Pedido Duplicado',
          message: `${msgDetail}\n\nHá o próximo número sequencial livre disponível:\n👉 ${nextFree}\n\nDeseja aplicar este número e fechar o pedido agora?`,
          type: 'error',
          confirmText: 'Ajustar Manualmente',
          actionText: nextFree ? `⚡ Usar Próximo Livre (${nextFree}) e Fechar` : undefined,
          onAction: nextFree ? async () => {
            setOrder(prev => ({
              ...prev,
              header: { ...prev.header, numeroPedido: nextFree }
            }));
            await executeCloseOrder(nextFree, validItems);
          } : undefined
        });
        return;
      }
      if (isOfflineError(err)) {
        const localDraft: PurchaseOrder = {
          ...orderWithInstallments,
          header: { ...orderWithInstallments.header, status: 'Em Cotação', isDraft: true }
        };
        saveCurrentOrder(localDraft);
        setOrder(localDraft);
        markLocalSavePending(targetOrderNumber);
        triggerIOSAlert({
          title: 'Fechamento não concluído',
          message: `O pedido ${targetOrderNumber} foi mantido como rascunho somente neste dispositivo. Ele NÃO foi fechado nem salvo no banco de dados.`,
          type: 'warning',
          confirmText: 'Fechar',
          actionText: 'Tentar fechar novamente',
          onAction: () => { void executeCloseOrder(targetOrderNumber, validItems); }
        });
        return;
      }
      triggerIOSAlert({
        title: 'Erro ao Fechar Pedido',
        message: err.message || 'Erro ao gravar pedido no banco de dados do sistema.',
        type: 'error',
        confirmText: 'OK'
      });
    }
  };

  // 2. Fechar Pedido (Conclui compras e envia diretamente para a Esteira de Separação do Depósito)
  const handleCloseOrder = async () => {
    const validItems = order.items.filter(it => !isOrderItemBlank(it));
    if (validItems.length === 0) {
      showToast('Adicione ao menos um produto antes de fechar o pedido.', 'error');
      return;
    }
    if (!order.header.fornecedor || order.header.fornecedor.trim() === '') {
      showToast('Selecione um fornecedor para fechar o pedido.', 'error');
      return;
    }

    const cleanNum = (order.header.numeroPedido || '').trim().toUpperCase();
    if (!cleanNum) {
      showToast('O número do pedido é obrigatório.', 'error');
      return;
    }

    // 🛡️ Validação Estrita de Unicidade no sistema e cache local
    const conflict = savedOrders.find(o => 
      o.header.id !== order.header.id && 
      o.header.numeroPedido && 
      o.header.numeroPedido.trim().toUpperCase() === cleanNum
    );
    if (conflict) {
      const nextFree = await fetchNextOrderNumberFromDb().catch(() => getNextOrderNumber(savedOrders));
      triggerIOSAlert({
        title: 'Número de Pedido Duplicado',
        message: `Não é possível fechar o pedido: O número "${order.header.numeroPedido}" já pertence a outro pedido registrado no sistema (Fornecedor: ${conflict.header.fornecedor || 'Fornecedor'}).\n\nHá o próximo número sequencial livre disponível:\n👉 ${nextFree}\n\nDeseja aplicar o próximo número livre e fechar o pedido agora?`,
        type: 'error',
        confirmText: 'Ajustar Manualmente',
        actionText: nextFree ? `⚡ Usar Próximo Livre (${nextFree}) e Fechar` : undefined,
        onAction: nextFree ? async () => {
          setOrder(prev => ({
            ...prev,
            header: { ...prev.header, numeroPedido: nextFree }
          }));
          await executeCloseOrder(nextFree, validItems);
        } : undefined
      });
      return;
    }

    await executeCloseOrder(cleanNum, validItems);
  };

  // 3. Duplicar Pedido Atual
  const handleDuplicateCurrentOrder = async () => {
    if (!order.header.id) return;
    try {
      let duplicated: PurchaseOrder;
      const today = new Date().toISOString().split('T')[0];
      try {
        duplicated = await duplicateOrderInDb(order.header.id);
      } catch {
        const nextNum = await fetchNextOrderNumberFromDb().catch(() => getNextOrderNumber(savedOrders));
        const newId = 'po_' + Date.now();
        duplicated = {
          ...order,
          header: {
            ...order.header,
            id: newId,
            numeroPedido: nextNum,
            dataPedido: today,
            dataEmissao: today,
            status: 'Em Cotação',
            separationStatus: 'Pendente',
            isDraft: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          items: order.items.map(it => ({
            ...it,
            id: 'it_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)
          })),
          installments: []
        };
      }

      // 1. Reverter preços originais dos produtos caso o pedido de origem tenha sofrido ajuste fiscal
      const cleanedItems = (duplicated.items || order.items || []).map(it => {
        const origPrice = it.precoUnitarioOriginal !== undefined && Number(it.precoUnitarioOriginal) > 0
          ? Number(it.precoUnitarioOriginal)
          : Number(it.precoUnitario || 0);
        const pecas = Number(it.qtdTotalUnidades || 0);
        const bruto = Number(it.valorTotalBrutoOriginal !== undefined ? it.valorTotalBrutoOriginal : (pecas * origPrice));
        const hasItemDesc = it.percentualDesconto !== undefined && it.percentualDesconto !== null && it.percentualDesconto > 0;
        const descPct = hasItemDesc ? Number(it.percentualDesconto) : 0;
        const descVal = descPct > 0 ? Number((bruto * (descPct / 100)).toFixed(2)) : 0;
        const liqVal = Math.max(0, Number((bruto - descVal).toFixed(2)));

        const itemCopy = {
          ...it,
          id: it.id && it.id.startsWith('it_') ? it.id : ('it_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)),
          precoUnitario: origPrice,
          valorTotalBruto: bruto,
          valorDescontoItem: descVal,
          valorTotalLiquido: liqVal
        };
        delete itemCopy.precoUnitarioOriginal;
        delete itemCopy.valorTotalBrutoOriginal;
        return itemCopy;
      });
      duplicated.items = cleanedItems;

      // 2. Destruturação para remover chaves que NUNCA devem ser herdadas
      const {
        valorNotaFiscalEntregue: _oldNf,
        ajusteFiscalDiferenca: _oldAdjDiff,
        ajusteFiscalData: _oldAdjDate,
        ajusteFiscalUsuario: _oldAdjUser,
        valoresParcelasPersonalizados: _oldCustomVals,
        datasVencimentoPersonalizadas: _oldCustomDates,
        deliveryRescheduleHistory: _oldResched,
        paymentConfigJson: _oldPJson,
        ...restHeader
      } = (order.header || {}) as any;

      // 3. Preservar dados comerciais do cabeçalho original, mas blindar estritamente o ciclo de vida (status, boletos, conferência, versão, ajuste fiscal)
      duplicated.header = {
        ...restHeader,
        id: duplicated.header.id,
        numeroPedido: duplicated.header.numeroPedido,
        dataPedido: today,
        dataEmissao: today,
        status: 'Em Cotação',
        separationStatus: 'Pendente',
        isDraft: true,
        version: 1,
        boletosLiberados: false,
        boletosLiberadosPor: undefined,
        boletosLiberadosEm: undefined,
        recebidoMatriz: false,
        dataRecebimentoMatriz: undefined,
        recebidoPor: undefined,
        numeroNotaFiscal: undefined,
        distribuicaoConcluida: false,
        distribuidoPor: undefined,
        dataDistribuicao: undefined,
        observacaoDistribuicao: undefined,
        separacaoConcluida: false,
        separadoPor: undefined,
        dataSeparacao: undefined,
        observacaoSeparacao: undefined,
        finalizadoPor: undefined,
        dataFinalizacao: undefined,
        aprovadoPor: undefined,
        dataAprovacao: undefined,
        valorNotaFiscalEntregue: 0,
        ajusteFiscalDiferenca: 0,
        ajusteFiscalData: undefined,
        ajusteFiscalUsuario: undefined,
        valoresParcelasPersonalizados: undefined,
        datasVencimentoPersonalizadas: undefined,
        deliveryRescheduleHistory: [],
        createdAt: duplicated.header.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 4. Preservar 100% da Engenharia Fiscal do pedido original
      const targetFiscal = order.fiscalConfig || fiscalConfig;
      duplicated.fiscalConfig = targetFiscal;
      setFiscalConfig(targetFiscal);

      // Gerar as parcelas de pagamento calculadas a partir da nova data do pedido com as condições idênticas e valor limpo
      duplicated.installments = generateOrderInstallments(duplicated, undefined, undefined, false);

      // Salva no banco e histórico com a data atual e as parcelas geradas
      let effectiveDuplicated = duplicated;
      try {
        const saveRes = await saveOrderToDb(duplicated, { autoAssignNextOnConflict: true });
        if (saveRes?.order) {
          effectiveDuplicated = saveRes.order;
        }
      } catch (saveErr) {
        console.warn('Aviso ao persistir pedido duplicado:', saveErr);
      }
      try {
        saveOrderToHistory(effectiveDuplicated);
      } catch (histErr) {
        console.warn('Aviso ao sincronizar pedido duplicado no histórico local:', histErr);
      }

      const updatedOrders = await fetchOrdersFromDb().catch(() => loadSavedOrdersList());
      setSavedOrders(updatedOrders);
      if (updatedOrders && updatedOrders.length > 0) {
        saveSavedOrdersList(updatedOrders);
      }
      setOrder({
        ...effectiveDuplicated,
        items: ensureTrailingBlankItem(effectiveDuplicated.items || [], targetFiscal, storeConfigs)
      });
      baseOrderRef.current = JSON.parse(JSON.stringify(effectiveDuplicated));

      // 📱 Lembrete obrigatório estilo iPhone ao duplicar pedido
      triggerIOSAlert({
        title: 'Pedido Duplicado',
        message: `Este pedido foi duplicado a partir do pedido anterior e recebeu o novo número sequencial ${effectiveDuplicated.header.numeroPedido}.\n\n⚠️ Lembrete importante:\nVerifique e confirme o Número do Pedido, Fornecedor e as Datas de Entrega antes de finalizar a negociação.`,
        type: 'info',
        confirmText: 'Entendi, vou revisar'
      });
    } catch (err: any) {
      triggerIOSAlert({
        title: 'Erro ao Duplicar Pedido',
        message: err.message || 'Não foi possível duplicar o pedido selecionado.',
        type: 'error',
        confirmText: 'OK'
      });
    }
  };

  // Handler para Aprovação de Pedido (Comprador/Diretoria -> Depósito)
  const handleApproveOrder = async (orderToApprove: PurchaseOrder) => {
    const validItems = orderToApprove.items.filter(it => !isOrderItemBlank(it));
    if (validItems.length === 0) {
      showToast('Não é possível aprovar um pedido sem itens.', 'error');
      return;
    }

    // 🛡️ Sincroniza a versão mais recente do banco para que a aprovação não falhe por defasagem
    let baseOrder = orderToApprove;
    let targetVersion = orderToApprove.header.version;
    try {
      if (orderToApprove.header.id) {
        const remote = await fetchOrderByIdFromDb(orderToApprove.header.id);
        if (remote && remote.header) {
          targetVersion = remote.header.version;
          // Se o pedido no banco possuir itens com distribuição mais recente, preserva
          if (remote.items && remote.items.length > 0) {
            baseOrder = remote;
          }
        }
      }
    } catch {}

    const updatedItems = baseOrder.items.filter(it => !isOrderItemBlank(it));
    const updated: PurchaseOrder = {
      ...baseOrder,
      items: updatedItems.length > 0 ? updatedItems : validItems,
      header: {
        ...baseOrder.header,
        version: targetVersion,
        status: 'Aprovado',
        aprovadoPor: currentUser?.nome || 'Diretoria Compras',
        dataAprovacao: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      installments: (baseOrder.installments && baseOrder.installments.length > 0)
        ? baseOrder.installments
        : generateOrderInstallments(baseOrder)
    };

    try {
      const saveRes = await saveOrderToDb(updated, { forceOverwrite: true });
      const finalApproved = saveRes?.order || updated;
      saveOrderToHistory(finalApproved);
      const refreshedOrders = await fetchOrdersFromDb().catch(() => loadSavedOrdersList());
      setSavedOrders(refreshedOrders);
      setOrder(finalApproved);
      baseOrderRef.current = JSON.parse(JSON.stringify(finalApproved));
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      showToast(`Pedido ${finalApproved.header.numeroPedido} APROVADO! Enviado para distribuição do Depósito Central.`, 'success');
    } catch (err: any) {
      showPersistenceError(err, `Não foi possível aprovar o pedido ${updated.header.numeroPedido}`);
    }
  };

  // Liberação transacional da distribuição para a doca. Estoque e status são confirmados pelo backend.
  const handleReleaseToSeparation = async (orderToRelease: PurchaseOrder) => {
    try {
      const res = await releaseOrderToSeparationApi(orderToRelease.header.id, {
        observacoes: orderToRelease.header.observacaoDistribuicao || ''
      });
      const updated = res.order;
      saveOrderToHistory(updated);
      const [updatedOrders, refreshedStock] = await Promise.all([
        fetchOrdersFromDb(),
        fetchStockFromDb()
      ]);
      setSavedOrders(updatedOrders);
      setCentralStock(refreshedStock);
      saveCentralStock(refreshedStock);
      setOrder(updated);
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      showToast(res.message || `Pedido ${updated.header.numeroPedido} liberado para separação na doca!`, 'success');
    } catch (err: any) {
      showPersistenceError(err, `Não foi possível liberar o pedido ${orderToRelease.header.numeroPedido} para separação`);
    }
  };

  // Handler para Envio do Pedido Aprovado para a Distribuição das Lojas
  const handleSendToDistribution = async (orderToSend: PurchaseOrder) => {
    try {
      const res = await sendOrderToDistributionApi(orderToSend.header.id);
      const updatedOrder = res.order || {
        ...orderToSend,
        header: {
          ...orderToSend.header,
          status: 'Em Distribuição',
          distribuicaoConcluida: false,
          updatedAt: new Date().toISOString()
        }
      };
      saveOrderToHistory(updatedOrder);
      const refreshed = await fetchOrdersFromDb().catch(() => loadSavedOrdersList());
      setSavedOrders(refreshed);
      setOrder(updatedOrder);
      showToast(`Pedido ${updatedOrder.header.numeroPedido} enviado para a Distribuição das Lojas!`, 'success');
    } catch (err: any) {
      showPersistenceError(err, `Não foi possível enviar o pedido ${orderToSend.header.numeroPedido} para distribuição`);
    }
  };

  // Handler para Conclusão de Separação e Envio para Faturamento
  const handleSendToFaturamento = async (orderToSend: PurchaseOrder) => {
    try {
      const conferente = orderToSend.inspection?.conferente || orderToSend.header?.separadoPor || currentUser?.nome || 'Conferente de Doca';
      const avarias = orderToSend.inspection?.avarias || orderToSend.header?.avariasApontadas || [];
      const observacoes = orderToSend.inspection?.observacoesDoca || orderToSend.header?.observacaoSeparacao || '';

      const res = await sendOrderToFaturamentoApi(orderToSend.header.id, {
        conferente,
        avarias,
        observacoes,
        forceIncomplete: true,
        expectedVersion: orderToSend.header?.version
      });
      const updatedOrder = res.order || {
        ...orderToSend,
        header: {
          ...orderToSend.header,
          status: 'Faturamento',
          recebidoMatriz: true,
          recebidoPor: orderToSend.header?.recebidoPor || conferente,
          separacaoConcluida: true,
          separadoPor: conferente,
          dataSeparacao: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };
      saveOrderToHistory(updatedOrder);
      const refreshed = await fetchOrdersFromDb().catch(() => loadSavedOrdersList());
      setSavedOrders(refreshed);
      setOrder(updatedOrder);
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      showToast(`Separação concluída! Pedido ${updatedOrder.header.numeroPedido} encaminhado para Faturamento.`, 'success');
    } catch (err: any) {
      showPersistenceError(err, `Não foi possível encaminhar o pedido ${orderToSend.header.numeroPedido} para faturamento`);
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

  // Salvar pedido atualizado diretamente (ex: pelo módulo financeiro ou romaneio)
  const handleSaveOrderDirect = async (updatedOrder: PurchaseOrder) => {
    const cleanNum = (updatedOrder.header.numeroPedido || '').trim().toUpperCase();
    if (cleanNum) {
      const conflict = savedOrders.find(o => 
        o.header.id !== updatedOrder.header.id && 
        o.header.numeroPedido && 
        o.header.numeroPedido.trim().toUpperCase() === cleanNum
      );
      if (conflict) {
        showToast(`Não é possível salvar: O número "${updatedOrder.header.numeroPedido}" já pertence ao pedido de ${conflict.header.fornecedor || 'outro fornecedor'}.`, 'error');
        return;
      }
    }

    // Salva automaticamente no catálogo produtos deste pedido que ainda não existam
    const validItems = (updatedOrder.items || []).filter(it => !isOrderItemBlank(it) && it.descricao && it.descricao.trim().length > 0);
    if (validItems.length > 0) {
      const newProdsToRegister: Product[] = [];
      const prodsToUpdate: Product[] = [];
      let currentProds = [...products];
      const fallbackSupplier = suppliers[0];
      const assignedSupplierId = updatedOrder.header.supplierId || fallbackSupplier?.id || '';
      const assignedSupplierNome = updatedOrder.header.fornecedor || fallbackSupplier?.razaoSocial || '';

      for (const it of validItems) {
        const existing = currentProds.find(p => {
          const pDesc = (p.descricao || '').trim().toLowerCase();
          const pCodInt = (p.codigoInterno || p.codigo || '').trim().toLowerCase();
          const itCodInt = (it.codigoInterno || it.codigo || '').trim().toLowerCase();
          const itDesc = (it.descricao || '').trim().toLowerCase();
          return (itCodInt && pCodInt && itCodInt === pCodInt) || 
                 (itDesc && pDesc && itDesc === pDesc && (!p.supplierId || p.supplierId === assignedSupplierId));
        });

        if (!existing) {
          const codInterno = it.codigoInterno || it.codigo || generateNextProductCode(currentProds);
          const newProd: Product = {
            id: 'prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            codigoInterno: codInterno,
            codigo: codInterno,
            codigoFornecedor: it.codigoFornecedor || '',
            codigoBarras: '',
            eanBarcode: '',
            descricao: it.descricao.trim(),
            categoria: 'Geral',
            fotoUrl: it.fotoUrl || '',
            qtdPorPacote: it.qtdNoPacote || it.qtdPorPacote || 1,
            precoUnitarioPadrao: it.precoUnitario || 0,
            pdvSugerido: it.pdvAlvo || 0,
            ncm: '',
            supplierId: assignedSupplierId,
            nomeFornecedor: assignedSupplierNome,
            ativo: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          newProdsToRegister.push(newProd);
          currentProds.push(newProd);
        } else if (!existing.supplierId || !existing.nomeFornecedor) {
          existing.supplierId = assignedSupplierId;
          existing.nomeFornecedor = assignedSupplierNome;
          existing.updatedAt = new Date().toISOString();
          prodsToUpdate.push(existing);
        }
      }

      const prodsToSync = [...newProdsToRegister, ...prodsToUpdate];
      if (prodsToSync.length > 0) {
        try {
          await saveProductsBatchToDb(prodsToSync);
        } catch {
          for (const p of prodsToSync) {
            await saveProductToDb(p).catch(() => {});
          }
        }
        saveBatchProductsToStorage(prodsToSync);
        const refreshed = await fetchProductsFromDb().catch(() => getProductsList());
        setProducts(refreshed);
      }
    }

    try {
      const result = await saveOrderToDb(updatedOrder);
      const confirmedOrder = result.order || updatedOrder;
      setSavedOrders(prev => {
        const idx = prev.findIndex(o => o.header.id === confirmedOrder.header.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = confirmedOrder;
          return copy;
        }
        return [confirmedOrder, ...prev];
      });
      if (order.header.id === confirmedOrder.header.id) {
        setOrder(confirmedOrder);
        saveCurrentOrder(confirmedOrder);
      }
      saveOrderToHistory(confirmedOrder);
    } catch (err: any) {
      showPersistenceError(err, `Não foi possível salvar o pedido ${updatedOrder.header.numeroPedido}`);
      throw err;
    }
  };

  // Handler seguro para reprogramação da previsão de entrega de pedidos e recalibração inteligente de boletos
  const handleRescheduleDelivery = async (
    targetOrder: PurchaseOrder,
    newDate: string,
    adjustBoletos: boolean,
    reason?: string
  ) => {
    try {
      const res = await rescheduleOrderDeliveryApi(targetOrder.header.id, {
        novaDataEntregaPrevista: newDate,
        ajustarBoletos: adjustBoletos,
        motivo: reason
      });
      const updatedOrder = res.order;
      saveOrderToHistory(updatedOrder);
      if (order?.header?.id === updatedOrder.header.id) {
        setOrder(updatedOrder);
        saveCurrentOrder(updatedOrder);
      }
      setSavedOrders(prev => prev.map(item => item.header.id === updatedOrder.header.id ? updatedOrder : item));
      showToast(res.message || `Previsão de entrega reprogramada para ${toBrDate(newDate)}.`, 'success');
      setRescheduleModalOrder(null);
    } catch (err: any) {
      showPersistenceError(err, `Não foi possível reprogramar a entrega do pedido ${targetOrder.header.numeroPedido}`);
      throw err;
    }
  };

  // Handler para confirmação de recebimento físico na Matriz
  const handleConfirmReceipt = async (payload: {
    dataRecebimento: string;
    recebidoPor: string;
    numeroNotaFiscal: string;
    autorizarBoletos: boolean;
  }) => {
    if (!receiptModalOrder) return;
    const targetOrder = receiptModalOrder;

    try {
      const res = await confirmReceiptInDb(targetOrder.header.id, payload);
      const updatedOrder = res.order;
      saveOrderToHistory(updatedOrder);
      setSavedOrders(prev => prev.map(item => item.header.id === updatedOrder.header.id ? updatedOrder : item));

      if (order.header.id === targetOrder.header.id) {
        setOrder(updatedOrder);
      }

      setReceiptModalOrder(null);
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      showToast(res?.message || `Recebimento do pedido ${targetOrder.header.numeroPedido} confirmado na Matriz!`, 'success');
    } catch (err: any) {
      showPersistenceError(err, `Não foi possível confirmar o recebimento do pedido ${targetOrder.header.numeroPedido}`);
    }
  };

  // Handler para liberação de boletos pelo Faturamento / Diretoria
  const handleAuthorizeFinancial = async (targetOrder: PurchaseOrder) => {
    if (!canAuthorizeFinancialRelease(currentUser, targetOrder.header.status)) {
      showToast('Apenas o Faturamento ou a Diretoria podem autorizar a liberação de boletos.', 'error');
      return;
    }

    if (!targetOrder.header.recebidoMatriz) {
      showToast('O pedido precisa estar fisicamente recebido na Matriz antes de liberar os boletos.', 'info');
      return;
    }

    try {
      const res = await authorizeFinancialInDb(targetOrder.header.id);

      const updated: PurchaseOrder = res.order;

      saveOrderToHistory(updated);
      const refreshedList = await fetchOrdersFromDb().catch(() => loadSavedOrdersList());
      setSavedOrders(refreshedList);

      if (order.header.id === targetOrder.header.id) {
        setOrder(updated);
      }

      confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
      showToast(res?.message || `Boletos do pedido ${targetOrder.header.numeroPedido} liberados e pedido finalizado com sucesso!`, 'success');
    } catch (err: any) {
      showPersistenceError(err, `Não foi possível liberar os boletos do pedido ${targetOrder.header.numeroPedido}`);
    }
  };

  // Handlers do Módulo de Estoque do Depósito Central
  const handleUpdateStockBalance = async (stockId: string, deltaUnidades: number, newLocation?: string) => {
    try {
      await updateStockBalanceInDb(stockId, deltaUnidades, newLocation);
      const updatedList = await fetchStockFromDb();
      setCentralStock(updatedList);
      saveCentralStock(updatedList);
      showToast('Saldo de estoque do depósito atualizado no SQLite!', 'success');
    } catch (err: any) {
      showPersistenceError(err, 'Não foi possível atualizar o saldo do estoque');
    }
  };

  const handleSaveNewStockItem = async (item: CentralStockItem) => {
    try {
      await saveStockItemToDb(item);
      const updatedList = await fetchStockFromDb();
      setCentralStock(updatedList);
      saveCentralStock(updatedList);
      showToast(`Produto ${item.descricao} gravado no estoque do CD (SQLite)!`, 'success');
    } catch (err: any) {
      showPersistenceError(err, `Não foi possível salvar ${item.descricao} no estoque`);
    }
  };

  const _handleClearAllStock = async () => {
    try {
      await clearAllStockFromDb();
      setCentralStock([]);
      saveCentralStock([]);
      showToast('Todo o estoque da matriz foi limpo com sucesso!', 'success');
    } catch (err: any) {
      showPersistenceError(err, 'Não foi possível limpar o estoque da matriz');
    }
  };

  const handleGenerateStockSeparation = async (itemsToTransfer: StockTransferPayloadItem[]) => {
    try {
      const transfOrder = createStockTransferOrder(itemsToTransfer, storeConfigs, fiscalConfig);
      const { order: persistedOrder } = await saveOrderToDb(transfOrder);
      saveOrderToHistory(persistedOrder);
      const updatedOrders = await fetchOrdersFromDb().catch(() => loadSavedOrdersList());
      setSavedOrders(updatedOrders);
      // Garante que a cotação comercial permaneça limpa e nunca seja poluída com romaneio de transferência interna
      if (
        order.header.supplierId === 'cd_matriz' || 
        String(order.header.numeroPedido || '').startsWith('CD-') ||
        String(order.header.id || '').startsWith('order_transf_cd_')
      ) {
        clearCurrentDraft();
        const nextNum = await fetchNextOrderNumberFromDb().catch(() => getNextOrderNumber());
        const cleanOrd = createNewOrder(fiscalConfig, storeConfigs, nextNum);
        setOrder({
          ...cleanOrd,
          items: ensureTrailingBlankItem(cleanOrd.items || [], fiscalConfig, storeConfigs)
        });
      }
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      showToast(`Romaneio ${transfOrder.header.numeroPedido} despachado com sucesso para a Doca!`, 'success');
    } catch (err: any) {
      console.error('Erro ao gerar romaneio de transferência:', err);
      showPersistenceError(err, 'Não foi possível despachar o romaneio');
    }
  };

  const handleFinalizeSeparation = async (finalizedOrder: PurchaseOrder, alreadyPersisted = false) => {
    try {
      const response = alreadyPersisted
        ? { order: finalizedOrder, message: `Separação do pedido ${finalizedOrder.header.numeroPedido} finalizada e enviada ao Faturamento.` }
        : await sendOrderToFaturamentoApi(finalizedOrder.header.id, {
            avarias: finalizedOrder.header.avariasApontadas,
            observacoes: finalizedOrder.header.observacaoSeparacao,
            expectedVersion: finalizedOrder.header.version
          });
      const persistedOrder: PurchaseOrder = response.order;
      saveOrderToHistory(persistedOrder);
      const updatedOrders = await fetchOrdersFromDb();
      setSavedOrders(updatedOrders);
      setOrder(persistedOrder);
      const refreshedStock = await fetchStockFromDb();
      setCentralStock(refreshedStock);
      saveCentralStock(refreshedStock);
      
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 }
      });
      
      showToast(response.message || `Separação do pedido ${finalizedOrder.header.numeroPedido} finalizada e enviada ao Faturamento.`, 'success');
      setActiveNav('separationHistory');
    } catch (err: any) {
      showPersistenceError(err, `Não foi possível finalizar a separação do pedido ${finalizedOrder.header.numeroPedido}`);
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
      showPersistenceError(err, `Não foi possível alterar o status do pedido ${ord.header.numeroPedido}`);
    }
  };

  const handleOrderImported = async (
    importedOrder: PurchaseOrder,
    context: { supplier: Supplier; productsToSave: Product[]; updatedProducts: Product[] }
  ) => {
    // Salvaguarda definitiva: garante que o número do pedido nunca contenha textos espúrios ou colida com existentes
    let finalOrderNum = (importedOrder.header.numeroPedido || '').trim();
    const isBogus = !finalOrderNum || finalOrderNum.toUpperCase().includes('FORNECEDOR') || finalOrderNum.toUpperCase().includes('IMPORTADO') || finalOrderNum.toUpperCase().includes('FORNEC');
    const isConflict = finalOrderNum && savedOrders.some(o => o.header.id !== importedOrder.header.id && o.header.numeroPedido?.trim().toUpperCase() === finalOrderNum.toUpperCase());

    if (isBogus || isConflict) {
      finalOrderNum = getNextOrderNumber(savedOrders);
    }
    const cleanOrder: PurchaseOrder = {
      ...importedOrder,
      header: {
        ...importedOrder.header,
        numeroPedido: finalOrderNum
      }
    };

    try {
      const saveRes = await importOrderPackageToDb(cleanOrder, context.supplier, context.productsToSave);
      const effectiveOrder = saveRes.order;
      const savedProductsById = new Map(saveRes.products.map(product => [product.id, product]));
      const effectiveProducts = context.updatedProducts.map(product => savedProductsById.get(product.id) || product);
      const effectiveSuppliers = [
        saveRes.supplier,
        ...suppliers.filter(supplier => supplier.id !== saveRes.supplier.id)
      ];

      setProducts(effectiveProducts);
      saveProductsList(effectiveProducts);
      setSuppliers(effectiveSuppliers);
      saveSuppliersList(effectiveSuppliers);
      setOrder(effectiveOrder);
      saveCurrentOrder(effectiveOrder);
      saveOrderToHistory(effectiveOrder);

      // A importação já foi confirmada atomicamente pelo servidor. Uma falha no
      // refresh subsequente não pode transformar sucesso real em pedido de nova tentativa.
      const updatedOrders = await fetchOrdersFromDb().catch(() => {
        const remaining = savedOrders.filter(saved => saved.header.id !== effectiveOrder.header.id);
        return [effectiveOrder, ...remaining];
      });
      setSavedOrders(updatedOrders);

      setActiveNav('orders');
      setViewMode('desktop');
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });

      if (saveRes?.numberReassigned) {
        showToast(`⚠️ Concorrência evitada: O número ${saveRes.originalNumber} já estava em uso. Pedido importado como ${saveRes.newNumber}!`, 'info');
      } else {
        showToast(`Pedido ${effectiveOrder.header.numeroPedido} importado com sucesso! (Salvo em cotação)`, 'success');
      }
    } catch (err: any) {
      showPersistenceError(err, `Não foi possível importar o pedido ${cleanOrder.header.numeroPedido}`);
      throw err;
    }
  };

  const handleExportCommercialPDF = () => {
    exportCommercialOrderPDF(order);
    showToast('Pedido Comercial PDF (Proposta para Fornecedor) gerado com sucesso!', 'success');
  };

  const handleExportExcel = () => {
    try {
      exportOrderToExcel(order, storeConfigs, fiscalConfig);
      showToast('Proposta Comercial em Excel (.xlsx) gerada com sucesso!', 'success');
    } catch (err: any) {
      showToast(`Erro ao exportar Excel: ${err?.message || err}`, 'error');
    }
  };

  const handleExportSeparationPDF = async (visibleColumns?: Record<string, boolean>) => {
    try {
      // 🛡️ Garante que a distribuição e separação das filiais sejam persistidas no Banco de Dados antes da emissão do Romaneio
      await saveOrderToDb(order, { autoAssignNextOnConflict: false });
      saveOrderToHistory(order);
      setSavedOrders(prev => {
        const idx = prev.findIndex(o => o.header.id === order.header.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = order;
          return next;
        }
        return [order, ...prev];
      });
    } catch (err: any) {
      console.error('Erro ao sincronizar pedido antes de emitir o romaneio:', err);
      triggerIOSBanner(
        `Atenção: Não foi possível salvar a separação no servidor: ${err?.message || 'Erro de conexão ou permissão'}. O PDF foi gerado apenas com os dados locais deste navegador.`,
        'error',
        'Erro de Gravação'
      );
    }
    exportRomaneioPDF(order, storeConfigs, visibleColumns);
    showToast('Romaneio PDF de Separação gerado com sucesso!', 'success');
  };

  // Supplier Page Handlers
  const handleSaveSupplier = async (sup: Supplier): Promise<Supplier> => {
    let savedSupplier = sup;
    try {
      await saveSupplierToDb(sup);
      const updated = await fetchSuppliersFromDb();
      setSuppliers(updated);
      saveSupplier(sup);
      saveSuppliersList(updated);
      const found = updated.find(s => s.id === sup.id);
      if (found) savedSupplier = found;
      showToast(`Fornecedor "${sup.razaoSocial}" salvo com sucesso no Banco de Dados!`, 'success');
      return savedSupplier;
    } catch (err: any) {
      console.error('Erro ao salvar fornecedor:', err);
      if (isOfflineError(err)) {
        saveSupplier(sup);
        const updatedLocal = getSuppliersList();
        setSuppliers(updatedLocal);
        const found = updatedLocal.find(s => s.id === sup.id);
        if (found) savedSupplier = found;
        showToast(`Você está offline. Fornecedor "${sup.razaoSocial}" salvo em contingência local.`, 'info');
        return savedSupplier;
      }
      showToast(err.message || 'Erro ao salvar fornecedor no Banco de Dados.', 'error');
      throw err;
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    try {
      await deleteSupplierFromDb(id);
      const [updatedSuppliers, updatedProducts] = await Promise.all([
        fetchSuppliersFromDb(),
        fetchProductsFromDb()
      ]);
      setSuppliers(updatedSuppliers);
      setProducts(updatedProducts);
      deleteSupplier(id);
      saveSuppliersList(updatedSuppliers);
      saveProductsList(updatedProducts);
      showToast('Fornecedor e produtos vinculados excluídos com sucesso!', 'info');
    } catch (err: any) {
      console.error('Erro ao remover fornecedor:', err);
      if (isOfflineError(err)) {
        deleteSupplier(id);
        setSuppliers(getSuppliersList());
        setProducts(getProductsList());
        showToast('Sem conexão: fornecedor e produtos vinculados removidos localmente.', 'info');
        return;
      }
      showToast(err.message || 'Erro ao remover fornecedor do Banco de Dados.', 'error');
      throw err;
    }
  };

  // Product Catalog Handlers
  const handleSaveProduct = async (productToSave: Product, silent: boolean = false) => {
    const rawCode = (productToSave.codigoInterno || productToSave.codigo || '').trim().toUpperCase();
    if (rawCode) {
      const localConflict = products.find(p => 
        p.id !== productToSave.id && 
        ((p.codigoInterno || '').trim().toUpperCase() === rawCode || (p.codigo || '').trim().toUpperCase() === rawCode)
      );
      if (localConflict) {
        const nextCode = generateNextProductCode(products);
        triggerIOSAlert({
          title: 'Código de Produto Já Cadastrado',
          message: `O código "${rawCode}" já pertence ao produto "${localConflict.descricao}" (${localConflict.nomeFornecedor || 'Fornecedor'}).\n\nHá o próximo código sequencial livre disponível no sistema:\n👉 ${nextCode}\n\nDeseja aplicar este código e salvar o produto agora no sistema?`,
          type: 'error',
          confirmText: 'Ajustar Manualmente',
          actionText: `⚡ Usar Próximo Código (${nextCode}) e Salvar`,
          onAction: async () => {
            const renumberedProduct: Product = {
              ...productToSave,
              codigo: nextCode,
              codigoInterno: nextCode,
              updatedAt: new Date().toISOString()
            };
            await handleSaveProduct(renumberedProduct, silent);
          }
        });
        return;
      }
    }

    try {
      await saveProductToDb(productToSave);
      const updated = await fetchProductsFromDb();
      setProducts(updated);
      saveProduct(productToSave);
      saveProductsList(updated);
      if (!silent) {
        showToast(`Produto "${productToSave.descricao}" salvo no Banco de Dados!`, 'success');
      }
    } catch (err: any) {
      console.error('Erro ao salvar produto:', err);
      if (err?.status === 409 || err?.code === 'PRODUCT_CODE_CONFLICT') {
        const nextCode = err.suggestedNextCode || await fetchNextProductCodeFromDb().catch(() => generateNextProductCode(products));
        const conflictDesc = err.conflictProduct?.descricao || 'outro produto cadastrado';
        const codeUsed = productToSave.codigoInterno || productToSave.codigo || '';

        triggerIOSAlert({
          title: 'Código de Produto Já Cadastrado',
          message: `O código "${codeUsed}" já está em uso pelo produto "${conflictDesc}" no sistema.\n\nHá o próximo código sequencial livre disponível:\n👉 ${nextCode}\n\nDeseja aplicar este código e salvar o produto agora?`,
          type: 'error',
          confirmText: 'Ajustar Manualmente',
          actionText: nextCode ? `⚡ Usar Próximo Código (${nextCode}) e Salvar` : undefined,
          onAction: nextCode ? async () => {
            const renumberedProduct: Product = {
              ...productToSave,
              codigo: nextCode,
              codigoInterno: nextCode,
              updatedAt: new Date().toISOString()
            };
            await handleSaveProduct(renumberedProduct, silent);
          } : undefined
        });
        return;
      }
      if (isOfflineError(err)) {
        const updated = saveProduct(productToSave);
        setProducts(updated);
        if (!silent) {
          showToast(`Sem conexão: Produto "${productToSave.descricao}" salvo em contingência local!`, 'info');
        }
        return;
      }
      if (!silent) {
        showToast(err.message || 'Erro ao salvar produto no Banco de Dados.', 'error');
      }
      throw err;
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteProductFromDb(id);
      const updated = await fetchProductsFromDb();
      setProducts(updated);
      deleteProduct(id);
      saveProductsList(updated);
      showToast('Produto removido do Banco de Dados.', 'info');
    } catch (err: any) {
      console.error('Erro ao excluir produto:', err);
      if (isOfflineError(err)) {
        deleteProduct(id);
        setProducts(getProductsList());
        showToast('Sem conexão: produto removido localmente.', 'info');
        return;
      }
      showToast(err.message || 'Erro ao remover produto do Banco de Dados.', 'error');
      throw err;
    }
  };

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

    const supOff = (sup.percentualNotaPadrao !== undefined && sup.percentualNotaPadrao > 0 && sup.percentualNotaPadrao < 100)
      ? sup.percentualNotaPadrao
      : ((sup.descontoOffPadrao !== undefined && sup.descontoOffPadrao > 0 && sup.descontoOffPadrao < 100)
          ? sup.descontoOffPadrao
          : 100);

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
        percentualDescontoOff: 0,
        percentualNota: supOff < 100 ? supOff : (prev.header.percentualNota ?? 100),
        // A descrição do pedido é independente do fornecedor
        observacoesDescarga: prev.header.observacoesDescarga || prev.header.observacoes || '',
        observacoes: prev.header.observacoes || prev.header.observacoesDescarga || ''
      }
    }));
    setActiveNav('orders');
    showToast(`Fornecedor "${sup.razaoSocial}" aplicado ao pedido!`);
  };

  // Global Settings Handlers
  const handleSaveGlobalSettings = async (newFiscal: FiscalConfig, newStores: StoreConfig[]) => {
    try {
      await Promise.all([
        saveFiscalConfigToDb(newFiscal).catch(err => console.warn('Aviso fiscal DB:', err)),
        saveStoresToDb(newStores).catch(err => console.warn('Aviso stores DB:', err))
      ]);
      saveFiscalConfig(newFiscal);
      saveStoresConfig(newStores);
      setFiscalConfig(newFiscal);
      setStoreConfigs(newStores);

      // Recalcular itens do pedido ativo com as novas taxas
      setOrder(prev => {
        const recalculatedItems = prev.items.map(item => {
          const precoCompraEfetivo = item.precoUnitario * (1 - (item.percentualDesconto || 0) / 100);
          const fiscalRes = calculateItemFiscal(precoCompraEfetivo, item.pdvAlvo, newFiscal, item.fiscalOverride);
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

      showToast('Configurações fiscais e matriz de lojas gravadas no SQLite!', 'success');
    } catch (err: any) {
      showToast(`Erro ao salvar: ${err.message}`, 'error');
    }
  };

  const handleSaveStoresOnly = async (newStores: StoreConfig[]) => {
    try {
      await saveStoresToDb(newStores);
      saveStoresConfig(newStores);
      setStoreConfigs(newStores);

      // Recalcular itens do pedido ativo com as novas lojas
      setOrder(prev => {
        const recalculatedItems = prev.items.map(item => {
          const sepRes = item.separacaoManual 
            ? { allocations: item.separacaoLojas || {} } 
            : calculateAutomaticSeparation(item.qtdTotalUnidades, newStores, item.qtdReservaEstoque || 0);

          return {
            ...item,
            separacaoLojas: sepRes.allocations
          };
        });

        return {
          ...prev,
          storeConfigs: newStores,
          items: recalculatedItems
        };
      });

      showToast('Matriz de lojas atualizada no SQLite com sucesso!', 'success');
    } catch (err: any) {
      console.warn('Falha ao gravar lojas no SQLite, mantendo backup local:', err);
      saveStoresConfig(newStores);
      setStoreConfigs(newStores);
      showToast(`Lojas salvas localmente (${err.message || 'offline'})`, 'info');
    }
  };

  // Handlers para Modelos / Saves de Separação
  const handleSaveSeparationPreset = async (preset: SeparationPreset) => {
    try {
      const saved = await saveSeparationPresetToDb(preset);
      const refreshed = await fetchSeparationPresetsFromDb().catch(() => null);
      if (refreshed && refreshed.length > 0) {
        setSeparationPresets(refreshed);
        saveSeparationPresetsList(refreshed);
      } else {
        setSeparationPresets(prev => {
          const existingIdx = prev.findIndex(p => p.id === saved.id);
          const updated = existingIdx >= 0
            ? prev.map(p => p.id === saved.id ? saved : p)
            : [...prev, saved];
          saveSeparationPresetsList(updated);
          return updated;
        });
      }
      showToast(`⭐ Modelo "${saved.name}" salvo no SQLite!`, 'success');
      return saved;
    } catch (err: any) {
      console.error('Erro ao persistir preset no SQLite:', err);
      showToast(`Erro ao salvar modelo no banco: ${err.message || 'Falha de comunicação'}`, 'error');
      throw err;
    }
  };

  const handleDeleteSeparationPreset = async (presetId: string) => {
    try {
      await deleteSeparationPresetFromDb(presetId);
      const refreshed = await fetchSeparationPresetsFromDb().catch(() => null);
      if (refreshed && refreshed.length > 0) {
        setSeparationPresets(refreshed);
        saveSeparationPresetsList(refreshed);
      } else {
        setSeparationPresets(prev => {
          const updated = prev.filter(p => p.id !== presetId);
          saveSeparationPresetsList(updated);
          return updated;
        });
      }
      showToast('Modelo de separação removido do banco com sucesso.', 'info');
    } catch (err: any) {
      console.error('Erro ao remover modelo do banco:', err);
      showToast(`Erro ao remover modelo: ${err.message}`, 'error');
      throw err;
    }
  };

  // Handlers para Modelos / Saves de Engenharia Fiscal
  const handleSaveFiscalPreset = async (preset: FiscalPreset) => {
    try {
      const saved = await saveFiscalPresetToDb(preset);
      setFiscalPresets(prev => {
        const existingIdx = prev.findIndex(p => p.id === saved.id || p.name.trim().toLowerCase() === saved.name.trim().toLowerCase());
        const updated = existingIdx >= 0
          ? prev.map((p, idx) => idx === existingIdx ? saved : p)
          : [...prev, saved];
        saveFiscalPresetsList(updated);
        return updated;
      });
      showToast(`⭐ Modelo fiscal "${saved.name}" salvo no SQLite!`, 'success');
      return saved;
    } catch (err: any) {
      console.warn('Persistindo modelo fiscal localmente:', err);
      setFiscalPresets(prev => {
        const existingIdx = prev.findIndex(p => p.id === preset.id || p.name.trim().toLowerCase() === preset.name.trim().toLowerCase());
        const updated = existingIdx >= 0
          ? prev.map((p, idx) => idx === existingIdx ? preset : p)
          : [...prev, preset];
        saveFiscalPresetsList(updated);
        return updated;
      });
      showToast(`Modelo fiscal "${preset.name}" salvo localmente.`, 'info');
      return preset;
    }
  };

  const handleDeleteFiscalPreset = async (presetId: string) => {
    try {
      await deleteFiscalPresetFromDb(presetId);
      setFiscalPresets(prev => {
        const updated = prev.filter(p => p.id !== presetId);
        saveFiscalPresetsList(updated);
        return updated;
      });
      showToast('Modelo fiscal removido com sucesso.', 'info');
    } catch (err: any) {
      showToast(`Erro ao remover modelo fiscal: ${err.message}`, 'error');
    }
  };

  const handleDeleteOrder = async (
    orderId: string,
    authPayload?: { directorEmail?: string; directorPassword?: string; reason?: string }
  ) => {
    try {
      const targetOrder = savedOrders.find(o => o.header.id === orderId || o.header.numeroPedido === orderId) || 
                          (order.header.id === orderId ? order : null);

      const isTransfer = targetOrder && (
        targetOrder.header.supplierId === 'cd_matriz' || 
        String(targetOrder.header.numeroPedido || '').startsWith('CD-') || 
        String(targetOrder.header.id || '').startsWith('order_transf_cd_') ||
        (targetOrder.header.fornecedor && targetOrder.header.fornecedor.toLowerCase().includes('transferência'))
      );

      // 🛡️ Executa a exclusão no backend passando a autorização da diretoria
      const deleteResult = await deleteOrderFromDb(orderId, authPayload);

      let totalUnitsReversed = 0;

      if (isTransfer && targetOrder && Array.isArray(targetOrder.items)) {
        for (const it of targetOrder.items) {
          const qty = Number(it.qtdTotalUnidades || 0);
          if (qty > 0) {
            const match = centralStock.find(s => 
              (s.codigo && it.codigo && s.codigo.trim().toLowerCase() === it.codigo.trim().toLowerCase()) ||
              (s.descricao && it.descricao && s.descricao.trim().toLowerCase() === it.descricao.trim().toLowerCase()) ||
              (s.productId && (s.productId === it.id || s.productId === (it as any).productId))
            );
            if (match) {
              updateStockBalance(match.id, qty);
              totalUnitsReversed += qty;
            }
          }
        }
      }

      const updatedOrders = await fetchOrdersFromDb().catch(() => null);
      if (updatedOrders !== null) {
        setSavedOrders(updatedOrders);
        saveSavedOrdersList(updatedOrders);
      } else {
        setSavedOrders(prev => {
          const filtered = prev.filter(o => o.header.id !== orderId && o.header.numeroPedido !== orderId);
          saveSavedOrdersList(filtered);
          return filtered;
        });
      }

      // 🧹 LIMPEZA IMEDIATA DA TELA DE COTAÇÃO:
      // Se o pedido excluído era o que estava exibido na tela de cotação ou se a tela de cotação estiver presa com essa transferência:
      const isCurrentOrderMatch = 
        order.header.id === orderId || 
        order.header.numeroPedido === orderId || 
        (targetOrder && (
          order.header.id === targetOrder.header.id || 
          order.header.numeroPedido === targetOrder.header.numeroPedido
        )) ||
        (isTransfer && (
          order.header.supplierId === 'cd_matriz' || 
          String(order.header.numeroPedido || '').startsWith('CD-') ||
          String(order.header.id || '').startsWith('order_transf_cd_')
        ));

      if (isCurrentOrderMatch) {
        clearCurrentDraft();
        let nextNum = '';
        try {
          nextNum = await fetchNextOrderNumberFromDb();
        } catch {
          nextNum = getNextOrderNumber();
        }
        const cleanOrd = createNewOrder(fiscalConfig, storeConfigs, nextNum);
        const finalCleanOrd: PurchaseOrder = {
          ...cleanOrd,
          items: ensureTrailingBlankItem(cleanOrd.items || [], fiscalConfig, storeConfigs)
        };
        setOrder(finalCleanOrd);
        saveCurrentOrder(finalCleanOrd);
      }

      if (isTransfer && targetOrder) {
        const refreshedStock = await fetchStockFromDb().catch(() => null);
        if (refreshedStock) {
          setCentralStock(refreshedStock);
          saveCentralStock(refreshedStock);
        }
        showToast(
          deleteResult?.message || `Romaneio ${targetOrder.header.numeroPedido} excluído! ${totalUnitsReversed} unidades creditadas de volta no Estoque Central.`, 
          'success'
        );
      } else {
        showToast(deleteResult?.message || 'Pedido excluído com sucesso e registrado na auditoria.', 'info');
      }
    } catch (err: any) {
      console.error('Erro ao excluir pedido:', err);
      showToast(err?.message || 'Erro ao autorizar exclusão. Verifique a senha da Diretoria.', 'error');
      throw err;
    }
  };

  // Se o usuário não estiver logado, exibe a página de login
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans antialiased">
      


      {/* Sidebar Lateral de Navegação (6 Páginas + Gestão de Usuários) */}
      <Sidebar
        order={order}
        activeNav={activeNav}
        onSelectNav={(tab) => {
          if (canAccessTab(currentUser, tab)) {
            setActiveNav(tab);
            setViewMode('desktop');
          }
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
          savedOrders={savedOrders}
          onSelectOrder={(selected) => {
            const st = selected.header.status;
            const target = (activeNav === 'separation' || activeNav === 'separationHistory' || st === 'Em Separação' || st === 'Em Distribuição' || st === 'Finalizado' || st === 'Aprovado')
              ? 'separation'
              : (canAccessTab(currentUser, 'orders') ? 'orders' : 'separation');
            handleOpenSelectedOrder(selected, target);
          }}
          onNewOrder={handleNewOrder}
          onSaveOrder={handleSaveDraftOrder}
          onCloseOrder={handleCloseOrder}
          onDuplicateOrder={handleDuplicateCurrentOrder}
          onDiscardDraft={handleRequestDiscardOrDelete}
          onExportExcel={handleExportExcel}
          onExportPDF={activeNav === 'separation' ? handleExportSeparationPDF : handleExportCommercialPDF}
          onImportExcel={() => setIsImportModalOpen(true)}
          onSelectNav={(tab) => {
            if (canAccessTab(currentUser, tab)) {
              setActiveNav(tab);
            }
          }}
        />

        <main className="flex-1 w-full max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 py-6 transition-all duration-300">
          
          {/* MODO MOBILE 1: COMPRAS EM VIAGENS / FEIRAS (Apenas Compradores) */}
          {viewMode === 'mobile_purchases' && canCreateOrEditOrders(currentUser) && (
            <MobilePurchasesView
              order={order}
              suppliers={suppliers}
              products={products}
              stores={storeConfigs}
              fiscalConfig={fiscalConfig}
              onUpdateOrder={setOrder}
              onExportPDF={handleExportCommercialPDF}
              onSaveOrder={handleSaveDraftOrder}
              onNewOrder={handleNewOrder}
              onOpenSeparationModal={(item) => setSelectedSeparationItem(item)}
            />
          )}

          {/* MODO MOBILE 2: ROMANEIO DE BOLSO / GALPÃO */}
          {viewMode === 'mobile_separation' && (
            <MobileSeparationView
              order={order}
              orders={savedOrders.length > 0 ? savedOrders : [order]}
              currentUser={currentUser}
              onSelectOrder={(selected) => handleOpenSelectedOrder(selected, 'separation')}
              onUpdateOrder={handleSaveOrderDirect}
              onFinalizeOrder={handleFinalizeSeparation}
            />
          )}

          {/* MODO DESKTOP TRADICIONAL COM AS PÁGINAS DO MENU */}
          {viewMode === 'desktop' && (
            <>
              {/* PÁGINA 0: HOME / HUB PRINCIPAL */}
              {activeNav === 'home' && canAccessTab(currentUser, 'home') && (
                <HomePage
                  currentUser={currentUser}
                  savedOrders={savedOrders}
                  draftOrder={hasActiveDraft ? order : null}
                  centralStock={centralStock}
                  isLoading={isInitialLoading}
                  localSaveNotice={localSaveNotice}
                  onRetryLocalSave={() => { void handleSaveDraftOrder(); }}
                  onNavigate={(tab) => {
                    if (canAccessTab(currentUser, tab)) {
                      setActiveNav(tab);
                      setViewMode('desktop');
                    }
                  }}
                  onNewOrder={handleNewOrder}
                  onContinueDraft={handleContinueDraft}
                  onDiscardDraft={handleDiscardDraft}
                  onSelectOrder={(selected, destinationTab) => {
                    let target = destinationTab;
                    if (!target) {
                      const st = selected.header.status;
                      target = (st === 'Em Separação' || st === 'Em Distribuição' || st === 'Finalizado' || st === 'Aprovado')
                        ? 'separation'
                        : (canAccessTab(currentUser, 'orders') ? 'orders' : 'separation');
                    }
                    handleOpenSelectedOrder(selected, target);
                  }}
                  onSwitchViewMode={(mode) => setViewMode(mode)}
                  onConfirmReceipt={(selected) => setReceiptModalOrder(selected)}
                  onAuthorizeFinancial={handleAuthorizeFinancial}
                  onRescheduleOrder={(selected) => setRescheduleModalOrder(selected)}
                />
              )}

              {/* PÁGINA 1: COTAÇÃO E PEDIDOS (Diretoria & Compradores) */}
              {activeNav === 'orders' && canAccessTab(currentUser, 'orders') && (
                <div className="space-y-6 animate-in fade-in duration-200 w-full max-w-full min-w-0">
                  {/* Esteira Operacional Visual do Pedido (Compras ➔ Depósito ➔ Separação ➔ Finalizado) */}
                  <OrderPipelineStepper
                    order={order}
                    currentUser={currentUser}
                    onApproveOrder={handleApproveOrder}
                    onSendToDistribution={handleSendToDistribution}
                    onOpenDistribution={(ord) => {
                      setOrder(ord);
                      setActiveNav('separation');
                    }}
                    onReleaseToSeparation={handleReleaseToSeparation}
                    onOpenSeparation={(ord) => {
                      setOrder(ord);
                      setActiveNav('separation');
                    }}
                    onSendToFaturamento={handleSendToFaturamento}
                    onFinalizeSeparation={handleFinalizeSeparation}
                    onConfirmReceipt={(selected) => setReceiptModalOrder(selected)}
                    onAuthorizeFinancial={handleAuthorizeFinancial}
                    onViewAuditLogs={(ord) => setPipelineAuditOrder(ord)}
                    onRollbackSuccess={(updated) => {
                      setOrder(updated);
                      saveOrderToHistory(updated);
                      fetchOrdersFromDb().then(setSavedOrders).catch(() => setSavedOrders(loadSavedOrdersList()));
                    }}
                  />

                  {/* 1. Formulário de Cabeçalho do Pedido (Previsão de Entrega liberada para o Comprador até a confirmação física) */}
                  <div className="space-y-6 border-none p-0 m-0 w-full max-w-full min-w-0">
                    {/* Pill de Co-presença Ativa em Tempo Real */}
                    {activeViewers && activeViewers.length > 0 && (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-900 dark:text-emerald-100 shadow-2xs animate-in fade-in duration-300">
                        <div className="flex items-center gap-2.5">
                          <span className="relative flex h-2.5 w-2.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                          </span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            {activeViewers.length === 1 ? (
                              <>
                                <span className="text-emerald-700 dark:text-emerald-300 font-extrabold">{activeViewers[0].userName}</span> ({activeViewers[0].userRole}) está com este pedido aberto agora
                              </>
                            ) : (
                              <>
                                <span className="text-emerald-700 dark:text-emerald-300 font-extrabold">{activeViewers.map(v => v.userName).join(', ')}</span> estão com este pedido aberto agora
                              </>
                            )}
                          </span>
                        </div>
                        <div className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 shrink-0">
                          Edição Compartilhada
                        </div>
                      </div>
                    )}

                    {/* Barra Flutuante de Detecção Ativa de Edição Simultânea por Colega */}
                    {hasNewerVersion && remoteInfo && (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-blue-900 dark:text-blue-100 shadow-xs animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-3.5">
                          <div className="p-2.5 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
                            <RefreshCw className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
                          </div>
                          <div>
                            <div className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                              <span>Alteração Salva por Colega</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-blue-500/20 text-blue-700 dark:text-blue-300">
                                Versão {remoteInfo.version}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                              {remoteInfo.lastModifier || 'Outro operador'} salvou alterações neste pedido {remoteInfo.lastModifiedAt ? `às ${new Date(remoteInfo.lastModifiedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}.
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <button
                            onClick={handleSyncWithRemote}
                            disabled={isSyncingRemote}
                            className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/30 transition flex items-center gap-1.5 cursor-pointer hover:scale-102 disabled:opacity-75"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingRemote ? 'animate-spin' : ''}`} />
                            <span>{isSyncingRemote ? 'Sincronizando...' : 'Sincronizar Dados'}</span>
                          </button>
                          <button
                            onClick={dismissAlert}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Dispensar aviso"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Banner Informativo de Boletos Liberados / Bloqueio Financeiro */}
                    {order.header.boletosLiberados && !canEditSpecificOrder(currentUser, order.header.status, order.header.boletosLiberados) && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3.5 text-amber-800 dark:text-amber-200 shadow-xs animate-in fade-in duration-200">
                        <div className="p-2.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
                          <Lock className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                            <span>Pedido em Modo Somente Leitura</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300">Boletos Liberados</span>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                            Os boletos deste pedido já foram conciliados e liberados para o Financeiro. Alterações são restritas ao Faturamento e à Diretoria.
                          </div>
                        </div>
                      </div>
                    )}

                    <OrderHeaderForm 
                      header={order.header} 
                      suppliers={suppliers}
                      existingOrders={savedOrders}
                      onChange={handleHeaderChange} 
                      onOpenSupplierModal={(supToEdit) => {
                        setSupplierModalEditTarget(supToEdit || null);
                        setIsSupplierModalOpen(true);
                      }}
                      orderTotal={calculateOrderNetTotal(order)}
                      orderGrossTotal={calculateOrderTotals(order).valorBruto}
                      onSaveAsSupplierTemplate={handleSaveAsSupplierTemplate}
                      onLoadSupplierTemplate={handleLoadSupplierTemplate}
                      hasSupplierTemplate={Boolean(activeSupplierTemplate)}
                      supplierTemplateItemsCount={activeSupplierTemplate?.items?.length || 0}
                      showToast={showToast}
                      isLocked={Boolean(
                        (order.header.status && 
                         order.header.status !== 'Em Cotação' && 
                         order.header.status !== 'Rascunho' && 
                         !canEditSpecificOrder(currentUser, order.header.status, order.header.boletosLiberados)) ||
                        (order.header.boletosLiberados && !canEditSpecificOrder(currentUser, order.header.status, order.header.boletosLiberados))
                      )}
                      canEditDeliveryDate={Boolean(
                        currentUser?.role === 'diretoria' ||
                        currentUser?.role === 'faturamento' ||
                        currentUser?.role === ('root' as any) ||
                        !order.header.recebidoMatriz
                      )}
                      canEditPaymentDates={Boolean(
                        currentUser?.role === 'diretoria' ||
                        currentUser?.role === 'faturamento' ||
                        currentUser?.role === ('root' as any) ||
                        canEditSpecificOrder(currentUser, order.header.status, order.header.boletosLiberados)
                      )}
                    />

                    {/* 2. Engenharia Fiscal e Grade de Itens */}
                    <fieldset 
                      disabled={Boolean(
                        (order.header.status && 
                         order.header.status !== 'Em Cotação' && 
                         order.header.status !== 'Rascunho' && 
                         !canEditSpecificOrder(currentUser, order.header.status, order.header.boletosLiberados)) ||
                        (order.header.boletosLiberados && !canEditSpecificOrder(currentUser, order.header.status, order.header.boletosLiberados))
                      )}
                      style={{ minWidth: 0 }}
                      className="space-y-6 border-none p-0 m-0 w-full max-w-full min-w-0"
                    >
                      {/* Card Retrátil de Engenharia Fiscal do Pedido (Entrada e Saída) */}
                      <OrderFiscalCard
                        fiscalConfig={order.fiscalConfig || fiscalConfig}
                        onChangeFiscalConfig={handleOrderFiscalConfigChange}
                        aliquotaStHeader={order.header.aliquotaSt}
                        onUpdateHeaderSt={(newSt) => {
                          handleHeaderChange({
                            ...order.header,
                            aliquotaSt: newSt
                          });
                        }}
                        valorFreteHeader={order.header.valorFrete}
                        onUpdateHeaderFrete={(newFrete) => {
                          handleHeaderChange({
                            ...order.header,
                            valorFrete: newFrete,
                            valorFreteGlobal: newFrete
                          });
                        }}
                        totalMercadorias={calculateOrderMerchandiseTotal(order)}
                        averageItemPrice={averageItemPrice}
                        samplePdv={samplePdv}
                        fiscalPresets={fiscalPresets}
                        onSaveFiscalPreset={handleSaveFiscalPreset}
                        onDeleteFiscalPreset={handleDeleteFiscalPreset}
                      />

                      <OrderItemsTable
                        items={order.items}
                        orderHeader={order.header}
                        globalFiscal={order.fiscalConfig || fiscalConfig}
                        stores={storeConfigs}
                        products={products}
                        suppliers={suppliers}
                        currentSupplierName={order.header.fornecedor}
                        currentSupplierId={order.header.supplierId}
                        percentualDescontoOff={order.header.aplicarDescontoOff === false ? 0 : order.header.percentualDescontoOff}
                        onUpdateItem={handleUpdateItem}
                        onAddItem={handleAddItem}
                        onDuplicateItem={handleDuplicateItem}
                        onDeleteItem={handleDeleteItem}
                        onSaveProduct={handleSaveProduct}
                        onOpenFiscalModal={(item) => setSelectedFiscalItem(item)}
                        removedItemsCount={order.removedItems?.length || 0}
                        onOpenTrashModal={() => setIsTrashModalOpen(true)}
                      />
                    </fieldset>
                  </div>

                  {/* Card de Ajuste Fiscal da Entrega (Conciliação da Nota Fiscal com Produtos e Boletos) */}
                  <OrderFiscalAdjustmentCard
                    order={order}
                    orderTotals={calculateOrderTotals(order)}
                    currentUser={currentUser}
                    onApplyAdjustment={handleApplyFiscalAdjustment}
                    onRestoreOriginals={handleRestoreFiscalAdjustment}
                    disabled={Boolean(
                      currentUser?.role !== 'diretoria' && 
                      currentUser?.role !== 'faturamento' && 
                      currentUser?.role !== 'comprador'
                    )}
                  />
                </div>
              )}

              {/* PÁGINA 1.1: GESTÃO DO ESTOQUE DO DEPÓSITO CENTRAL (CD MATRIZ) */}
              {activeNav === 'stock' && canAccessTab(currentUser, 'stock') && (
                <CentralStockPage
                  stockItems={centralStock}
                  products={products}
                  suppliers={suppliers}
                  stores={storeConfigs}
                  fiscalConfig={fiscalConfig}
                  presets={separationPresets}
                  onUpdateStockBalance={handleUpdateStockBalance}
                  onSaveNewStockItem={handleSaveNewStockItem}
                  onGenerateStockSeparation={handleGenerateStockSeparation}
                  onNavigateToSeparation={() => setActiveNav('separation')}
                />
              )}

              {/* PÁGINA 2: CONFERÊNCIA DE SEPARAÇÃO E ROMANEIO (20 LOJAS) */}
              {activeNav === 'separation' && canAccessTab(currentUser, 'separation') && (
                currentUser?.role === 'separacao' ? (
                  <MobileSeparationView
                    order={order}
                    orders={savedOrders.length > 0 ? savedOrders : [order]}
                    currentUser={currentUser}
                    onSelectOrder={(selected) => handleOpenSelectedOrder(selected, 'separation')}
                    onUpdateOrder={handleSaveOrderDirect}
                    onFinalizeOrder={handleFinalizeSeparation}
                  />
                ) : (
                  <SeparationPage
                    order={order}
                    orders={savedOrders.length > 0 ? savedOrders : [order]}
                    stores={storeConfigs}
                    presets={separationPresets}
                    currentUser={currentUser}
                    onExportPDF={handleExportSeparationPDF}
                    onNavigateToOrders={() => setActiveNav('orders')}
                    onNavigateToHistory={() => setActiveNav('separationHistory')}
                    onChangeOrder={setOrder}
                    onSelectOrder={(selected) => handleOpenSelectedOrder(selected, 'separation')}
                    onFinalizeOrder={handleFinalizeSeparation}
                    onReleaseToSeparation={handleReleaseToSeparation}
                    onApproveOrder={handleApproveOrder}
                    onSendToDistribution={handleSendToDistribution}
                    onSendToFaturamento={handleSendToFaturamento}
                    onConfirmReceipt={(selected) => setReceiptModalOrder(selected)}
                    onAuthorizeFinancial={handleAuthorizeFinancial}
                    onViewAuditLogs={(ord) => setPipelineAuditOrder(ord)}
                    onSavePreset={handleSaveSeparationPreset}
                    onDeletePreset={handleDeleteSeparationPreset}
                  />
                )
              )}

              {/* PÁGINA 2.1: HISTÓRICO DE SEPARAÇÕES & AUDITORIA DE CONFERENTES */}
              {activeNav === 'separationHistory' && canAccessTab(currentUser, 'separationHistory') && (
                <SeparationHistoryPage
                  orders={savedOrders.length > 0 ? savedOrders : [order]}
                  stores={storeConfigs}
                  onSelectOrderForSeparation={(selected) => handleOpenSelectedOrder(selected, 'separation')}
                  onNavigateToSeparation={() => setActiveNav('separation')}
                />
              )}

              {/* PÁGINA 3: CATÁLOGO & CADASTRO DE PRODUTOS COM FOTOS */}
              {activeNav === 'products' && canAccessTab(currentUser, 'products') && (
                <ProductsCatalogPage
                  products={products}
                  suppliers={suppliers}
                  initialSupplierId={selectedCatalogSupplier}
                  onSaveProduct={handleSaveProduct}
                  onDeleteProduct={handleDeleteProduct}
                />
              )}

              {/* PÁGINA 4: DASHBOARD EXECUTIVO & BI FINANCEIRO (Diretoria) */}
              {activeNav === 'dashboard' && canAccessTab(currentUser, 'dashboard') && (
                <DashboardView
                  orders={savedOrders}
                  suppliers={suppliers}
                  onSelectOrder={(selected) => {
                    const st = selected.header.status;
                    const target = (st === 'Em Separação' || st === 'Em Distribuição' || st === 'Finalizado' || st === 'Aprovado')
                      ? 'separation'
                      : (canAccessTab(currentUser, 'orders') ? 'orders' : 'separation');
                    handleOpenSelectedOrder(selected, target);
                  }}
                  onNavigateToOrders={() => setActiveNav('orders')}
                  onNavigateToProductsBI={() => setActiveNav('bi_products')}
                />
              )}

              {/* PÁGINA 4.0B: BI PRODUTOS & MOVIMENTAÇÃO DE LOJAS (Diretoria) */}
              {activeNav === 'bi_products' && canAccessTab(currentUser, 'bi_products') && (
                <ProductMovementsBI
                  orders={savedOrders.length > 0 ? savedOrders : (order ? [order] : [])}
                  stores={storeConfigs}
                  canAccessFinancialBI={canAccessTab(currentUser, 'dashboard')}
                  onNavigateToFinancialBI={() => setActiveNav('dashboard')}
                  onSelectOrder={(selected) => {
                    const st = selected.header.status;
                    const target = (st === 'Em Separação' || st === 'Em Distribuição' || st === 'Finalizado' || st === 'Aprovado')
                      ? 'separation'
                      : (canAccessTab(currentUser, 'orders') ? 'orders' : 'separation');
                    handleOpenSelectedOrder(selected, target);
                  }}
                />
              )}

              {/* PÁGINA 4.1: GESTÃO FINANCEIRA DE BOLETOS & CONTAS A PAGAR (Diretoria) */}
              {activeNav === 'financial' && canAccessTab(currentUser, 'financial') && (
                <FinancialBoletosPage
                  orders={effectiveOrders}
                  suppliers={suppliers}
                  stores={storeConfigs}
                  currentUser={currentUser}
                  onSelectOrder={(selected) => handleOpenSelectedOrder(selected, 'orders')}
                  onUpdateInstallment={handleUpdateInstallment}
                  onSaveOrder={handleSaveOrderDirect}
                  showToast={showToast}
                />
              )}

              {/* PÁGINA 5: GESTÃO COMPLETA DE FORNECEDORES (Diretoria & Compradores) */}
              {activeNav === 'suppliers' && canAccessTab(currentUser, 'suppliers') && (
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

              {/* PÁGINA 5.1: HISTÓRICO & ARQUIVO DE PEDIDOS (Diretoria & Compradores) */}
              {activeNav === 'history' && canAccessTab(currentUser, 'history') && (
                <OrderHistoryPage
                  orders={savedOrders.length > 0 ? savedOrders : [order]}
                  currentUser={currentUser}
                  onSelectOrder={(selected) => handleOpenSelectedOrder(selected, 'orders')}
                  onDeleteOrder={handleDeleteOrder}
                  onNewOrder={handleNewOrder}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onNavigateToSeparation={(selected) => handleOpenSelectedOrder(selected, 'separation')}
                  onConfirmReceipt={(selected) => setReceiptModalOrder(selected)}
                  onAuthorizeFinancial={handleAuthorizeFinancial}
                  onRescheduleOrder={(selected) => setRescheduleModalOrder(selected)}
                  onRollbackSuccess={(updated) => {
                    setOrder(updated);
                    saveOrderToHistory(updated);
                    fetchOrdersFromDb().then(setSavedOrders).catch(() => setSavedOrders(loadSavedOrdersList()));
                  }}
                />
              )}

              {/* PÁGINA 6: CONFIGURAÇÕES FISCAIS & PARÂMETROS DA REDE (Diretoria) */}
              {activeNav === 'fiscal' && canAccessTab(currentUser, 'fiscal') && (
                <FiscalSettingsPage
                  fiscalConfig={fiscalConfig}
                  storeConfigs={storeConfigs}
                  currentUser={currentUser}
                  onSave={handleSaveGlobalSettings}
                  onSaveStores={handleSaveStoresOnly}
                  onRestoreSuccess={async () => {
                    await loadFromSqlite();
                    showToast('Base de dados SQLite restaurada e sincronizada com sucesso!', 'success');
                  }}
                />
              )}

              {/* PÁGINA 7: GESTÃO DE USUÁRIOS & PERMISSÕES (Diretoria) */}
              {activeNav === 'users' && canAccessTab(currentUser, 'users') && (
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
        globalFiscal={order.fiscalConfig || fiscalConfig}
        isOpen={!!selectedFiscalItem}
        onClose={() => setSelectedFiscalItem(null)}
        onApplyChanges={handleUpdateItem}
      />

      <SeparationMatrixModal
        item={selectedSeparationItem}
        stores={storeConfigs}
        presets={separationPresets}
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
        onSavePreset={handleSaveSeparationPreset}
      />

      {/* Modal Rápido de Fornecedor & Parâmetros Fiscais (Overlay direto no Pedido) */}
      <SupplierModal
        isOpen={isSupplierModalOpen}
        suppliers={suppliers}
        initialEditSupplier={supplierModalEditTarget}
        onClose={() => {
          setIsSupplierModalOpen(false);
          setSupplierModalEditTarget(null);
        }}
        onSaveSupplier={async (sup) => {
          const saved = await handleSaveSupplier(sup);
          handleSelectSupplierForOrder(saved);
          setIsSupplierModalOpen(false);
          setSupplierModalEditTarget(null);
        }}
        onDeleteSupplier={async (supId) => {
          await handleDeleteSupplier(supId);
          if (order.header.supplierId === supId) {
            handleHeaderChange({
              ...order.header,
              fornecedor: '',
              supplierId: ''
            });
          }
        }}
        onSelectSupplierForOrder={(sup) => {
          handleSelectSupplierForOrder(sup);
          setIsSupplierModalOpen(false);
          setSupplierModalEditTarget(null);
        }}
      />

      {/* Modal Inteligente de Importação de Pedidos Excel (.xlsx) */}
      {isImportModalOpen && (
        <OrderImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          suppliers={suppliers}
          products={products}
          stores={storeConfigs}
          existingOrders={savedOrders}
          fiscalConfig={fiscalConfig}
          onOrderImported={handleOrderImported}
        />
      )}

      {/* Modal Seguro de Confirmação de Exclusão da Tela de Cotação */}
      <DeleteOrderConfirmModal
        isOpen={Boolean(orderToDeleteFromHeader)}
        onClose={() => setOrderToDeleteFromHeader(null)}
        order={orderToDeleteFromHeader}
        currentUser={currentUser}
        onConfirm={async (authPayload) => {
          if (orderToDeleteFromHeader) {
            await handleDeleteOrder(orderToDeleteFromHeader.header.id, authPayload);
            setOrderToDeleteFromHeader(null);
          }
        }}
      />

      {/* Modal de Confirmação de Recebimento Físico na Matriz */}
      {receiptModalOrder && (
        <ReceiptConfirmationModal
          order={receiptModalOrder}
          currentUser={currentUser}
          onConfirm={handleConfirmReceipt}
          onClose={() => setReceiptModalOrder(null)}
        />
      )}

      {/* Modal de Reprogramação da Previsão de Entrega */}
      {rescheduleModalOrder && (
        <RescheduleDeliveryModal
          isOpen={Boolean(rescheduleModalOrder)}
          order={rescheduleModalOrder}
          onClose={() => setRescheduleModalOrder(null)}
          onConfirm={async (targetOrder, newDate, adjustBoletos, reason) => {
            await handleRescheduleDelivery(targetOrder, newDate, adjustBoletos, reason);
          }}
        />
      )}

      {/* Modal de Trilha de Auditoria da Esteira */}
      {pipelineAuditOrder && (
        <OrderAuditModal
          order={pipelineAuditOrder}
          onClose={() => setPipelineAuditOrder(null)}
        />
      )}

      {/* Modal da Lixeira & Auditoria de Produtos Removidos */}
      <OrderTrashModal
        isOpen={isTrashModalOpen}
        onClose={() => setIsTrashModalOpen(false)}
        removedItems={order.removedItems || []}
        onRestoreItem={handleRestoreItem}
        isOrderFinalized={order.header.status === 'Finalizado'}
        stores={storeConfigs}
      />

      {/* Modal Ergonômico de Resolução de Conflitos Granulares */}
      {conflictMergeData && (
        <OrderConflictResolutionModal
          isOpen={Boolean(conflictMergeData)}
          conflicts={conflictMergeData.mergeResult.conflicts}
          remoteModifier={remoteInfo?.lastModifier || conflictMergeData.remote.header.recebidoPor || 'Outro operador'}
          onResolve={handleResolveConflicts}
          onCancel={() => setConflictMergeData(null)}
        />
      )}

      {/* 📱 Sistema de Notificações & Alertas Estilo iPhone (iOS Design System) */}
      <IOSAlertModal
        isOpen={Boolean(iosAlert)}
        alert={iosAlert}
        onClose={() => setIosAlert(null)}
      />

      <IOSNotificationBanner
        notification={iosBanner}
        onClose={() => setIosBanner(null)}
      />

    </div>
  );
}

export default App;
