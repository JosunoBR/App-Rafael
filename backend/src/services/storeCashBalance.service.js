// Internal SQL identifiers only; dates and other request values remain bound parameters.
function balanceAtDateSql(storeId, date, inclusive = true) {
  const operator = inclusive ? '<=' : '<';
  const referenceDate = `(SELECT MAX(r.effectiveDate) FROM store_cash_references r WHERE r.storeId=${storeId} AND r.effectiveDate ${operator} ${date})`;
  return `(COALESCE((SELECT r.amountCents FROM store_cash_references r WHERE r.storeId=${storeId} AND r.effectiveDate=${referenceDate}),0)
    + COALESCE((SELECT SUM(p.cashCents - COALESCE((SELECT SUM(e.amountCents) FROM store_daily_expenses e WHERE e.closingId=p.id),0))
      FROM store_daily_closings p WHERE p.storeId=${storeId} AND p.status='aprovado'
      AND p.closingDate ${operator} ${date} AND p.closingDate > COALESCE(${referenceDate},'')),0))`;
}

module.exports = { balanceAtDateSql };
