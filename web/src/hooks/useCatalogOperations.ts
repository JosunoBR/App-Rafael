import { Supplier, Product, CentralStockItem } from '../shared/types';
import { 
  saveSupplierToDb, 
  fetchSuppliersFromDb, 
  deleteSupplierFromDb, 
  saveProductToDb, 
  fetchProductsFromDb, 
  deleteProductFromDb, 
  updateStockBalanceInDb, 
  fetchStockFromDb, 
  saveStockItemToDb 
} from '../utils/api';
import { 
  saveSupplier, 
  getSuppliersList, 
  deleteSupplier, 
  saveProduct, 
  getProductsList, 
  deleteProduct, 
  saveCentralStock, 
  updateStockBalance, 
  loadCentralStock 
} from '../utils/storage';

interface UseCatalogOperationsParams {
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setCentralStock: React.Dispatch<React.SetStateAction<CentralStockItem[]>>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function useCatalogOperations({
  setSuppliers,
  setProducts,
  setCentralStock,
  showToast
}: UseCatalogOperationsParams) {

  // Fornecedores
  const handleSaveSupplier = async (sup: Supplier) => {
    try {
      await saveSupplierToDb(sup);
      const updated = await fetchSuppliersFromDb();
      setSuppliers(updated);
      showToast(`Fornecedor "${sup.razaoSocial}" salvo no SQLite.`);
    } catch (_err) {
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
    } catch (_err) {
      deleteSupplier(id);
      setSuppliers(getSuppliersList());
      showToast('Fornecedor removido.', 'info');
    }
  };

  // Produtos
  const handleSaveProduct = async (productToSave: Product) => {
    try {
      await saveProductToDb(productToSave);
      const updated = await fetchProductsFromDb();
      setProducts(updated);
      saveProduct(productToSave);
      showToast(`Produto "${productToSave.descricao}" salvo com foto no SQLite!`);
    } catch (_err) {
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
    } catch (_err) {
      deleteProduct(id);
      setProducts(getProductsList());
      showToast('Produto removido.', 'info');
    }
  };

  // Estoque Central CD
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

  return {
    handleSaveSupplier,
    handleDeleteSupplier,
    handleSaveProduct,
    handleDeleteProduct,
    handleUpdateStockBalance,
    handleSaveNewStockItem
  };
}
