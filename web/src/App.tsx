import React, { useState, useEffect, useMemo, startTransition } from 'react';
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

import { PurchaseOrder, OrderItem, FiscalConfig, StoreConfig, Supplier, User, Product, PaymentInstallment, CentralStockItem, SeparationPreset, FiscalPreset } from './shared/types';
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
  deleteStockItemFromDb,
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
  authorizeFinancialInDb
} from './utils/api';
import { exportCommercialOrderPDF, exportRomaneioPDF } from './utils/pdfExporter';
import { exportOrderToExcel } from './utils/excelExporter';
import { calculateOrderNetTotal, calculateOrderMerchandiseTotal, generateOrderInstallments } from './utils/installments';
import { calculateItemFiscal, normalizeRateToDecimal } from './shared/fiscalEngine';
import { DEFAULT_FISCAL_CONFIG } from './shared/constants';
import { calculateAutomaticSeparation } from './shared/separationEngine';
import { ensureTrailingBlankItem, isOrderItemBlank, createBlankOrderItem, generateNextProductCode } from './utils/orderItemUtils';
import { CheckCircle2, AlertCircle, Plus, Lock, ShieldCheck } from 'lucide-react';
import { canAccessTab, canCreateOrEditOrders, getDefaultNavForRole, canEditSpecificOrder } from './shared/permissions';

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
    if (currentUser && !canAccessTab(currentUser.role, activeNav)) {
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
          return currentOrder;
        });
      }
    } catch (err: any) {
      console.warn('Usando armazenamento local de contingência:', err);
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

      // 🛡️ Busca primeiro por código; se for por descrição, busca estritamente no catálogo DO MESMO FORNECEDOR
      const existing = (code ? existingCodeSet.get(code) : undefined) || 
                       (cleanDesc ? (existingDescSet.get(`${assignedSupplierId}:::${cleanDesc}`) || existingDescSet.get(`:::${cleanDesc}`)) : undefined);

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

  // Salva o pedido silenciosamente para contingência e troca segura de telas/pedidos sem perda de dados
  const saveOrderSilently = async (targetOrder: PurchaseOrder) => {
    const validItems = (targetOrder.items || []).filter(it => !isOrderItemBlank(it));
    if (validItems.length === 0 && (!targetOrder.header.fornecedor || targetOrder.header.fornecedor.trim() === '')) {
      return;
    }

    const cleanNum = (targetOrder.header.numeroPedido || '').trim().toUpperCase();
    if (!cleanNum) return;

    // 🛡️ Não permite salvar se o número de pedido colidir com outro pedido existente
    const duplicate = savedOrders.find(o => 
      o.header.id !== targetOrder.header.id && 
      o.header.numeroPedido && 
      o.header.numeroPedido.trim().toUpperCase() === cleanNum
    );
    if (duplicate) {
      console.warn(`[AutoSave] Abortado: número ${cleanNum} já pertence a outro pedido (${duplicate.header.fornecedor}).`);
      return;
    }

    // Registra novos produtos no catálogo em segundo plano sem travar a interface
    autoRegisterProductsFromOrder(validItems).catch(err => {
      console.warn('Aviso ao sincronizar produtos em segundo plano:', err);
    });

    const today = new Date().toISOString().split('T')[0];
    const targetDate = targetOrder.header.dataPedido || targetOrder.header.dataEmissao || today;

    // Recupera valor de frete das parcelas caso o header tenha ficado zerado
    const existingFrete = Array.isArray(targetOrder.installments)
      ? targetOrder.installments.find(inst => inst.isBoletoFrete || inst.tipoTitulo === 'frete' || inst.observacao?.toLowerCase().includes('frete'))
      : undefined;

    let targetValorFrete = Number(targetOrder.header.valorFrete ?? targetOrder.header.valorFreteGlobal) || 0;
    if (targetValorFrete <= 0 && existingFrete && existingFrete.valor > 0) {
      targetValorFrete = existingFrete.valor;
    }
    let targetTipoFrete = targetOrder.header.tipoFrete;
    if (targetValorFrete > 0 && (!targetTipoFrete || targetTipoFrete === 'CIF')) {
      targetTipoFrete = 'FOB';
    }

    // Preserva fielmente o status do pedido (não rebaixa pedidos Aprovados ou Em Distribuição para Em Cotação)
    const headerWithFrete = {
      ...targetOrder.header,
      tipoFrete: targetTipoFrete || targetOrder.header.tipoFrete || 'CIF',
      valorFrete: targetValorFrete,
      valorFreteGlobal: targetValorFrete,
      dataPedido: targetDate,
      dataEmissao: targetOrder.header.dataEmissao || targetDate,
      isDraft: targetOrder.header.isDraft !== undefined ? targetOrder.header.isDraft : true,
      status: targetOrder.header.status || 'Em Cotação',
      updatedAt: new Date().toISOString()
    };

    const orderToSave: PurchaseOrder = {
      ...targetOrder,
      items: validItems,
      header: headerWithFrete,
      installments: generateOrderInstallments({ ...targetOrder, header: headerWithFrete }, undefined, undefined, true)
    };

    // Atualiza imediatamente o histórico local e o estado em memória sem re-baixar todos os pedidos pela rede
    saveOrderToHistory(orderToSave);
    setSavedOrders(prev => {
      const idx = prev.findIndex(o => o.header.id === orderToSave.header.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = orderToSave;
        return next;
      }
      return [orderToSave, ...prev];
    });

    try {
      await saveOrderToDb(orderToSave);
    } catch (err) {
      console.warn('Aviso ao sincronizar pedido silenciosamente com o SQLite:', err);
    }
  };

  // Auto-save active order in local storage and SQLite (unificado para 1 minuto de inatividade)
  useEffect(() => {
    // 1. Salva imediatamente o rascunho no localStorage para segurança máxima a cada tecla
    saveCurrentOrder(order);

    // 2. Sincroniza silenciosamente com o banco SQLite a cada 60 segundos de inatividade
    const timer = setTimeout(() => {
      const validItems = (order.items || []).filter(it => !isOrderItemBlank(it));
      if (validItems.length > 0 || (order.header?.fornecedor && order.header.fornecedor.trim() !== '')) {
        saveOrderSilently(order).catch(() => {});
      }
    }, 60000); // 1 minuto unificado conforme validação do usuário
    return () => clearTimeout(timer);
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

      const rawValorFrete = Number(updatedHeader?.valorFrete ?? updatedHeader?.valorFreteGlobal) || 0;
      let effectiveTipoFrete = updatedHeader?.tipoFrete;
      if (rawValorFrete > 0 && (!effectiveTipoFrete || effectiveTipoFrete === 'CIF')) {
        effectiveTipoFrete = 'FOB';
        updatedHeader = { ...updatedHeader, tipoFrete: 'FOB' };
      }
      const isCif = String(effectiveTipoFrete || 'CIF').toUpperCase().includes('CIF') && rawValorFrete <= 0;
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

      return { 
        ...prev, 
        header: updatedHeader,
        fiscalConfig: newFiscal,
        items: updatedItems,
        installments: generateOrderInstallments({ ...prev, header: updatedHeader, items: updatedItems }, undefined, undefined, true)
      };
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
    setOrder(prev => {
      const filtered = prev.items.filter(item => item.id !== itemId);
      const cleanItems = ensureTrailingBlankItem(filtered, fiscalConfig, storeConfigs);
      const synced = syncOrderFreteAndItems(prev, cleanItems);
      return {
        ...prev,
        header: synced.header,
        items: synced.items
      };
    });
    showToast('Item removido do pedido.', 'info');
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

    if (!canAccessTab(currentUser?.role, targetTab)) {
      targetTab = getDefaultNavForRole(currentUser?.role);
    }

    // startTransition garante prioridade máxima para a resposta de clique do usuário
    startTransition(() => {
      setOrder(updatedOrder);
      setViewMode('desktop');
      if (activeNav !== targetTab) {
        setActiveNav(targetTab);
      }
    });

    showToast(`Pedido ${cleanNum} carregado com sucesso.`);
  };

  // 1. Salvar Pedido em Rascunho / Espera (mantém o pedido na tela para continuar editando)
  const handleSaveDraftOrder = async () => {
    const validItems = order.items.filter(it => !isOrderItemBlank(it));
    if (validItems.length === 0 && (!order.header.fornecedor || order.header.fornecedor.trim() === '')) {
      showToast('Não é possível salvar um pedido totalmente vazio.', 'error');
      return;
    }

    const cleanNum = (order.header.numeroPedido || '').trim().toUpperCase();
    if (!cleanNum) {
      showToast('O número do pedido é obrigatório.', 'error');
      return;
    }

    // 🛡️ Validação Estrita de Unicidade: impede duplicidade de número chave
    const conflict = savedOrders.find(o => 
      o.header.id !== order.header.id && 
      o.header.numeroPedido && 
      o.header.numeroPedido.trim().toUpperCase() === cleanNum
    );
    if (conflict) {
      showToast(`Não é possível salvar: O número "${order.header.numeroPedido}" já pertence ao pedido do fornecedor "${conflict.header.fornecedor || 'outro fornecedor'}". Números de pedido devem ser únicos!`, 'error');
      return;
    }

    await autoRegisterProductsFromOrder(validItems);

    const today = new Date().toISOString().split('T')[0];
    const targetDate = order.header.dataPedido || order.header.dataEmissao || today;

    const isClosed = Boolean(
      order.header.status && 
      order.header.status !== 'Em Cotação' && 
      order.header.status !== 'Rascunho'
    );

    // 🛡️ Se o pedido já foi fechado, compradores não podem alterar pedidos em esteira sem liberação da Diretoria
    if (isClosed && currentUser?.role !== 'diretoria') {
      showToast('Este pedido já foi aprovado e está na esteira operacional. Para efetuar alterações comerciais ou de quantidades, solicite a liberação à Diretoria.', 'error');
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
      await saveOrderToDb(orderWithInstallments);
      try {
        saveOrderToHistory(orderWithInstallments);
      } catch (localErr) {
        console.warn('Aviso: cópia em localStorage não pôde ser salva (cota):', localErr);
      }
      const updatedOrders = await fetchOrdersFromDb().catch(() => loadSavedOrdersList());
      setSavedOrders(updatedOrders);
      setOrder({
        ...orderWithInstallments,
        items: ensureTrailingBlankItem(validItems, fiscalConfig, storeConfigs)
      });
      if (isClosed) {
        showToast(`Pedido ${order.header.numeroPedido} atualizado com sucesso pela Diretoria!`, 'success');
      } else {
        showToast(`Pedido ${order.header.numeroPedido} salvo com sucesso em espera!`, 'success');
      }
    } catch (err: any) {
      console.error('Erro ao salvar pedido no servidor:', err);
      if (isOfflineError(err)) {
        saveOrderToHistory(orderWithInstallments);
        setSavedOrders(loadSavedOrdersList());
        setOrder({
          ...orderWithInstallments,
          items: ensureTrailingBlankItem(validItems, fiscalConfig, storeConfigs)
        });
        showToast(`Você está sem conexão. Pedido ${order.header.numeroPedido} salvo localmente (contingência).`, 'info');
        return;
      }
      showToast(err.message || 'Erro ao salvar pedido no Banco de Dados.', 'error');
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

    // 🛡️ Validação Estrita de Unicidade
    const conflict = savedOrders.find(o => 
      o.header.id !== order.header.id && 
      o.header.numeroPedido && 
      o.header.numeroPedido.trim().toUpperCase() === cleanNum
    );
    if (conflict) {
      showToast(`Não é possível fechar o pedido: O número "${order.header.numeroPedido}" já pertence a outro pedido (${conflict.header.fornecedor || 'Fornecedor'}).`, 'error');
      return;
    }

    await autoRegisterProductsFromOrder(validItems);

    const today = new Date().toISOString().split('T')[0];
    const orderDate = order.header.dataPedido || order.header.dataEmissao || today;

    const closedOrder: PurchaseOrder = {
      ...order,
      items: validItems,
      header: {
        ...order.header,
        dataPedido: orderDate,
        dataEmissao: order.header.dataEmissao || orderDate,
        status: 'Em Separação',
        separationStatus: 'Pendente',
        isDraft: false,
        liberadoPorDeposito: currentUser?.nome || 'Comprador',
        dataLiberacaoSeparacao: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    const orderWithInstallments: PurchaseOrder = {
      ...closedOrder,
      installments: generateOrderInstallments(closedOrder, undefined, undefined, true)
    };

    const closedNum = closedOrder.header.numeroPedido;

    try {
      await saveOrderToDb(orderWithInstallments);
      try {
        saveOrderToHistory(orderWithInstallments);
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

      showToast(`Pedido ${closedNum} FECHADO e gravado no Banco de Dados!`, 'success');
    } catch (err: any) {
      console.error('Erro ao fechar pedido no servidor:', err);
      if (isOfflineError(err)) {
        saveOrderToHistory(orderWithInstallments);
        setSavedOrders(loadSavedOrdersList());
        clearCurrentDraft();

        const nextNum = await fetchNextOrderNumberFromDb().catch(() => getNextOrderNumber());
        const cleanOrder = createNewOrder(fiscalConfig, storeConfigs, nextNum);
        setOrder({
          ...cleanOrder,
          items: ensureTrailingBlankItem(cleanOrder.items || [], fiscalConfig, storeConfigs)
        });

        showToast(`Você está offline. Pedido ${closedNum} fechado localmente e será enviado ao reconectar.`, 'info');
        return;
      }
      showToast(err.message || 'Erro ao fechar pedido no Banco de Dados.', 'error');
    }
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
        const nextNum = getNextOrderNumber();
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

      // 1. Preservar 100% de todos os dados do card de negociação e do cabeçalho comercial original
      duplicated.header = {
        ...order.header,
        id: duplicated.header.id,
        numeroPedido: duplicated.header.numeroPedido,
        dataPedido: today,
        dataEmissao: today,
        status: 'Em Cotação',
        separationStatus: 'Pendente',
        isDraft: true,
        createdAt: duplicated.header.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 2. Preservar 100% da Engenharia Fiscal do pedido original
      const targetFiscal = order.fiscalConfig || fiscalConfig;
      duplicated.fiscalConfig = targetFiscal;
      setFiscalConfig(targetFiscal);

      // Gerar as parcelas de pagamento calculadas a partir da nova data do pedido com as condições idênticas
      duplicated.installments = generateOrderInstallments(duplicated, undefined, undefined, false);

      // Salva no banco e histórico com a data atual e as parcelas geradas
      await saveOrderToDb(duplicated).catch(() => {});
      saveOrderToHistory(duplicated);

      const updatedOrders = await fetchOrdersFromDb().catch(() => loadSavedOrdersList());
      setSavedOrders(updatedOrders);
      setOrder({
        ...duplicated,
        items: ensureTrailingBlankItem(duplicated.items || [], targetFiscal, storeConfigs)
      });
      showToast(`Pedido duplicado com sucesso: ${duplicated.header.numeroPedido}! Altere os itens e quantidades.`, 'success');
    } catch (err: any) {
      showToast(`Erro ao duplicar pedido: ${err.message}`, 'error');
    }
  };

  // Handler para Aprovação de Pedido (Comprador/Diretoria -> Depósito)
  const handleApproveOrder = async (orderToApprove: PurchaseOrder) => {
    const validItems = orderToApprove.items.filter(it => !isOrderItemBlank(it));
    if (validItems.length === 0) {
      showToast('Não é possível aprovar um pedido sem itens.', 'error');
      return;
    }

    const updated: PurchaseOrder = {
      ...orderToApprove,
      items: validItems,
      header: {
        ...orderToApprove.header,
        status: 'Aprovado',
        aprovadoPor: currentUser?.nome || 'Diretoria Compras',
        dataAprovacao: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      installments: (orderToApprove.installments && orderToApprove.installments.length > 0)
        ? orderToApprove.installments
        : generateOrderInstallments(orderToApprove)
    };

    try {
      await saveOrderToDb(updated);
      saveOrderToHistory(updated);
      setSavedOrders(loadSavedOrdersList());
      setOrder(updated);
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      showToast(`Pedido ${updated.header.numeroPedido} APROVADO! Enviado para distribuição do Depósito Central.`, 'success');
    } catch (err: any) {
      saveOrderToHistory(updated);
      setSavedOrders(loadSavedOrdersList());
      setOrder(updated);
      showToast(`Pedido ${updated.header.numeroPedido} aprovado localmente!`, 'info');
    }
  };

  // Handler para Liberação da Distribuição para a Doca com Entrada Automática no Estoque Central
  const handleReleaseToSeparation = async (orderToRelease: PurchaseOrder) => {
    // Governança: Para compras de fornecedores externos, a mercadoria precisa ter sido fisicamente recebida na Matriz
    const isTransfer = orderToRelease.header?.supplierId === 'cd_matriz' || 
                       String(orderToRelease.header?.numeroPedido || '').startsWith('CD-') || 
                       String(orderToRelease.header?.id || '').startsWith('order_transf_cd_') ||
                       Boolean(orderToRelease.header?.fornecedor && orderToRelease.header.fornecedor.toLowerCase().includes('transferência'));

    if (!isTransfer && !orderToRelease.header?.recebidoMatriz) {
      showToast('Atenção: O pedido precisa ser confirmado como recebido na Matriz antes de liberar a separação!', 'info');
      return;
    }

    // 1. Dar entrada automática no Estoque Central para itens com reserva no CD (qtdReservaEstoque > 0)
    let totalPecasEstoqueEntrada = 0;
    try {
      const currentStock = await fetchStockFromDb().catch(() => loadCentralStock());

      for (const it of orderToRelease.items) {
        const qtdEntrada = it.qtdReservaEstoque || 0;
        if (qtdEntrada > 0 && it.descricao && it.descricao.trim().length > 0) {
          totalPecasEstoqueEntrada += qtdEntrada;

          // Verifica se o produto já existe no Estoque Central
          const existingStock = currentStock.find(s => 
            (s.codigo && it.codigo && s.codigo.trim().toLowerCase() === it.codigo.trim().toLowerCase()) ||
            (s.codigoInterno && it.codigoInterno && s.codigoInterno.trim().toLowerCase() === it.codigoInterno.trim().toLowerCase()) ||
            (s.descricao && it.descricao && s.descricao.trim().toLowerCase() === it.descricao.trim().toLowerCase()) ||
            (s.productId && it.id && s.productId === it.id)
          );

          if (existingStock) {
            // Incrementa o saldo no SQLite
            try {
              await updateStockBalanceInDb(existingStock.id, qtdEntrada);
            } catch {
              updateStockBalance(existingStock.id, qtdEntrada);
            }
          } else {
            // Cria o novo item no Estoque Matriz
            const pack = it.qtdPorPacote || it.qtdNoPacote || 1;
            const newStockItem: CentralStockItem = {
              id: 'stock_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
              productId: it.id,
              codigoInterno: it.codigoInterno || it.codigo || '',
              codigoFornecedor: it.codigoFornecedor || '',
              codigoBarras: it.codigoBarras || '',
              codigo: it.codigo || it.codigoInterno || '',
              descricao: it.descricao.trim(),
              categoria: 'Geral',
              fotoUrl: it.fotoUrl || '',
              qtdPorPacote: pack,
              saldoUnidades: qtdEntrada,
              saldoCaixas: Math.floor(qtdEntrada / pack),
              precoUnitario: it.precoUnitario || 0,
              pdvSugerido: it.pdvAlvo || 0,
              localizacaoGalpao: `Entrada Pedido ${orderToRelease.header.numeroPedido}`,
              fornecedorOrigem: orderToRelease.header.fornecedor || '',
              dataUltimaEntrada: new Date().toISOString().split('T')[0],
              updatedAt: new Date().toISOString()
            };

            try {
              await saveStockItemToDb(newStockItem);
            } catch {
              const current = loadCentralStock();
              saveCentralStock([newStockItem, ...current]);
            }
          }
        }
      }

      // Atualiza o estado central de estoque imediatamente
      const refreshedStock = await fetchStockFromDb().catch(() => loadCentralStock());
      setCentralStock(refreshedStock);
      saveCentralStock(refreshedStock);
    } catch (stockErr) {
      console.warn('Erro ao registrar entrada automática no estoque central:', stockErr);
    }

    // 2. Atualizar o status do pedido para 'Em Separação'
    const updated: PurchaseOrder = {
      ...orderToRelease,
      header: {
        ...orderToRelease.header,
        status: 'Em Separação',
        liberadoPorDeposito: currentUser?.nome || 'Depósito Central',
        dataLiberacaoSeparacao: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    try {
      await saveOrderToDb(updated);
      saveOrderToHistory(updated);
      setSavedOrders(loadSavedOrdersList());
      setOrder(updated);
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      if (totalPecasEstoqueEntrada > 0) {
        showToast(`Distribuição confirmada! Entrada de ${totalPecasEstoqueEntrada.toLocaleString('pt-BR')} un registrada no Estoque Matriz e romaneio liberado para Separação na Doca!`, 'success');
      } else {
        showToast(`Distribuição confirmada! Pedido ${updated.header.numeroPedido} liberado para separação na doca!`, 'success');
      }
    } catch (err: any) {
      saveOrderToHistory(updated);
      setSavedOrders(loadSavedOrdersList());
      setOrder(updated);
      showToast(`Pedido ${updated.header.numeroPedido} liberado localmente!`, 'info');
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
      // 1. Persistir no backend SQLite
      const res = await confirmReceiptInDb(targetOrder.header.id, payload);

      // 2. Atualizar cabeçalho localmente com campos de recebimento e liberação
      const updatedHeader = {
        ...targetOrder.header,
        recebidoMatriz: true,
        dataRecebimentoMatriz: payload.dataRecebimento,
        recebidoPor: payload.recebidoPor,
        numeroNotaFiscal: payload.numeroNotaFiscal || targetOrder.header.numeroNotaFiscal,
        ...(payload.autorizarBoletos && currentUser?.role === 'diretoria' ? {
          boletosLiberados: true,
          boletosLiberadosPor: currentUser?.nome || 'Diretoria',
          boletosLiberadosEm: new Date().toISOString()
        } : {}),
        updatedAt: new Date().toISOString()
      };

      const intermediateOrder: PurchaseOrder = {
        ...targetOrder,
        header: updatedHeader
      };

      // 3. Recalcular datas de vencimento com base na data de recebimento real na Matriz
      const updatedOrderWithInstallments: PurchaseOrder = {
        ...intermediateOrder,
        installments: generateOrderInstallments(intermediateOrder, undefined, undefined, true)
      };

      // 4. Salvar versão com parcelas recalculadas
      await saveOrderToDb(updatedOrderWithInstallments).catch(() => {});
      saveOrderToHistory(updatedOrderWithInstallments);
      const refreshedList = loadSavedOrdersList();
      setSavedOrders(refreshedList);

      if (order.header.id === targetOrder.header.id) {
        setOrder(updatedOrderWithInstallments);
      }

      setReceiptModalOrder(null);
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      showToast(res?.message || `Recebimento do pedido ${targetOrder.header.numeroPedido} confirmado na Matriz!`, 'success');
    } catch (err: any) {
      showToast(`Erro ao confirmar recebimento: ${err.message || 'Falha de comunicação'}`, 'error');
    }
  };

  // Handler para liberação de boletos pela Diretoria
  const handleAuthorizeFinancial = async (targetOrder: PurchaseOrder) => {
    if (currentUser?.role !== 'diretoria') {
      showToast('Apenas a Diretoria pode autorizar a liberação de boletos para o Financeiro.', 'error');
      return;
    }

    if (!targetOrder.header.recebidoMatriz) {
      showToast('O pedido precisa estar fisicamente recebido na Matriz antes de liberar os boletos.', 'info');
      return;
    }

    try {
      const res = await authorizeFinancialInDb(targetOrder.header.id);

      const updated: PurchaseOrder = {
        ...targetOrder,
        header: {
          ...targetOrder.header,
          boletosLiberados: true,
          boletosLiberadosPor: currentUser?.nome || 'Diretoria',
          boletosLiberadosEm: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };

      await saveOrderToDb(updated).catch(() => {});
      saveOrderToHistory(updated);
      const refreshedList = loadSavedOrdersList();
      setSavedOrders(refreshedList);

      if (order.header.id === targetOrder.header.id) {
        setOrder(updated);
      }

      confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
      showToast(res?.message || `Boletos do pedido ${targetOrder.header.numeroPedido} liberados com sucesso!`, 'success');
    } catch (err: any) {
      showToast(`Erro ao liberar boletos: ${err.message || 'Falha de comunicação'}`, 'error');
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
    } catch {
      const updated = updateStockBalance(stockId, deltaUnidades, newLocation);
      setCentralStock([...updated]);
      showToast('Saldo de estoque do depósito atualizado localmente!', 'info');
    }
  };

  const handleSaveNewStockItem = async (item: CentralStockItem) => {
    try {
      await saveStockItemToDb(item);
      const updatedList = await fetchStockFromDb();
      setCentralStock(updatedList);
      saveCentralStock(updatedList);
      showToast(`Produto ${item.descricao} gravado no estoque do CD (SQLite)!`, 'success');
    } catch {
      const current = loadCentralStock();
      const existingIdx = current.findIndex(s => s.id === item.id || (item.productId && s.productId === item.productId));
      let updated: CentralStockItem[];
      if (existingIdx >= 0) {
        current[existingIdx] = { 
          ...current[existingIdx], 
          ...item, 
          saldoUnidades: (current[existingIdx].saldoUnidades || 0) + (item.saldoUnidades || 0)
        };
        updated = current;
      } else {
        updated = [item, ...current];
      }
      saveCentralStock(updated);
      setCentralStock([...updated]);
      showToast(`Produto ${item.descricao} salvo localmente!`, 'info');
    }
  };

  const handleDeleteStockItem = async (stockId: string) => {
    // Atualização otimista imediata na UI e storage local
    setCentralStock(prev => {
      const updated = prev.filter(s => s.id !== stockId);
      saveCentralStock(updated);
      return updated;
    });

    try {
      await deleteStockItemFromDb(stockId);
      const updatedList = await fetchStockFromDb();
      setCentralStock(updatedList);
      saveCentralStock(updatedList);
      showToast('Item excluído do estoque central!', 'success');
    } catch {
      showToast('Item excluído localmente.', 'info');
    }
  };

  const _handleClearAllStock = async () => {
    try {
      await clearAllStockFromDb();
      setCentralStock([]);
      saveCentralStock([]);
      showToast('Todo o estoque da matriz foi limpo com sucesso!', 'success');
    } catch {
      saveCentralStock([]);
      setCentralStock([]);
      showToast('Estoque limpo localmente.', 'info');
    }
  };

  const handleGenerateStockSeparation = async (itemsToTransfer: StockTransferPayloadItem[]) => {
    try {
      const transfOrder = createStockTransferOrder(itemsToTransfer, storeConfigs, fiscalConfig);
      await saveOrderToDb(transfOrder).catch(err => {
        console.warn('Aviso ao salvar romaneio no SQLite:', err);
      });
      saveOrderToHistory(transfOrder);
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
      showToast('Erro ao despachar romaneio: ' + (err.message || 'Falha inesperada'), 'error');
    }
  };

  const handleFinalizeSeparation = async (finalizedOrder: PurchaseOrder) => {
    try {
      // Se for transferência do estoque central, realiza a baixa do estoque do CD no SQLite
      if (finalizedOrder.header.supplierId === 'cd_matriz') {
        for (const it of finalizedOrder.items) {
          const match = centralStock.find(s => s.codigo === it.codigo || s.descricao === it.descricao || (s.productId && s.productId === it.id));
          if (match) {
            await updateStockBalanceInDb(match.id, -(it.qtdTotalUnidades || 0)).catch(() => {});
          }
        }
        const refreshedStock = await fetchStockFromDb().catch(() => null);
        if (refreshedStock) setCentralStock(refreshedStock);
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
      
      showToast(`Separação do pedido ${finalizedOrder.header.numeroPedido} FINALIZADA! Arquivado no SQLite.`, 'success');
      setActiveNav('separationHistory');
    } catch (err: any) {
      if (finalizedOrder.header.supplierId === 'cd_matriz') {
        finalizedOrder.items.forEach(it => {
          const stock = loadCentralStock();
          const match = stock.find(s => s.codigo === it.codigo || s.descricao === it.descricao);
          if (match) {
            updateStockBalance(match.id, -(it.qtdTotalUnidades || 0));
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

  const handleOrderImported = async (importedOrder: PurchaseOrder, updatedProducts: Product[]) => {
    setProducts(updatedProducts);
    
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

    // Salva o pedido como ativo e em cotação (rascunho ativo, nunca fechado)
    setOrder(cleanOrder);
    saveCurrentOrder(cleanOrder);
    saveOrderToHistory(cleanOrder);

    try {
      await saveOrderToDb(cleanOrder);
      const updatedOrders = await fetchOrdersFromDb().catch(() => loadSavedOrdersList());
      setSavedOrders(updatedOrders);
    } catch {
      setSavedOrders(prev => {
        const filtered = prev.filter(o => o.header.id !== cleanOrder.header.id && o.header.numeroPedido !== cleanOrder.header.numeroPedido);
        return [cleanOrder, ...filtered];
      });
    }

    setActiveNav('orders');
    setViewMode('desktop');
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
    showToast(`Pedido ${importedOrder.header.numeroPedido} importado com sucesso! (Salvo em cotação)`, 'success');
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

  const handleExportSeparationPDF = () => {
    exportRomaneioPDF(order, storeConfigs);
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
        percentualNota: sup.percentualNotaPadrao !== undefined ? sup.percentualNotaPadrao : (prev.header.percentualNota ?? 100),
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
      } else {
        setSavedOrders(prev => prev.filter(o => o.header.id !== orderId && o.header.numeroPedido !== orderId));
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
          if (canAccessTab(currentUser?.role, tab)) {
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
          onSelectOrder={(selected) => handleOpenSelectedOrder(selected, canCreateOrEditOrders(currentUser?.role) ? 'orders' : 'separation')}
          onNewOrder={handleNewOrder}
          onSaveOrder={handleSaveDraftOrder}
          onCloseOrder={handleCloseOrder}
          onDuplicateOrder={handleDuplicateCurrentOrder}
          onDiscardDraft={handleRequestDiscardOrDelete}
          onExportExcel={handleExportExcel}
          onExportPDF={activeNav === 'separation' ? handleExportSeparationPDF : handleExportCommercialPDF}
          onImportExcel={() => setIsImportModalOpen(true)}
          onSelectNav={(tab) => {
            if (canAccessTab(currentUser?.role, tab)) {
              setActiveNav(tab);
            }
          }}
        />

        <main className="flex-1 w-full max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 py-6 transition-all duration-300">
          
          {/* MODO MOBILE 1: COMPRAS EM VIAGENS / FEIRAS (Apenas Compradores) */}
          {viewMode === 'mobile_purchases' && canCreateOrEditOrders(currentUser?.role) && (
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
              {activeNav === 'home' && canAccessTab(currentUser?.role, 'home') && (
                <HomePage
                  currentUser={currentUser}
                  savedOrders={savedOrders}
                  draftOrder={hasActiveDraft ? order : null}
                  suppliers={suppliers}
                  products={products}
                  stores={storeConfigs}
                  centralStock={centralStock}
                  onNavigate={(tab) => {
                    if (canAccessTab(currentUser?.role, tab)) {
                      setActiveNav(tab);
                      setViewMode('desktop');
                    }
                  }}
                  onNewOrder={handleNewOrder}
                  onContinueDraft={handleContinueDraft}
                  onDiscardDraft={handleDiscardDraft}
                  onSelectOrder={(selected) => handleOpenSelectedOrder(selected, canCreateOrEditOrders(currentUser?.role) ? 'orders' : 'separation')}
                  onSwitchViewMode={(mode) => setViewMode(mode)}
                  onConfirmReceipt={(selected) => setReceiptModalOrder(selected)}
                  onAuthorizeFinancial={handleAuthorizeFinancial}
                />
              )}

              {/* PÁGINA 1: COTAÇÃO E PEDIDOS (Diretoria & Compradores) */}
              {activeNav === 'orders' && canAccessTab(currentUser?.role, 'orders') && (
                <div className="space-y-6 animate-in fade-in duration-200">
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
                    onConfirmReceipt={(selected) => setReceiptModalOrder(selected)}
                    onAuthorizeFinancial={handleAuthorizeFinancial}
                  />

                  {/* Banner Informativo de Pedido Fechado / Edição da Diretoria */}
                  {order.header.status && order.header.status !== 'Em Cotação' && order.header.status !== 'Rascunho' && (
                    currentUser?.role === 'diretoria' ? (
                      <div className="p-3.5 px-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between shadow-2xs">
                        <div className="flex items-center gap-2.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>
                            <b>Edição Liberada para a Diretoria:</b> Este pedido está fechado na esteira ({order.header.status}). Você pode editar dados, itens e parcelas livremente. Ao salvar, suas alterações manterão o fluxo do pedido ativo.
                          </span>
                        </div>
                        <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shrink-0">
                          Diretoria
                        </span>
                      </div>
                    ) : (
                      <div className="p-3.5 px-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center gap-2.5 shadow-2xs">
                        <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>
                          <b>Modo de Visualização (Somente Leitura):</b> Este pedido já foi fechado ({order.header.status}). Apenas a Diretoria possui autorização para alterar pedidos já fechados.
                        </span>
                      </div>
                    )
                  )}

                  <fieldset 
                    disabled={Boolean(
                      order.header.status && 
                      order.header.status !== 'Em Cotação' && 
                      order.header.status !== 'Rascunho' && 
                      currentUser?.role !== 'diretoria'
                    )}
                    className={Boolean(
                      order.header.status && 
                      order.header.status !== 'Em Cotação' && 
                      order.header.status !== 'Rascunho' && 
                      currentUser?.role !== 'diretoria'
                    ) ? 'space-y-6 opacity-85 pointer-events-none select-none border-none p-0 m-0' : 'space-y-6 border-none p-0 m-0'}
                  >
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
                      onSaveAsSupplierTemplate={handleSaveAsSupplierTemplate}
                      onLoadSupplierTemplate={handleLoadSupplierTemplate}
                      hasSupplierTemplate={Boolean(activeSupplierTemplate)}
                      supplierTemplateItemsCount={activeSupplierTemplate?.items?.length || 0}
                      showToast={showToast}
                    />

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
                      percentualDescontoOff={order.header.percentualDescontoOff}
                      onUpdateItem={handleUpdateItem}
                      onAddItem={handleAddItem}
                      onDuplicateItem={handleDuplicateItem}
                      onDeleteItem={handleDeleteItem}
                      onSaveProduct={handleSaveProduct}
                      onOpenFiscalModal={(item) => setSelectedFiscalItem(item)}
                    />
                  </fieldset>
                </div>
              )}

              {/* PÁGINA 1.1: GESTÃO DO ESTOQUE DO DEPÓSITO CENTRAL (CD MATRIZ) */}
              {activeNav === 'stock' && canAccessTab(currentUser?.role, 'stock') && (
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
                  onDeleteStockItem={handleDeleteStockItem}
                />
              )}

              {/* PÁGINA 2: CONFERÊNCIA DE SEPARAÇÃO E ROMANEIO (20 LOJAS) */}
              {activeNav === 'separation' && canAccessTab(currentUser?.role, 'separation') && (
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
                    onSavePreset={handleSaveSeparationPreset}
                    onDeletePreset={handleDeleteSeparationPreset}
                  />
                )
              )}

              {/* PÁGINA 2.1: HISTÓRICO DE SEPARAÇÕES & AUDITORIA DE CONFERENTES */}
              {activeNav === 'separationHistory' && canAccessTab(currentUser?.role, 'separationHistory') && (
                <SeparationHistoryPage
                  orders={savedOrders.length > 0 ? savedOrders : [order]}
                  stores={storeConfigs}
                  onSelectOrderForSeparation={(selected) => handleOpenSelectedOrder(selected, 'separation')}
                  onNavigateToSeparation={() => setActiveNav('separation')}
                />
              )}

              {/* PÁGINA 3: CATÁLOGO & CADASTRO DE PRODUTOS COM FOTOS */}
              {activeNav === 'products' && canAccessTab(currentUser?.role, 'products') && (
                <ProductsCatalogPage
                  products={products}
                  suppliers={suppliers}
                  initialSupplierId={selectedCatalogSupplier}
                  onSaveProduct={handleSaveProduct}
                  onDeleteProduct={handleDeleteProduct}
                />
              )}

              {/* PÁGINA 4: DASHBOARD EXECUTIVO & BI (Diretoria) */}
              {activeNav === 'dashboard' && canAccessTab(currentUser?.role, 'dashboard') && (
                <DashboardView
                  orders={savedOrders}
                  suppliers={suppliers}
                  onSelectOrder={(selected) => handleOpenSelectedOrder(selected, 'orders')}
                  onNavigateToOrders={() => setActiveNav('orders')}
                />
              )}

              {/* PÁGINA 4.1: GESTÃO FINANCEIRA DE BOLETOS & CONTAS A PAGAR (Diretoria) */}
              {activeNav === 'financial' && canAccessTab(currentUser?.role, 'financial') && (
                <FinancialBoletosPage
                  orders={effectiveOrders}
                  suppliers={suppliers}
                  stores={storeConfigs}
                  onSelectOrder={(selected) => handleOpenSelectedOrder(selected, 'orders')}
                  onUpdateInstallment={handleUpdateInstallment}
                  onSaveOrder={handleSaveOrderDirect}
                  showToast={showToast}
                />
              )}

              {/* PÁGINA 5: GESTÃO COMPLETA DE FORNECEDORES (Diretoria & Compradores) */}
              {activeNav === 'suppliers' && canAccessTab(currentUser?.role, 'suppliers') && (
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
              {activeNav === 'history' && canAccessTab(currentUser?.role, 'history') && (
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
                />
              )}

              {/* PÁGINA 6: CONFIGURAÇÕES FISCAIS & PARÂMETROS DA REDE (Diretoria) */}
              {activeNav === 'fiscal' && canAccessTab(currentUser?.role, 'fiscal') && (
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
              {activeNav === 'users' && canAccessTab(currentUser?.role, 'users') && (
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
          onSaveSupplier={handleSaveSupplier}
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

    </div>
  );
}

export default App;
