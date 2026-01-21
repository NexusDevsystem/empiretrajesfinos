
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

    const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Cliente Removido';


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
            case 'Ativo': return { bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-200', soft: 'bg-emerald-50' };
            case 'Agendado': return { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-200', soft: 'bg-blue-50' };
            case 'Finalizado': return { bg: 'bg-gray-500', text: 'text-gray-500', border: 'border-gray-200', soft: 'bg-gray-100' };
            case 'Cancelado': return { bg: 'bg-red-500', text: 'text-red-500', border: 'border-red-200', soft: 'bg-red-50' };
            default: return { bg: 'bg-purple-500', text: 'text-purple-500', border: 'border-purple-200', soft: 'bg-purple-50' };
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
                            className={`group relative bg-white rounded-[24px] border border-gray-100 p-0 cursor-pointer transition-all duration-300 hover:shadow-lg overflow-hidden ${selectedContract?.id === contract.id ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                        >
                            {/* Left Color Strip */}
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300" style={{ backgroundColor: contractColor }}></div>

                            <div className="p-4 md:p-6 md:pl-8 flex flex-col md:flex-row gap-4 md:gap-6 relative z-10">
                                {/* Client Info Section */}
                                <div className="flex items-start gap-4 min-w-[200px]">
                                    <div className="relative">
                                        <div className={`size-14 rounded-2xl ${statusColors.soft} flex items-center justify-center shadow-inner`}>
                                            <span className={`text-xl font-black ${statusColors.text}`}>
                                                {getInitials(getClientName(contract.clientId))}
                                            </span>
                                        </div>
                                        <div className={`absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-white ${statusColors.bg}`}></div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Cliente</p>
                                        <h3 className="text-lg font-black text-navy leading-tight line-clamp-1">{getClientName(contract.clientId)}</h3>
                                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-50 text-gray-500 border border-gray-100">
                                            #{contract.id.split('-')[2]}
                                        </span>
                                        {(!contract.lesseeSignature || !contract.attendantSignature) && (contract.status === 'Agendado' || contract.status === 'Ativo') && (
                                            <div className="mt-1 flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 w-fit animate-pulse" title="Assinatura Pendente">
                                                <span className="material-symbols-outlined text-[10px]">warning</span>
                                                <span className="text-[9px] font-bold uppercase tracking-wide">Assinar</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Timeline & Items Section */}
                                <div className="flex-1 flex flex-col justify-center gap-4">
                                    {/* Items Preview */}
                                    <div className="flex items-center gap-3">
                                        <div className="flex -space-x-3">
                                            {contract.items.slice(0, 4).map((itemId, i) => (
                                                <div key={i} className="size-8 rounded-full border-2 border-white bg-gray-100 bg-cover bg-center shadow-sm relative group/item" style={{ backgroundImage: `url('${items.find(it => it.id === itemId)?.img}')` }}>
                                                </div>
                                            ))}
                                            {contract.items.length > 4 && (
                                                <div className="size-8 rounded-full border-2 border-white bg-navy text-white flex items-center justify-center text-[10px] font-bold shadow-sm z-10">
                                                    +{contract.items.length - 4}
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs font-medium text-gray-500">
                                            {contract.items.length} {contract.items.length === 1 ? 'Item' : 'Itens'}
                                        </p>
                                    </div>

                                    {/* Timeline */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                            <span>{new Date(contract.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })}</span>
                                            <span className={statusColors.text}>{contract.status}</span>
                                            <span>{new Date(contract.endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })}</span>
                                        </div>
                                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${statusColors.bg}`}
                                                style={{ width: `${progress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Price & Action */}
                                <div className="flex flex-row md:flex-col items-center md:items-end justify-between min-w-0 md:min-w-[100px] border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 border-dashed">
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</p>
                                        <p className="text-xl font-black text-navy">R$ {contract.totalValue}</p>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-300">
                                        <div className="size-8 rounded-full bg-gray-50 flex items-center justify-center text-navy hover:bg-navy hover:text-white transition-colors">
                                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                        </div>
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
                            client={clients.find(c => c.id === selectedContract.clientId)!}
                            items={items.filter(i => selectedContract.items.includes(i.id))}
                            onClose={() => setSelectedContract(null)}
                            onPrint={() => setViewMode('print')}
                        />
                    ) : (
                        <PrintableContract
                            contract={selectedContract}
                            client={clients.find(c => c.id === selectedContract.clientId)!}
                            items={items.filter(i => selectedContract.items.includes(i.id))}
                            onClose={() => setViewMode('details')} // Back to details instead of closing all
                        />
                    )
                )
            }
        </div >
    );
}