import React, { useState } from 'react';
import { Transaction } from '../types';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';

interface NewTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function NewTransactionModal({ isOpen, onClose }: NewTransactionModalProps) {
    const { addTransaction } = useApp();
    const { showToast } = useToast();

    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const categories = type === 'expense'
        ? ['Energia', 'Água', 'Internet', 'Aluguel', 'Lavanderia', 'Manutenção', 'Compra de Material', 'Marketing', 'Outros']
        : ['Venda Avulsa', 'Ajuste de Caixa', 'Outros'];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!amount || !description || !category) {
            showToast('error', 'Preencha todos os campos obrigatórios.');
            return;
        }

        const newTransaction: Transaction = {
            id: crypto.randomUUID(),
            type,
            amount: parseFloat(amount),
            description,
            category,
            date: new Date(date).toISOString(),
        };

        addTransaction(newTransaction);
        showToast('success', `${type === 'expense' ? 'Despesa' : 'Receita'} registrada com sucesso!`);

        // Reset form
        setAmount('');
        setDescription('');
        setCategory('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/20 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xl font-black text-navy">Nova Transação</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    {/* Type Toggle */}
                    <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                        <button
                            type="button"
                            onClick={() => setType('income')}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${type === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <span className="material-symbols-outlined text-lg">arrow_downward</span>
                            Receita
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('expense')}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${type === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <span className="material-symbols-outlined text-lg">arrow_upward</span>
                            Despesa
                        </button>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Valor (R$)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                            <input
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-lg text-navy"
                                placeholder="0,00"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Descrição</label>
                        <input
                            type="text"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-navy"
                            placeholder="Ex: Conta de Luz Referente a Jan/24"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Categoria</label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-navy appearance-none"
                                required
                            >
                                <option value="">Selecione...</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Data</label>
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-navy"
                                required
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 ${type === 'income' ? 'bg-green-600 shadow-green-600/20 hover:bg-green-700' : 'bg-red-600 shadow-red-600/20 hover:bg-red-700'}`}
                        >
                            <span className="material-symbols-outlined">check</span>
                            Confirmar Lançamento
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
