import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { EnvelopeBoard } from './components/EnvelopeBoard';
import { FinancialSummary } from './components/FinancialSummary';
import { TransactionTable } from './components/TransactionTable';
import { Modal } from './components/Modal';
import { Button } from './components/Button';
import { useToast } from './contexts/ToastContext';
import { Envelope, Transaction, EnvelopeType } from './types';
import { envelopeService } from './services/envelopeService';
import { transactionService } from './services/transactionService';
import { supabase } from './lib/supabase';
import { useAuth } from './contexts/AuthContext';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';

const Home: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  
  const [processing, setProcessing] = useState({
    transfer: false,
    createEnvelope: false,
    editEnvelope: false,
    deleteEnvelope: false,
    createTransaction: false,
    deleteTransaction: false,
    updateTransaction: false,
    bulkUpdate: false,
    bulkDelete: false
  });

  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const isMounted = useRef(true);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!user) return;
    if (!isSilent) setIsInitialLoading(true);
    
    try {
      const [envs, txs] = await Promise.all([
        envelopeService.getAll(),
        transactionService.getAll()
      ]);

      if (isMounted.current) {
        setEnvelopes(envs || []);
        setTransactions(txs || []);
        setIsError(false);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      if (isMounted.current) {
        setIsError(true);
        if (!isSilent) addToast('Erro ao carregar dados financeiros.', 'error');
      }
    } finally {
      if (isMounted.current) setIsInitialLoading(false);
    }
  }, [user, addToast]);

  useEffect(() => {
    isMounted.current = true;
    fetchData();

    if (!user) return;

    const envChannel = supabase
      .channel('home-envs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'envelopes', filter: `user_id=eq.${user.id}` }, () => fetchData(true))
      .subscribe();

    const txChannel = supabase
      .channel('home-txs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` }, () => fetchData(true))
      .subscribe();

    return () => {
      isMounted.current = false;
      supabase.removeChannel(envChannel);
      supabase.removeChannel(txChannel);
    };
  }, [user, fetchData]);

  const handleTransfer = async (fromId: string, toId: string, amount: number) => {
    setProcessing(p => ({ ...p, transfer: true }));
    try {
      await envelopeService.transfer(fromId, toId, amount);
      await fetchData(true);
      addToast('Transferência realizada!', 'success');
    } catch (e) { addToast('Erro na transferência.', 'error'); }
    finally { setProcessing(p => ({ ...p, transfer: false })); }
  };

  const handleCreateTransaction = async (data: any) => {
    setProcessing(p => ({ ...p, createTransaction: true }));
    try {
      await transactionService.create(data);
      await fetchData(true);
      addToast('Lançamento adicionado!', 'success');
    } catch (e) { addToast('Erro ao criar lançamento.', 'error'); }
    finally { setProcessing(p => ({ ...p, createTransaction: false })); }
  };

  const handleUpdateTransaction = async (id: string, data: any) => {
    setProcessing(p => ({ ...p, updateTransaction: true }));
    try {
      await transactionService.update(id, data);
      await fetchData(true);
      addToast('Lançamento atualizado!', 'success');
    } catch (e) { addToast('Erro ao atualizar lançamento.', 'error'); }
    finally { setProcessing(p => ({ ...p, updateTransaction: false })); }
  };

  const handleBulkDelete = async (ids: string[]) => {
    setProcessing(p => ({ ...p, bulkDelete: true }));
    try {
      await transactionService.bulkDelete(ids);
      await fetchData(true);
      addToast(`${ids.length} transações excluídas.`, 'success');
    } catch (e) { addToast('Erro ao excluir transações.', 'error'); }
    finally { setProcessing(p => ({ ...p, bulkDelete: false })); }
  };

  const confirmDeleteTransaction = async () => {
    if (!transactionToDelete) return;
    setProcessing(p => ({ ...p, deleteTransaction: true }));
    try {
      await transactionService.delete(transactionToDelete);
      setTransactionToDelete(null);
      await fetchData(true);
      addToast('Lançamento excluído.', 'success');
    } catch (e) { addToast('Erro ao excluir.', 'error'); }
    finally { setProcessing(p => ({ ...p, deleteTransaction: false })); }
  };

  if (isInitialLoading && envelopes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
          <p className="text-gray-500 dark:text-gray-400 animate-pulse font-medium">Carregando painel...</p>
        </div>
      </div>
    );
  }

  if (isError && envelopes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-sm w-full text-center space-y-6 border border-red-100 dark:border-red-900/20">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto text-red-600">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ops! Algo deu errado</h2>
          <p className="text-gray-500 dark:text-gray-400">Não conseguimos conectar ao banco de dados agora.</p>
          <Button onClick={() => fetchData()} fullWidth className="flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4" /> Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 pb-20">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <section>
          <EnvelopeBoard 
            envelopes={envelopes} 
            setEnvelopes={setEnvelopes}
            onTransfer={handleTransfer}
            onCreateEnvelope={async (d) => {
              setProcessing(p => ({ ...p, createEnvelope: true }));
              try { await envelopeService.create({ ...d, amount: 0 }); await fetchData(true); addToast('Envelope criado!'); }
              catch(e) { addToast('Erro ao criar envelope', 'error'); }
              finally { setProcessing(p => ({ ...p, createEnvelope: false })); }
            }}
            onEditEnvelope={async (id, c, n, t) => {
              setProcessing(p => ({ ...p, editEnvelope: true }));
              try { await envelopeService.update(id, { code: c, name: n, type: t }); await fetchData(true); addToast('Envelope atualizado!'); }
              catch(e) { addToast('Erro ao atualizar', 'error'); }
              finally { setProcessing(p => ({ ...p, editEnvelope: false })); }
            }}
            onDeleteEnvelope={async (id) => {
              setProcessing(p => ({ ...p, deleteEnvelope: true }));
              try { await envelopeService.delete(id); await fetchData(true); addToast('Envelope removido'); }
              catch(e) { addToast('Erro ao excluir', 'error'); }
              finally { setProcessing(p => ({ ...p, deleteEnvelope: false })); }
            }}
            isCreating={processing.createEnvelope}
            isEditing={processing.editEnvelope}
            isDeleting={processing.deleteEnvelope}
            isTransferring={processing.transfer}
          />
        </section>
        <section>
          <FinancialSummary transactions={transactions} />
        </section>
        <section>
          <TransactionTable 
            transactions={transactions}
            envelopes={envelopes}
            onDelete={(id) => setTransactionToDelete(id)}
            onBulkDelete={handleBulkDelete}
            onUpdateEnvelope={async (txId, envId) => {
              try { await transactionService.updateEnvelope(txId, envId || null); await fetchData(true); addToast('Atualizado!'); }
              catch(e) { addToast('Erro ao atualizar', 'error'); }
            }}
            onBulkUpdateEnvelope={async (ids, envId) => {
              setProcessing(p => ({ ...p, bulkUpdate: true }));
              try { await transactionService.bulkUpdateEnvelope(ids, envId || null); await fetchData(true); addToast('Atualizados!'); }
              catch(e) { addToast('Erro na atualização', 'error'); }
              finally { setProcessing(p => ({ ...p, bulkUpdate: false })); }
            }}
            onAddTransaction={handleCreateTransaction}
            onUpdateTransaction={handleUpdateTransaction}
            onRefresh={() => fetchData(true)}
            isAdding={processing.createTransaction}
            isUpdating={processing.updateTransaction}
            isBulkUpdating={processing.bulkUpdate || processing.bulkDelete}
          />
        </section>
      </main>
      <Modal isOpen={!!transactionToDelete} onClose={() => setTransactionToDelete(null)} title="Excluir Lançamento">
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">Tem certeza que deseja excluir permanentemente este lançamento?</p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setTransactionToDelete(null)}>Cancelar</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmDeleteTransaction} isLoading={processing.deleteTransaction}>Confirmar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Home;