import { PurchaseOrder, OrderStatus, Supplier, FiscalConfig, FiscalPreset, StoreConfig, Product, User, CentralStockItem, SeparationPreset, PaymentCondition, FinancialEntry, FinancialSummary, DistributionAuditLog, FinancialAuditLog } from '../shared/types';
import { API_BASE_URL } from './config';
import { getNextOrderNumber } from './storage';

export class ApiError extends Error {
  status: number;
  isNetworkError: boolean;

  constructor(message: string, status: number = 0, isNetworkError: boolean = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isNetworkError = isNetworkError;
  }
}

export function isOfflineError(err: any): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  if (err instanceof ApiError && err.isNetworkError) return true;
  if (err?.name === 'TypeError' && err?.message?.toLowerCase().includes('fetch')) return true;
  if (err?.message?.toLowerCase().includes('failed to fetch')) return true;
  if (err?.message?.toLowerCase().includes('networkerror')) return true;
  return false;
}

export function isJwtExpired(token: string): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return false;
  }
}

export async function verifyServerSession(): Promise<{ valid: boolean; user?: User; expired?: boolean }> {
  try {
    const raw = localStorage.getItem('mega12_user');
    if (raw) {
      const localUser = JSON.parse(raw);
      if (localUser?.token && isJwtExpired(localUser.token)) {
        return { valid: false, expired: true };
      }
    }
    const res = await apiFetch('/auth/me');
    if (res.ok) {
      const data = await res.json();
      return { valid: true, user: data.user };
    }
  } catch {}

  try {
    const raw = localStorage.getItem('mega12_user');
    if (raw) {
      const localUser = JSON.parse(raw);
      if (localUser?.token && !isJwtExpired(localUser.token)) {
        return { valid: true, user: localUser };
      }
      return { valid: false, expired: true };
    }
  } catch {}
  return { valid: false };
}

function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extraHeaders };
  try {
    const raw = localStorage.getItem('mega12_user');
    if (raw) {
      const user = JSON.parse(raw);
      if (user?.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }
    }
  } catch {}
  return headers;
}

async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const headers = getAuthHeaders(options.headers as Record<string, string> || {});
  
  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      let errorMessage = `Erro HTTP ${res.status}`;
      let errorData: any = null;
      try {
        errorData = await res.json();
        if (errorData?.error) errorMessage = errorData.error;
        else if (errorData?.message) errorMessage = errorData.message;
      } catch {}

      if (res.status === 401) {
        errorMessage = errorData?.error || errorData?.message || 'Sessão expirada ou não autenticada no servidor. Faça login novamente.';
      } else if (res.status === 403) {
        errorMessage = errorData?.error || errorData?.message || 'Acesso negado: seu usuário não tem permissão para esta operação.';
      }

      throw new ApiError(errorMessage, res.status, false);
    }
    return res;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(
      'Não foi possível conectar ao servidor. Verifique sua conexão ou se o servidor está ativo.',
      0,
      true
    );
  }
}

export async function fetchHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

// PRODUTOS COM FOTOS
export async function fetchProductsFromDb(): Promise<Product[]> {
  const res = await apiFetch('/products');
  return res.json();
}

export async function saveProductToDb(product: Product): Promise<void> {
  await apiFetch('/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  });
}

export async function saveProductsBatchToDb(products: Product[]): Promise<void> {
  await apiFetch('/products/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(products)
  });
}

export async function deleteProductFromDb(id: string): Promise<void> {
  await apiFetch(`/products/${id}`, {
    method: 'DELETE'
  });
}

// FORNECEDORES
export async function fetchSuppliersFromDb(): Promise<Supplier[]> {
  const res = await apiFetch('/suppliers');
  return res.json();
}

export async function saveSupplierToDb(supplier: Supplier): Promise<void> {
  await apiFetch('/suppliers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(supplier)
  });
}

export async function deleteSupplierFromDb(id: string): Promise<void> {
  await apiFetch(`/suppliers/${id}`, {
    method: 'DELETE'
  });
}

// PEDIDOS DE COMPRA
export async function fetchOrdersFromDb(): Promise<PurchaseOrder[]> {
  const res = await apiFetch('/orders');
  return res.json();
}

export async function saveOrderToDb(order: PurchaseOrder): Promise<void> {
  await apiFetch('/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order)
  });
}

