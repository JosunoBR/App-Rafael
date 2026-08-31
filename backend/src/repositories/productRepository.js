const { queryAll, queryOne, execute } = require('../config/database');

class ProductRepository {
  async findAll() {
    return await queryAll("SELECT * FROM products WHERE ativo = 1 ORDER BY descricao ASC");
  }

  async findById(id) {
    return await queryOne("SELECT * FROM products WHERE id = ?", [id]);
  }

  async findByCodigo(codigo) {
    return await queryOne("SELECT * FROM products WHERE codigo = ?", [codigo]);
  }

  async upsert(product) {
    const existing = await this.findById(product.id);
    const now = new Date().toISOString();
    const codInterno = product.codigoInterno || product.codigo;
    const codForn = product.codigoFornecedor || '';
    const codBarras = product.codigoBarras || product.eanBarcode || '';
    const supplierId = product.supplierId || product.fornecedorPadraoId || '';
    const nomeFornecedor = product.nomeFornecedor || product.fornecedorPadraoNome || '';

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
        codInterno,
        codInterno,
        codForn,
        codBarras,
        product.descricao,
        product.categoria || 'Utilidades',
        product.subcategoria || '',
        supplierId,
        nomeFornecedor,
        Number(product.precoUnitarioPadrao) || 0,
        Number(product.pdvSugerido) || 12.0,
        Number(product.qtdPorPacote) || 12,
        product.fotoUrl || '',
        product.ncm || '',
        codBarras,
        product.ativo !== undefined ? (product.ativo ? 1 : 0) : 1,
        now,
        product.id
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
        product.id,
        codInterno,
        codInterno,
        codForn,
        codBarras,
        product.descricao,
        product.categoria || 'Utilidades',
        product.subcategoria || '',
        supplierId,
        nomeFornecedor,
        Number(product.precoUnitarioPadrao) || 0,
        Number(product.pdvSugerido) || 12.0,
        Number(product.qtdPorPacote) || 12,
        product.fotoUrl || '',
        product.ncm || '',
        codBarras,
        product.ativo !== undefined ? (product.ativo ? 1 : 0) : 1,
        product.createdAt || now,
        now
      ]);
    }

    return await this.findById(product.id);
  }

  async delete(id) {
    await execute("DELETE FROM products WHERE id = ?", [id]);
    return true;
  }
}

module.exports = new ProductRepository();
