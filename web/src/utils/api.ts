import { PurchaseOrder, Supplier, FiscalConfig, StoreConfig, Product, User, CentralStockItem } from '../shared/types';
import { API_BASE_URL } from './config';

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
  const res = await fetch(`${API_BASE_URL}/products`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar produtos do SQLite');
  return res.json();
}

export async function saveProductToDb(product: Product): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/products`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(product)
  });
  if (!res.ok) throw new Error('Erro ao salvar produto no SQLite');
}

export async function deleteProductFromDb(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Erro ao remover produto do SQLite');
}

// FORNECEDORES
export async function fetchSuppliersFromDb(): Promise<Supplier[]> {
  const res = await fetch(`${API_BASE_URL}/suppliers`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar fornecedores do SQLite');
  return res.json();
}

export async function saveSupplierToDb(supplier: Supplier): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/suppliers`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(supplier)
  });
  if (!res.ok) throw new Error('Erro ao salvar fornecedor no SQLite');
}

export async function deleteSupplierFromDb(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/suppliers/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Erro ao remover fornecedor do SQLite');
}

// PEDIDOS DE COMPRA
export async function fetchOrdersFromDb(): Promise<PurchaseOrder[]> {
  const res = await fetch(`${API_BASE_URL}/orders`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar pedidos do SQLite');
  return res.json();
}

export async function saveOrderToDb(order: PurchaseOrder): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(order)
  });
  if (!res.ok) throw new Error('Erro ao salvar pedido no SQLite');
}

export async function deleteOrderFromDb(orderId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Erro ao excluir pedido do SQLite');
}

export async function updateInstallmentInDb(
  orderId: string, 
  installment: any
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/orders/${orderId}/installment`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(installment)
  });
  if (!res.ok) throw new Error('Erro ao atualizar parcela no SQLite');
}

export async function fetchStoresFromDb(): Promise<StoreConfig[]> {
  const res = await fetch(`${API_BASE_URL}/config/stores`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar lojas do SQLite');
  return res.json();
}

// ESTOQUE DO DEPÓSITO CENTRAL (CD MATRIZ)
export async function fetchStockFromDb(): Promise<CentralStockItem[]> {
  const res = await fetch(`${API_BASE_URL}/stock`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar estoque central do SQLite');
  return res.json();
}

export async function saveStockItemToDb(item: CentralStockItem): Promise<CentralStockItem> {
  const res = await fetch(`${API_BASE_URL}/stock`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(item)
  });
  if (!res.ok) throw new Error('Erro ao salvar item no estoque central do SQLite');
  return res.json();
}

export async function updateStockBalanceInDb(
  id: string, 
  deltaUnidades: number, 
  localizacaoGalpao?: string
): Promise<CentralStockItem> {
  const res = await fetch(`${API_BASE_URL}/stock/${id}/balance`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ deltaUnidades, localizacaoGalpao })
  });
  if (!res.ok) throw new Error('Erro ao atualizar saldo de estoque central no SQLite');
  return res.json();
}

export async function deleteStockItemFromDb(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/stock/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Erro ao excluir item do estoque central no SQLite');
}

export async function fetchFiscalConfigFromDb(): Promise<FiscalConfig> {
  const res = await fetch(`${API_BASE_URL}/config/fiscal`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    return {
      icmsAliquota: 0.11,
      ipiAliquota: 0.00,
      pisCofinsAliquota: 0.03,
      custosFixos: 0.26,
      creditoEntradaICMS: 0.195
    };
  }
  return res.json();
}

export async function saveFiscalConfigToDb(config: FiscalConfig): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/config/fiscal`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(config)
  });
  if (!res.ok) throw new Error('Erro ao salvar parâmetros fiscais no SQLite');
}

export async function fetchNextOrderNumberFromDb(): Promise<string> {
  try {
    const res = await fetch(`${API_BASE_URL}/orders`, { headers: getAuthHeaders() });
    if (!res.ok) return 'PED-0001';
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
    return 'PED-0001';
  }
}

export async function fetchUsersFromDb(): Promise<User[]> {
  const res = await fetch(`${API_BASE_URL}/users`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar usuários do SQLite');
  return res.json();
}

export async function saveUserToDb(user: Partial<User> & { senha?: string }): Promise<User> {
  const isUpdate = Boolean(user.id);
  const url = isUpdate ? `${API_BASE_URL}/users/${user.id}` : `${API_BASE_URL}/users`;
  const method = isUpdate ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(user)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Erro ao salvar usuário no SQLite');
  }
  return res.json();
}

export async function deleteUserFromDb(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/users/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Erro ao excluir usuário do SQLite');
}