export async function deleteOrderFromDb(
  orderId: string,
  authPayload?: { directorEmail?: string; directorPassword?: string; reason?: string }
): Promise<any> {
  const res = await apiFetch(`/orders/${orderId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: authPayload ? JSON.stringify(authPayload) : undefined
  });
  return await res.json().catch(() => ({ success: true }));
}

export async function duplicateOrderInDb(orderId: string): Promise<PurchaseOrder> {
  const res = await apiFetch(`/orders/${orderId}/duplicate`, {
    method: 'POST'
  });
  const data = await res.json();
  return data.order;
}

export async function updateInstallmentInDb(
  orderId: string, 
  installment: any
): Promise<void> {
  await apiFetch(`/orders/${orderId}/installment`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(installment)
  });
}

export async function confirmReceiptInDb(
  orderId: string,
  payload: { dataRecebimento: string; recebidoPor?: string; numeroNotaFiscal?: string; autorizarBoletos?: boolean }
): Promise<any> {
  const res = await apiFetch(`/orders/${orderId}/confirm-receipt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function authorizeFinancialInDb(orderId: string): Promise<any> {
  const res = await apiFetch(`/orders/${orderId}/authorize-financial`, {
    method: 'POST'
  });
  return res.json();
}

export async function fetchStoresFromDb(): Promise<StoreConfig[]> {
  const res = await apiFetch('/config/stores');
  return res.json();
}

export async function saveStoresToDb(stores: StoreConfig[]): Promise<StoreConfig[]> {
  const res = await apiFetch('/config/stores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stores)
  });
  return res.json();
}

// MODELOS / PRESETS DE SEPARAÇÃO DE LOJAS (SAVES)
export async function fetchSeparationPresetsFromDb(): Promise<SeparationPreset[]> {
  const res = await apiFetch('/separation-presets');
  return res.json();
}

export async function saveSeparationPresetToDb(preset: SeparationPreset): Promise<SeparationPreset> {
  const res = await apiFetch('/separation-presets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preset)
  });
  return res.json();
}

export async function deleteSeparationPresetFromDb(id: string): Promise<void> {
  await apiFetch(`/separation-presets/${id}`, {
    method: 'DELETE'
  });
}

// MODELOS / PRESETS DE ENGENHARIA FISCAL (SAVES)
export async function fetchFiscalPresetsFromDb(): Promise<FiscalPreset[]> {
  const res = await apiFetch('/fiscal-presets');
  return res.json();
}

export async function saveFiscalPresetToDb(preset: FiscalPreset): Promise<FiscalPreset> {
  const res = await apiFetch('/fiscal-presets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preset)
  });
  return res.json();
}

export async function deleteFiscalPresetFromDb(id: string): Promise<void> {
  await apiFetch(`/fiscal-presets/${id}`, {
    method: 'DELETE'
  });
}

// ESTOQUE DO DEPÓSITO CENTRAL (CD MATRIZ)
export async function fetchStockFromDb(): Promise<CentralStockItem[]> {
  const res = await apiFetch('/stock');
  return res.json();
}

export async function saveStockItemToDb(item: CentralStockItem): Promise<CentralStockItem> {
  const res = await apiFetch('/stock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  });
  return res.json();
}

export async function updateStockBalanceInDb(
  id: string, 
  deltaUnidades: number, 
  localizacaoGalpao?: string
): Promise<CentralStockItem> {
  const res = await apiFetch(`/stock/${id}/balance`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deltaUnidades, localizacaoGalpao })
  });
  return res.json();
}

export async function deleteStockItemFromDb(id: string): Promise<void> {
  await apiFetch(`/stock/${id}`, {
    method: 'DELETE'
  });
}

export async function clearAllStockFromDb(): Promise<void> {
  await apiFetch('/stock/clear/all', {
    method: 'DELETE'
  });
}

export async function fetchFiscalConfigFromDb(): Promise<FiscalConfig> {
  try {
    const res = await apiFetch('/config/fiscal');
    return await res.json();
  } catch {
    return {
      icmsAliquota: 0.11,
      ipiAliquota: 0.00,
      pisCofinsAliquota: 0.03,
      custosFixos: 0.26,
      creditoEntradaICMS: 0.195
    };
  }
}

