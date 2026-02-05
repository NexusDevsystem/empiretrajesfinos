
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Receipt } from '../types';
import { receiptsAPI } from '../services/api';
import PrintableReceipt from './PrintableReceipt';
import ConfirmationModal from './ConfirmationModal';

export default function Receipts() {
    const { user } = useApp();
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showNewModal, setShowNewModal] = useState(false);
    const [printReceipt, setPrintReceipt] = useState<Receipt | null>(null);
    const [receiptToDelete, setReceiptToDelete] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [newReceipt, setNewReceipt] = useState<Partial<Receipt>>({
        clientName: '',
        clientDoc: '',
        value: 0,
        concept: '',
        paymentMethod: 'Pix',
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        loadReceipts();
    }, []);

    const loadReceipts = async () => {
        try {
            const data = await receiptsAPI.getAll();
            setReceipts(data);
        } catch (error) {
            console.error('Error loading receipts:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const saved = await receiptsAPI.create(newReceipt);
            setReceipts(prev => [saved, ...prev]);
            setShowNewModal(false);
            setPrintReceipt(saved);
            // Reset form
            setNewReceipt({
                clientName: '',
                clientDoc: '',
                value: 0,
                concept: '',
                paymentMethod: 'Pix',
                date: new Date().toISOString().split('T')[0]
            });
        } catch (error) {
            console.error('Error creating receipt:', error);
            alert('Erro ao criar recibo.');
        }
    };

    const handleDelete = async () => {
        if (!receiptToDelete) return;
        try {
            await receiptsAPI.delete(receiptToDelete);
            setReceipts(prev => prev.filter(r => r.id !== receiptToDelete));
            setReceiptToDelete(null);
        } catch (error) {
            console.error('Error deleting receipt:', error);
        }
    };

    const filteredReceipts = useMemo(() => {
        return receipts.filter(r =>
            r.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.number.toString().includes(searchTerm) ||
            r.concept.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [receipts, searchTerm]);

    return (
        <div className="h-full flex flex-col bg-bg-light">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black text-navy tracking-tight">Recibos</h1>
                    <p className="text-sm text-gray-400 font-medium">Gerenciamento e emissão de recibos</p>
                </div>

                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                        <input
                            type="text"
                            placeholder="Buscar recibos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-10 md:h-10 pl-9 pr-4 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm font-medium"
                        />
                    </div>
                    <button
                        onClick={() => setShowNewModal(true)}
                        className="w-full md:w-auto h-12 md:h-10 px-4 bg-navy text-white font-bold rounded-xl shadow-lg shadow-navy/20 hover:scale-[1.02] flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        Novo Recibo
                    </button>
                </div>
            </header>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">
                {isLoading ? (
                    <div className="p-8 text-center text-gray-400">Carregando...</div>
                ) : filteredReceipts.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center h-full">
                        <div className="size-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-3xl text-gray-300">receipt_long</span>
                        </div>
                        <h3 className="text-navy font-bold text-lg">{searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum recibo encontrado'}</h3>
                        <p className="text-gray-400 text-sm mt-1 max-w-xs mx-auto">
                            {searchTerm ? 'Tente buscar por outro termo.' : 'Emita recibos avulsos ou através dos contratos para manter o histórico organizado.'}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Mobile View - Cards */}
                        <div className="md:hidden overflow-auto flex-1 p-4 space-y-3">
                            {filteredReceipts.map(receipt => (
                                <div key={receipt.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:border-primary/30 transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="bg-navy/5 px-2 py-1 rounded text-xs font-mono font-bold text-navy">
                                            #{receipt.number.toString().padStart(4, '0')}
                                        </div>
                                        <span className="text-xs text-gray-400 font-medium">
                                            {new Date(receipt.date).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                    <h3 className="text-navy font-bold text-lg mb-1">{receipt.clientName}</h3>
                                    <p className="text-sm text-gray-500 line-clamp-2 mb-3 leading-relaxed">{receipt.concept}</p>

                                    <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                                        <div className="text-primary font-bold font-mono text-lg">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receipt.value)}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setPrintReceipt(receipt)}
                                                className="size-9 rounded-lg bg-gray-50 text-gray-600 hover:bg-primary hover:text-white transition-all flex items-center justify-center"
                                                title="Imprimir"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">print</span>
                                            </button>
                                            <button
                                                onClick={() => setReceiptToDelete(receipt.id)}
                                                className="size-9 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                                                title="Excluir"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop View - Table */}
                        <div className="hidden md:block overflow-auto flex-1">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-4 text-[10px] font-black uppercase text-gray-400 tracking-wider">Número</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-gray-400 tracking-wider">Cliente</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-gray-400 tracking-wider">Descrição / Conceito</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-gray-400 tracking-wider">Data</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-gray-400 tracking-wider">Forma</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-gray-400 tracking-wider">Valor</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-gray-400 tracking-wider text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredReceipts.map(receipt => (
                                        <tr key={receipt.id} className="hover:bg-blue-50/30 group transition-colors">
                                            <td className="p-4 font-mono text-xs font-bold text-gray-500">#{receipt.number.toString().padStart(4, '0')}</td>
                                            <td className="p-4 font-bold text-navy">{receipt.clientName}</td>
                                            <td className="p-4 text-sm text-gray-600 truncate max-w-[200px]" title={receipt.concept}>{receipt.concept}</td>
                                            <td className="p-4 text-sm text-gray-500">{new Date(receipt.date).toLocaleDateString('pt-BR')}</td>
                                            <td className="p-4">
                                                <span className="px-2 py-0.5 rounded-lg border border-gray-100 bg-gray-50 text-[10px] font-black text-navy uppercase tracking-tighter">
                                                    {receipt.paymentMethod}
                                                </span>
                                            </td>
                                            <td className="p-4 font-mono font-bold text-navy">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receipt.value)}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        onClick={() => setPrintReceipt(receipt)}
                                                        className="size-8 rounded-lg text-gray-400 hover:text-navy hover:bg-white border border-transparent hover:border-gray-200 transition-all flex items-center justify-center"
                                                        title="Imprimir"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">print</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setReceiptToDelete(receipt.id)}
                                                        className="size-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all flex items-center justify-center"
                                                        title="Excluir"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* New Receipt Modal */}
            {showNewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <form onSubmit={handleSave}>
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <h2 className="text-xl font-black text-navy tracking-tight">Novo Recibo Avulso</h2>
                                <button type="button" onClick={() => setShowNewModal(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Nome do Pagador / Cliente *</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full h-11 px-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold text-navy"
                                            value={newReceipt.clientName}
                                            onChange={e => setNewReceipt({ ...newReceipt, clientName: e.target.value })}
                                            placeholder="Ex: Mario Silva"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">CPF/CNPJ (Opcional)</label>
                                        <input
                                            type="text"
                                            className="w-full h-11 px-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold text-navy"
                                            value={newReceipt.clientDoc || ''}
                                            onChange={e => setNewReceipt({ ...newReceipt, clientDoc: e.target.value })}
                                            placeholder="000.000.000-00"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Valor (R$)</label>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.01"
                                            className="w-full h-11 px-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold text-navy"
                                            value={newReceipt.value}
                                            onChange={e => setNewReceipt({ ...newReceipt, value: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Data</label>
                                        <input
                                            type="date"
                                            required
                                            className="w-full h-11 px-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold text-navy text-sm"
                                            value={newReceipt.date ? new Date(newReceipt.date).toISOString().split('T')[0] : ''}
                                            onChange={e => setNewReceipt({ ...newReceipt, date: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Forma de Pagamento</label>
                                    <select
                                        className="w-full h-11 px-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold text-navy text-sm appearance-none bg-white"
                                        value={newReceipt.paymentMethod}
                                        onChange={e => setNewReceipt({ ...newReceipt, paymentMethod: e.target.value })}
                                    >
                                        <option value="Pix">Pix</option>
                                        <option value="Crédito">Cartão de Crédito</option>
                                        <option value="Débito">Cartão de Débito</option>
                                        <option value="Dinheiro">Dinheiro</option>
                                        <option value="Link">Link de Pagamento</option>
                                        <option value="Transferência">Transferência</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Referente a (Descrição)</label>
                                    <textarea
                                        required
                                        className="w-full p-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium text-navy text-sm resize-none h-24"
                                        value={newReceipt.concept}
                                        onChange={e => setNewReceipt({ ...newReceipt, concept: e.target.value })}
                                        placeholder="Ex: Entrada do aluguel do terno azul..."
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 flex justify-end gap-2 border-t border-gray-100">
                                <button type="button" onClick={() => setShowNewModal(false)} className="px-6 h-11 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 active:scale-95 transition-all text-sm">Cancelar</button>
                                <button type="submit" className="px-6 h-11 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:bg-primary/90 active:scale-95 transition-all text-sm">Salvar e Imprimir</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Print Overlay */}

            {printReceipt && (
                <PrintableReceipt
                    receipt={printReceipt}
                    onClose={() => setPrintReceipt(null)}
                />
            )}

            <ConfirmationModal
                isOpen={!!receiptToDelete}
                onClose={() => setReceiptToDelete(null)}
                onConfirm={handleDelete}
                title="Excluir Recibo"
                description="Tem certeza que deseja apagar este recibo? Esta ação não pode ser desfeita."
                confirmText="Excluir Recibo"
                cancelText="Cancelar"
                isDangerous={true}
            />
        </div>
    );
}
