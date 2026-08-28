const { queryAll, queryOne, execute } = require('../config/database');

class OrderRepository {
  async findAll() {
    const rows = await queryAll("SELECT * FROM purchase_orders ORDER BY createdAt DESC");
    return rows.map(r => this._mapRowToOrder(r));
  }

  async findById(id) {
    const row = await queryOne("SELECT * FROM purchase_orders WHERE id = ?", [id]);
    return row ? this._mapRowToOrder(row) : null;
  }

  async findByNumero(numeroPedido) {
    const row = await queryOne("SELECT * FROM purchase_orders WHERE numeroPedido = ?", [numeroPedido]);
    return row ? this._mapRowToOrder(row) : null;
  }

  async save(order) {
    const existing = await queryOne("SELECT id FROM purchase_orders WHERE id = ?", [order.header.id]);
    const now = new Date().toISOString();

    const itemsJson = JSON.stringify(order.items || []);
    const installmentsJson = order.installments ? JSON.stringify(order.installments) : null;
    const separationJson = order.separationDistribution ? JSON.stringify(order.separationDistribution) : null;

    let totalLiquido = 0;
    let totalPecas = 0;
    (order.items || []).forEach(item => {
      totalLiquido += (Number(item.custoLiquidoTotalComDesconto || item.custoLiquidoTotal || 0));
      totalPecas += (Number(item.qtdTotalUnidades || 0));
    });

    if (existing) {
      const sql = `
        UPDATE purchase_orders SET
          numeroPedido = ?, fornecedor = ?, supplierId = ?, aliquotaSt = ?,
          vendedor = ?, contatoVendedor = ?, condicaoPagamento = ?, dataEmissao = ?,
          dataEntregaPrevista = ?, percentualDescontoOff = ?, percentualNota = ?,
          observacoes = ?, status = ?, separationStatus = ?, totalLiquido = ?,
          totalPecas = ?, installmentsJson = ?, itemsJson = ?,
          separationDistributionJson = ?, updatedAt = ?
        WHERE id = ?
      `;
      await execute(sql, [
        order.header.numeroPedido,
        order.header.fornecedor,
        order.header.supplierId || null,
        Number(order.header.aliquotaSt) || 0,
        order.header.vendedor || '',
        order.header.contatoVendedor || '',
        order.header.condicaoPagamento || '30/60/90 Dias',
        order.header.dataEmissao || '',
        order.header.dataEntregaPrevista || '',
        Number(order.header.percentualDescontoOff) || 0,
        order.header.percentualNota !== undefined ? Number(order.header.percentualNota) : 100,
        order.header.observacoes || '',
        order.header.status || 'Em Cotação',
        order.header.separationStatus || 'Pendente',
        totalLiquido,
        totalPecas,
        installmentsJson,
        itemsJson,
        separationJson,
        now,
        order.header.id
      ]);
    } else {
      const sql = `
        INSERT INTO purchase_orders (
          id, numeroPedido, fornecedor, supplierId, aliquotaSt, vendedor,
          contatoVendedor, condicaoPagamento, dataEmissao, dataEntregaPrevista,
          percentualDescontoOff, percentualNota, observacoes, status,
          separationStatus, totalLiquido, totalPecas, installmentsJson,
          itemsJson, separationDistributionJson, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await execute(sql, [
        order.header.id,
        order.header.numeroPedido,
        order.header.fornecedor,
        order.header.supplierId || null,
        Number(order.header.aliquotaSt) || 0,
        order.header.vendedor || '',
        order.header.contatoVendedor || '',
        order.header.condicaoPagamento || '30/60/90 Dias',
        order.header.dataEmissao || '',
        order.header.dataEntregaPrevista || '',
        Number(order.header.percentualDescontoOff) || 0,
        order.header.percentualNota !== undefined ? Number(order.header.percentualNota) : 100,
        order.header.observacoes || '',
        order.header.status || 'Em Cotação',
        order.header.separationStatus || 'Pendente',
        totalLiquido,
        totalPecas,
        installmentsJson,
        itemsJson,
        separationJson,
        order.header.createdAt || now,
        now
      ]);
    }

    return await this.findById(order.header.id);
  }

  async updateInstallments(orderId, installments) {
    const sql = `UPDATE purchase_orders SET installmentsJson = ?, updatedAt = ? WHERE id = ?`;
    await execute(sql, [JSON.stringify(installments), new Date().toISOString(), orderId]);
    return await this.findById(orderId);
  }

  async delete(id) {
    await execute("DELETE FROM purchase_orders WHERE id = ?", [id]);
    return true;
  }

  _mapRowToOrder(r) {
    let items = [];
    let installments = [];
    let separationDistribution = null;

    try { items = JSON.parse(r.itemsJson || '[]'); } catch {}
    try { installments = JSON.parse(r.installmentsJson || '[]'); } catch {}
    try { separationDistribution = r.separationDistributionJson ? JSON.parse(r.separationDistributionJson) : null; } catch {}

    return {
      header: {
        id: r.id,
        numeroPedido: r.numeroPedido,
        fornecedor: r.fornecedor,
        supplierId: r.supplierId,
        aliquotaSt: r.aliquotaSt,
        vendedor: r.vendedor,
        contatoVendedor: r.contatoVendedor,
        condicaoPagamento: r.condicaoPagamento,
        dataEmissao: r.dataEmissao,
        dataEntregaPrevista: r.dataEntregaPrevista,
        percentualDescontoOff: r.percentualDescontoOff,
        percentualNota: r.percentualNota !== undefined ? r.percentualNota : 100,
        observacoes: r.observacoes,
        status: r.status,
        separationStatus: r.separationStatus,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      },
      items,
      installments,
      separationDistribution,
      totalLiquido: r.totalLiquido || 0,
      totalPecas: r.totalPecas || 0
    };
  }
}

module.exports = new OrderRepository();
