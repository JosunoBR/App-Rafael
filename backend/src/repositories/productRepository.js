const { queryAll, queryOne, execute } = require('../config/database');

class ProductRepository {
  async findAll() {
    return await queryAll("SELECT * FROM products WHERE ativo = 1 ORDER BY descricao ASC");
  }

  async findById(id) {
    return await queryOne("SELECT * FROM products WHERE id = ?", [id]);
  }

  async findByCodigo(codigo) {
    return await queryOne("SELECT * FROM products WHERE LOWER(codigo) = LOWER(?) OR LOWER(codigoInterno) = LOWER(?)", [codigo, codigo]);
  }

  async findNextAvailableCodigo() {
    const rows = await queryAll("SELECT codigo, codigoInterno FROM products");
    let maxNum = 0;
    rows.forEach(r => {
      const code = r.codigoInterno || r.codigo || '';
      const match = code.match(/(?:PRD|PRE|PROD)-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const nextNum = maxNum > 0 ? maxNum + 1 : (rows.length + 1);
    return `PRD-${String(nextNum).padStart(3, '0')}`;
  }

  async upsert(product) {
    const now = new Date().toISOString();
    const codInterno = (product.codigoInterno || product.codigo || '').trim();
    const codForn = (product.codigoFornecedor || '').trim();
    const codBarras = (product.codigoBarras || product.eanBarcode || '').trim();
    const supplierId = product.supplierId || product.fornecedorPadraoId || '';
    const nomeFornecedor = product.nomeFornecedor || product.fornecedorPadraoNome || '';

    let existing = product.id ? await this.findById(product.id) : null;
    let finalCodInterno = codInterno;

    // 🛡️ Prevenção estrita de duplicidade de código de produto
    if (codInterno) {
      const conflict = await this.findByCodigo(codInterno);
      if (conflict && (!existing || conflict.id !== existing.id)) {
        const nextCod = await this.findNextAvailableCodigo();
        if (product.autoAssignNextOnConflict) {
          finalCodInterno = nextCod;
        } else {
          const err = new Error(`Não é permitido duplicar código de produto! O código "${codInterno}" já pertence ao produto "${conflict.descricao || 'Existente'}" (${conflict.nomeFornecedor || 'Fornecedor'}).`);
          err.statusCode = 409;
          err.code = 'PRODUCT_CODE_CONFLICT';
          err.suggestedNextCode = nextCod;
          err.conflictProduct = {
            id: conflict.id,
            codigo: conflict.codigo,
            descricao: conflict.descricao,
            nomeFornecedor: conflict.nomeFornecedor
          };
          throw err;
        }
      }
    }

    const targetId = existing ? existing.id : (product.id || ('prod_' + Date.now()));

    const incomingQtd = product.qtdPorPacote !== undefined && product.qtdPorPacote !== null && !isNaN(Number(product.qtdPorPacote))
      ? Number(product.qtdPorPacote)
      : (product.qtdNoPacote !== undefined && product.qtdNoPacote !== null && !isNaN(Number(product.qtdNoPacote))
          ? Number(product.qtdNoPacote)
          : (existing ? Number(existing.qtdPorPacote) : 1));
    const finalQtdPorPacote = incomingQtd > 0 ? incomingQtd : 1;

    if (existing) {
      const sql = `
        UPDATE products SET
          codigo = ?, codigoInterno = ?, codigoFornecedor = ?, codigoBarras = ?,
          descricao = ?, categoria = ?, subcategoria = ?,
          supplierId = ?, nomeFornecedor = ?, precoUnitarioPadrao = ?,
          pdvSugerido = ?, qtdPorPacote = ?, fotoUrl = ?, ncm = ?, eanBarcode = ?,
          ativo = ?, updatedAt = ?
        WHERE id = ?
      `;
      await execute(sql, [
        finalCodInterno,
        finalCodInterno,
        codForn,
        codBarras,
        product.descricao,
        product.categoria || existing.categoria || 'Utilidades',
        product.subcategoria || existing.subcategoria || '',
        supplierId || existing.supplierId || '',
        nomeFornecedor || existing.nomeFornecedor || '',
        Number(product.precoUnitarioPadrao) || Number(existing.precoUnitarioPadrao) || 0,
        Number(product.pdvSugerido) || Number(existing.pdvSugerido) || 0,
        finalQtdPorPacote,
        product.fotoUrl !== undefined ? product.fotoUrl : (existing.fotoUrl || ''),
        product.ncm || existing.ncm || '',
        codBarras || existing.codigoBarras || '',
        product.ativo !== undefined ? (product.ativo ? 1 : 0) : 1,
        now,
        targetId
      ]);
    } else {
      const sql = `
        INSERT INTO products (
          id, codigo, codigoInterno, codigoFornecedor, codigoBarras,
          descricao, categoria, subcategoria, supplierId,
          nomeFornecedor, precoUnitarioPadrao, pdvSugerido, qtdPorPacote,
          fotoUrl, ncm, eanBarcode, ativo, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await execute(sql, [
        targetId,
        finalCodInterno,
        finalCodInterno,
        codForn,
        codBarras,
        product.descricao,
        product.categoria || 'Utilidades',
        product.subcategoria || '',
        supplierId,
        nomeFornecedor,
        Number(product.precoUnitarioPadrao) || 0,
        Number(product.pdvSugerido) || 0,
        finalQtdPorPacote,
        product.fotoUrl || '',
        product.ncm || '',
        codBarras,
        product.ativo !== undefined ? (product.ativo ? 1 : 0) : 1,
        product.createdAt || now,
        now
      ]);
    }

    return await this.findById(targetId);
  }

  async delete(id) {
    await execute("DELETE FROM products WHERE id = ?", [id]);
    return true;
  }

  async deleteBySupplierId(supplierId, razaoSocial) {
    if (razaoSocial) {
      await execute("DELETE FROM products WHERE supplierId = ? OR nomeFornecedor = ?", [supplierId, razaoSocial]);
    } else {
      await execute("DELETE FROM products WHERE supplierId = ?", [supplierId]);
    }
    return true;
  }
}

module.exports = new ProductRepository();
