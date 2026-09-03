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

  const percentualLucroSobreVenda = faturamentoPdvProjetado > 0 ? (lucroEstimadoTotal / faturamentoPdvProjetado) * 100 : 0;

  return (
    <div className="glass-panel-pro kpi-glow-strip py-2.5 px-4 rounded-2xl flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 text-xs mb-4">
      
      {/* 1. Investimento Compra */}
      <div className="flex items-center gap-3 min-w-0" title={`Investimento Total Líquido: R$ ${totalCompraLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}>
        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 flex items-center justify-center shrink-0">
          <DollarSign className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Investimento</span>
            {order.header.percentualDescontoOff > 0 ? (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                -{order.header.percentualDescontoOff}% OFF
              </span>
            ) : (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                Líquido
              </span>
            )}
          </div>
          <div className="font-mono font-black text-slate-900 dark:text-white text-xs truncate">
            R$ {totalCompraLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div className="hidden sm:block h-7 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

      {/* 2. Faturamento PDV */}
      <div className="flex items-center gap-3 min-w-0" title={`Receita PDV projetada: R$ ${faturamentoPdvProjetado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}>
        <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
          <TrendingUp className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Faturamento PDV</span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
              R$ 12 Fixo
            </span>
          </div>
          <div className="font-mono font-black text-blue-600 dark:text-blue-400 text-xs truncate">
            R$ {faturamentoPdvProjetado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div className="hidden sm:block h-7 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

      {/* 3. Lucro Real Efetivo */}
      <div className="flex items-center gap-3 min-w-0" title={`Lucro Líquido Real após impostos e ST: R$ ${lucroEstimadoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}>
        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <PieChart className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Lucro Efetivo</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md border ${
              lucroEstimadoTotal >= 0 
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
            }`}>
              {lucroEstimadoTotal >= 0 ? `+${percentualLucroSobreVenda.toFixed(1)}%` : `${percentualLucroSobreVenda.toFixed(1)}%`}
            </span>
          </div>
          <div className={`font-mono font-black text-xs truncate ${lucroEstimadoTotal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            R$ {lucroEstimadoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div className="hidden lg:block h-7 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

      {/* 4. Margem Média Real */}
      <div className="flex items-center gap-3 min-w-0" title={`Margem Média Real: ${margemPercentualMedia.toFixed(1)}%`}>
        <div className="w-8 h-8 rounded-xl bg-teal-500/10 dark:bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex items-center justify-center shrink-0">
          <div className="font-bold text-xs font-mono text-teal-500">
            %
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Margem Média</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md border ${
              margemPercentualMedia >= 20 
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                : margemPercentualMedia > 0 
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' 
                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
            }`}>
              {margemPercentualMedia >= 20 ? 'Excelente' : margemPercentualMedia > 0 ? 'Normal' : 'Crítica'}
            </span>
          </div>
          <div className="font-mono font-black text-slate-900 dark:text-white text-xs truncate">
            {margemPercentualMedia.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="hidden sm:block h-7 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

      {/* 5. Volume Total */}
      <div className="flex items-center gap-3 min-w-0" title={`${totalUnidades.toLocaleString('pt-BR')} unidades em ${order.items.length} itens`}>
        <div className="w-8 h-8 rounded-xl bg-purple-500/10 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
          <Boxes className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Volume Total</span>
          <div className="font-mono font-black text-slate-900 dark:text-white text-xs truncate">
            {totalUnidades.toLocaleString('pt-BR')} <span className="text-[10px] font-normal text-slate-400 font-sans">({order.items.length} {order.items.length === 1 ? 'item' : 'itens'})</span>
          </div>
        </div>
      </div>

      <div className="hidden sm:block h-7 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

      {/* 6. Separação Lojas */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
          <Store className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Separação</span>
          <div className="flex items-center gap-1 mt-0.5 text-xs">
            {order.items.length === 0 ? (
              <span className="font-bold text-slate-400">Sem itens</span>
            ) : totalDivergencias === 0 ? (
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                100% Batida
              </span>
            ) : (
              <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1" title={`${totalDivergencias} itens com soma diferente do comprado`}>
                <AlertCircle className="w-3 h-3 shrink-0" />
                {totalDivergencias} {totalDivergencias === 1 ? 'divergência' : 'divergências'}
              </span>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
