
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navbar } from '../components/Navbar';
import { Button } from '../components/Button';
import { categoryService } from '../services/categoryService';
import { transactionService } from '../services/transactionService';
import { getInPeriod as getTransferLogInPeriod } from '../services/transferLogService';
import { formatCurrency } from '../utils/format';
import { Category, EnvelopeTransferLogEntry, Transaction } from '../types';
import { useToast } from '../contexts/ToastContext';
import { BarChart3, Loader2, AlertCircle, TrendingUp, TrendingDown, Wallet, ChevronRight, ChevronDown } from 'lucide-react';

/**
 * Retorna dateFrom (primeiro dia do mês início) e dateTo (último dia do mês fim).
 * Se início for posterior ao fim, normaliza trocando os valores.
 */
function getDateRange(
  monthStart: number,
  yearStart: number,
  monthEnd: number,
  yearEnd: number
): { dateFrom: string; dateTo: string } {
  let m1 = monthStart;
  let y1 = yearStart;
  let m2 = monthEnd;
  let y2 = yearEnd;
  if (y1 > y2 || (y1 === y2 && m1 > m2)) {
    m1 = monthEnd;
    y1 = yearEnd;
    m2 = monthStart;
    y2 = yearStart;
  }
  const dateFrom = `${y1}-${String(m1).padStart(2, '0')}-01`;
  const lastDay = new Date(y2, m2, 0).getDate();
  const dateTo = `${y2}-${String(m2).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { dateFrom, dateTo };
}

/** Subcategoria dentro de um bloco de categoria (gráfico/tabela drill-down) */
interface SubcategoryRow {
  subcategoryId: string | null;
  subcategoryName: string;
  gastos: number;
  pctPeriodo: number;
  pctCategoria: number;
}

/** Bloco por categoria (exclui "Sem categoria") para drill-down */
interface CategoryBlock {
  categoryId: string;
  categoryName: string;
  gastos: number;
  pctPeriodo: number;
  subcategories: SubcategoryRow[];
}

/** Bloco à parte para gastos sem categoria */
interface SemCategoriaBlock {
  gastos: number;
  pctPeriodo: number;
  rows: Array<{ subcategoryName: string; gastos: number; pctPeriodo: number }>;
}

function formatPct(value: number): string {
  return `${(Math.round(value * 10) / 10).toFixed(1).replace('.', ',')} %`;
}

export default function SpendingByCategoryReport() {
  const { addToast } = useToast();
  const now = new Date();
  const [filterMonthStart, setFilterMonthStart] = useState(now.getMonth() + 1);
  const [filterYearStart, setFilterYearStart] = useState(now.getFullYear());
  const [filterMonthEnd, setFilterMonthEnd] = useState(now.getMonth() + 1);
  const [filterYearEnd, setFilterYearEnd] = useState(now.getFullYear());
  const [filterCategoryId, setFilterCategoryId] = useState<string>('');
  const [filterSubcategoryId, setFilterSubcategoryId] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transferLogEntries, setTransferLogEntries] = useState<EnvelopeTransferLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(new Set());
  type SectionKey = 'chart-receita' | 'chart-despesa' | 'table-receita' | 'table-despesa';
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(
    () => new Set(['chart-receita', 'chart-despesa', 'table-receita', 'table-despesa'])
  );
  const toggleSectionExpanded = useCallback((key: SectionKey) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleCategoryExpanded = useCallback((categoryId: string) => {
    setExpandedCategoryIds(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }, []);

  const loadCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const data = await categoryService.getAll();
      setCategories(data || []);
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
      addToast('Não foi possível carregar as categorias.', 'error');
    } finally {
      setLoadingCategories(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const applyFilters = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { dateFrom, dateTo } = getDateRange(
      filterMonthStart,
      filterYearStart,
      filterMonthEnd,
      filterYearEnd
    );
    try {
      const [txData, logData] = await Promise.all([
        transactionService.getFiltered({
          dateFrom,
          dateTo,
          categoryId: filterCategoryId || undefined,
          subcategoryId: filterSubcategoryId || undefined
        }),
        getTransferLogInPeriod(dateFrom, dateTo).catch(err => {
          console.error('Erro ao buscar log de transferências:', err);
          addToast('Não foi possível carregar as transferências para o relatório.', 'error');
          return [] as EnvelopeTransferLogEntry[];
        })
      ]);
      setTransactions(txData || []);
      setTransferLogEntries(logData ?? []);
    } catch (err) {
      console.error('Erro ao buscar transações:', err);
      setError('Não foi possível carregar os lançamentos. Tente novamente.');
      setTransactions([]);
      setTransferLogEntries([]);
      addToast('Erro ao aplicar filtros.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterMonthStart, filterYearStart, filterMonthEnd, filterYearEnd, filterCategoryId, filterSubcategoryId, addToast]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  useEffect(() => {
    if (!filterCategoryId) setFilterSubcategoryId('');
  }, [filterCategoryId]);

  const subcategoryOptions = useMemo(() => {
    if (!filterCategoryId) return [];
    const cat = categories.find(c => c.id === filterCategoryId);
    return cat?.sub_categories ?? [];
  }, [categories, filterCategoryId]);

  const { totalReceitas, totalGastos, saldo } = useMemo(() => {
    let receitas = 0;
    let gastos = 0;
    transactions.forEach(tx => {
      const abs = Math.abs(Number(tx.amount)) || 0;
      if (tx.type === 'credit') receitas += abs;
      else gastos += abs;
    });
    transferLogEntries.forEach(entry => {
      const amt = Number(entry.amount) || 0;
      if (entry.origin_category_id != null && entry.origin_subcategory_id != null) gastos += amt;
      if (entry.dest_category_id != null && entry.dest_subcategory_id != null) receitas += amt;
    });
    return {
      totalReceitas: Math.round(receitas * 100) / 100,
      totalGastos: Math.round(gastos * 100) / 100,
      saldo: Math.round((receitas - gastos) * 100) / 100
    };
  }, [transactions, transferLogEntries]);

  const {
    categoryBlocksDespesa,
    semCategoriaDespesa,
    chartMaxDespesa,
    categoryBlocksReceita,
    semCategoriaReceita,
    chartMaxReceita
  } = useMemo(() => {
    const catById = new Map(categories.map(c => [c.id, c]));
    const totalG = totalGastos;
    const totalR = totalReceitas;

    function buildBlocksAndSem(
      map: Map<string, number>,
      totalForPct: number
    ): { blocks: CategoryBlock[]; semCategoriaBlock: SemCategoriaBlock } {
      const gastosPorCategoria = new Map<string, number>();
      map.forEach((val, key) => {
        const cid = key.split('|')[0];
        gastosPorCategoria.set(cid, (gastosPorCategoria.get(cid) ?? 0) + val);
      });
      const blocks: CategoryBlock[] = [];
      const semCategoriaRows: Array<{ subcategoryName: string; gastos: number; pctPeriodo: number }> = [];
      let semCategoriaTotal = 0;
      const cids = Array.from(new Set(Array.from(map.keys()).map(k => k.split('|')[0])));

      for (const cid of cids) {
        if (cid === '__sem_categoria__') {
          const subKeys = Array.from(map.keys()).filter(k => k.startsWith(cid + '|'));
          let total = 0;
          for (const key of subKeys) {
            const g = map.get(key) ?? 0;
            const gr = Math.round(g * 100) / 100;
            total += g;
            semCategoriaRows.push({
              subcategoryName: '—',
              gastos: gr,
              pctPeriodo: totalForPct > 0 ? (gr / totalForPct) * 100 : 0
            });
          }
          semCategoriaTotal = total;
          continue;
        }
        const cat = catById.get(cid);
        const categoryName = cat?.name ?? 'Sem categoria';
        const gastosCat = gastosPorCategoria.get(cid) ?? 0;
        const gastosCatRounded = Math.round(gastosCat * 100) / 100;
        const subKeys = Array.from(map.keys()).filter(k => k.startsWith(cid + '|'));
        const subcategories: SubcategoryRow[] = subKeys.map(key => {
          const g = map.get(key) ?? 0;
          const gr = Math.round(g * 100) / 100;
          const sid = key.split('|')[1];
          const subcategoryId = sid === '__sem_sub__' ? null : sid;
          let subcategoryName = '—';
          if (subcategoryId && cat?.sub_categories) {
            const sub = cat.sub_categories.find(s => s.id === subcategoryId);
            subcategoryName = sub?.name ?? '—';
          }
          return {
            subcategoryId,
            subcategoryName,
            gastos: gr,
            pctPeriodo: totalForPct > 0 ? (gr / totalForPct) * 100 : 0,
            pctCategoria: gastosCat > 0 ? (gr / gastosCat) * 100 : 0
          };
        });
        subcategories.sort((a, b) => a.subcategoryName.localeCompare(b.subcategoryName));
        blocks.push({
          categoryId: cid,
          categoryName,
          gastos: gastosCatRounded,
          pctPeriodo: totalForPct > 0 ? (gastosCatRounded / totalForPct) * 100 : 0,
          subcategories
        });
      }
      blocks.sort((a, b) => b.gastos - a.gastos);
      const semCategoriaBlock: SemCategoriaBlock = {
        gastos: Math.round(semCategoriaTotal * 100) / 100,
        pctPeriodo: totalForPct > 0 ? (semCategoriaTotal / totalForPct) * 100 : 0,
        rows: semCategoriaRows
      };
      return { blocks, semCategoriaBlock };
    }

    const mapDebit = new Map<string, number>();
    const mapCredit = new Map<string, number>();
    transactions.forEach(tx => {
      const cid = tx.categoryId ?? '__sem_categoria__';
      const sid = tx.subcategoryId ?? '__sem_sub__';
      const key = `${cid}|${sid}`;
      const abs = Math.abs(Number(tx.amount)) || 0;
      if (tx.type === 'debit') mapDebit.set(key, (mapDebit.get(key) ?? 0) + abs);
      else mapCredit.set(key, (mapCredit.get(key) ?? 0) + abs);
    });

    transferLogEntries.forEach(entry => {
      const amt = Number(entry.amount) || 0;
      if (entry.origin_category_id != null && entry.origin_subcategory_id != null) {
        const matchFilter =
          !filterCategoryId ||
          (entry.origin_category_id === filterCategoryId &&
            (!filterSubcategoryId || entry.origin_subcategory_id === filterSubcategoryId));
        if (matchFilter) {
          const key = `${entry.origin_category_id}|${entry.origin_subcategory_id}`;
          mapDebit.set(key, (mapDebit.get(key) ?? 0) + amt);
        }
      }
      if (entry.dest_category_id != null && entry.dest_subcategory_id != null) {
        const matchFilter =
          !filterCategoryId ||
          (entry.dest_category_id === filterCategoryId &&
            (!filterSubcategoryId || entry.dest_subcategory_id === filterSubcategoryId));
        if (matchFilter) {
          const key = `${entry.dest_category_id}|${entry.dest_subcategory_id}`;
          mapCredit.set(key, (mapCredit.get(key) ?? 0) + amt);
        }
      }
    });

    const { blocks: blocksDespesa, semCategoriaBlock: semCategoriaDespesa } = buildBlocksAndSem(mapDebit, totalG);
    const { blocks: blocksReceita, semCategoriaBlock: semCategoriaReceita } = buildBlocksAndSem(mapCredit, totalR);

    const chartMaxDespesa = Math.max(
      ...blocksDespesa.map(b => b.gastos),
      semCategoriaDespesa.gastos,
      1
    );
    const chartMaxReceita = Math.max(
      ...blocksReceita.map(b => b.gastos),
      semCategoriaReceita.gastos,
      1
    );

    return {
      categoryBlocksDespesa: blocksDespesa,
      semCategoriaDespesa,
      chartMaxDespesa,
      categoryBlocksReceita: blocksReceita,
      semCategoriaReceita,
      chartMaxReceita
    };
  }, [transactions, transferLogEntries, categories, totalGastos, totalReceitas, filterCategoryId, filterSubcategoryId]);

  const months = [
    { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' }, { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' }, { value: 5, label: 'Maio' }, { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' }, { value: 11, label: 'Novembro' }, { value: 12, label: 'Dezembro' }
  ];
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary-500" />
          Relatório de Gastos por Categoria
        </h1>

        {/* Filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6 shadow-sm">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Filtros</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mês início</label>
              <select
                value={filterMonthStart}
                onChange={e => setFilterMonthStart(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[44px] cursor-pointer transition-colors duration-200"
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ano início</label>
              <select
                value={filterYearStart}
                onChange={e => setFilterYearStart(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[44px] cursor-pointer transition-colors duration-200"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mês fim</label>
              <select
                value={filterMonthEnd}
                onChange={e => setFilterMonthEnd(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[44px] cursor-pointer transition-colors duration-200"
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ano fim</label>
              <select
                value={filterYearEnd}
                onChange={e => setFilterYearEnd(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[44px] cursor-pointer transition-colors duration-200"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label>
              <select
                value={filterCategoryId}
                onChange={e => setFilterCategoryId(e.target.value)}
                disabled={loadingCategories}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[44px] cursor-pointer transition-colors duration-200 disabled:opacity-60"
              >
                <option value="">Todas</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subcategoria</label>
              <select
                value={filterSubcategoryId}
                onChange={e => setFilterSubcategoryId(e.target.value)}
                disabled={!filterCategoryId}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[44px] cursor-pointer transition-colors duration-200 disabled:opacity-60"
              >
                <option value="">Todas</option>
                {subcategoryOptions.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <Button type="button" onClick={applyFilters} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? ' Carregando...' : 'Aplicar filtros'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            <Button type="button" variant="outline" onClick={applyFilters} className="ml-auto cursor-pointer">Tentar novamente</Button>
          </div>
        )}

        {!error && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1 uppercase tracking-wider">Total Receitas</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-emerald-500" />
                  {formatCurrency(totalReceitas)}
                </h3>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1 uppercase tracking-wider">Total Gastos</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <TrendingDown className="w-6 h-6 text-red-500" />
                  {formatCurrency(totalGastos)}
                </h3>
              </div>
              <div className={`rounded-xl p-4 shadow-sm border ${saldo >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${saldo >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>Saldo do Período</p>
                <h3 className={`text-2xl font-bold flex items-center gap-2 ${saldo >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                  <Wallet className="w-6 h-6" />
                  {formatCurrency(saldo)}
                </h3>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
              </div>
            ) : transactions.length === 0 && transferLogEntries.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                <BarChart3 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 font-medium">Nenhum lançamento encontrado para os filtros selecionados.</p>
              </div>
            ) : (
              <>
                {/* Gráfico: Receitas e Despesas por categoria em frames separados */}
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Gastos por categoria</h2>
                  <div className="space-y-6">
                    {/* Frame Receitas por categoria (verde) */}
                    <section
                      aria-labelledby="chart-receitas-heading"
                      className="rounded-xl border-2 border-emerald-300 dark:border-emerald-600 bg-white dark:bg-gray-800 shadow-sm overflow-hidden transition-all duration-200"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSectionExpanded('chart-receita')}
                        className="w-full flex items-center gap-2 p-4 sm:p-5 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
                        aria-expanded={expandedSections.has('chart-receita')}
                        aria-label={expandedSections.has('chart-receita') ? 'Recolher seção Receitas por categoria' : 'Expandir seção Receitas por categoria'}
                      >
                        {expandedSections.has('chart-receita') ? (
                          <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400 shrink-0" aria-hidden />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400 shrink-0" aria-hidden />
                        )}
                        <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden />
                        <h3 id="chart-receitas-heading" className="text-lg font-bold text-gray-900 dark:text-white">Receitas por categoria</h3>
                      </button>
                      {expandedSections.has('chart-receita') && (
                        <div className="px-4 sm:p-6 pt-0 pb-4 sm:pb-6 border-t border-gray-100 dark:border-gray-700">
                          <div className="space-y-4 pt-4">
                            {categoryBlocksReceita.map(block => {
                              const expandKey = `receita-${block.categoryId}`;
                              return (
                                <div key={block.categoryId} className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => toggleCategoryExpanded(expandKey)}
                                      className="p-0.5 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 cursor-pointer transition-colors duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                      aria-expanded={expandedCategoryIds.has(expandKey)}
                                      aria-label={expandedCategoryIds.has(expandKey) ? `Recolher ${block.categoryName}` : `Expandir ${block.categoryName}`}
                                    >
                                      {expandedCategoryIds.has(expandKey) ? (
                                        <ChevronDown className="w-5 h-5" aria-hidden />
                                      ) : (
                                        <ChevronRight className="w-5 h-5" aria-hidden />
                                      )}
                                    </button>
                                    <div className="flex-1 min-w-0 flex justify-between items-center gap-2">
                                      <span className="font-medium text-gray-900 dark:text-white truncate">{block.categoryName}</span>
                                      <span className="text-sm text-gray-700 dark:text-gray-300 font-medium shrink-0">{formatCurrency(block.gastos)}</span>
                                      <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">{formatPct(block.pctPeriodo)}</span>
                                    </div>
                                  </div>
                                  <div className="h-6 rounded overflow-hidden bg-gray-100 dark:bg-gray-700 transition-all duration-300">
                                    <div
                                      className="h-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-300"
                                      style={{ width: `${(block.gastos / chartMaxReceita) * 100}%`, minWidth: block.gastos > 0 ? '4px' : 0 }}
                                    />
                                  </div>
                                  {expandedCategoryIds.has(expandKey) && block.subcategories.length > 0 && (
                                    <div className="pl-6 space-y-3 pt-1">
                                      {block.subcategories.map((sub, j) => (
                                        <div key={j} className="space-y-1">
                                          <div className="flex justify-between text-xs gap-2">
                                            <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{sub.subcategoryName}</span>
                                            <span className="text-gray-700 dark:text-gray-300 shrink-0">{formatCurrency(sub.gastos)}</span>
                                            <span className="text-gray-500 dark:text-gray-400 shrink-0">{formatPct(sub.pctPeriodo)} do total · {formatPct(sub.pctCategoria)} da categoria</span>
                                          </div>
                                          <div
                                            className="h-5 rounded overflow-hidden bg-gray-100 dark:bg-gray-700"
                                            title={`${formatCurrency(sub.gastos)} · ${formatPct(sub.pctPeriodo)} do período · ${formatPct(sub.pctCategoria)} da categoria`}
                                          >
                                            <div
                                              className="h-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-300"
                                              style={{ width: `${(sub.gastos / chartMaxReceita) * 100}%`, minWidth: sub.gastos > 0 ? '4px' : 0 }}
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          {semCategoriaReceita.gastos > 0 && (
                            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                              <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Sem categoria</h4>
                              <div className="space-y-3">
                                {semCategoriaReceita.rows.map((row, i) => (
                                  <div key={i} className="space-y-1">
                                    <div className="flex justify-between text-xs gap-2">
                                      <span className="font-medium text-gray-600 dark:text-gray-400">{row.subcategoryName}</span>
                                      <span className="text-gray-700 dark:text-gray-300 shrink-0">{formatCurrency(row.gastos)}</span>
                                      <span className="text-gray-500 dark:text-gray-400 shrink-0">{formatPct(row.pctPeriodo)}</span>
                                    </div>
                                    <div className="h-5 rounded overflow-hidden bg-gray-100 dark:bg-gray-700">
                                      <div
                                        className="h-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-300"
                                        style={{ width: `${(row.gastos / chartMaxReceita) * 100}%`, minWidth: row.gastos > 0 ? '4px' : 0 }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </section>

                    {/* Frame Despesas por categoria (vermelho) */}
                    <section
                      aria-labelledby="chart-despesas-heading"
                      className="rounded-xl border-2 border-red-300 dark:border-red-600 bg-white dark:bg-gray-800 shadow-sm overflow-hidden transition-all duration-200"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSectionExpanded('chart-despesa')}
                        className="w-full flex items-center gap-2 p-4 sm:p-5 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
                        aria-expanded={expandedSections.has('chart-despesa')}
                        aria-label={expandedSections.has('chart-despesa') ? 'Recolher seção Despesas por categoria' : 'Expandir seção Despesas por categoria'}
                      >
                        {expandedSections.has('chart-despesa') ? (
                          <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400 shrink-0" aria-hidden />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400 shrink-0" aria-hidden />
                        )}
                        <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" aria-hidden />
                        <h3 id="chart-despesas-heading" className="text-lg font-bold text-gray-900 dark:text-white">Despesas por categoria</h3>
                      </button>
                      {expandedSections.has('chart-despesa') && (
                        <div className="px-4 sm:p-6 pt-0 pb-4 sm:pb-6 border-t border-gray-100 dark:border-gray-700">
                          <div className="space-y-4 pt-4">
                            {categoryBlocksDespesa.map(block => {
                              const expandKey = `despesa-${block.categoryId}`;
                              return (
                                <div key={block.categoryId} className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => toggleCategoryExpanded(expandKey)}
                                      className="p-0.5 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 cursor-pointer transition-colors duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                      aria-expanded={expandedCategoryIds.has(expandKey)}
                                      aria-label={expandedCategoryIds.has(expandKey) ? `Recolher ${block.categoryName}` : `Expandir ${block.categoryName}`}
                                    >
                                      {expandedCategoryIds.has(expandKey) ? (
                                        <ChevronDown className="w-5 h-5" aria-hidden />
                                      ) : (
                                        <ChevronRight className="w-5 h-5" aria-hidden />
                                      )}
                                    </button>
                                    <div className="flex-1 min-w-0 flex justify-between items-center gap-2">
                                      <span className="font-medium text-gray-900 dark:text-white truncate">{block.categoryName}</span>
                                      <span className="text-sm text-gray-700 dark:text-gray-300 font-medium shrink-0">{formatCurrency(block.gastos)}</span>
                                      <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">{formatPct(block.pctPeriodo)}</span>
                                    </div>
                                  </div>
                                  <div className="h-6 rounded overflow-hidden bg-gray-100 dark:bg-gray-700 transition-all duration-300">
                                    <div
                                      className="h-full bg-red-500 dark:bg-red-400 transition-all duration-300"
                                      style={{ width: `${(block.gastos / chartMaxDespesa) * 100}%`, minWidth: block.gastos > 0 ? '4px' : 0 }}
                                    />
                                  </div>
                                  {expandedCategoryIds.has(expandKey) && block.subcategories.length > 0 && (
                                    <div className="pl-6 space-y-3 pt-1">
                                      {block.subcategories.map((sub, j) => (
                                        <div key={j} className="space-y-1">
                                          <div className="flex justify-between text-xs gap-2">
                                            <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{sub.subcategoryName}</span>
                                            <span className="text-gray-700 dark:text-gray-300 shrink-0">{formatCurrency(sub.gastos)}</span>
                                            <span className="text-gray-500 dark:text-gray-400 shrink-0">{formatPct(sub.pctPeriodo)} do total · {formatPct(sub.pctCategoria)} da categoria</span>
                                          </div>
                                          <div
                                            className="h-5 rounded overflow-hidden bg-gray-100 dark:bg-gray-700"
                                            title={`${formatCurrency(sub.gastos)} · ${formatPct(sub.pctPeriodo)} do período · ${formatPct(sub.pctCategoria)} da categoria`}
                                          >
                                            <div
                                              className="h-full bg-red-500 dark:bg-red-400 transition-all duration-300"
                                              style={{ width: `${(sub.gastos / chartMaxDespesa) * 100}%`, minWidth: sub.gastos > 0 ? '4px' : 0 }}
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          {semCategoriaDespesa.gastos > 0 && (
                            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                              <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Sem categoria</h4>
                              <div className="space-y-3">
                                {semCategoriaDespesa.rows.map((row, i) => (
                                  <div key={i} className="space-y-1">
                                    <div className="flex justify-between text-xs gap-2">
                                      <span className="font-medium text-gray-600 dark:text-gray-400">{row.subcategoryName}</span>
                                      <span className="text-gray-700 dark:text-gray-300 shrink-0">{formatCurrency(row.gastos)}</span>
                                      <span className="text-gray-500 dark:text-gray-400 shrink-0">{formatPct(row.pctPeriodo)}</span>
                                    </div>
                                    <div className="h-5 rounded overflow-hidden bg-gray-100 dark:bg-gray-700">
                                      <div
                                        className="h-full bg-red-500 dark:bg-red-400 transition-all duration-300"
                                        style={{ width: `${(row.gastos / chartMaxDespesa) * 100}%`, minWidth: row.gastos > 0 ? '4px' : 0 }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </section>
                  </div>
                </div>

                {/* Detalhamento: Receitas e Despesas em frames separados */}
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Detalhamento por categoria e subcategoria</h2>
                  <div className="space-y-6">
                    {/* Frame Receitas (verde) */}
                    <section
                      aria-labelledby="table-receitas-heading"
                      className="rounded-xl border-2 border-emerald-300 dark:border-emerald-600 bg-white dark:bg-gray-800 shadow-sm overflow-hidden transition-all duration-200"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSectionExpanded('table-receita')}
                        className="w-full flex items-center gap-2 p-4 sm:p-5 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
                        aria-expanded={expandedSections.has('table-receita')}
                        aria-label={expandedSections.has('table-receita') ? 'Recolher seção Receitas' : 'Expandir seção Receitas'}
                      >
                        {expandedSections.has('table-receita') ? (
                          <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400 shrink-0" aria-hidden />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400 shrink-0" aria-hidden />
                        )}
                        <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden />
                        <h3 id="table-receitas-heading" className="text-lg font-bold text-gray-900 dark:text-white">Receitas</h3>
                      </button>
                      {expandedSections.has('table-receita') && (
                        <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-gray-100 dark:border-gray-700">
                          <div className="overflow-x-auto pt-4">
                            <table className="w-full text-sm" aria-labelledby="table-receitas-heading">
                              <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-left text-gray-600 dark:text-gray-400 uppercase tracking-wider text-xs font-bold">
                                  <th className="px-4 py-3 w-10" scope="col" aria-label="Expandir ou recolher" />
                                  <th className="px-4 py-3">Categoria</th>
                                  <th className="px-4 py-3 text-right">Total Receitas</th>
                                  <th className="px-4 py-3 text-right">% do Período</th>
                                  <th className="px-4 py-3 text-right">% da Categoria</th>
                                </tr>
                              </thead>
                              <tbody>
                                {categoryBlocksReceita.map(block => {
                                  const expandKey = `receita-${block.categoryId}`;
                                  return (
                                    <React.Fragment key={block.categoryId}>
                                      <tr
                                        className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-200 bg-gray-50/80 dark:bg-gray-700/40 font-semibold"
                                      >
                                        <td className="px-4 py-3">
                                          <button
                                            type="button"
                                            onClick={() => toggleCategoryExpanded(expandKey)}
                                            className="p-0.5 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 cursor-pointer transition-colors duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                            aria-expanded={expandedCategoryIds.has(expandKey)}
                                            aria-label={expandedCategoryIds.has(expandKey) ? `Recolher ${block.categoryName}` : `Expandir ${block.categoryName}`}
                                          >
                                            {expandedCategoryIds.has(expandKey) ? (
                                              <ChevronDown className="w-5 h-5" aria-hidden />
                                            ) : (
                                              <ChevronRight className="w-5 h-5" aria-hidden />
                                            )}
                                          </button>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{block.categoryName}</td>
                                        <td className="px-4 py-3 text-right text-gray-900 dark:text-white font-medium">{formatCurrency(block.gastos)}</td>
                                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatPct(block.pctPeriodo)}</td>
                                        <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">—</td>
                                      </tr>
                                      {expandedCategoryIds.has(expandKey) && block.subcategories.map((sub, j) => (
                                        <tr
                                          key={`${block.categoryId}-${sub.subcategoryId ?? j}`}
                                          className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-200"
                                        >
                                          <td className="px-4 py-3" />
                                          <td className="px-4 py-3 pl-10 text-gray-600 dark:text-gray-400">{sub.subcategoryName}</td>
                                          <td className="px-4 py-3 text-right text-gray-900 dark:text-white font-medium">{formatCurrency(sub.gastos)}</td>
                                          <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatPct(sub.pctPeriodo)}</td>
                                          <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatPct(sub.pctCategoria)}</td>
                                        </tr>
                                      ))}
                                    </React.Fragment>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          {semCategoriaReceita.gastos > 0 && (
                            <div className="border-t border-gray-200 dark:border-gray-700 mt-4 pt-4">
                              <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Sem categoria</h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-left text-gray-600 dark:text-gray-400 uppercase tracking-wider text-xs font-bold">
                                      <th className="px-4 py-3 w-10" scope="col" />
                                      <th className="px-4 py-3">Categoria</th>
                                      <th className="px-4 py-3 text-right">Total Receitas</th>
                                      <th className="px-4 py-3 text-right">% do Período</th>
                                      <th className="px-4 py-3 text-right">% da Categoria</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {semCategoriaReceita.rows.map((row, i) => (
                                      <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-200">
                                        <td className="px-4 py-3" />
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{row.subcategoryName}</td>
                                        <td className="px-4 py-3 text-right text-gray-900 dark:text-white font-medium">{formatCurrency(row.gastos)}</td>
                                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatPct(row.pctPeriodo)}</td>
                                        <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">—</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </section>

                    {/* Frame Despesas (vermelho) */}
                    <section
                      aria-labelledby="table-despesas-heading"
                      className="rounded-xl border-2 border-red-300 dark:border-red-600 bg-white dark:bg-gray-800 shadow-sm overflow-hidden transition-all duration-200"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSectionExpanded('table-despesa')}
                        className="w-full flex items-center gap-2 p-4 sm:p-5 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
                        aria-expanded={expandedSections.has('table-despesa')}
                        aria-label={expandedSections.has('table-despesa') ? 'Recolher seção Despesas por categoria' : 'Expandir seção Despesas por categoria'}
                      >
                        {expandedSections.has('table-despesa') ? (
                          <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400 shrink-0" aria-hidden />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400 shrink-0" aria-hidden />
                        )}
                        <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" aria-hidden />
                        <h3 id="table-despesas-heading" className="text-lg font-bold text-gray-900 dark:text-white">Despesas por categoria</h3>
                      </button>
                      {expandedSections.has('table-despesa') && (
                        <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-gray-100 dark:border-gray-700">
                          <div className="overflow-x-auto pt-4">
                            <table className="w-full text-sm" aria-labelledby="table-despesas-heading">
                              <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-left text-gray-600 dark:text-gray-400 uppercase tracking-wider text-xs font-bold">
                                  <th className="px-4 py-3 w-10" scope="col" aria-label="Expandir ou recolher" />
                                  <th className="px-4 py-3">Categoria</th>
                                  <th className="px-4 py-3 text-right">Total Despesas</th>
                                  <th className="px-4 py-3 text-right">% do Período</th>
                                  <th className="px-4 py-3 text-right">% da Categoria</th>
                                </tr>
                              </thead>
                              <tbody>
                                {categoryBlocksDespesa.map(block => {
                                  const expandKey = `despesa-${block.categoryId}`;
                                  return (
                                    <React.Fragment key={block.categoryId}>
                                      <tr
                                        className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-200 bg-gray-50/80 dark:bg-gray-700/40 font-semibold"
                                      >
                                        <td className="px-4 py-3">
                                          <button
                                            type="button"
                                            onClick={() => toggleCategoryExpanded(expandKey)}
                                            className="p-0.5 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 cursor-pointer transition-colors duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                            aria-expanded={expandedCategoryIds.has(expandKey)}
                                            aria-label={expandedCategoryIds.has(expandKey) ? `Recolher ${block.categoryName}` : `Expandir ${block.categoryName}`}
                                          >
                                            {expandedCategoryIds.has(expandKey) ? (
                                              <ChevronDown className="w-5 h-5" aria-hidden />
                                            ) : (
                                              <ChevronRight className="w-5 h-5" aria-hidden />
                                            )}
                                          </button>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{block.categoryName}</td>
                                        <td className="px-4 py-3 text-right text-gray-900 dark:text-white font-medium">{formatCurrency(block.gastos)}</td>
                                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatPct(block.pctPeriodo)}</td>
                                        <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">—</td>
                                      </tr>
                                      {expandedCategoryIds.has(expandKey) && block.subcategories.map((sub, j) => (
                                        <tr
                                          key={`${block.categoryId}-${sub.subcategoryId ?? j}`}
                                          className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-200"
                                        >
                                          <td className="px-4 py-3" />
                                          <td className="px-4 py-3 pl-10 text-gray-600 dark:text-gray-400">{sub.subcategoryName}</td>
                                          <td className="px-4 py-3 text-right text-gray-900 dark:text-white font-medium">{formatCurrency(sub.gastos)}</td>
                                          <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatPct(sub.pctPeriodo)}</td>
                                          <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatPct(sub.pctCategoria)}</td>
                                        </tr>
                                      ))}
                                    </React.Fragment>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          {semCategoriaDespesa.gastos > 0 && (
                            <div className="border-t border-gray-200 dark:border-gray-700 mt-4 pt-4">
                              <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Sem categoria</h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-left text-gray-600 dark:text-gray-400 uppercase tracking-wider text-xs font-bold">
                                      <th className="px-4 py-3 w-10" scope="col" />
                                      <th className="px-4 py-3">Categoria</th>
                                      <th className="px-4 py-3 text-right">Total Despesas</th>
                                      <th className="px-4 py-3 text-right">% do Período</th>
                                      <th className="px-4 py-3 text-right">% da Categoria</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {semCategoriaDespesa.rows.map((row, i) => (
                                      <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-200">
                                        <td className="px-4 py-3" />
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{row.subcategoryName}</td>
                                        <td className="px-4 py-3 text-right text-gray-900 dark:text-white font-medium">{formatCurrency(row.gastos)}</td>
                                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatPct(row.pctPeriodo)}</td>
                                        <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">—</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </section>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
