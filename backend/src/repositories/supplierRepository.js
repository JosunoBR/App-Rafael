const { queryAll, queryOne, execute } = require('../config/database');

class SupplierRepository {
  async findAll() {
    return await queryAll("SELECT * FROM suppliers ORDER BY razaoSocial ASC");
  }

  async findById(id) {
    return await queryOne("SELECT * FROM suppliers WHERE id = ?", [id]);
  }

  async findByCnpj(cnpj) {
    if (!cnpj) return null;
    return await queryOne("SELECT * FROM suppliers WHERE cnpj = ?", [cnpj]);
  }

  async upsert(supplier) {
    const existing = await this.findById(supplier.id);
    const now = new Date().toISOString();

    const pedidoPadraoJson = typeof supplier.pedidoPadraoJson === 'string' 
      ? supplier.pedidoPadraoJson 
      : (supplier.pedidoPadrao ? JSON.stringify(supplier.pedidoPadrao) : (existing?.pedidoPadraoJson || null));

    if (existing) {
      const sql = `
        UPDATE suppliers SET
          razaoSocial = ?, nomeFantasia = ?, cnpj = ?, vendedorPadrao = ?,
          contatoVendedor = ?, condicaoPagamentoPadrao = ?, aliquotaStPadrao = ?,
          aliquotaIpiPadrao = ?, descontoOffPadrao = ?, percentualNotaPadrao = ?,
          observacoesDescarga = ?, pedidoPadraoJson = ?, updatedAt = ?
        WHERE id = ?
      `;
      await execute(sql, [
        supplier.razaoSocial,
        supplier.nomeFantasia || '',
        supplier.cnpj || '',
        supplier.vendedorPadrao || '',
        supplier.contatoVendedor || '',
        supplier.condicaoPagamentoPadrao || '30/60/90 Dias',
        Number(supplier.aliquotaStPadrao) || 0,
        Number(supplier.aliquotaIpiPadrao) || 0,
        Number(supplier.descontoOffPadrao) || 0,
        Number(supplier.percentualNotaPadrao) || 100,
        supplier.observacoesDescarga || '',
        pedidoPadraoJson,
        now,
        supplier.id
      ]);
    } else {
      const sql = `
        INSERT INTO suppliers (
          id, razaoSocial, nomeFantasia, cnpj, vendedorPadrao, contatoVendedor,
          condicaoPagamentoPadrao, aliquotaStPadrao, aliquotaIpiPadrao,
          descontoOffPadrao, percentualNotaPadrao, observacoesDescarga,
          pedidoPadraoJson, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await execute(sql, [
        supplier.id,
        supplier.razaoSocial,
        supplier.nomeFantasia || '',
        supplier.cnpj || '',
        supplier.vendedorPadrao || '',
        supplier.contatoVendedor || '',
        supplier.condicaoPagamentoPadrao || '30/60/90 Dias',
        Number(supplier.aliquotaStPadrao) || 0,
        Number(supplier.aliquotaIpiPadrao) || 0,
        Number(supplier.descontoOffPadrao) || 0,
        Number(supplier.percentualNotaPadrao) || 100,
        supplier.observacoesDescarga || '',
        pedidoPadraoJson,
        supplier.createdAt || now,
        now
      ]);
    }

    return await this.findById(supplier.id);
  }

  async delete(id) {
    await execute("DELETE FROM suppliers WHERE id = ?", [id]);
    return true;
  }
}

module.exports = new SupplierRepository();
