import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { Item, ItemStatus, Contract } from '../types';

export default function Logistics() {
    const { items, updateItem, contracts, updateContractStatus } = useApp();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'triagem' | 'lavanderia' | 'atelier'>('triagem');
    const [searchTerm, setSearchTerm] = useState('');

    // Helper: Dates
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local

    // --- LOGIC: Daily Flow ---

    // 1. Pickups Today (Saídas)
    // Contracts starting TODAY that are 'Ativo' or 'Agendado'
    const todayPickups = useMemo(() => {
        return contracts.filter(c =>
            c.startDate.split('T')[0] === today &&
            (c.status === 'Agendado' || c.status === 'Ativo')
        ).flatMap(c => {
            return c.items.map(itemId => {
                const item = items.find(i => i.id === itemId);
                return { item, contract: c };
            }).filter(x => x.item); // Filter out undefined if item moved/deleted
        });
    }, [contracts, items, today]);

    // 2. Returns Today (Retornos)
    // Contracts ending TODAY that are 'Ativo'
    // 2. Returns Today (Retornos)
    // Contracts ending TODAY or BEFORE (Late) that are 'Ativo'
    const todayReturns = useMemo(() => {
        return contracts.filter(c =>
            c.endDate.split('T')[0] <= today && // Catches overdue returns too
            c.status === 'Ativo'
        ).flatMap(c => {
            return c.items.map(itemId => {
                const item = items.find(i => i.id === itemId);
                return { item, contract: c };
            }).filter(x => x.item);
        });
    }, [contracts, items, today]);


    // --- LOGIC: Backstage Processing ---

    // Items in specific operational statuses
    const processingItems = useMemo(() => {
        return items.filter(i => {
            const matchesSearch =
                i.name.toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;

            if (activeTab === 'triagem') return i.status === 'Devolução';
            if (activeTab === 'lavanderia') return i.status === 'Na Lavanderia';
            if (activeTab === 'atelier') return i.status === 'No Atelier';
            return false;
        });
    }, [items, searchTerm, activeTab]);


    // --- HANDLERS ---

    const handleConfirmPickup = (itemId: string, itemName: string, contractId: string) => {
        // 1. Update Item Status
        updateItem(itemId, { status: 'Alugado', statusColor: 'red' });
        showToast('success', `${itemName} confirmado para saída!`);

        // 2. Check Smart Start (Auto-Start Contract)
        const contract = contracts.find(c => c.id === contractId);
        if (contract) {
            // Check if ALL OTHER items are already 'Alugado'
            const allOthersPickedUp = contract.items
                .filter(id => id !== itemId) // Exclude current (we know it's being picked up)
                .every(id => {
                    const i = items.find(x => x.id === id);
                    return i?.status === 'Alugado';
                });

            if (allOthersPickedUp) {
                updateContractStatus(contractId, 'Ativo');
                showToast('info', `Contrato #${contractId} iniciado automaticamente!`);
            }
        }
    };

    const handleReceiveItem = (itemId: string, itemName: string, contractId: string) => {
        // 1. Update Item Status
        updateItem(itemId, { status: 'Devolução', statusColor: 'orange' });
        showToast('info', `${itemName} recebido. Enviado para Triagem.`);

        // 2. Check Smart Finish (Auto-Finalize Contract)
        const contract = contracts.find(c => c.id === contractId);
        if (contract) {
            // Check if ALL OTHER items are already in 'Devolução' (or passed stages)
            const allOthersReturned = contract.items
                .filter(id => id !== itemId)
                .every(id => {
                    const i = items.find(x => x.id === id);
                    // Consider returned if status is Devolução, Lavanderia, Atelier, etc.
                    return ['Devolução', 'Na Lavanderia', 'No Atelier', 'Disponível'].includes(i?.status || '');
                });

            if (allOthersReturned) {
                updateContractStatus(contractId, 'Finalizado');
                showToast('success', `Contrato #${contractId} finalizado automaticamente!`);
            }
        }
    };

    const handleMoveTo = (itemId: string, status: ItemStatus, color: string, locationName: string) => {
        updateItem(itemId, { status: status, statusColor: color });
        showToast('success', `Item movido para ${locationName}`);
    };

    const handleRestock = (itemId: string) => {
        updateItem(itemId, { status: 'Disponível', statusColor: 'primary' });
        showToast('success', 'Item pronto! Devolvido ao estoque.');
    };


    // --- RENDER HELPERS ---

    const renderCard = (
        data: { item: Item | undefined, contract: Contract },
        action: 'pickup' | 'return'
    ) => {
        const { item, contract } = data;
        if (!item) return null;

        const isDone = action === 'pickup'
            ? item.status === 'Alugado'
            : ['Devolução', 'Na Lavanderia', 'No Atelier', 'Disponível'].includes(item.status);

        return (
            <div key={`${contract.id}-${item.id}`} className={`bg-white p-4 rounded-xl border ${isDone ? 'border-green-200 bg-green-50/50' : 'border-gray-200'} shadow-sm flex items-center justify-between group transition-all`}>
                <div className="flex gap-4 items-center">
                    <div className="size-14 rounded-lg bg-cover bg-center border border-gray-100 shadow-sm" style={{ backgroundImage: `url('${item.img}')` }}></div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{contract.eventType}</span>
                        </div>
                        <p className="font-bold text-navy leading-tight">{item.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Contrato #{contract.id}</p>
                    </div>
                </div>

                {isDone ? (
                    <div className="flex items-center gap-2 text-green-600 bg-green-100 px-3 py-1.5 rounded-lg">
                        <span className="material-symbols-outlined text-lg">check_circle</span>
                        <span className="text-xs font-bold uppercase">Concluído</span>
                    </div>
                ) : (
                    <button
                        onClick={() => action === 'pickup' ? handleConfirmPickup(item.id, item.name, contract.id) : handleReceiveItem(item.id, item.name, contract.id)}
                        className={`
                            px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-all flex items-center gap-2
                            ${action === 'pickup'
                                ? 'bg-navy text-white hover:bg-primary'
                                : 'bg-orange-500 text-white hover:bg-orange-600'}
                        `}
                    >
                        <span className="material-symbols-outlined text-lg">
                            {action === 'pickup' ? 'outbox' : 'input'}
                        </span>
                        {action === 'pickup' ? 'Liberar Saída' : 'Receber'}
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-gray-50/50">
            {/* Header / Command Center */}
            <header className="px-4 md:px-8 py-4 md:py-6 bg-white border-b border-gray-200 shadow-sm z-10">
                <div className="flex flex-col gap-4 md:gap-6">
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-navy tracking-tight flex items-center gap-2 md:gap-3">
                            <span className="material-symbols-outlined text-2xl md:text-3xl text-primary">hub</span>
                            Centro de Operações
                        </h1>
                        <p className="text-gray-500 text-xs md:text-sm mt-1">Gestão de fluxo diário e processamento de itens.</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 md:flex md:gap-4">
                        <div className="flex flex-col items-center md:items-end px-3 md:px-4 py-2 bg-blue-50 rounded-xl border border-blue-100">
                            <span className="text-[9px] md:text-[10px] font-bold uppercase text-blue-400 tracking-wider text-center">Saídas</span>
                            <span className="text-xl md:text-2xl font-black text-blue-700">{todayPickups.length}</span>
                        </div>
                        <div className="flex flex-col items-center md:items-end px-3 md:px-4 py-2 bg-orange-50 rounded-xl border border-orange-100">
                            <span className="text-[9px] md:text-[10px] font-bold uppercase text-orange-400 tracking-wider text-center">Retornos</span>
                            <span className="text-xl md:text-2xl font-black text-orange-700">{todayReturns.length}</span>
                        </div>
                        <div className="flex flex-col items-center md:items-end px-3 md:px-4 py-2 bg-purple-50 rounded-xl border border-purple-100">
                            <span className="text-[9px] md:text-[10px] font-bold uppercase text-purple-400 tracking-wider text-center">Processo</span>
                            <span className="text-xl md:text-2xl font-black text-purple-700">
                                {items.filter(i => ['Devolução', 'Na Lavanderia', 'No Atelier'].includes(i.status)).length}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Split */}
            <div className="flex-1 flex flex-col lg:overflow-hidden lg:flex-row">

                {/* Daily Flow Section */}
                <div className="flex flex-col bg-white/50 border-b lg:border-b-0 lg:border-r border-gray-200">
                    <div className="p-4 md:p-6 lg:overflow-y-auto custom-scrollbar space-y-6 md:space-y-8">

                        {/* SAÍDAS */}
                        <section>
                            <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                                <span className="material-symbols-outlined text-2xl md:text-3xl text-blue-600">flight_takeoff</span>
                                <h2 className="text-base md:text-lg font-black text-navy uppercase tracking-tight">Próximas Retiradas</h2>
                            </div>

                            <div className="flex flex-col gap-2 md:gap-3">
                                {todayPickups.length > 0 ? (
                                    todayPickups.map(data => renderCard(data, 'pickup'))
                                ) : (
                                    <div className="p-4 md:p-6 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400">
                                        <span className="material-symbols-outlined text-2xl md:text-3xl mb-1">check_circle</span>
                                        <p className="text-xs md:text-sm font-medium">Nenhuma saída pendente hoje.</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        <div className="w-full h-px bg-gray-100"></div>

                        {/* RETORNOS */}
                        <section>
                            <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                                <span className="material-symbols-outlined text-2xl md:text-3xl text-orange-600">flight_land</span>
                                <h2 className="text-base md:text-lg font-black text-navy uppercase tracking-tight">Retornos Esperados</h2>
                            </div>

                            <div className="flex flex-col gap-2 md:gap-3">
                                {todayReturns.length > 0 ? (
                                    todayReturns.map(data => renderCard(data, 'return'))
                                ) : (
                                    <div className="p-4 md:p-6 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400">
                                        <span className="material-symbols-outlined text-2xl md:text-3xl mb-1">event_available</span>
                                        <p className="text-xs md:text-sm font-medium">Nenhum retorno agendado hoje.</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>

                {/* Processing Hub Section */}
                <div className="flex-1 flex flex-col bg-gray-50">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 bg-white px-2 md:px-6 pt-2 md:pt-4 overflow-x-auto no-scrollbar">
                        {[
                            { id: 'triagem', label: 'Triagem', icon: 'inbox', color: 'orange' },
                            { id: 'lavanderia', label: 'Lavanderia', icon: 'local_laundry_service', color: 'cyan' },
                            { id: 'atelier', label: 'Manutenção', icon: 'content_cut', color: 'purple' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`
                                    flex items-center gap-1.5 md:gap-2 px-3 md:px-6 py-2.5 md:py-3 border-b-2 font-bold text-xs md:text-sm transition-all whitespace-nowrap
                                    ${activeTab === tab.id
                                        ? `border-${tab.color}-500 text-${tab.color}-600 bg-${tab.color}-50/30`
                                        : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'}
                                `}
                            >
                                <span className={`material-symbols-outlined text-base md:text-lg ${activeTab === tab.id ? '' : 'opacity-70'}`}>{tab.icon}</span>
                                <span className="hidden sm:inline">{tab.label}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] md:text-[10px] bg-gray-100 text-gray-500 font-bold`}>
                                    {items.filter(i => {
                                        if (tab.id === 'triagem') return i.status === 'Devolução';
                                        if (tab.id === 'lavanderia') return i.status === 'Na Lavanderia';
                                        if (tab.id === 'atelier') return i.status === 'No Atelier';
                                        return false;
                                    }).length}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Toolbar */}
                    <div className="p-3 md:p-4 flex gap-3 bg-white border-b border-gray-100">
                        <div className="relative flex-1">
                            <span className="material-symbols-outlined absolute left-3 top-2 md:top-2.5 text-gray-400 text-lg md:text-xl">search</span>
                            <input
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Buscar..."
                                className="w-full pl-9 md:pl-10 pr-4 py-1.5 md:py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none text-xs md:text-sm"
                            />
                        </div>
                    </div>

                    {/* Process List */}
                    <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-6 custom-scrollbar">
                        <div className="grid grid-cols-1 gap-3">
                            {processingItems.map(item => (
                                <div key={item.id} className="bg-white p-3 md:p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3 group">
                                    <div className="flex gap-3 items-center">
                                        <div className="size-14 md:size-16 rounded-lg bg-cover bg-center border border-gray-100 shrink-0" style={{ backgroundImage: `url('${item.img}')` }}></div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500">
                                                    #{item.id.slice(-4)}
                                                </span>
                                            </div>
                                            <p className="font-bold text-navy text-sm md:text-base truncate">{item.name}</p>
                                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[14px]">location_on</span>
                                                {item.status}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Buttons based on Tab */}
                                    <div className="flex gap-2 w-full">
                                        {activeTab === 'triagem' && (
                                            <>
                                                <button
                                                    onClick={() => handleMoveTo(item.id, 'Na Lavanderia', 'cyan', 'Lavanderia')}
                                                    className="flex-1 px-3 py-2.5 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                                                    title="Enviar para Lavanderia"
                                                >
                                                    <span className="material-symbols-outlined text-base">local_laundry_service</span>
                                                    <span>Lavar</span>
                                                </button>
                                                <button
                                                    onClick={() => handleMoveTo(item.id, 'No Atelier', 'purple', 'Atelier')}
                                                    className="flex-1 px-3 py-2.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                                                    title="Enviar para Manutenção"
                                                >
                                                    <span className="material-symbols-outlined text-base">content_cut</span>
                                                    <span>Reparar</span>
                                                </button>
                                                <button
                                                    onClick={() => handleRestock(item.id)}
                                                    className="flex-1 px-3 py-2.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                                                    title="Devolver ao Estoque"
                                                >
                                                    <span className="material-symbols-outlined text-base">check</span>
                                                    <span>Liberar</span>
                                                </button>
                                            </>
                                        )}

                                        {activeTab === 'lavanderia' && (
                                            <button
                                                onClick={() => handleRestock(item.id)}
                                                className="w-full px-4 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                                            >
                                                <span className="material-symbols-outlined text-base">dry_cleaning</span>
                                                Pronto / Limpo
                                            </button>
                                        )}

                                        {activeTab === 'atelier' && (
                                            <button
                                                onClick={() => handleRestock(item.id)}
                                                className="w-full px-4 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                                            >
                                                <span className="material-symbols-outlined text-base">check_circle</span>
                                                Pronto / Reparado
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {processingItems.length === 0 && (
                                <div className="py-12 flex flex-col items-center justify-center text-gray-400 opacity-60">
                                    <span className="material-symbols-outlined text-4xl mb-2">task_alt</span>
                                    <p className="text-sm font-medium">Tudo limpo por aqui!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}