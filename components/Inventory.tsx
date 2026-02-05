import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { Item, Toast } from '../types';
import NewItemModal from './NewItemModal';
import StockDetailsModal from './StockDetailsModal';

export default function Inventory() {
    const { items, contracts, addItem, deleteItem, profile } = useApp();
    const { showToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<Item[] | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const isSeller = profile?.role === 'vendedor';

    // Group items by name + type + size + color (unique product identifier)
    const groupedItems = useMemo(() => {
        const groups: Record<string, Item[]> = {};
        items.forEach(item => {
            const key = `${item.name}|${item.type}|${item.size}|${item.color || ''}`;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(item);
        });
        return groups;
    }, [items]);

    // Filter aggregated groups
    const filteredGroups = useMemo(() => {
        return Object.values(groupedItems).filter(group => {
            const representative = group[0];
            const search = searchTerm.toLowerCase();
            return (
                representative.name.toLowerCase().includes(search) ||
                representative.type.toLowerCase().includes(search) ||
                group.some(item => item.code && item.code.toLowerCase().includes(search))
            );
        });
    }, [groupedItems, searchTerm]);

    const handleSave = async (newItemData: Partial<Item> & { quantity?: number }) => {
        if (newItemData.name) {
            try {
                const qty = newItemData.quantity || 1;

                // Criar um único item com quantidade ao invés de múltiplos itens
                await addItem({
                    id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
                    name: newItemData.name,
                    type: newItemData.type || 'Traje',
                    size: newItemData.size || '-',
                    status: newItemData.status as Item['status'] || 'Disponível',
                    statusColor: 'primary',
                    color: newItemData.color || '',
                    img: newItemData.img || 'https://placehold.co/400x600?text=Sem+Imagem',
                    loc: newItemData.loc || 'Estoque',
                    code: newItemData.code || '',
                    note: '',
                    price: newItemData.price || 0,

                    // Campos de quantidade
                    totalQuantity: qty,
                    availableQuantity: qty,
                    rentedUnits: 0
                });

                showToast('success', `Item adicionado com ${qty} unidade(s)!`);
                setIsModalOpen(false);
            } catch (error) {
                console.error('Erro ao salvar item:', error);
                showToast('error', 'Erro ao salvar item. Verifique as informações ou reduza o tamanho da imagem.');
            }
        } else {
            showToast('error', 'Preencha o campo obrigatório (Nome).');
        }
    };

    return (
        <div className="flex flex-col gap-8 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-col gap-1 md:gap-2">
                    <h1 className="text-2xl md:text-4xl font-black text-navy leading-tight tracking-tight flex items-center">
                        Vestuário
                    </h1>
                    <p className="text-gray-500 text-xs md:text-sm max-w-2xl">
                        Gerencie o ciclo de vida, disponibilidade e manutenção dos ativos de luxo.
                    </p>
                </div>
                {!isSeller && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full md:w-auto flex items-center justify-center gap-2 rounded-xl h-12 px-8 bg-navy text-white text-xs md:text-sm font-black uppercase tracking-widest shadow-lg shadow-navy/20 hover:scale-[1.02] transition-all active:scale-95 shrink-0"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                        <span>Novo Item</span>
                    </button>
                )}
            </div>

            {/* Filter */}
            <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-gray-400 group-focus-within:text-gold transition-colors">search</span>
                    </div>
                    <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full h-12 pl-10 pr-3 py-2.5 border-none rounded-xl bg-gray-50 text-navy placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-gold/5 focus:border-gold transition-all font-medium text-sm"
                        placeholder="Buscar por nome, tipo ou código..."
                    />
                </div>
            </div>


            {/* Items Grid (Grouped by product) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredGroups.map((group) => {
                    const product = group[0];
                    const groupKey = `${product.name}|${product.type}|${product.size}|${product.color || ''}`;

                    // Usar campos de quantidade se disponíveis, senão usar contagem de itens (compatibilidade)
                    const totalQty = group.reduce((sum, item) => sum + (item.totalQuantity || 1), 0);

                    // Calcular quantidade disponível e alugada
                    let availableQty = 0;
                    let rentedQty = 0;

                    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local

                    group.forEach(item => {
                        // 1. Identify if the item has a "blocking" physical status (Laundry, Atelier, etc.)
                        const operationalStatuses = ['Disponível', 'Alugado', 'Reservado', 'Devolução'];
                        const isPhysicallyBlocked = !operationalStatuses.includes(item.status);

                        // 2. Count how many units of THIS item ID are in contracts for today
                        const bookedUnits = contracts.reduce((count, c) => {
                            if (c.status === 'Cancelado' || c.status === 'Finalizado') return count;

                            const start = c.startDate.split('T')[0];
                            const end = c.endDate.split('T')[0];
                            const isTodayInRange = today >= start && today <= end;

                            if (!isTodayInRange) return count;

                            // Count occurrences of this item ID in the contract
                            return count + c.items.filter(id => id === item.id).length;
                        }, 0);

                        rentedQty += bookedUnits;

                        // 3. Universal Logic: Physical Status blocks 1 unit, Contracts block N units.
                        const total = item.totalQuantity || 1;
                        const maintenanceUnits = isPhysicallyBlocked ? 1 : 0;

                        const available = Math.max(0, total - bookedUnits - maintenanceUnits);
                        availableQty += available;
                    });

                    return (
                        <div
                            key={groupKey}
                            onClick={() => setSelectedGroup(group)}
                            className="group relative flex flex-col justify-end h-[440px] rounded-[24px] overflow-hidden cursor-pointer shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 bg-gray-900"
                        >
                            {/* Background Image */}
                            <div
                                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                                style={{ backgroundImage: `url('${product.img}')` }}
                            />

                            {/* Gradient Overlays */}
                            <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/40 to-transparent opacity-90 group-hover:opacity-95 transition-opacity" />
                            <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent opacity-100" />

                            {/* Top Badges */}
                            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                                <span className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
                                    {product.type}
                                </span>
                            </div>

                            {/* Status Indicator (Top Right) */}
                            <div className="absolute top-4 right-4 z-10">
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10 shadow-sm ${availableQty > 0 ? 'bg-emerald-500/20 text-emerald-100' : 'bg-red-500/20 text-red-100'}`}>
                                    <div className={`size-2 rounded-full ${availableQty > 0 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-red-400'}`} />
                                    <span className="text-[10px] font-bold uppercase">{availableQty > 0 ? 'Disponível' : 'Esgotado'}</span>
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className="relative p-6 space-y-5 z-10">
                                {/* Main Info */}
                                <div className="transform transition-transform duration-300 group-hover:-translate-y-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="size-8 rounded-lg bg-white/10 border border-white/10 text-white text-xs font-bold flex items-center justify-center">
                                            {product.size}
                                        </div>
                                        <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
                                            Total: {totalQty}
                                        </div>
                                    </div>
                                    <h3 className="text-2xl font-black text-white leading-tight tracking-tight line-clamp-2">{product.name}</h3>
                                    {product.code && <p className="text-xs font-bold text-white/50 tracking-widest uppercase mt-1">#{product.code}</p>}
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Disponíveis</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-xl font-black text-white">{availableQty}</span>
                                            <span className="text-xs font-medium text-gray-500">unid.</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 border-l border-white/10 pl-4">
                                        <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Alugados</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-xl font-black text-white/90">{rentedQty}</span>
                                            <span className="text-xs font-medium text-gray-600">unid.</span>
                                        </div>
                                    </div>
                                </div>
                            </div>


                            {/* Hover Action */}
                            <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors duration-300 pointer-events-none" />
                            <div className="absolute right-5 bottom-24 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300 delay-75">
                                <div className="size-12 rounded-full bg-gold text-navy flex items-center justify-center shadow-lg shadow-gold/20">
                                    <span className="material-symbols-outlined">arrow_forward</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal Novo Item */}
            <NewItemModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
            />

            {/* Modal Detalhes do Estoque */}
            <StockDetailsModal
                isOpen={selectedGroup !== null}
                onClose={() => setSelectedGroup(null)}
                representativeItem={selectedGroup ? selectedGroup[0] : null}
            />
        </div>
    );
}