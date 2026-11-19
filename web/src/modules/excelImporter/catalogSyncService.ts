import { Product, Supplier } from '../../shared/types';
import { ExcelImportRawItem, CatalogProductStatus } from './types';

/**
 * Normaliza texto para comparação fonética/limpa de descrições.
 */
function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Analisa os itens importados da planilha contra o catálogo atual de produtos.
 * Garante que tanto produtos novos quanto existentes sejam devidamente vinculados ao fornecedor.
 */
export function analyzeCatalogProducts(
  rawItems: ExcelImportRawItem[],
  existingCatalog: Product[],
  supplier: Supplier
): {
  statusList: CatalogProductStatus[];
  newProducts: Product[];
  existingToUpdate: Product[];
  allOrderProducts: Product[];
  existingCount: number;
  newCount: number;
} {
  const existingCodes = new Set(existingCatalog.map(p => (p.codigo || '').toUpperCase().trim()).filter(Boolean));

  const statusList: CatalogProductStatus[] = [];
  const newProducts: Product[] = [];
  const existingToUpdateById = new Map<string, Product>();
  const batchProductBySupplierKey = new Map<string, Product>();

  // Encontrar maior sequencial numérico caso precise gerar código
  let maxSeq = 100;
  existingCatalog.forEach(p => {
    const match = (p.codigo || '').match(/^(?:PRD|PRE|PROD)[-_ ]?(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq && num < 999999) {
        maxSeq = num;
      }
    }
  });

  const supplierName = supplier.razaoSocial || supplier.nomeFantasia || '';
  const normalizedSupplierName = normalizeText(supplierName);
  const belongsToSupplier = (product: Product): boolean => {
    if (supplier.id && product.supplierId) return product.supplierId === supplier.id;
    return Boolean(normalizedSupplierName && normalizeText(product.nomeFornecedor || '') === normalizedSupplierName);
  };

  const buildSupplierKeys = (rawItem: ExcelImportRawItem): string[] => {
    const keys: string[] = [];
    const supplierCode = (rawItem.codigoFornecedor || rawItem.codigo || '').toUpperCase().trim();
    const ean = (rawItem.eanBarcode || '').trim();
    const description = normalizeText(rawItem.descricao);
    if (supplierCode) keys.push(`code:${supplierCode}`);
    if (ean) keys.push(`ean:${ean}`);
    if (description) keys.push(`desc:${description}`);
    return keys;
  };

  for (const rawItem of rawItems) {
    const rawCod = (rawItem.codigo || '').toUpperCase().trim();
    const rawFornecCod = (rawItem.codigoFornecedor || '').toUpperCase().trim();
    const rawInternoCod = (rawItem.codigoInterno || '').toUpperCase().trim();
    const rawEan = (rawItem.eanBarcode || '').trim();
    const normDesc = normalizeText(rawItem.descricao);
    const supplierKeys = buildSupplierKeys(rawItem);

    // 1. Tentar encontrar produto correspondente no catálogo
    let matchedProduct: Product | undefined;
    let matchedByGlobalInternalCode = false;

    // Código interno é o único identificador permitido para associação global.
    // Código do fornecedor, EAN e descrição só podem associar produtos do mesmo fornecedor.
    if (rawInternoCod) {
      matchedProduct = existingCatalog.find(p => {
        const pCod = p.codigo?.toUpperCase().trim();
        const pInterno = p.codigoInterno?.toUpperCase().trim();
        return pInterno === rawInternoCod || pCod === rawInternoCod;
      });
      matchedByGlobalInternalCode = Boolean(matchedProduct);
    }

    if (!matchedProduct) matchedProduct = existingCatalog.find(p => {
      if (!belongsToSupplier(p)) return false;
      const pCod = p.codigo?.toUpperCase().trim();
      const pFornec = p.codigoFornecedor?.toUpperCase().trim();
      if (rawFornecCod && (pFornec === rawFornecCod || pCod === rawFornecCod)) {
        return true;
      }
      if (rawCod && (pFornec === rawCod || (!rawFornecCod && pCod === rawCod))) {
        return true;
      }
      if (rawEan && (p.eanBarcode?.trim() === rawEan || p.codigoBarras?.trim() === rawEan)) {
        return true;
      }
      return false;
    });

    if (!matchedProduct && normDesc) {
      matchedProduct = existingCatalog.find(p => belongsToSupplier(p) && normalizeText(p.descricao || '') === normDesc);
    }

    if (!matchedProduct) {
      matchedProduct = supplierKeys.map(key => batchProductBySupplierKey.get(key)).find(Boolean);
    }

    if (matchedProduct) {
      if (matchedByGlobalInternalCode && !belongsToSupplier(matchedProduct)) {
        // O código interno é global e identifica o produto, mas não autoriza
        // transferir seu cadastro para outro fornecedor nem sobrescrever a referência dele.
        statusList.push({
          rawItem,
          status: 'existing',
          existingProduct: matchedProduct,
          assignedCode: matchedProduct.codigo || rawInternoCod
        });
        continue;
      }

      // Produto já existente do mesmo fornecedor (ou criado anteriormente neste lote).
      const updatedProduct: Product = {
        ...matchedProduct,
        supplierId: matchedProduct.supplierId || supplier.id,
        nomeFornecedor: matchedProduct.nomeFornecedor || supplierName,
        codigoFornecedor: rawItem.codigoFornecedor || rawItem.codigo || matchedProduct.codigoFornecedor,
        codigoBarras: rawItem.eanBarcode || matchedProduct.codigoBarras || matchedProduct.eanBarcode,
        eanBarcode: rawItem.eanBarcode || matchedProduct.eanBarcode || matchedProduct.codigoBarras,
        precoUnitarioPadrao: rawItem.precoUnitario > 0 ? rawItem.precoUnitario : matchedProduct.precoUnitarioPadrao,
        pdvSugerido: (rawItem.pdvSugerido && rawItem.pdvSugerido > 0)
          ? rawItem.pdvSugerido
          : (matchedProduct.pdvSugerido && matchedProduct.pdvSugerido > 0 ? matchedProduct.pdvSugerido : 12.0),
        qtdPorPacote: (rawItem.qtdNoPacote && rawItem.qtdNoPacote > 0) ? rawItem.qtdNoPacote : (matchedProduct.qtdPorPacote || 1),
        ncm: rawItem.ncm || matchedProduct.ncm,
        updatedAt: new Date().toISOString()
      };

      const existsInCatalog = existingCatalog.some(product => product.id === matchedProduct?.id);
      if (existsInCatalog) {
        existingToUpdateById.set(updatedProduct.id, updatedProduct);
      } else {
        const newIndex = newProducts.findIndex(product => product.id === updatedProduct.id);
        if (newIndex >= 0) newProducts[newIndex] = updatedProduct;
      }
      supplierKeys.forEach(key => batchProductBySupplierKey.set(key, updatedProduct));

      statusList.push({
        rawItem,
        status: existsInCatalog ? 'existing' : 'new',
        existingProduct: updatedProduct,
        assignedCode: matchedProduct.codigo || rawCod
      });
    } else {
      // Produto NOVO - precisa ser cadastrado com código único
      let assignedCode = rawItem.codigoInterno || '';
      if (!assignedCode || existingCodes.has(assignedCode.toUpperCase())) {
        maxSeq++;
        assignedCode = `PRD-${String(maxSeq).padStart(4, '0')}`;
      }
      existingCodes.add(assignedCode.toUpperCase());

      const now = new Date().toISOString();
      const newProduct: Product = {
        id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        codigo: assignedCode,
        codigoInterno: assignedCode,
        codigoFornecedor: rawItem.codigoFornecedor || rawItem.codigo || undefined,
        codigoBarras: rawItem.eanBarcode || undefined,
        descricao: rawItem.descricao,
        categoria: 'Bazar / Utilidades',
        supplierId: supplier.id,
        nomeFornecedor: supplierName,
        precoUnitarioPadrao: rawItem.precoUnitario,
        pdvSugerido: (rawItem.pdvSugerido && rawItem.pdvSugerido > 0) ? rawItem.pdvSugerido : 12.0,
        qtdPorPacote: rawItem.qtdNoPacote || 1,
        ncm: rawItem.ncm || undefined,
        eanBarcode: rawItem.eanBarcode || undefined,
        ativo: true,
        createdAt: now,
        updatedAt: now
      };

      newProducts.push(newProduct);
      supplierKeys.forEach(key => batchProductBySupplierKey.set(key, newProduct));

      statusList.push({
        rawItem,
        status: 'new',
        existingProduct: newProduct,
        assignedCode
      });
    }
  }

  const existingCount = statusList.filter(s => s.status === 'existing').length;
  const newCount = newProducts.length;
  const existingToUpdate = Array.from(existingToUpdateById.values());
  const allOrderProducts = [...newProducts, ...existingToUpdate];

  return {
    statusList,
    newProducts,
    existingToUpdate,
    allOrderProducts,
    existingCount,
    newCount
  };
}

export function mergeCatalogProducts(currentCatalog: Product[], productsToSave: Product[]): Product[] {
  const updatedCatalog = [...currentCatalog];
  productsToSave.forEach(savedP => {
    const idx = updatedCatalog.findIndex(p => 
      p.id === savedP.id || 
      (p.codigo && savedP.codigo && p.codigo.trim().toUpperCase() === savedP.codigo.trim().toUpperCase()) ||
      (p.supplierId === savedP.supplierId && p.codigoFornecedor && savedP.codigoFornecedor &&
        p.codigoFornecedor.trim().toUpperCase() === savedP.codigoFornecedor.trim().toUpperCase())
    );
    if (idx >= 0) {
      updatedCatalog[idx] = {
        ...updatedCatalog[idx],
        ...savedP
      };
    } else {
      updatedCatalog.push(savedP);
    }
  });

  return updatedCatalog;
}
