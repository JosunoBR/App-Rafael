const fs = require('fs');
const path = require('path');
const productRepository = require('../repositories/productRepository');
const supplierRepository = require('../repositories/supplierRepository');

const productImagesDir = path.resolve(__dirname, '../../data/produtos');

function ensureProductImagesDir() {
  if (!fs.existsSync(productImagesDir)) {
    fs.mkdirSync(productImagesDir, { recursive: true });
  }
}

function saveBase64ImageToDisk(base64Str, productId) {
  if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image/')) {
    return base64Str;
  }
  const match = base64Str.match(/^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,(.*)$/i);
  if (!match) return base64Str;

  ensureProductImagesDir();
  let ext = match[1].toLowerCase();
  if (ext === 'jpeg') ext = 'jpg';
  if (ext === 'svg+xml') ext = 'svg';

  const buffer = Buffer.from(match[2], 'base64');
  const safeId = String(productId || 'prod').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `prod_${safeId}_${Date.now()}.${ext}`;
  const targetPath = path.join(productImagesDir, filename);

  fs.writeFileSync(targetPath, buffer);
  return `/api/products/images/${filename}`;
}

function removeDiskImageIfLocal(fotoUrl) {
  if (!fotoUrl || typeof fotoUrl !== 'string' || !fotoUrl.startsWith('/api/products/images/')) {
    return;
  }
  const filename = path.basename(fotoUrl);
  if (!filename || !/^[a-zA-Z0-9_\-\.]+\.(webp|png|jpe?g|gif|svg)$/i.test(filename)) {
    return;
  }
  const targetPath = path.join(productImagesDir, filename);
  if (fs.existsSync(targetPath)) {
    try {
      fs.unlinkSync(targetPath);
    } catch (e) {
      console.warn(`[ProductService] Não foi possível remover foto antiga ${filename}:`, e.message);
    }
  }
}

class ProductService {
  async listProducts() {
    return await productRepository.findAll();
  }

  async getProduct(id) {
    const product = await productRepository.findById(id);
    if (!product) {
      const err = new Error('Produto não encontrado.');
      err.statusCode = 404;
      throw err;
    }
    return product;
  }

  async saveProduct(productData) {
    const rawCod = (productData?.codigoInterno || productData?.codigo || '').trim();
    if (!productData || !rawCod || !productData.descricao?.trim()) {
      const err = new Error('Código e descrição do produto são obrigatórios.');
      err.statusCode = 400;
      throw err;
    }

    const cleanCod = rawCod.toUpperCase();
    let supplierId = (productData.supplierId || productData.fornecedorPadraoId || '').trim();
    let nomeFornecedor = (productData.nomeFornecedor || productData.fornecedorPadraoNome || '').trim();

    // REGRA DE NEGÓCIO CRÍTICA: Nenhum produto pode ficar sem fornecedor
    if (!supplierId || !nomeFornecedor) {
      if (supplierId) {
        const sup = await supplierRepository.findById(supplierId);
        if (sup) {
          nomeFornecedor = sup.razaoSocial || sup.nomeFantasia || '';
        }
      }
      if (!supplierId) {
        const sups = await supplierRepository.findAll();
        if (sups.length > 0) {
          supplierId = sups[0].id;
          nomeFornecedor = sups[0].razaoSocial || sups[0].nomeFantasia || '';
        }
      }
    }

    const existing = productData.id ? await productRepository.findById(productData.id).catch(() => null) : null;
    let finalFotoUrl = productData.fotoUrl !== undefined ? productData.fotoUrl : (existing?.fotoUrl || '');

    // Se a foto recebida for Base64, salva fisicamente no disco e persiste apenas a URL
    if (finalFotoUrl && finalFotoUrl.startsWith('data:image/')) {
      const targetId = productData.id || cleanCod;
      const newUrl = saveBase64ImageToDisk(finalFotoUrl, targetId);
      if (existing?.fotoUrl && existing.fotoUrl !== newUrl) {
        removeDiskImageIfLocal(existing.fotoUrl);
      }
      finalFotoUrl = newUrl;
    } else if (existing?.fotoUrl && !finalFotoUrl) {
      // Se a foto foi removida pelo usuário, limpa o arquivo do disco
      removeDiskImageIfLocal(existing.fotoUrl);
    }

    const payload = {
      ...productData,
      id: productData.id || ('prod_' + Date.now()),
      codigo: cleanCod,
      codigoInterno: cleanCod,
      descricao: productData.descricao.trim(),
      fotoUrl: finalFotoUrl,
      supplierId,
      nomeFornecedor
    };

    const saved = await productRepository.upsert(payload);
    return {
      success: true,
      message: `Produto "${saved.descricao}" salvo com sucesso!`,
      product: saved
    };
  }

  async deleteProduct(id) {
    const existing = await this.getProduct(id);
    if (existing?.fotoUrl) {
      removeDiskImageIfLocal(existing.fotoUrl);
    }
    await productRepository.delete(id);
    return { success: true, message: 'Produto removido com sucesso.' };
  }

  async saveBatchProducts(productsList) {
    if (!Array.isArray(productsList) || productsList.length === 0) {
      return { success: true, count: 0, products: [] };
    }

    const allSups = await supplierRepository.findAll();
    const defaultSup = allSups.length > 0 ? allSups[0] : null;

    const savedList = [];
    for (const prod of productsList) {
      if (!prod || !prod.descricao || prod.descricao.trim().length === 0) continue;
      const cod = (prod.codigoInterno || prod.codigo || '').trim().toUpperCase();
      if (!cod) continue;

      let supplierId = (prod.supplierId || prod.fornecedorPadraoId || '').trim();
      let nomeFornecedor = (prod.nomeFornecedor || prod.fornecedorPadraoNome || '').trim();

      // Garantir fornecedor vinculado
      if (!supplierId && defaultSup) {
        supplierId = defaultSup.id;
        nomeFornecedor = defaultSup.razaoSocial || defaultSup.nomeFantasia || '';
      } else if (supplierId && !nomeFornecedor) {
        const matched = allSups.find(s => s.id === supplierId);
        if (matched) {
          nomeFornecedor = matched.razaoSocial || matched.nomeFantasia || '';
        }
      }

      let prodFotoUrl = prod.fotoUrl !== undefined ? prod.fotoUrl : '';
      if (prodFotoUrl && typeof prodFotoUrl === 'string' && prodFotoUrl.startsWith('data:image/')) {
        prodFotoUrl = saveBase64ImageToDisk(prodFotoUrl, cod);
      }

      const payload = {
        ...prod,
        id: prod.id || ('prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
        codigo: cod,
        codigoInterno: cod,
        descricao: prod.descricao.trim(),
        fotoUrl: prodFotoUrl,
        supplierId,
        nomeFornecedor
      };

      try {
        const saved = await productRepository.upsert(payload);
        if (saved) savedList.push(saved);
      } catch (err) {
        console.error('Erro ao salvar produto em lote:', err.message);
      }
    }
    return { success: true, count: savedList.length, products: savedList };
  }

  async syncCatalog() {
    return await productRepository.findAll();
  }
}

module.exports = new ProductService();
