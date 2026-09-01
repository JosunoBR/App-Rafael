import { PurchaseOrder, PaymentInstallment, FiscalConfig, StoreConfig, User, CentralStockItem } from '../shared/types';
import { 
  saveOrderToDb, 
  fetchOrdersFromDb, 
  deleteOrderFromDb, 
  updateInstallmentInDb, 
  fetchStockFromDb, 
  updateStockBalanceInDb, 
  fetchNextOrderNumberFromDb 
} from '../utils/api';
import { 
  saveOrderToHistory, 
  loadSavedOrdersList, 
  saveSavedOrdersList, 
  clearCurrentDraft, 
  getNextOrderNumber, 
  createNewOrder, 
  saveCurrentOrder, 
  loadCentralStock, 
  updateStockBalance,
  createStockTransferOrder
} from '../utils/storage';
import { generateOrderInstallments } from '../utils/installments';
import { ensureTrailingBlankItem, isOrderItemBlank } from '../utils/orderItemUtils';
import confetti from 'canvas-confetti';

interface UseOrderOperationsParams {
  order: PurchaseOrder;
  setOrder: React.Dispatch<React.SetStateAction<PurchaseOrder>>;
  setSavedOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  centralStock: CentralStockItem[];
  setCentralStock: React.Dispatch<React.SetStateAction<CentralStockItem[]>>;
  fiscalConfig: FiscalConfig;
  storeConfigs: StoreConfig[];
  currentUser: User | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  setActiveNav: (nav: any) => void;
}

export function useOrderOperations({
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
}: UseOrderOperationsParams) {

  const handleSaveOrder = async () => {
    const validItems = order.items.filter(it => !isOrderItemBlank(it));
    if (validItems.length === 0) {
      showToast('Não é possível salvar um pedido sem itens. Adicione pelo menos 1 produto.', 'error');
      return;
    }

    const orderToSave: PurchaseOrder = {
      ...order,
      items: validItems
    };

    const savedOrderNumber = order.header.numeroPedido;
    const orderWithInstallments: PurchaseOrder = {
      ...orderToSave,
      installments: (orderToSave.installments && orderToSave.installments.length > 0)
        ? orderToSave.installments
        : generateOrderInstallments(orderToSave)
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

      const nextNum = await fetchNextOrderNumberFromDb().catch(() => getNextOrderNumber());
      const cleanOrder = createNewOrder(fiscalConfig, storeConfigs, nextNum);
      setOrder({
        ...cleanOrder,
        items: ensureTrailingBlankItem(cleanOrder.items || [], fiscalConfig, storeConfigs)
      });

      showToast(`Pedido ${savedOrderNumber} gravado no SQLite! Tela pronta para o próximo pedido.`, 'success');
    } catch (_err) {
      saveOrderToHistory(orderWithInstallments);
      setSavedOrders(loadSavedOrdersList());
      clearCurrentDraft();

      const nextNum = getNextOrderNumber();
      const cleanOrder = createNewOrder(fiscalConfig, storeConfigs, nextNum);
      setOrder({
        ...cleanOrder,
        items: ensureTrailingBlankItem(cleanOrder.items || [], fiscalConfig, storeConfigs)
      });

      showToast(`Pedido ${savedOrderNumber} salvo localmente! Tela pronta para o próximo pedido.`, 'info');
    }
  };

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
    } catch (_err) {
      saveOrderToHistory(updated);
      setSavedOrders(loadSavedOrdersList());
      setOrder(updated);
      showToast(`Pedido ${updated.header.numeroPedido} aprovado localmente!`, 'info');
    }
  };

  const handleReleaseToSeparation = async (orderToRelease: PurchaseOrder) => {
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
      showToast(`Distribuição confirmada! Pedido ${updated.header.numeroPedido} LIBERADO para separação física na doca!`, 'success');
    } catch (_err) {
      saveOrderToHistory(updated);
      setSavedOrders(loadSavedOrdersList());
      setOrder(updated);
      showToast(`Pedido ${updated.header.numeroPedido} liberado localmente!`, 'info');
    }
  };

  const handleFinalizeSeparation = async (finalizedOrder: PurchaseOrder) => {
    try {
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
    } catch (_err) {
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
      showToast('Finalizado localmente!', 'info');
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
    } catch (_err) {
      saveOrderToHistory(updated);
      setSavedOrders(loadSavedOrdersList());
      if (order.header.numeroPedido === ord.header.numeroPedido || (order.header.id && order.header.id === ord.header.id)) {
        setOrder(updated);
      }
      showToast(`Status atualizado para "${newStatus}"!`);
    }
  };

  const handleUpdateInstallment = async (_orderId: string, updatedInstallment: PaymentInstallment) => {
    try {
      await updateInstallmentInDb(updatedInstallment.id, {
        valor: updatedInstallment.valor,
        dataVencimento: updatedInstallment.dataVencimento,
        status: updatedInstallment.status,
        dataPagamento: updatedInstallment.dataPagamento,
        observacao: updatedInstallment.observacao,
        documentoRef: updatedInstallment.documentoRef
      });
    } catch (_err) {
      console.warn('Persistência via API de parcela:', _err);
    }
  };

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
    } catch (_err) {
      console.warn('Erro ao salvar no SQLite:', _err);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await deleteOrderFromDb(orderId);
      const updated = await fetchOrdersFromDb().catch(() => null);
      if (updated && updated.length > 0) {
        setSavedOrders(updated);
        saveSavedOrdersList(updated);
      } else {
        const list = loadSavedOrdersList().filter(o => o.header.id !== orderId && o.header.numeroPedido !== orderId);
        saveSavedOrdersList(list);
        setSavedOrders(list);
      }
      showToast('Pedido excluído do sistema.', 'info');
    } catch (_err) {
      const list = loadSavedOrdersList().filter(o => o.header.id !== orderId && o.header.numeroPedido !== orderId);
      saveSavedOrdersList(list);
      setSavedOrders(list);
      showToast('Pedido excluído localmente.', 'info');
    }
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

  return {
    handleSaveOrder,
    handleApproveOrder,
    handleReleaseToSeparation,
    handleFinalizeSeparation,
    handleUpdateOrderStatus,
    handleUpdateInstallment,
    handleSaveOrderDirect,
    handleDeleteOrder,
    handleGenerateStockSeparation
  };
}
