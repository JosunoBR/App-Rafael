const { queryAll, queryOne, execute } = require('../config/database');

class StockRepository {
  async findAll() {
    return await queryAll("SELECT * FROM central_stock ORDER BY descricao ASC");
  }

  async findById(id) {
    return await queryOne("SELECT * FROM central_stock WHERE id = ?", [id]);
  }

  async findByProductId(productId) {
    return await queryOne("SELECT * FROM central_stock WHERE productId = ?", [productId]);
  }

  async save(item) {
    const existing = await queryOne("SELECT id FROM central_stock WHERE id = ?", [item.id]);
    const now = new Date().toISOString();

    if (existing) {
      const sql = `
        UPDATE central_stock SET
          productId = ?, codigoInterno = ?, codigoFornecedor = ?, codigoBarras = ?,
          codigo = ?, descricao = ?, categoria = ?, fotoUrl = ?, saldoUnidades = ?,
          precoUnitario = ?, pdvSugerido = ?, localizacaoGalpao = ?, fornecedorOrigem = ?,
          dataUltimaEntrada = ?, updatedAt = ?
        WHERE id = ?
      `;
      await execute(sql, [
        item.productId || null,
        item.codigoInterno || item.codigo || '',
        item.codigoFornecedor || '',
        item.codigoBarras || item.eanBarcode || '',
        item.codigo || item.codigoInterno || '',
        item.descricao || '',
        item.categoria || 'Geral',
        item.fotoUrl || '',
        Number(item.saldoUnidades) || 0,
        Number(item.precoUnitario) || 0,
        Number(item.pdvSugerido) || 12.0,
        item.localizacaoGalpao || '',
        item.fornecedorOrigem || '',
        item.dataUltimaEntrada || now,
        now,
        item.id
      ]);
    } else {
      const sql = `
        INSERT INTO central_stock (
          id, productId, codigoInterno, codigoFornecedor, codigoBarras, codigo,
          descricao, categoria, fotoUrl, saldoUnidades, precoUnitario, pdvSugerido,
          localizacaoGalpao, fornecedorOrigem, dataUltimaEntrada, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await execute(sql, [
        item.id,
        item.productId || null,
        item.codigoInterno || item.codigo || '',
        item.codigoFornecedor || '',
        item.codigoBarras || item.eanBarcode || '',
        item.codigo || item.codigoInterno || '',
        item.descricao || '',
        item.categoria || 'Geral',
        item.fotoUrl || '',
        Number(item.saldoUnidades) || 0,
        Number(item.precoUnitario) || 0,
        Number(item.pdvSugerido) || 12.0,
        item.localizacaoGalpao || '',
        item.fornecedorOrigem || '',
        item.dataUltimaEntrada || now,
        item.createdAt || now,
        now
      ]);
    }

    return await this.findById(item.id);
  }

  async updateBalance(id, deltaUnidades, newLocation) {
    const item = await this.findById(id);
    if (!item) throw new Error('Item de estoque não encontrado.');

    const newSaldo = Math.max(0, (Number(item.saldoUnidades) || 0) + Number(deltaUnidades));
    const now = new Date().toISOString();

    if (newLocation) {
      await execute(
        "UPDATE central_stock SET saldoUnidades = ?, localizacaoGalpao = ?, updatedAt = ? WHERE id = ?",
        [newSaldo, newLocation, now, id]
      );
    } else {
      await execute(
        "UPDATE central_stock SET saldoUnidades = ?, updatedAt = ? WHERE id = ?",
        [newSaldo, now, id]
      );
    }

    return await this.findById(id);
  }

  async delete(id) {
    await execute("DELETE FROM central_stock WHERE id = ?", [id]);
    return true;
  }
}

module.exports = new StockRepository();
