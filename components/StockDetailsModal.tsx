import React, { useState, useMemo } from 'react';
import { Item } from '../types';
import { getContractColor } from '../utils/colorUtils';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';

interface StockDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    representativeItem: Item | null; // Representative item of the group
}

export default function StockDetailsModal({ isOpen, onClose, representativeItem }: StockDetailsModalProps) {
    const { items: globalItems, deleteItem, addItem, updateItem, contracts, updateContractStatus, navigateTo, profile } = useApp();
    const { showToast } = useToast();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Item>>({});
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [checkInId, setCheckInId] = useState<string | null>(null);
    const [isEditingProduct, setIsEditingProduct] = useState(false);
    const [bulkEditForm, setBulkEditForm] = useState<Partial<Item>>({});

    const isSeller = profile?.role === 'vendedor';

    // Selection Mode
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Sync with global items in real-time
    const currentItems = useMemo(() => {
        if (!representativeItem) return [];
        return globalItems.filter(i =>
            i.name === representativeItem.name &&
            i.type === representativeItem.type &&
            i.size === representativeItem.size &&
            (i.color || '') === (representativeItem.color || '')
        );
    }, [globalItems, representativeItem]);

    const handleCheckIn = (item: Item, needsLaundry: boolean) => {
        const newStatus = needsLaundry ? 'Na Lavanderia' : 'Disponível';
        const newColor = needsLaundry ? 'cyan' : 'primary';

        // 1. Update Item Status
        updateItem(item.id, {
            status: newStatus,
            statusColor: newColor,
            loc: needsLaundry ? 'Lavanderia' : 'Estoque'
        });

        // 2. Smart Sync: Find and Finalize associated Active Contract
        // If the item is being returned, the rental period is effectively over for this cycle.
        const activeContract = contracts.find(c =>
            c.items.includes(item.id) &&
            (c.status === 'Ativo' || c.status === 'Agendado')
        );

        if (activeContract) {
            updateContractStatus(activeContract.id, 'Finalizado');
        }

        setCheckInId(null);
    };

    // View State
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [currentDate, setCurrentDate] = useState(new Date());

    // Identify the representative product info from the first item
    const product = representativeItem;

    // --- TIMELINE LOGIC (List View) ---
    const TIMELINE_DAYS = 7;
    const timelineDates = useMemo(() => {
        // Calculate Monday of current week
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today.setDate(diff));
        monday.setHours(0, 0, 0, 0);

        return Array.from({ length: TIMELINE_DAYS }, (_, i) => {
            const d = new Date(monday);
            d.setDate(d.getDate() + i);
            return d;
        });
    }, []);

    // --- CALENDAR LOGIC (Calendar View) ---
    const calendarDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const days = [];

        // Padding for previous month
        for (let i = 0; i < firstDay.getDay(); i++) {
            days.push(null);
        }

        // Days of current month
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }

        return days;
    }, [currentDate]);

    const changeMonth = (delta: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setCurrentDate(newDate);
    };

    const handleAddUnit = () => {
        if (!product) return;
        const newItem: Item = {
            ...product,
            id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36), // Robust ID
            status: 'Disponível',
            statusColor: 'primary',
            loc: 'Estoque',
            note: '',
            totalQuantity: 1,
            availableQuantity: 1,
            rentedUnits: 0
        };
        addItem(newItem);
        showToast('success', 'Nova unidade adicionada com sucesso!');
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteItem(id);
            setDeleteConfirmId(null);
            showToast('success', 'Item removido do acervo com sucesso.');
            if (currentItems.length === 1 && currentItems[0].id === id) onClose();
        } catch (error) {
            console.error('Erro ao deletar item:', error);
            showToast('error', 'Erro ao remover item. Verifique suas permissões.');
            setDeleteConfirmId(null);
        }
    };

    const handleBulkDelete = async () => {
        try {
            // Group virtual IDs by their base item ID
            const deletionsByItemId: Record<string, number> = {};
            selectedIds.forEach(vid => {
                const baseId = vid.split('-')[0];
                deletionsByItemId[baseId] = (deletionsByItemId[baseId] || 0) + 1;
            });

            for (const [itemId, count] of Object.entries(deletionsByItemId)) {
                const item = globalItems.find(i => i.id === itemId);
                if (!item) continue;

                const currentQty = item.totalQuantity || 1;

                if (count >= currentQty) {
                    // Delete the entire item if all virtual units are selected
                    await deleteItem(itemId);
                } else {
                    // Reduce quantity if only some virtual units are selected
                    updateItem(itemId, {
                        totalQuantity: currentQty - count,
                        availableQuantity: Math.max(0, (item.availableQuantity || 0) - count)
                    });
                }
            }

            showToast('success', `${selectedIds.length} unidade(s) processada(s) com sucesso.`);
            setSelectedIds([]);
            setIsSelectionMode(false);

            // If everything was deleted, close modal
            const remainingUnits = virtualUnits.length - selectedIds.length;
            if (remainingUnits === 0) onClose();
        } catch (error) {
            showToast('error', 'Erro ao processar exclusão em massa.');
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    };

    const startEdit = (item: Item) => {
        setEditingId(item.id);
        setEditForm(item);
    };

    const saveEdit = () => {
        if (editingId && editForm) {
            updateItem(editingId, editForm);
            setEditingId(null);
        }
    };

    const startProductEdit = () => {
        if (representativeItem) {
            setBulkEditForm({
                name: representativeItem.name,
                type: representativeItem.type,
                size: representativeItem.size,
                color: representativeItem.color,
                price: representativeItem.price,
                img: representativeItem.img,
                loc: representativeItem.loc
            });
            setIsEditingProduct(true);
        }
    };

    const handleSaveProductEdit = async () => {
        try {
            // Update all items in the current group
            const updatePromises = currentItems.map(item =>
                updateItem(item.id, bulkEditForm)
            );
            await Promise.all(updatePromises);
            setIsEditingProduct(false);
            showToast('success', 'Todas as unidades do produto foram atualizadas.');
        } catch (error) {
            showToast('error', 'Erro ao atualizar unidades em massa.');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const MAX_SIZE = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    ctx?.drawImage(img, 0, 0, width, height);
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    setBulkEditForm(prev => ({ ...prev, img: compressedDataUrl }));
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    // --- QUANTITY VIRTUALIZATION ---

    // Virtualize units: Expand items with totalQuantity > 1 into individual rows
    const virtualUnits = useMemo(() => {
        const units: { item: Item, unitIndex: number, virtualId: string }[] = [];
        currentItems.forEach(item => {
            const qty = item.totalQuantity || 1;
            for (let i = 0; i < qty; i++) {
                units.push({
                    item,
                    unitIndex: i + 1,
                    virtualId: qty > 1 ? `${item.id}-${i}` : item.id
                });
            }
        });
        return units;
    }, [currentItems]);

    // Robust Scheduling: Assign contracts to virtual slots to prevent overlapping slots
    const unitSchedules = useMemo(() => {
        const schedules: Record<string, { contract: any, start: Date, end: Date }[]> = {};

        // 1. Get all relevant contracts
        const itemIds = currentItems.map(i => i.id);
        const relatedContracts = contracts.filter(c =>
            c.items.some(id => itemIds.includes(id)) &&
            c.status !== 'Cancelado'
        );

        // 2. Map each contract instance to a virtual unit
        relatedContracts.forEach(contract => {
            const instances = contract.items.filter(id => itemIds.includes(id));
            instances.forEach((itemId) => {
                // Find units for this specific itemId
                const possibleUnits = virtualUnits.filter(u => u.item.id === itemId);

                const cStart = new Date(contract.startDate);
                const cEnd = new Date(contract.endDate);
                cStart.setHours(0, 0, 0, 0);
                cEnd.setHours(0, 0, 0, 0);

                // Find first unit that doesn't have an overlap with this contract period
                const assignedUnit = possibleUnits.find(unit => {
                    const unitEvents = schedules[unit.virtualId] || [];
                    return !unitEvents.some(event => {
                        return (cStart <= event.end && cEnd >= event.start);
                    });
                });

                if (assignedUnit) {
                    if (!schedules[assignedUnit.virtualId]) schedules[assignedUnit.virtualId] = [];
                    schedules[assignedUnit.virtualId].push({
                        contract,
                        start: cStart,
                        end: cEnd
                    });
                }
            });
        });

        return schedules;
    }, [contracts, virtualUnits, currentItems]);

    // Helper to check availability for a specific VIRTUAL unit and date
    const getItemDayStatus = (unit: any, date: Date) => {
        const { item, virtualId } = unit;
        const isToday = date.toDateString() === new Date().toDateString();

        // 0. Physical Status (Applies ONLY to the first unit of a multi-unit lot to represent maintenance/blockage accurately)
        const isPhysicalStatus = item.status !== 'Disponível' && item.status !== 'Reservado' && item.status !== 'Alugado';
        if (isToday && isPhysicalStatus && unit.unitIndex === 1) {
            let color = 'gray';
            if (item.status === 'No Atelier') color = 'purple';
            else if (item.status === 'Na Lavanderia') color = 'cyan';
            else if (item.status === 'Devolução') color = 'orange';

            return {
                status: 'blocked',
                label: item.status,
                color: color
            };
        }

        // 1. Check Scheduler for this virtual unit
        const schedule = unitSchedules[virtualId] || [];
        const event = schedule.find(e => {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            return d >= e.start && d <= e.end;
        });

        if (event) {
            return {
                status: 'booked',
                label: `Reserva #${event.contract.id.split('-').slice(-1)[0]}`,
                color: 'red',
                contractId: event.contract.id
            };
        }

        return { status: 'free', label: 'Livre', color: 'green' };
    };

    // Helper to get ALL blocked/booked units for a specific date
    const getDailyStats = (date: Date) => {
        const busyUnits: { virtualId: string, label: string, color: string, contractId?: string }[] = [];
        let availableCount = 0;

        virtualUnits.forEach(unit => {
            const dayStatus = getItemDayStatus(unit, date);
            if (dayStatus.status !== 'free') {
                busyUnits.push({
                    virtualId: unit.virtualId,
                    label: dayStatus.label,
                    color: dayStatus.color,
                    contractId: dayStatus.contractId
                });
            } else {
                availableCount++;
            }
        });

        return { busyUnits, availableCount };
    };

    if (!isOpen || !product) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full h-full md:w-full md:max-w-6xl md:h-[90vh] md:rounded-2xl rounded-none shadow-2xl overflow-hidden flex flex-col border border-gray-200">

                {/* Header - Glass/Premium feel */}
                <div className="relative h-auto min-h-[180px] md:h-48 shrink-0 overflow-hidden bg-navy">
                    <div className="absolute inset-0 bg-cover bg-center opacity-50 blur-xl scale-110" style={{ backgroundImage: `url('${product.img}')` }}></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>

                    <div className="relative p-6 md:p-8 flex flex-col md:flex-row justify-between items-end gap-4 h-full">
                        <div className="flex flex-row items-end gap-4 md:gap-6 w-full">
                            <div className="size-24 md:size-32 rounded-2xl bg-white p-1 shadow-2xl skew-y-1 transform origin-bottom-left shrink-0">
                                <div className="h-full w-full rounded-xl bg-cover bg-center" style={{ backgroundImage: `url('${product.img}')` }}></div>
                            </div>
                            <div className="mb-1 md:mb-2 min-w-0 flex-1">
                                <span className="px-2 md:px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/10 text-[10px] md:text-xs font-bold uppercase tracking-widest shadow-sm">
                                    {product.type}
                                </span>
                                <h2 className="text-xl md:text-3xl font-black text-white mt-2 md:mt-3 tracking-tight shadow-black drop-shadow-md line-clamp-2">{product.name}</h2>
                                <div className="flex items-center gap-2 md:gap-4 text-gray-300 mt-1 font-medium text-xs md:text-sm uppercase tracking-wider">
                                    <p className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px] md:text-[16px]">straighten</span> Tam. {product.size}</p>
                                </div>
                            </div>
                        </div>

                        {/* Top Controls Overlay */}
                        <div className="absolute top-4 right-4 flex flex-col items-end gap-3 z-30">
                            <button onClick={onClose} className="size-10 flex items-center justify-center text-white/90 hover:text-white transition-all bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full border border-white/10">
                                <span className="material-symbols-outlined text-2xl">close</span>
                            </button>
                        </div>

                        {/* Inventory Stat (Desktop) */}
                        <div className="hidden md:block text-right text-white mb-2">
                            <p className="text-4xl font-black leading-none tracking-tighter">
                                {currentItems.reduce((sum, i) => sum + (i.totalQuantity || 1), 0)}
                            </p>
                            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Acervo Total</p>
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="px-4 md:px-8 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white shrink-0 gap-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                        <h3 className="text-navy font-bold text-base md:text-lg whitespace-nowrap">Visão Geral do Acervo</h3>

                        {/* View Toggle */}
                        <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 w-full sm:w-auto">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${viewMode === 'list' ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-navy'}`}
                            >
                                <span className="material-symbols-outlined text-[18px]">list</span>
                                <span>Lista</span>
                            </button>
                            <button
                                onClick={() => setViewMode('calendar')}
                                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${viewMode === 'calendar' ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-navy'}`}
                            >
                                <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                                <span>Calendário</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                        {viewMode === 'calendar' && (
                            <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200 flex-1 sm:flex-none justify-between sm:justify-start">
                                <button onClick={() => changeMonth(-1)} className="size-8 flex items-center justify-center hover:bg-white hover:shadow rounded text-gray-600">
                                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                                </button>
                                <span className="text-[11px] md:text-xs font-bold text-navy w-24 md:w-28 text-center uppercase tracking-wider">
                                    {currentDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                                </span>
                                <button onClick={() => changeMonth(1)} className="size-8 flex items-center justify-center hover:bg-white hover:shadow rounded text-gray-600">
                                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                                </button>
                            </div>
                        )}

                        {!isSeller && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={startProductEdit}
                                    className="size-10 flex items-center justify-center rounded-xl bg-gold/10 text-gold border border-gold/20 hover:bg-gold hover:text-navy transition-all"
                                    title="Editar Informações do Produto"
                                >
                                    <span className="material-symbols-outlined text-[20px]">edit_note</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setIsSelectionMode(!isSelectionMode);
                                        setSelectedIds([]);
                                    }}
                                    className={`size-10 flex items-center justify-center rounded-xl transition-all border ${isSelectionMode ? 'bg-red-50 text-red-600 border-red-200 shadow-inner' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
                                    title={isSelectionMode ? 'Cancelar Seleção' : 'Selecionar Vários'}
                                >
                                    <span className="material-symbols-outlined text-[20px]">{isSelectionMode ? 'close' : 'checklist'}</span>
                                </button>
                                <button onClick={handleAddUnit} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-xs md:text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                                    <span className="material-symbols-outlined text-lg md:text-xl">add_circle</span>
                                    <span>Adicionar Unidade</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-auto bg-gray-50/50 flex flex-col">

                    {/* LIST VIEW (RESOURCE CARDS) */}
                    {viewMode === 'list' && (
                        <div className="flex-1 overflow-auto p-4 md:p-8 bg-gray-50/50">
                            {/* Selection Bar */}
                            {isSelectionMode && selectedIds.length > 0 && (
                                <div className="sticky top-0 z-40 -mx-4 md:-mx-8 mb-6 px-4 md:px-8 py-2 bg-gray-50/80 backdrop-blur-md animate-in slide-in-from-top-4 duration-300">
                                    <div className="bg-navy rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4 border border-white/10">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                                                <span className="material-symbols-outlined">checklist</span>
                                            </div>
                                            <div>
                                                <p className="text-white font-black text-sm uppercase tracking-tight">{selectedIds.length} selecionados</p>
                                                <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest leading-none">Ação em massa ativada</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setIsSelectionMode(false);
                                                    setSelectedIds([]);
                                                }}
                                                className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={handleBulkDelete}
                                                className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-600/20 active:scale-95 flex items-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                                Excluir Unidades
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {virtualUnits.map((unit, unitIdx) => {
                                    const todayStatus = getItemDayStatus(unit, new Date());
                                    const isSelected = selectedIds.includes(unit.item.id);
                                    const colorMap: Record<string, string> = {
                                        'green': 'bg-emerald-500',
                                        'red': 'bg-red-500',
                                        'purple': 'bg-purple-600',
                                        'cyan': 'bg-cyan-500',
                                        'orange': 'bg-orange-500',
                                        'gray': 'bg-gray-400'
                                    };

                                    return (
                                        <div
                                            key={unit.virtualId}
                                            onClick={() => isSelectionMode && toggleSelect(unit.virtualId)}
                                            className={`group relative bg-white rounded-2xl border p-5 shadow-sm transition-all duration-300 flex flex-col gap-4 overflow-hidden ${isSelectionMode ? 'cursor-pointer' : ''} ${selectedIds.includes(unit.virtualId) ? 'ring-2 ring-primary border-primary shadow-xl scale-[1.02]' : 'border-gray-100'}`}
                                        >
                                            {/* Status Accent Bar / Selection Overlay */}
                                            {isSelectionMode ? (
                                                <div className={`absolute top-0 left-0 right-0 h-1.5 transition-colors ${isSelected ? 'bg-primary' : 'bg-gray-200'}`} />
                                            ) : (
                                                <div className={`absolute top-0 left-0 right-0 h-1.5 ${colorMap[todayStatus.color] || 'bg-primary'}`} />
                                            )}

                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-sm font-black text-navy uppercase tracking-tight">Unidade {unitIdx + 1}</h4>
                                                        <span className="text-[10px] font-mono text-gray-300">#{unit.item.id.substring(0, 4)}</span>
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Status Atual</p>
                                                </div>

                                                <div className="flex gap-1">
                                                    {isSelectionMode ? (
                                                        <div className={`size-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedIds.includes(unit.virtualId) ? 'bg-primary border-primary text-white scale-110' : 'border-gray-200 bg-white'}`}>
                                                            {selectedIds.includes(unit.virtualId) && <span className="material-symbols-outlined text-[16px] font-black">check</span>}
                                                        </div>
                                                    ) : (
                                                        !isSeller && (
                                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); startEdit(unit.item); }}
                                                                    className="size-8 flex items-center justify-center bg-gray-50 text-gray-400 hover:text-navy hover:bg-gray-100 rounded-lg transition-all"
                                                                    title="Editar"
                                                                >
                                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                                </button>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </div>

                                            <div className={`mt-auto flex items-center gap-3 p-3 rounded-xl border ${todayStatus.status === 'free' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-gray-50 border-gray-100 text-gray-700'}`}>
                                                <div className={`size-3 rounded-full ${colorMap[todayStatus.color] || 'bg-primary'} animate-pulse`} />
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black uppercase tracking-wider leading-none">
                                                        {todayStatus.status === 'free' && unit.item.totalQuantity === 1 ? unit.item.status : todayStatus.label}
                                                    </span>
                                                    {todayStatus.contractId && (
                                                        <span className="text-[9px] font-medium opacity-50 mt-0.5">Clique para detalhes no calendário</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Empty State */}
                            {virtualUnits.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4 opacity-50">
                                    <span className="material-symbols-outlined text-6xl">inventory_2</span>
                                    <p className="font-bold uppercase tracking-widest text-sm">Nenhuma unidade cadastrada</p>
                                </div>
                            )}
                        </div>
                    )}


                    {/* CALENDAR VIEW (STANDARD GRID) */}
                    {viewMode === 'calendar' && (
                        <div className="flex-1 overflow-auto bg-white flex flex-col">
                            {/* Horizontal Scroll Wrapper */}
                            <div className="min-w-[800px] flex-1 flex flex-col">
                                {/* Days Header */}
                                <div className="grid grid-cols-7 border-b border-gray-200">
                                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                                        <div key={d} className="text-center py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 bg-gray-50/50 sticky top-0 z-20">
                                            {d}
                                        </div>
                                    ))}
                                </div>

                                {/* Grid (Per-Item Rows) */}
                                <div className="flex-1 overflow-y-auto">
                                    <div className="grid grid-cols-7 border-l border-t border-gray-200 auto-rows-fr min-h-[120px]">
                                        {calendarDays.map((date, i) => {
                                            if (!date) return <div key={i} className="bg-gray-50/10 border-r border-b border-gray-200 min-h-[120px]"></div>;

                                            const { availableCount } = getDailyStats(date);
                                            const isToday = date.toDateString() === new Date().toDateString();

                                            return (
                                                <div
                                                    key={i}
                                                    className={`border-r border-b border-gray-200 flex flex-col transition-all hover:bg-gray-50/30 min-h-[140px] py-2 gap-1 ${isToday ? 'bg-primary/5' : 'bg-white'}`}
                                                >
                                                    {/* Date Header */}
                                                    <div className="flex justify-between items-start px-2.5 mb-2">
                                                        <span className={`text-xs font-black tracking-tight ${isToday ? 'text-primary' : 'text-gray-300'}`}>
                                                            {date.getDate()}
                                                        </span>
                                                        {isToday && (
                                                            <span className="size-1.5 rounded-full bg-primary animate-ping"></span>
                                                        )}
                                                    </div>

                                                    {/* Items Loop - Consistent Vertical Slots */}
                                                    <div className="flex flex-col gap-[2.5px] w-full relative">
                                                        {virtualUnits.map((unit, idx) => {
                                                            const dayStatus = getItemDayStatus(unit, date);

                                                            // Continuity Logic
                                                            const getStatusAt = (offset: number) => {
                                                                const d = new Date(date);
                                                                d.setDate(date.getDate() + offset);
                                                                return getItemDayStatus(unit, d);
                                                            };
                                                            const prev = i > 0 && calendarDays[i - 1] ? getStatusAt(-1) : null;
                                                            const next = i < calendarDays.length - 1 && calendarDays[i + 1] ? getStatusAt(1) : null;

                                                            let content = null;
                                                            let bgClass = '';

                                                            // 1. BLOCKED (Physical)
                                                            if (dayStatus.status === 'blocked') {
                                                                const colorMap: Record<string, string> = {
                                                                    'purple': 'bg-purple-600',
                                                                    'cyan': 'bg-cyan-500',
                                                                    'orange': 'bg-orange-500',
                                                                    'gray': 'bg-gray-400'
                                                                };
                                                                bgClass = colorMap[dayStatus.color] || 'bg-gray-400';

                                                                const isVisualStart = prev?.status !== 'blocked' || prev?.label !== dayStatus.label || date.getDay() === 0;
                                                                const isVisualEnd = next?.status !== 'blocked' || next?.label !== dayStatus.label || date.getDay() === 6;

                                                                bgClass += ` text-white shadow-sm flex items-center justify-center relative z-10 whitespace-nowrap h-5
                                                                    ${isVisualStart ? 'ml-1 rounded-l-md pl-1' : '-ml-[1px]'} 
                                                                    ${isVisualEnd ? 'mr-1 rounded-r-md' : '-mr-[1px]'}
                                                                    ${(!isVisualStart || !isVisualEnd) ? 'w-[calc(100%+2px)]' : 'w-[calc(100%-0.5rem)]'}
                                                                `;

                                                                if (isVisualStart) {
                                                                    content = <span className="text-[8px] font-black uppercase tracking-widest truncate px-1">Unid. {idx + 1} - {dayStatus.label}</span>;
                                                                }
                                                            }
                                                            // 2. BOOKED (Contract)
                                                            else if (dayStatus.status === 'booked' && dayStatus.contractId) {
                                                                const isVisualStart = prev?.status !== 'booked' || prev?.contractId !== dayStatus.contractId || date.getDay() === 0;
                                                                const isVisualEnd = next?.status !== 'booked' || next?.contractId !== dayStatus.contractId || date.getDay() === 6;

                                                                const dynamicStyle = { backgroundColor: getContractColor(dayStatus.contractId || '') };
                                                                const connectionStyles = `
                                                                    ${isVisualStart ? 'ml-1 rounded-l-md pl-1.5' : '-ml-[1px]'} 
                                                                    ${isVisualEnd ? 'mr-1 rounded-r-md' : '-mr-[1px]'}
                                                                    ${(!isVisualStart || !isVisualEnd) ? 'w-[calc(100%+2px)]' : 'w-[calc(100%-0.5rem)]'}
                                                                `;

                                                                if (isVisualStart) {
                                                                    content = <span className="text-[8px] font-black uppercase tracking-widest truncate">Unid. {idx + 1}</span>;
                                                                }

                                                                return (
                                                                    <div
                                                                        key={unit.virtualId}
                                                                        className={`text-[white] shadow-sm flex items-center relative z-10 whitespace-nowrap h-5 text-[10px] leading-none cursor-default transition-all hover:brightness-110 ${connectionStyles}`}
                                                                        style={dynamicStyle}
                                                                        title={`#${unit.virtualId}: ${dayStatus.label}`}
                                                                    >
                                                                        {content}
                                                                    </div>
                                                                );
                                                            }
                                                            else {
                                                                return <div key={unit.virtualId} className="h-5" />;
                                                            }

                                                            return (
                                                                <div key={unit.virtualId} className={`h-5 text-[10px] leading-none ${bgClass} cursor-default transition-all hover:brightness-110`} title={`#${unit.virtualId}: ${dayStatus.label}`}>
                                                                    {content}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* BULK EDIT PRODUCT VIEW */}
                    {isEditingProduct && (
                        <div className="absolute inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
                            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div>
                                    <h3 className="text-xl font-black text-navy uppercase tracking-tight">Editar Produto</h3>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Alterações afetarão todas as unidades deste item</p>
                                </div>
                                <button
                                    onClick={() => setIsEditingProduct(false)}
                                    className="size-10 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-400 transition-all"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto p-8">
                                <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8">
                                    {/* Left Content: Image */}
                                    <div className="w-full md:w-1/3 space-y-4">
                                        <div className="aspect-[3/4] rounded-2xl bg-gray-100 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center relative overflow-hidden group hover:border-primary transition-all cursor-pointer">
                                            {bulkEditForm.img ? (
                                                <>
                                                    <img src={bulkEditForm.img} className="w-full h-full object-cover" alt="Preview" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                                        <span className="text-white text-xs font-bold uppercase tracking-widest">Alterar Foto</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="material-symbols-outlined text-4xl text-gray-300">add_a_photo</span>
                                            )}
                                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                                        </div>
                                    </div>

                                    {/* Right Content: Fields */}
                                    <div className="flex-1 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="md:col-span-2 space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome do Produto</label>
                                                <input
                                                    value={bulkEditForm.name || ''}
                                                    onChange={e => setBulkEditForm(prev => ({ ...prev, name: e.target.value }))}
                                                    className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-primary/5 outline-none font-bold text-navy"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Categoria</label>
                                                <input
                                                    value={bulkEditForm.type || ''}
                                                    onChange={e => setBulkEditForm(prev => ({ ...prev, type: e.target.value }))}
                                                    className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-primary/5 outline-none font-bold text-navy"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tamanho</label>
                                                <input
                                                    value={bulkEditForm.size || ''}
                                                    onChange={e => setBulkEditForm(prev => ({ ...prev, size: e.target.value }))}
                                                    className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-primary/5 outline-none font-bold text-navy text-center"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cor</label>
                                                <input
                                                    value={bulkEditForm.color || ''}
                                                    onChange={e => setBulkEditForm(prev => ({ ...prev, color: e.target.value }))}
                                                    className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-primary/5 outline-none font-bold text-navy"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Valor de Locação (R$)</label>
                                                <input
                                                    type="number"
                                                    value={bulkEditForm.price || 0}
                                                    onChange={e => setBulkEditForm(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                                                    className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-primary/5 outline-none font-black text-navy"
                                                />
                                            </div>

                                            <div className="md:col-span-2 space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Localização de Estoque</label>
                                                <input
                                                    value={bulkEditForm.loc || ''}
                                                    onChange={e => setBulkEditForm(prev => ({ ...prev, loc: e.target.value }))}
                                                    className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-primary/5 outline-none font-bold text-navy"
                                                    placeholder="Ex: Prateleira A-12"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                                <button
                                    onClick={() => setIsEditingProduct(false)}
                                    className="px-6 py-3 rounded-xl font-bold text-gray-400 hover:bg-gray-200 transition-all uppercase text-xs tracking-widest"
                                >
                                    Descartar
                                </button>
                                <button
                                    onClick={handleSaveProductEdit}
                                    className="px-10 py-3 bg-primary text-white rounded-xl font-black shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all uppercase text-xs tracking-widest flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">save</span>
                                    Atualizar Todas as Unidades
                                </button>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Legend */}
                <div className="p-4 border-t border-gray-100 bg-white text-[10px] md:text-xs flex flex-wrap gap-x-6 gap-y-2 text-gray-500 justify-center">
                    <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 font-bold">
                            {getDailyStats(new Date()).availableCount}
                        </span>
                        <span className="uppercase font-bold tracking-wider">Disponíveis</span>
                    </div>
                    <div className="flex items-center gap-1.5"><div className="size-3 rounded-md bg-purple-600 shadow-sm"></div> <span className="uppercase font-bold tracking-wider">No Atelier</span></div>
                    <div className="flex items-center gap-1.5"><div className="size-3 rounded-md bg-cyan-500 shadow-sm"></div> <span className="uppercase font-bold tracking-wider">Lavanderia</span></div>
                    <div className="flex items-center gap-1.5"><div className="size-3 rounded-md bg-orange-500 shadow-sm"></div> <span className="uppercase font-bold tracking-wider">Devolução</span></div>
                </div>

                {/* Confirmation Modals */}
                {deleteConfirmId && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/90 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in duration-300">
                            <div className="size-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-6">
                                <span className="material-symbols-outlined text-4xl">delete_forever</span>
                            </div>
                            <h3 className="text-xl font-black text-navy mb-2">Excluir Unidade?</h3>
                            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                                Esta ação não pode ser desfeita. A unidade será removida permanentemente do acervo e do histórico.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="h-12 rounded-xl border border-gray-200 text-navy font-bold hover:bg-gray-50 transition-all uppercase text-xs tracking-widest"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleDelete(deleteConfirmId)}
                                    className="h-12 rounded-xl bg-red-600 text-white font-black hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 uppercase text-xs tracking-widest"
                                >
                                    Sim, Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
