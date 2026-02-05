
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
        const matchesSearch = c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.number && c.number.toString().includes(searchTerm)) ||
            (c.clientName && c.clientName.toLowerCase().includes(searchTerm.toLowerCase()));
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
                    <h1 className="text-navy text-2xl md:text-3xl font-black leading-tight tracking-tight">Locações</h1>
                    <p className="text-gray-400 font-medium tracking-wide text-sm mt-1 uppercase">Gestão de Locações e Reservas</p>
                </div>
                <button
                    onClick={() => openWizard()}
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
                    const clientName = getClientName(contract);

                    return (
                        <div
                            key={contract.id}
                            onClick={() => setSelectedContract(contract)}
                            className={`group relative bg-white rounded-3xl border border-gray-100/80 shadow-sm cursor-pointer transition-all duration-500 hover:shadow-lg hover:shadow-navy/5 overflow-hidden flex flex-col md:flex-row items-stretch min-h-[100px] ${selectedContract?.id === contract.id ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                        >

                            <div className="flex-1 p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">

                                {/* 1. Client & Identity */}
                                <div className="flex items-center gap-4 w-full md:w-auto min-w-[20%]">
                                    <div className="relative shrink-0">
                                        <div className="size-12 md:size-14 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100 transition-transform duration-500">
                                            <span className="text-base md:text-lg font-black text-navy/30 tracking-tighter">
                                                {getInitials(clientName)}
                                            </span>
                                        </div>
                                        <div className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-white ${statusColors.bg} shadow-sm`}></div>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest leading-none mb-1">Dono do Contrato</p>
                                        <h3 className="text-base font-black text-navy truncate tracking-tight">{clientName}</h3>
                                        <div className="mt-1">
                                            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100">
                                                #{contract.number || contract.id.split('-').pop()?.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Collection Info */}
                                <div className="hidden lg:flex flex-col min-w-[12%]">
                                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest leading-none mb-2">Acervo</p>
                                    <div className="flex items-center gap-2">
                                        <div className="size-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-sm text-gray-400">inventory_2</span>
                                        </div>
                                        <p className="text-xs font-bold text-navy/60">
                                            {contract.items.length} {contract.items.length === 1 ? 'Item' : 'Itens'}
                                        </p>
                                    </div>
                                </div>

                                {/* 3. Timeline & Progress */}
                                <div className="flex-1 w-full md:max-w-[40%] flex flex-col justify-center">
                                    <div className="flex justify-between items-end text-[9px] font-black uppercase tracking-[0.2em] mb-3">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-gray-300">Saída</span>
                                            <span className="text-navy/80">{new Date(contract.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })}</span>
                                        </div>

                                        <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${statusColors.soft} ${statusColors.text} border ${statusColors.border}`}>
                                            {contract.status}
                                        </div>

                                        <div className="flex flex-col gap-1 text-right">
                                            <span className="text-gray-300">Retorno</span>
                                            <span className="text-navy/80">{new Date(contract.endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })}</span>
                                        </div>
                                    </div>

                                    <div className="h-[2px] w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-1000 ease-out ${statusColors.bg}`}
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* 4. Financial & CTA */}
                                <div className="flex items-center gap-6 w-full md:w-auto md:min-w-[15%] justify-between md:justify-end">
                                    <div className="text-left md:text-right">
                                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest leading-none mb-1">Valor Total</p>
                                        <p className="text-xl font-black text-navy leading-none">
                                            <span className="text-xs font-bold mr-0.5 text-navy/30">R$</span>
                                            {contract.totalValue.toLocaleString('pt-BR')}
                                        </p>
                                    </div>

                                    <div className="shrink-0">
                                        <div className="size-10 md:size-12 rounded-2xl bg-navy text-white flex items-center justify-center transition-all group-active:scale-95 shadow-lg shadow-navy/20">
                                            <span className="material-symbols-outlined text-lg md:text-xl">arrow_forward</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Alert for Pending Signature */}
                            {((!contract.lesseeSignature || !contract.attendantSignature) && !contract.isPhysicallySigned) && (contract.status === 'Agendado' || contract.status === 'Ativo') && (
                                <div className="absolute top-0 right-12 px-3 py-1 bg-red-500 text-white text-[8px] font-black uppercase tracking-widest rounded-b-lg shadow-sm">
                                    Pendente Assinatura
                                </div>
                            )}
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