export async function saveFiscalConfigToDb(config: FiscalConfig): Promise<void> {
  await apiFetch('/config/fiscal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
}

export async function fetchNextOrderNumberFromDb(): Promise<string> {
  try {
    const res = await apiFetch('/orders/next-number');
    const data = await res.json();
    if (data?.nextNumber) return data.nextNumber;
  } catch {}

  try {
    const res = await apiFetch('/orders');
    const orders: PurchaseOrder[] = await res.json();
    if (!orders || orders.length === 0) return 'PED-0001';

    let maxNum = 0;
    orders.forEach(o => {
      const match = (o.header?.numeroPedido || '').match(/(\d+)/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    });

    return `PED-${String(maxNum + 1).padStart(4, '0')}`;
  } catch {
    return getNextOrderNumber();
  }
}

export async function checkOrderNumberInDb(numero: string, excludeId?: string): Promise<{ available: boolean; message: string }> {
  try {
    const query = excludeId ? `?excludeId=${encodeURIComponent(excludeId)}` : '';
    const res = await apiFetch(`/orders/check-numero/${encodeURIComponent(numero)}${query}`);
    return await res.json();
  } catch {
    return { available: true, message: 'Não foi possível validar online' };
  }
}

export async function fetchUsersFromDb(): Promise<User[]> {
  const res = await apiFetch('/users');
  return res.json();
}

export async function saveUserToDb(user: Partial<User> & { senha?: string }): Promise<User> {
  const isUpdate = Boolean(user.id);
  const url = isUpdate ? `/users/${user.id}` : '/users';
  const method = isUpdate ? 'PUT' : 'POST';

  const res = await apiFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  });
  return res.json();
}

export async function deleteUserFromDb(id: string): Promise<void> {
  await apiFetch(`/users/${id}`, {
    method: 'DELETE'
  });
}

export async function saveUserPermissionsInDb(userId: string, permissions: Record<string, boolean>): Promise<User> {
  const res = await apiFetch(`/users/${userId}/permissions`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ permissions })
  });
  return res.json();
}

// Condições de Pagamento
export async function fetchPaymentConditionsFromDb(activeOnly: boolean = false): Promise<PaymentCondition[]> {
  const query = activeOnly ? '?active=true' : '';
  const res = await apiFetch(`/payment-conditions${query}`);
  return res.json();
}

export async function savePaymentConditionToDb(condition: Partial<PaymentCondition>): Promise<PaymentCondition> {
  const res = await apiFetch('/payment-conditions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(condition)
  });
  return res.json();
}

export async function deletePaymentConditionFromDb(id: string): Promise<void> {
  await apiFetch(`/payment-conditions/${id}`, {
    method: 'DELETE'
  });
}

// -------------------------------------------------------------
// GESTÃO FINANCEIRA ERP & CONTAS A PAGAR
// -------------------------------------------------------------

export interface FinancialFilters {
  month?: string;
  year?: string;
  storeId?: string;
  lojaNome?: string;
  categoria?: string;
  status?: string;
  tipo?: string;
  search?: string;
  empresa?: string;
  statusPrevisao?: string;
  formaPagamento?: string;
}

export async function fetchFinancialEntriesFromDb(filters: FinancialFilters = {}): Promise<FinancialEntry[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'all') {
      params.append(k, String(v));
    }
  });
  const queryString = params.toString() ? `?${params.toString()}` : '';
  const res = await apiFetch(`/financial/entries${queryString}`);
  const json = await res.json();
  return json.data || [];
}

export async function fetchFinancialSummaryFromDb(filters: FinancialFilters = {}): Promise<FinancialSummary> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'all') {
      params.append(k, String(v));
    }
  });
  const queryString = params.toString() ? `?${params.toString()}` : '';
  const res = await apiFetch(`/financial/summary${queryString}`);
  const json = await res.json();
  return json.data;
}

export async function saveFinancialEntryToDb(entryData: any): Promise<FinancialEntry | FinancialEntry[]> {
  const isUpdate = Boolean(entryData.id);
  const url = isUpdate ? `/financial/entries/${entryData.id}` : '/financial/entries';
  const method = isUpdate ? 'PUT' : 'POST';

  const res = await apiFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entryData)
  });
  const json = await res.json();
  return json.data;
}

export interface ComprovantePayload {
  id?: string;
  nome: string;
  tipo: string;
  tamanho: number;
  base64: string;
}

