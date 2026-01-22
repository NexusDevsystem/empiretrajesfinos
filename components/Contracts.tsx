
import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Contract } from '../types';
import { getContractColor } from '../utils/colorUtils';
import PrintableContract from './PrintableContract';
import ContractDetails from './ContractDetails';

export default function Contracts() {
    const { contracts, clients, items, updateContractStatus, deleteContract, openWizard, selectedContractId, setSelectedContractId } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Todos');

    // Derived state from context ID
    const selectedContract = useMemo(() => contracts.find(c => c.id === selectedContractId) || null, [contracts, selectedContractId]);

    // Helper to match existing setter signature
    const setSelectedContract = (c: Contract | null) => {
        setSelectedContractId(c ? c.id : null);
        if (c) setViewMode('details');
    };

    const [viewMode, setViewMode] = useState<'details' | 'print'>('details');

    const filteredContracts = contracts.filter(c => {
        const matchesSearch = c.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'Todos' || c.status === statusFilter;
        return matchesSearch && matchesStatus;
    }).sort((a, b) => {
        const statusOrder: Record<string, number> = { 'Ativo': 1, 'Agendado': 2, 'Finalizado': 3, 'Cancelado': 4 };
        return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
    });

    const getClientName = (contract: Contract) => contract.clientName || clients.find(c => c.id === contract.clientId)?.name || 'Cliente Removido';


    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

    const getProgress = (start: string, end: string) => {
        const s = new Date(start).getTime();
        const e = new Date(end).getTime();
        const now = new Date().getTime();
        const total = e - s;
        const elapsed = now - s;
        if (elapsed < 0) return 0;
        if (elapsed > total) return 100;
        return (elapsed / total) * 100;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Ativo': return { bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-200', soft: 'bg-emerald-50', shadow: 'shadow-emerald-500/20' };
            case 'Agendado': return { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-200', soft: 'bg-blue-50', shadow: 'shadow-blue-500/20' };
            case 'Finalizado': return { bg: 'bg-gray-500', text: 'text-gray-500', border: 'border-gray-200', soft: 'bg-gray-100', shadow: 'shadow-gray-500/10' };
            case 'Cancelado': return { bg: 'bg-red-500', text: 'text-red-500', border: 'border-red-200', soft: 'bg-red-50', shadow: 'shadow-red-500/20' };
            default: return { bg: 'bg-gold', text: 'text-gold', border: 'border-gold/20', soft: 'bg-gold/5', shadow: 'shadow-gold/20' };
        }
    };

    return (
        <div className="flex flex-col gap-8 pb-10 relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
                <div>
                    <h1 className="text-4xl font-black text-navy tracking-tighter">
                        CONTRATOS
                        <span className="text-primary">.</span>
                    </h1>
                    <p className="text-gray-400 font-medium tracking-wide text-sm mt-1 uppercase">Gestão de Locações e Reservas</p>
                </div>
                <button
                    onClick={openWizard}
                    className="group relative overflow-hidden bg-navy text-white px-6 py-3 rounded-2xl font-bold shadow-xl shadow-navy/20 transition-all hover:scale-105 active:scale-95"
                >
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <div className="relative flex items-center gap-3">
                        <span className="material-symbols-outlined">add_circle</span>
                        NOVO CONTRATO
                    </div>
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 shrink-0">
                <div className="flex-1 relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-gray-300 group-focus-within:text-primary transition-colors">search</span>
                    </div>
                    <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-12 pr-4 py-3.5 border-none rounded-2xl bg-white shadow-sm text-navy placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                        placeholder="Buscar por ID, cliente..."
                    />
                </div>
                <div className="flex overflow-x-auto gap-2 p-1 bg-gray-100/50 rounded-2xl no-scrollbar">
                    {['Todos', 'Ativo', 'Agendado', 'Finalizado'].map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`whitespace-nowrap px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${statusFilter === status
                                ? 'bg-white text-navy shadow-md scale-100'
                                : 'text-gray-500 hover:text-navy hover:bg-white/50'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                {filteredContracts.map((contract) => {
                    const statusColors = getStatusColor(contract.status);
                    const progress = getProgress(contract.startDate, contract.endDate);
                    const contractColor = getContractColor(contract.id);

                    return (
                        <div
                            key={contract.id}
                            onClick={() => setSelectedContract(contract)}
                            className={`group relative bg-white rounded-[28px] border border-gray-100 p-0 shadow-sm cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden ${selectedContract?.id === contract.id ? 'ring-2 ring-primary ring-offset-2 scale-[0.99]' : ''}`}
                        >
                            {/* Accent Line */}
                            <div className="absolute left-0 top-0 bottom-0 w-2 transition-all duration-300" style={{ backgroundColor: contractColor }}></div>

                            <div className="p-5 md:p-6 md:pl-10 flex flex-col gap-5 relative z-10">
                                {/* Top Row: Client & ID */}
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="relative shrink-0">
                                            <div className={`size-12 md:size-14 rounded-2xl ${statusColors.soft} flex items-center justify-center shadow-inner`}>
                                                <span className={`text-lg md:text-xl font-black ${statusColors.text}`}>
                                                    {getInitials(getClientName(contract))}
                                                </span>
                                            </div>
                                            <div className={`absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-white ${statusColors.bg} ${statusColors.shadow} shadow-lg`}></div>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Dono do Contrato</p>
                                            <h3 className="text-base md:text-lg font-black text-navy leading-tight truncate">{getClientName(contract)}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-gray-50 text-gray-400 border border-gray-100">
                                                    #{contract.id.split('-')[2]}
                                                </span>
                                                {(!contract.lesseeSignature || !contract.attendantSignature) && (contract.status === 'Agendado' || contract.status === 'Ativo') && (
                                                    <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-red-500 bg-red-50 px-2 py-0.5 rounded-lg border border-red-100 animate-pulse">
                                                        Pendente Assinatura
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="hidden sm:block text-right">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Valor Total</p>
                                        <p className="text-xl font-black text-navy">R$ {contract.totalValue.toLocaleString('pt-BR')}</p>
                                    </div>
                                </div>

                                {/* Middle Row: Items & Timeline */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center border-y border-gray-50 py-5 md:py-0 md:border-none">
                                    {/* Items Preview */}
                                    <div className="flex items-center gap-4">
                                        <div className="flex -space-x-3">
                                            {contract.items.slice(0, 4).map((itemId, i) => (
                                                <div
                                                    key={i}
                                                    className="size-9 rounded-xl border-2 border-white bg-gray-100 bg-cover bg-center shadow-lg shadow-black/5 relative hover:z-20 hover:-translate-y-1 transition-all"
                                                    style={{ backgroundImage: `url('${items.find(it => it.id === itemId)?.img}')` }}
                                                >
                                                </div>
                                            ))}
                                            {contract.items.length > 4 && (
                                                <div className="size-9 rounded-xl border-2 border-white bg-navy text-white flex items-center justify-center text-[10px] font-black shadow-lg z-10">
                                                    +{contract.items.length - 4}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Acervo</p>
                                            <p className="text-xs font-bold text-navy/70">
                                                {contract.items.length} {contract.items.length === 1 ? 'Item selecionado' : 'Itens selecionados'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Timeline */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-end text-[9px] font-black uppercase tracking-[0.15em]">
                                            <div className="text-left">
                                                <span className="text-gray-400 block mb-0.5">Saída</span>
                                                <span className="text-navy">{new Date(contract.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })}</span>
                                            </div>
                                            <div className="text-center">
                                                <span className={`px-2 py-1 rounded-lg ${statusColors.soft} ${statusColors.text} border ${statusColors.border}`}>{contract.status}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-gray-400 block mb-0.5">Retorno</span>
                                                <span className="text-navy">{new Date(contract.endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })}</span>
                                            </div>
                                        </div>
                                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden p-[1px]">
                                            <div
                                                className={`h-full rounded-full transition-all duration-[1500ms] ${statusColors.bg} ${statusColors.shadow} shadow-lg relative`}
                                                style={{ width: `${progress}%` }}
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Mobile Footer Row (Price) */}
                                <div className="flex sm:hidden items-center justify-between pt-1">
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Total da Reserva</p>
                                        <p className="text-xl font-black text-navy">R$ {contract.totalValue.toLocaleString('pt-BR')}</p>
                                    </div>
                                    <div className="size-10 rounded-2xl bg-gray-50 flex items-center justify-center text-navy shadow-inner">
                                        <span className="material-symbols-outlined text-xl">arrow_forward</span>
                                    </div>
                                </div>

                                {/* Desktop Action indicator */}
                                <div className="hidden sm:flex absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                    <div className="size-12 rounded-2xl bg-navy text-white flex items-center justify-center shadow-xl shadow-navy/20">
                                        <span className="material-symbols-outlined">arrow_forward</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Contract Views (Details or Print) */}
            {
                selectedContract && (
                    viewMode === 'details' ? (
                        <ContractDetails
                            contract={selectedContract}
                            client={clients.find(c => c.id === selectedContract.clientId) || { id: selectedContract.clientId, name: selectedContract.clientName || 'Cliente Removido', phone: 'N/A', email: 'N/A' } as any}
                            items={items.filter(i => selectedContract.items.includes(i.id))}
                            onClose={() => setSelectedContract(null)}
                            onPrint={() => setViewMode('print')}
                        />
                    ) : (
                        <PrintableContract
                            contract={selectedContract}
                            client={clients.find(c => c.id === selectedContract.clientId) || { id: selectedContract.clientId, name: selectedContract.clientName || 'Cliente Removido', phone: 'N/A', email: 'N/A' } as any}
                            items={items.filter(i => selectedContract.items.includes(i.id))}
                            onClose={() => setViewMode('details')} // Back to details instead of closing all
                        />
                    )
                )
            }
        </div >
    );
}