import React from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Boxes, 
  PieChart, 
  Store, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { PurchaseOrder } from '../shared/types';

interface OrderSummaryCardsProps {
  order: PurchaseOrder;
}

export const OrderSummaryCards: React.FC<OrderSummaryCardsProps> = ({ order }) => {
  const totalUnidades = order.items.reduce((acc, i) => acc + (i.qtdTotalUnidades || 0), 0);
  const totalBrutoCompra = order.items.reduce((acc, i) => acc + (i.valorTotalBruto || 0), 0);
  
  // Desconto negociado %
  const valorDesconto = (totalBrutoCompra * (order.header.percentualDescontoOff || 0)) / 100;
  const subtotalAposDesconto = totalBrutoCompra - valorDesconto;

  // ST do Fornecedor
  const aliquotaSt = order.header.aliquotaSt || 0;
  const valorSt = (subtotalAposDesconto * aliquotaSt) / 100;

  // Total Compra Líquido Final com ST e Despesas
  const totalCompraLiquido = subtotalAposDesconto + valorSt + (order.header.valorFreteGlobal || 0) + (order.header.valorOutrasDespesasGlobal || 0);

  // Faturamento e Margem Projetados
  const faturamentoPdvProjetado = order.items.reduce((acc, i) => acc + (i.qtdTotalUnidades * (i.pdvAlvo || 0)), 0);
  const custoRealEfetivoTotal = order.items.reduce((acc, i) => acc + (i.qtdTotalUnidades * (i.custoRealEfetivo || 0)), 0);
  const lucroEstimadoTotal = faturamentoPdvProjetado - custoRealEfetivoTotal - valorSt;
  const margemPercentualMedia = faturamentoPdvProjetado > 0 ? (lucroEstimadoTotal / faturamentoPdvProjetado) * 100 : 0;

  // Verificação de separação de todas as lojas (soma das lojas + estoque central/reserva)
  const activeStores = (order.storeConfigs || []).filter(s => s.active);
  let totalDivergencias = 0;
  if (order.items.length > 0) {
    order.items.forEach(item => {
      const sumLojas = activeStores.reduce((acc, s) => acc + (item.separacaoLojas?.[s.id] || 0), 0);
      const totalDistribuido = sumLojas + (item.qtdReservaEstoque || 0);
      if (totalDistribuido !== item.qtdTotalUnidades) {
        totalDivergencias++;
      }
    });
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      
      {/* 1. Total Compra Bruto/Líquido com ST */}
      <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
          <span className="text-xs font-medium">Investimento Compra</span>
          <DollarSign className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="text-sm xl:text-base font-extrabold text-slate-900 dark:text-white font-mono whitespace-nowrap tracking-tight" title={`R$ ${totalCompraLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}>
          <span className="text-xs font-semibold mr-1">R$</span>
          {totalCompraLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex flex-col gap-0.5 mt-0.5 truncate">
          {order.header.percentualDescontoOff > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400">
              -{order.header.percentualDescontoOff}% OFF (-R$ {valorDesconto.toFixed(2)})
            </span>
          )}
          {aliquotaSt > 0 && (
            <span className="text-amber-600 dark:text-amber-400 font-bold">
              +ST {aliquotaSt}% (+R$ {valorSt.toFixed(2)})
            </span>
          )}
        </div>
      </div>

      {/* 2. Faturamento PDV Alvo */}
      <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
          <span className="text-xs font-medium">Faturamento PDV</span>
          <TrendingUp className="w-4 h-4 text-blue-500" />
        </div>
        <div className="text-sm xl:text-base font-extrabold text-blue-600 dark:text-blue-400 font-mono whitespace-nowrap tracking-tight" title={`R$ ${faturamentoPdvProjetado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}>
          <span className="text-xs font-semibold mr-1">R$</span>
          {faturamentoPdvProjetado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-[10px] text-slate-400 truncate">
          Receita bruta nas 20 lojas
        </div>
      </div>

      {/* 3. Lucro Real Efetivo */}
      <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
          <span className="text-xs font-medium">Lucro Real Efetivo</span>
          <PieChart className="w-4 h-4 text-teal-500" />
        </div>
        <div className={`text-sm xl:text-base font-extrabold font-mono whitespace-nowrap tracking-tight ${lucroEstimadoTotal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`} title={`R$ ${lucroEstimadoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}>
          <span className="text-xs font-semibold mr-1">R$</span>
          {lucroEstimadoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-[10px] text-slate-400 truncate">
          Após impostos, despesas & ST
        </div>
      </div>

      {/* 4. Margem Média Real */}
      <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
          <span className="text-xs font-medium">Margem Média</span>
          <div className={`w-2.5 h-2.5 rounded-full ${margemPercentualMedia >= 20 ? 'bg-emerald-500' : margemPercentualMedia > 0 ? 'bg-amber-500' : 'bg-rose-500'}`} />
        </div>
        <div className="text-sm xl:text-base font-extrabold text-slate-900 dark:text-white font-mono whitespace-nowrap tracking-tight">
          {margemPercentualMedia.toFixed(1)}%
        </div>
        <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
          {margemPercentualMedia >= 20 ? 'Excelente margem' : margemPercentualMedia > 0 ? 'Margem operacional' : 'Prejuízo fiscal'}
        </div>
      </div>

      {/* 5. Volume de Unidades */}
      <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
          <span className="text-xs font-medium">Volume Total</span>
          <Boxes className="w-4 h-4 text-purple-500" />
        </div>
        <div className="text-base font-bold text-slate-900 dark:text-white truncate">
          {totalUnidades.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-400">unidades</span>
        </div>
        <div className="text-[10px] text-slate-400">
          {order.items.length} {order.items.length === 1 ? 'produto' : 'produtos'} no pedido
        </div>
      </div>

      {/* 6. Status de Separação / Lojas */}
      <div 
        className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs"
        title="Valida se a soma das peças distribuídas para as 20 lojas (mais a reserva de estoque) bate 100% com a quantidade total comprada."
      >
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
          <span className="text-xs font-medium">Separação 20 Lojas</span>
          <Store className="w-4 h-4 text-indigo-500" />
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {order.items.length === 0 ? (
            <span className="text-xs font-bold text-slate-400">Aguardando itens</span>
          ) : totalDivergencias === 0 ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">100% Batida</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                {totalDivergencias} {totalDivergencias === 1 ? 'item divergente' : 'itens divergentes'}
              </span>
            </>
          )}
        </div>
        <div className="text-[10px] text-slate-400 mt-1">
          {order.items.length === 0 ? 'Rateio automático' : 'Clusters A, B e C (39 pts)'}
        </div>
      </div>

    </div>
  );
};