export async function payFinancialEntryInDb(
  id: string, 
  paymentData: { 
    dataPagamento?: string; 
    valorPago?: number; 
    observacao?: string;
    comprovante?: ComprovantePayload;
    comprovantes?: ComprovantePayload[];
  }
): Promise<FinancialEntry> {
  const res = await apiFetch(`/financial/entries/${id}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paymentData)
  });
  const json = await res.json();
  return json.data;
}

export async function downloadFinancialComprovanteBlob(id: string, index?: number): Promise<{ blob: Blob; filename: string; mimeType: string }> {
  const query = index !== undefined ? `?index=${index}` : '';
  const res = await apiFetch(`/financial/entries/${id}/comprovante${query}`);
  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    throw new Error(errorJson?.error || 'Erro ao carregar comprovante.');
  }
  const contentDisp = res.headers.get('Content-Disposition') || '';
  let filename = 'comprovante';
  const match = contentDisp.match(/filename="?([^"]+)"?/);
  if (match && match[1]) {
    try {
      filename = decodeURIComponent(match[1]);
    } catch {
      filename = match[1];
    }
  }
  const mimeType = res.headers.get('Content-Type') || 'application/octet-stream';
  const blob = await res.blob();
  return { blob, filename, mimeType };
}

export async function batchPayFinancialEntriesInDb(
  ids: string[],
  paymentData: { dataPagamento?: string; observacao?: string } = {}
): Promise<{ count: number; data: FinancialEntry[]; message: string }> {
  const res = await apiFetch('/financial/entries/batch-pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, ...paymentData })
  });
  const json = await res.json();
  return json;
}

export async function importFinancialSpreadsheetInDb(payload: {
  entries: any[];
  targetYear: string;
  targetMonth: string;
  mode: 'append' | 'replace_month';
}): Promise<{ count: number; totalValor: number; message: string }> {
  const res = await apiFetch('/financial/import-spreadsheet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    throw new Error(errorJson?.error || 'Erro ao importar lote de lançamentos da planilha.');
  }
  const json = await res.json();
  return json.data;
}

export async function deleteFinancialEntryFromDb(id: string, password?: string): Promise<void> {
  await apiFetch(`/financial/entries/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
}

export async function cancelRecurringSeriesInDb(recorrenciaId: string): Promise<void> {
  await apiFetch(`/financial/recurring/${encodeURIComponent(recorrenciaId)}`, {
    method: 'DELETE'
  });
}

export async function syncFinancialOrdersInDb(): Promise<{ createdCount: number; message: string }> {
  const res = await apiFetch('/financial/sync-orders', {
    method: 'POST'
  });
  const json = await res.json();
  return json.data;
}

export async function importFinancialClientSheetInDb(customFilePath?: string): Promise<{ importedCount: number; totalValor: number; message: string }> {
  const res = await apiFetch('/financial/import-sheet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customFilePath })
  });
  const json = await res.json();
  return json.data;
}

export async function restoreDatabaseBackupApi(backupData: any): Promise<{
  success: boolean;
  restoredSuppliersCount: number;
  restoredProductsCount: number;
  restoredOrdersCount: number;
  restoredItemsCount: number;
  restoredConditionsCount: number;
}> {
  const res = await apiFetch('/config/restore-backup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(backupData)
  });
  return res.json();
}

export async function exportDatabaseBackupApi(): Promise<Record<string, string>> {
  const res = await apiFetch('/config/export-backup');
  return res.json();
}

export async function sendOrderToDistributionApi(orderId: string): Promise<{ success: boolean; message: string; order: PurchaseOrder }> {
  const res = await apiFetch(`/orders/${orderId}/send-to-distribution`, {
    method: 'POST'
  });
  return res.json();
}

export async function releaseOrderToSeparationApi(orderId: string, payload: any = {}): Promise<{ success: boolean; message: string; order: PurchaseOrder }> {
  const res = await apiFetch(`/orders/${orderId}/release-to-separation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function sendOrderToFaturamentoApi(orderId: string, payload: any = {}): Promise<{ success: boolean; message: string; order: PurchaseOrder }> {
  const res = await apiFetch(`/orders/${orderId}/send-to-faturamento`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function finalizeOrderPipelineApi(orderId: string): Promise<{ success: boolean; message: string; order: PurchaseOrder }> {
  const res = await apiFetch(`/orders/${orderId}/finalize`, {
    method: 'POST'
  });
  return res.json();
}

export async function rollbackOrderStatusApi(orderId: string, payload: { targetStatus: OrderStatus; reason: string }): Promise<{ success: boolean; message: string; order: PurchaseOrder }> {
  const res = await apiFetch(`/orders/${orderId}/rollback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function fetchDistributionAuditLogs(orderId?: string): Promise<DistributionAuditLog[]> {
  const url = orderId ? `/audit/distribution/${orderId}` : '/audit/distribution';
  const res = await apiFetch(url);
  return res.json();
}

export async function fetchFinancialAuditLogs(params: { entryId?: string; orderId?: string } = {}): Promise<FinancialAuditLog[]> {
  const query = new URLSearchParams();
  if (params.entryId) query.append('entryId', params.entryId);
  if (params.orderId) query.append('orderId', params.orderId);
  const qs = query.toString();
  const url = qs ? `/audit/financial?${qs}` : '/audit/financial';
  const res = await apiFetch(url);
  return res.json();
}
