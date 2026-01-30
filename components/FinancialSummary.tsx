import React, { useMemo } from 'react';
import { PieChart, CheckCircle2, Wallet, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { Transaction } from '../types';

interface FinancialSummaryProps {
  transactions: Transaction[];
}

export const FinancialSummary: React.FC<FinancialSummaryProps> = ({ transactions = [] }) => {
  // Cálculo centralizado e memoizado para performance
  const { totalBalance, distributed, undistributed } = useMemo(() => {
    const totals = transactions.reduce((acc, txn) => {
      // Garantir que o valor seja numérico e absoluto para controle total do sinal aqui
      const amount = Math.abs(Number(txn.amount) || 0);
      const isCredit = txn.type === 'credit';
      const signedValue = isCredit ? amount : -amount;

      // 1. Saldo Total (Independente de envelope)
      acc.totalBalance += signedValue;

      // 2. Comprometido (Apenas se tiver envelope_id)
      // Usamos uma verificação rigorosa para null/undefined
      if (txn.envelopeId !== null && txn.envelopeId !== undefined && txn.envelopeId !== '') {
        acc.distributed += signedValue;
      }

      return acc;
    }, { totalBalance: 0, distributed: 0 });

    // Debug para validação em desenvolvimento (remova em produção se necessário)
    // console.log('Financial Calculation Debug:', { 
    //   count: transactions.length, 
    //   total: totals.totalBalance, 
    //   dist: totals.distributed 
    // });

    return {
      totalBalance: totals.totalBalance,
      distributed: totals.distributed,
      undistributed: totals.totalBalance - totals.distributed
    };
  }, [transactions]);

  // Consideramos zero se for menor que 1 centavo para evitar erros de arredondamento de float
  const isZero = Math.abs(undistributed) < 0.01;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Card: Saldo em Conta */}
      <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50 group transition-all hover:shadow-md">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 dark:bg-gray-700/20 rounded-full -mr-10 -mt-10 transition-transform duration-500 group-hover:scale-110"></div>
        
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
              Saldo Total
            </p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              {formatCurrency(totalBalance)}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400 shadow-sm">
            <Wallet className="w-6 h-6" />
          </div>
        </div>
        
        <div className="mt-4 flex items-center gap-2">
           <div className="h-1.5 flex-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
             <div className="h-full bg-primary-500 rounded-full" style={{ width: '100%' }}></div>
           </div>
           <span className="text-[10px] font-medium text-gray-400">Total em Conta</span>
        </div>
      </div>

      {/* Card: Valor Distribuído (Comprometido) */}
      <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50 group transition-all hover:shadow-md">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 dark:bg-blue-900/10 rounded-full -mr-10 -mt-10 transition-transform duration-500 group-hover:scale-110"></div>
        
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1 uppercase tracking-wider">
              Comprometido
            </p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              {formatCurrency(distributed)}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
            <PieChart className="w-6 h-6" />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
           <div className="h-1.5 flex-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-700 ease-out" 
                    style={{ width: totalBalance !== 0 ? `${Math.min(100, Math.max(0, (distributed / (totalBalance || 1)) * 100))}%` : '0%' }}
                ></div>
           </div>
           <span className="text-[10px] font-medium text-gray-400">
             {totalBalance > 0 ? Math.round((Math.max(0, distributed) / totalBalance) * 100) : 0}%
           </span>
        </div>
      </div>

      {/* Card: Não Distribuído (DESTAQUE) */}
      <div className={`relative overflow-hidden rounded-xl p-4 shadow-sm transition-all duration-300 group hover:shadow-lg
        ${!isZero 
          ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' 
          : 'bg-gradient-to-br from-emerald-500 to-green-600 border border-transparent shadow-emerald-500/20'
        }`}
      >
        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-12 -mt-12 transition-transform duration-500 group-hover:scale-110
            ${!isZero ? 'bg-amber-100/50 dark:bg-amber-600/10' : 'bg-white/10'}`}
        ></div>

        <div className="relative flex items-center justify-between">
          <div>
            <p className={`text-xs font-bold mb-1 uppercase tracking-wider ${!isZero ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-100'}`}>
              {!isZero ? 'A Distribuir' : 'Tudo Planejado'}
            </p>
            <h3 className={`text-2xl font-bold tracking-tight ${!isZero ? 'text-amber-700 dark:text-amber-400' : 'text-white'}`}>
              {formatCurrency(undistributed)}
            </h3>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105
            ${!isZero 
                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' 
                : 'bg-white/20 text-white backdrop-blur-sm'
            }`}
          >
            {!isZero ? <AlertCircle className="w-6 h-6" /> : <CheckCircle2 className="w-7 h-7" />}
          </div>
        </div>
        
        <div className="mt-4">
          {!isZero ? (
            <div className="inline-flex items-center text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-white/50 dark:bg-black/20 px-3 py-1 rounded-full animate-pulse border border-amber-200/50 dark:border-amber-700/30">
                <AlertCircle className="w-3 h-3 mr-1.5" />
                Ação Necessária
            </div>
          ) : (
             <div className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-white px-3 py-1 rounded-full shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Saldo 100% Alocado
            </div>
          )}
        </div>
      </div>
    </div>
  );
};