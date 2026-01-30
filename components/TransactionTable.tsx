
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, Trash2, Plus, Pencil,
  RefreshCw, ChevronDown, 
  Upload, FileSpreadsheet, Tag, AlertCircle, X
} from 'lucide-react';
// @ts-ignore
import * as ReactWindow from 'react-window';
// @ts-ignore
import AutoSizerModule from 'react-virtualized-auto-sizer';
import { Transaction, Envelope } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { Button } from './Button';
import { Modal } from './Modal';
import { useToast } from '../contexts/ToastContext';
import { SearchableSelect } from './SearchableSelect';
import { TransactionModal } from './TransactionModal';
import { ConfirmModal } from './ConfirmModal';

const List = (ReactWindow as any).FixedSizeList;
const AutoSizer = (AutoSizerModule as any).default || AutoSizerModule;

const GRID_TEMPLATE = "50px 100px 100px 1fr 120px 200px 80px";

interface TransactionTableProps {
  transactions: Transaction[];
  envelopes: Envelope[];
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => Promise<void>;
  onUpdateEnvelope: (txId: string, envId: string | null) => void | Promise<void>;
  onBulkUpdateEnvelope: (ids: string[], envId: string | null) => Promise<void>;
  onAddTransaction: (data: any) => Promise<void>;
  onUpdateTransaction: (id: string, data: any) => Promise<void>;
  onRefresh: () => void | Promise<void>;
  isAdding: boolean;
  isUpdating: boolean;
  isBulkUpdating: boolean;
}

const TransactionRow = ({ index, style, data }: any) => {
  const { 
    items, envelopes, selectedIds, toggleSelect, editingTxId, 
    setEditingTxId, onUpdateEnvelope, onDelete, onEdit, sortedEnvelopes 
  } = data;
  
  const tx = items[index];
  if (!tx) return null;

  const linkedEnvelope = envelopes.find((e: any) => e.id === tx.envelopeId);
  const isSelected = selectedIds.has(tx.id);
  const isEditing = editingTxId === tx.id;

  const rowStyle = {
    ...style,
    zIndex: isEditing ? 50 : 1,
    overflow: isEditing ? 'visible' : 'hidden'
  };

  return (
    <div 
      style={{ ...rowStyle, gridTemplateColumns: GRID_TEMPLATE }} 
      className={`grid items-center border-b border-gray-100 dark:border-gray-700/50 border-l-4 transition-colors ${isSelected ? 'bg-primary-50 dark:bg-primary-900/10 border-primary-500' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-transparent'}`}
    >
      <div className="flex justify-center">
        <input 
          type="checkbox" 
          className="rounded border-gray-300 text-primary-600 w-4 h-4 cursor-pointer focus:ring-primary-500" 
          checked={isSelected} 
          onChange={() => toggleSelect(tx.id)} 
        />
      </div>
      <div className="px-2 text-[11px] text-gray-500 dark:text-gray-400 truncate">{formatDate(tx.date)}</div>
      <div className="px-2 text-center">
        <span className={`inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded-full border ${tx.type === 'credit' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-red-600 bg-red-50 border-red-100'}`}>
          {tx.type === 'credit' ? 'CRÉD' : 'DÉB'}
        </span>
      </div>
      <div className="px-2 text-xs font-medium text-gray-900 dark:text-white truncate">{tx.description}</div>
      <div className={`px-2 text-xs font-bold text-right truncate ${tx.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(tx.amount)}</div>
      <div className="px-2">
        {isEditing ? (
          <div className="relative z-50">
            <SearchableSelect 
              autoFocus 
              options={sortedEnvelopes} 
              value={tx.envelopeId || ''} 
              onChange={(val) => { onUpdateEnvelope(tx.id, val); setEditingTxId(null); }} 
            />
          </div>
        ) : (
          <div onClick={() => setEditingTxId(tx.id)} className="cursor-pointer px-2 py-1 rounded border border-dashed border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-[10px] truncate flex items-center justify-between">
            {linkedEnvelope ? linkedEnvelope.name : <span className="text-amber-500 font-bold">Sem Envelope</span>}
            <ChevronDown className="w-2.5 h-2.5 opacity-40" />
          </div>
        )}
      </div>
      <div className="px-2 flex justify-center gap-1">
        <button onClick={() => onEdit(tx)} className="text-gray-400 hover:text-primary-500 p-1.5 transition-colors" title="Editar" type="button"><Pencil className="w-3.5 h-3.5" /></button>
        <button onClick={() => onDelete(tx.id)} className="text-gray-400 hover:text-red-500 p-1.5 transition-colors" title="Excluir" type="button"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
};

export const TransactionTable: React.FC<TransactionTableProps> = ({ 
  transactions, envelopes, onDelete, onBulkDelete, onUpdateEnvelope, onBulkUpdateEnvelope,
  onRefresh, isAdding, isUpdating, isBulkUpdating, onAddTransaction, onUpdateTransaction
}) => {
  const { addToast } = useToast();
  const [textFilter, setTextFilter] = useState('');
  const [showOnlyUnallocated, setShowOnlyUnallocated] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAssignConfirm, setShowAssignConfirm] = useState(false);

  const sortedEnvelopes = useMemo(() => [...envelopes].sort((a, b) => a.name.localeCompare(b.name)), [envelopes]);

  const filteredTransactions = useMemo(() => {
    let res = transactions;
    if (textFilter) {
      const s = textFilter.toLowerCase();
      res = res.filter(t => t.description.toLowerCase().includes(s));
    }
    if (showOnlyUnallocated) {
      res = res.filter(t => !t.envelopeId);
    }
    return res;
  }, [transactions, textFilter, showOnlyUnallocated]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map(t => t.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedIds.size === 0) return;
    setShowDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      await onBulkDelete(Array.from(selectedIds));
      clearSelection();
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  const openAssignModal = () => {
    if (selectedIds.size === 0) return;
    setShowAssignModal(true);
  };

  const requestBulkAssign = () => {
    setShowAssignModal(false);
    setShowAssignConfirm(true);
  };

  const confirmBulkAssign = async () => {
    setShowAssignConfirm(false);
    try {
      await onBulkUpdateEnvelope(Array.from(selectedIds), selectedEnvelopeId);
      clearSelection();
      setSelectedEnvelopeId(null);
    } catch (err) {
      console.error('Erro na atualização em massa:', err);
    }
  };

  const itemData = useMemo(() => ({
    items: filteredTransactions, 
    envelopes, 
    selectedIds, 
    toggleSelect,
    editingTxId, 
    setEditingTxId, 
    onUpdateEnvelope, 
    onDelete, 
    onEdit: (tx: Transaction) => { setEditingTransaction(tx); setIsModalOpen(true); },
    sortedEnvelopes
  }), [filteredTransactions, envelopes, selectedIds, editingTxId, onUpdateEnvelope, onDelete, sortedEnvelopes]);

  const allSelected = selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-[600px] overflow-hidden relative">
      
      {selectedIds.size > 0 && (
        <div 
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-primary-600 dark:bg-primary-700 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-4 duration-300 border-2 border-primary-400"
          style={{ zIndex: 9999 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold">
              {selectedIds.size}
            </div>
            <span className="font-bold text-sm tracking-tight">Transações Selecionadas</span>
          </div>

          <div className="h-8 w-px bg-white/20" />

          <div className="flex gap-2">
            <button 
              onClick={openAssignModal} 
              className="h-10 px-4 bg-white text-primary-700 rounded-xl text-xs font-bold hover:bg-primary-50 transition-colors shadow-sm"
              type="button"
            >
              Atribuir Envelope
            </button>
            <button 
              id="btn-bulk-delete"
              onClick={handleBulkDelete} 
              className="h-10 px-4 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-colors shadow-sm flex items-center gap-2 border border-red-400"
              type="button"
            >
              <Trash2 className="w-3.5 h-3.5" /> Excluir
            </button>
            <button 
              onClick={clearSelection} 
              className="h-10 w-10 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors"
              type="button"
              title="Cancelar Seleção"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="p-4 border-b border-gray-100 dark:border-gray-700 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary-500" /> Lançamentos
          </h3>
          <div className="flex gap-2">
            <Button onClick={() => setIsModalOpen(true)} className="h-9 px-3 text-xs sm:px-4 flex items-center gap-2" type="button">
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Nova Transação</span>
            </Button>
            <Button onClick={() => setIsImportModalOpen(true)} variant="outline" className="text-xs h-9" type="button">
              <Upload className="w-3.5 h-3.5 mr-2" /> Importar CSV
            </Button>
            <Button onClick={onRefresh} variant="ghost" className="p-2 h-9 w-9" type="button">
              <RefreshCw className={`w-4 h-4 ${isAdding || isUpdating || isBulkUpdating ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Filtrar por descrição..." 
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-1 focus:ring-primary-500 transition-all" 
              value={textFilter} 
              onChange={e => setTextFilter(e.target.value)} 
            />
          </div>
          <div className="flex items-center">
            <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all select-none ${showOnlyUnallocated ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer" checked={showOnlyUnallocated} onChange={e => setShowOnlyUnallocated(e.target.checked)} />
              <span className="text-[11px] font-bold uppercase tracking-tight">Sem Envelope</span>
            </label>
          </div>
        </div>
      </div>

      <div className="grid bg-gray-50 dark:bg-gray-700/50 text-[10px] uppercase text-gray-400 font-bold border-b border-gray-100 dark:border-gray-700" style={{ gridTemplateColumns: GRID_TEMPLATE }}>
        <div className="py-2 flex justify-center">
          <input 
            type="checkbox" 
            className="rounded border-gray-300 text-primary-600 w-4 h-4 cursor-pointer focus:ring-primary-500" 
            checked={allSelected} 
            onChange={toggleSelectAll} 
          />
        </div>
        <div className="px-2 py-2">Data</div>
        <div className="px-2 py-2 text-center">Tipo</div>
        <div className="px-2 py-2">Descrição</div>
        <div className="px-2 py-2 text-right">Valor</div>
        <div className="px-2 py-2">Envelope</div>
        <div className="px-2 py-2 text-center">Ações</div>
      </div>

      <div className="flex-1 min-h-0">
        <AutoSizer>
          {({ height, width }: any) => (
            <div className="relative h-full w-full">
              {filteredTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                  <AlertCircle className="w-8 h-8 opacity-20" />
                  <p className="text-xs font-medium">Nenhum lançamento encontrado.</p>
                </div>
              ) : (
                <List height={height} width={width} itemCount={filteredTransactions.length} itemSize={44} itemData={itemData} overscanCount={5}>
                  {TransactionRow}
                </List>
              )}
            </div>
          )}
        </AutoSizer>
      </div>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={async (data, id) => {
          if (id) await onUpdateTransaction(id, data);
          else await onAddTransaction(data);
          setIsModalOpen(false);
        }}
        envelopes={envelopes}
        transaction={editingTransaction}
        isLoading={isAdding || isUpdating}
      />

      {showAssignModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4"
          onClick={() => {
            setShowAssignModal(false);
            setSelectedEnvelopeId(null);
          }}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl p-8 w-full max-w-sm shadow-2xl animate-in zoom-in duration-200 border border-gray-100 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
              Selecionar Envelope
            </h3>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {selectedIds.size} transação(ões) selecionada(s) para mover.
            </p>

            <select
              value={selectedEnvelopeId || ''}
              onChange={(e) => setSelectedEnvelopeId(e.target.value || null)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all mb-8 dark:text-white font-medium"
              autoFocus
            >
              <option value="">Sem envelope (Desvincular)</option>
              {sortedEnvelopes.map(env => (
                <option key={env.id} value={env.id}>
                  {env.code} - {env.name}
                </option>
              ))}
            </select>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowAssignModal(false); setSelectedEnvelopeId(null); }}
                className="px-6 py-2.5 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-bold"
                type="button"
              >
                Cancelar
              </button>
              <button
                onClick={requestBulkAssign}
                className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all text-sm font-bold shadow-lg shadow-primary-500/20"
                type="button"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Confirmar Exclusão"
        message={`Deseja excluir permanentemente ${selectedIds.size} transação(ões)?\n\nEsta ação não pode ser desfeita.`}
        type="danger"
        confirmText="Excluir Agora"
        cancelText="Cancelar"
        onConfirm={confirmBulkDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmModal
        isOpen={showAssignConfirm}
        title="Confirmar Atribuição"
        message={`Deseja atribuir ${selectedIds.size} transação(ões) ao envelope selecionado?\n\nDestino: ${
          selectedEnvelopeId 
            ? envelopes.find(e => e.id === selectedEnvelopeId)?.name || 'Envelope selecionado'
            : 'Remover envelope (Sem atribuição)'
        }`}
        type="info"
        confirmText="Confirmar"
        cancelText="Voltar"
        onConfirm={confirmBulkAssign}
        onCancel={() => setShowAssignConfirm(false)}
      />

      <Modal isOpen={isImportModalOpen} onClose={() => !isUploading && setIsImportModalOpen(false)} title="Importar Lançamentos">
        <div className="space-y-6">
          <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={e => setImportFile(e.target.files?.[0] || null)} />
          <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-10 flex flex-col items-center gap-4 bg-gray-50 dark:bg-gray-900/50">
            {importFile ? (
              <div className="text-center"><FileSpreadsheet className="w-12 h-12 text-primary-500 mx-auto mb-2" /><p className="text-sm font-medium">{importFile.name}</p></div>
            ) : (
              <div className="text-center"><Upload className="w-12 h-12 text-gray-300 mx-auto mb-2" /><Button onClick={() => fileInputRef.current?.click()} variant="outline" type="button">Escolher CSV</Button></div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsImportModalOpen(false)} type="button">Cancelar</Button>
            <Button disabled={!importFile} isLoading={isUploading} onClick={onRefresh} type="button">Processar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
