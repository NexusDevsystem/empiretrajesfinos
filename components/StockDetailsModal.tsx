import React, { useState, useMemo } from 'react';
import { Item } from '../types';
import { getContractColor } from '../utils/colorUtils';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';

interface StockDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: Item[]; // All items in this group
}

export default function StockDetailsModal({ isOpen, onClose, items }: StockDetailsModalProps) {
    const { deleteItem, addItem, updateItem, contracts, updateContractStatus, navigateTo } = useApp();
    const { showToast } = useToast();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Item>>({});
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [checkInId, setCheckInId] = useState<string | null>(null);

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
    const product = items[0];

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
        const newItem: Item = {
            ...product,
            id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36), // Robust ID
            status: 'Disponível',
            statusColor: 'primary',
            loc: 'Estoque',
            note: ''
        };
        addItem(newItem);
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteItem(id);
            setDeleteConfirmId(null);
            showToast('success', 'Item removido do acervo com sucesso.');
            if (items.length === 1) onClose();
        } catch (error) {
            console.error('Erro ao deletar item:', error);
            showToast('error', 'Erro ao remover item. Verifique suas permissões.');
            setDeleteConfirmId(null);
        }
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

    // --- QUANTITY VIRTUALIZATION ---

    // Virtualize units: Expand items with totalQuantity > 1 into individual rows
    const virtualUnits = useMemo(() => {
        const units: { item: Item, unitIndex: number, virtualId: string }[] = [];
        items.forEach(item => {
            const qty = item.totalQuantity || 1;
            for (let i = 0; i < qty; i++) {
                units.push({
                    item,
                    unitIndex: i + 1,
                    virtualId: `${item.id}-${i}`
                });
            }
        });
        return units;
    }, [items]);

    // Robust Scheduling: Assign contracts to virtual slots to prevent overlapping slots
    const unitSchedules = useMemo(() => {
        const schedules: Record<string, { contract: any, start: Date, end: Date }[]> = {};

        // 1. Get all relevant contracts
        const itemIds = items.map(i => i.id);
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
    }, [contracts, virtualUnits, items]);

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
                                {items.reduce((sum, i) => sum + (i.totalQuantity || 1), 0)}
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

                        {viewMode === 'list' && (
                            <button onClick={handleAddUnit} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-xs md:text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                                <span className="material-symbols-outlined text-lg md:text-xl">add_circle</span>
                                <span>Adicionar Unidade</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-auto bg-gray-50/50 flex flex-col">

                    {/* LIST VIEW (RESOURCE SCHEDULER) */}
                    {viewMode === 'list' && (
                        <div className="flex-1 overflow-auto bg-white flex flex-col relative w-full">

                            {/* Scrollable Container for the extensive grid */}
                            <div className="min-w-fit flex flex-col">

                                {/* 1. Header Row (Days) */}
                                <div className="flex border-b border-gray-200 sticky top-0 z-30 bg-white shadow-sm">
                                    {/* Sidebar Header Stub */}
                                    <div className="w-64 shrink-0 p-3 bg-gray-50 border-r border-gray-200 sticky left-0 z-40 font-bold text-xs text-navy uppercase tracking-wider flex items-center justify-between">
                                        <span>Item Físico</span>
                                        <span className="text-gray-400 font-normal normal-case">{virtualUnits.length} unidades</span>
                                    </div>

                                    {/* Days Headers */}
                                    <div className="flex">
                                        {calendarDays.map((date, i) => {
                                            if (!date) return <div key={i} className="w-32 bg-gray-50/30 border-r border-gray-100"></div>; // Padding
                                            const isToday = date.toDateString() === new Date().toDateString();
                                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                                            return (
                                                <div key={i} className={`w-32 py-2 border-r border-gray-100 flex flex-col items-center justify-center gap-0.5 ${isToday ? 'bg-primary/5' : isWeekend ? 'bg-gray-50/50' : 'bg-white'}`}>
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-primary' : 'text-gray-400'}`}>
                                                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()]}
                                                    </span>
                                                    <span className={`text-sm font-black ${isToday ? 'text-primary' : 'text-navy'}`}>
                                                        {date.getDate()}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 2. Item Rows */}
                                <div className="divide-y divide-gray-100">
                                    {virtualUnits.map((unit, unitIdx) => (
                                        <div key={unit.virtualId} className="flex hover:bg-gray-50/50 transition-colors group">

                                            {/* Sticky Sidebar: Item Details */}
                                            <div className="w-64 shrink-0 p-3 border-r border-gray-100 bg-white sticky left-0 z-20 group-hover:bg-gray-50/50 transition-colors flex flex-col justify-center gap-1 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-navy">Unidade {unitIdx + 1}</span>
                                                    {/* Actions (Hover only) */}
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                        <button
                                                            onClick={() => startEdit(unit.item)}
                                                            className="p-1.5 hover:bg-navy/5 text-navy/50 hover:text-navy rounded-lg transition-colors"
                                                            title="Editar item"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">edit_note</span>
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteConfirmId(unit.item.id)}
                                                            className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-colors"
                                                            title="Excluir item permanentemente"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Mini Status Badge (calculated for Today) */}
                                                {(() => {
                                                    const todayStatus = getItemDayStatus(unit, new Date());
                                                    const colorMap: any = {
                                                        'green': 'bg-emerald-500',
                                                        'red': 'bg-red-500',
                                                        'purple': 'bg-purple-600',
                                                        'cyan': 'bg-cyan-500',
                                                        'orange': 'bg-orange-500',
                                                        'gray': 'bg-gray-400'
                                                    };
                                                    return (
                                                        <div className="flex items-center gap-1.5">
                                                            <div className={`size-1.5 rounded-full ${colorMap[todayStatus.color] || 'bg-primary'}`} />
                                                            <span className="text-[10px] text-gray-400 font-bold truncate max-w-[120px]">
                                                                {todayStatus.status === 'free' && unit.item.totalQuantity === 1 ? unit.item.status : todayStatus.label}
                                                            </span>
                                                        </div>
                                                    );
                                                })()}
                                                <div className="text-[9px] font-mono text-gray-300">ID: {unit.item.id.substring(0, 6)}{unit.item.totalQuantity! > 1 ? `-${unit.unitIndex}` : ''}</div>
                                            </div>

                                            {/* Timeline Grid for this Item */}
                                            <div className="flex relative">
                                                {/* Background Grid Lines (Absolute) - Optional, but keeping strict cell structure avoids misalignment */}

                                                {calendarDays.map((date, idx) => {
                                                    if (!date) return <div key={idx} className="w-32 border-r border-gray-100 h-16 bg-gray-50/10"></div>;

                                                    const dayStatus = getItemDayStatus(unit, date);
                                                    const isToday = date.toDateString() === new Date().toDateString();

                                                    // Continuity Logic
                                                    const getStatusAt = (offset: number) => {
                                                        const d = new Date(date);
                                                        d.setDate(date.getDate() + offset);
                                                        return getItemDayStatus(unit, d);
                                                    };

                                                    const prev = idx > 0 ? getStatusAt(-1) : null;
                                                    const next = idx < calendarDays.length - 1 ? getStatusAt(1) : null;

                                                    let content = null;
                                                    let bgClass = '';

                                                    // BLOCKED (Physical)
                                                    if (dayStatus.status === 'blocked') {
                                                        if (dayStatus.color === 'purple') bgClass = 'bg-purple-500';
                                                        else if (dayStatus.color === 'cyan') bgClass = 'bg-cyan-500';
                                                        else if (dayStatus.color === 'orange') bgClass = 'bg-orange-500';
                                                        else bgClass = 'bg-gray-400';

                                                        const samePrev = prev?.status === 'blocked' && prev?.label === dayStatus.label;
                                                        const sameNext = next?.status === 'blocked' && next?.label === dayStatus.label;

                                                        bgClass += ` absolutely-positioned-bar z-10 shadow-sm flex items-center justify-center
                                                            ${!samePrev ? 'rounded-l-md ml-1' : '-ml-px rounded-l-none'} 
                                                            ${!sameNext ? 'rounded-r-md mr-1' : '-mr-px rounded-r-none'}
                                                        `;

                                                        // Show Label on first day of block or if it's Sunday (start of visual week)
                                                        if (!samePrev || date.getDay() === 0) {
                                                            let icon = 'block';
                                                            if (dayStatus.label === 'No Atelier') icon = 'straighten'; // Ruler
                                                            if (dayStatus.label === 'Na Lavanderia') icon = 'local_laundry_service';
                                                            if (dayStatus.label === 'Devolução') icon = 'assignment_return';

                                                            content = (
                                                                <div className="flex items-center gap-1 px-2 overflow-hidden text-white/90">
                                                                    <span className="material-symbols-outlined text-[14px]">{icon}</span>
                                                                    <span className="text-[9px] font-bold uppercase tracking-wider truncate hidden md:inline-block">
                                                                        {dayStatus.label}
                                                                    </span>
                                                                </div>
                                                            );
                                                        }
                                                    }
                                                    // BOOKED (Contract)
                                                    else if (dayStatus.status === 'booked' && dayStatus.contractId) {
                                                        const connectPrev = prev?.status === 'booked' && prev?.contractId === dayStatus.contractId;
                                                        const connectNext = next?.status === 'booked' && next?.contractId === dayStatus.contractId;
                                                        const isStart = !connectPrev;
                                                        const isEnd = !connectNext;

                                                        const baseColor = getContractColor(dayStatus.contractId);

                                                        bgClass = `z-10 shadow-sm flex items-center justify-center relative h-10 w-full`;

                                                        // Margin/Rounded logic
                                                        const styleClasses = `
                                                            ${isStart ? 'rounded-l-md ml-1 pl-1' : '-ml-px rounded-l-none border-l-0'} 
                                                            ${isEnd ? 'rounded-r-md mr-1' : '-mr-px rounded-r-none border-r-0'}
                                                        `;

                                                        content = (
                                                            <div
                                                                className={`h-10 w-full flex items-center text-white text-[10px] font-bold truncate transition-all hover:brightness-110 cursor-pointer ${styleClasses}`}
                                                                style={{ backgroundColor: baseColor }}
                                                                title={`${dayStatus.label}`}
                                                            >
                                                                {(isStart || date.getDay() === 0) && (
                                                                    <span className="px-2 truncate">{dayStatus.label}</span>
                                                                )}
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div key={idx} className={`w-32 h-16 border-r border-gray-100 relative flex items-center justify-center ${isToday ? 'bg-primary/5' : ''}`}>
                                                            {bgClass && !content /* If pure CSS background class with no content (not booked case) */ ? (
                                                                <div className={`h-10 w-full ${bgClass}`} title={dayStatus.label}>
                                                                    {content}
                                                                </div>
                                                            ) : content}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}


                    {/* CALENDAR VIEW (STANDARD GRID) */}
                    {viewMode === 'calendar' && (
                        <div className="flex-1 overflow-hidden flex flex-col bg-white">
                            {/* Days Header */}
                            <div className="grid grid-cols-7 border-b border-gray-200">
                                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                                    <div key={d} className="text-center py-2 text-xs font-bold uppercase tracking-wider text-gray-400 bg-gray-50 sticky top-0 z-20">
                                        {d}
                                    </div>
                                ))}
                            </div>

                            {/* Grid (Per-Item Rows) */}
                            <div className="flex-1 overflow-y-auto">
                                <div className="grid grid-cols-7 border-l border-t border-gray-200 auto-rows-fr min-h-[120px]">
                                    {calendarDays.map((date, i) => {
                                        if (!date) return <div key={i} className="bg-gray-50/30 border-r border-b border-gray-200 min-h-[120px]"></div>;

                                        const dateStr = date.toISOString().split('T')[0];
                                        const { availableCount } = getDailyStats(date);
                                        const isToday = date.toDateString() === new Date().toDateString();

                                        return (
                                            <div
                                                key={i}
                                                className={`border-r border-b border-gray-200 flex flex-col transition-all hover:bg-gray-50 min-h-[120px] py-1 gap-0.5 ${isToday ? 'bg-primary/5' : 'bg-white'}`}
                                            >
                                                {/* Date Header */}
                                                <div className="flex justify-between items-start px-2 mb-1">
                                                    <span className={`text-sm font-bold ${isToday ? 'text-primary' : 'text-gray-400'}`}>
                                                        {date.getDate()}
                                                    </span>
                                                </div>

                                                {/* Items Loop - Consistent Vertical Slots */}
                                                <div className="flex flex-col gap-[2px] w-full relative">
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
                                                            if (dayStatus.color === 'purple') bgClass = 'bg-purple-500';
                                                            else if (dayStatus.color === 'cyan') bgClass = 'bg-cyan-500';
                                                            else if (dayStatus.color === 'orange') bgClass = 'bg-orange-500';
                                                            else bgClass = 'bg-gray-400';

                                                            const samePrev = prev?.status === 'blocked' && prev?.label === dayStatus.label;
                                                            const sameNext = next?.status === 'blocked' && next?.label === dayStatus.label;

                                                            const isStart = !samePrev;
                                                            const isEnd = !sameNext;

                                                            bgClass += ` text-white shadow-sm flex items-center justify-center relative z-10
                                                                ${isStart ? 'ml-1 rounded-l pl-0.5' : '-ml-[1px] rounded-l-none border-l-0'} 
                                                                ${isEnd ? 'mr-1 rounded-r' : '-mr-[1px] rounded-r-none border-r-0'}
                                                            `;

                                                            if (isStart) {
                                                                content = <span className="text-[8px] font-bold uppercase truncate px-1">Unid. {idx + 1} - {dayStatus.label}</span>;
                                                            }
                                                        }
                                                        // 2. BOOKED (Contract)
                                                        else if (dayStatus.status === 'booked' && dayStatus.contractId) {
                                                            const connectPrev = prev?.status === 'booked' && prev?.contractId === dayStatus.contractId;
                                                            const connectNext = next?.status === 'booked' && next?.contractId === dayStatus.contractId;
                                                            const isStart = !connectPrev;
                                                            const isEnd = !connectNext;

                                                            bgClass = `text-white shadow-sm flex items-center relative z-10
                                                                ${isStart ? 'ml-1 rounded-l pl-1' : '-ml-[1px] rounded-l-none border-l-0'} 
                                                                ${isEnd ? 'mr-1 rounded-r' : '-mr-[1px] rounded-r-none border-r-0'}
                                                            `;

                                                            const dynamicStyle = { backgroundColor: getContractColor(dayStatus.contractId || '') };

                                                            if (isStart) {
                                                                content = <span className="text-[8px] font-bold truncate px-1">Unid. {idx + 1}</span>;
                                                            }

                                                            return (
                                                                <div
                                                                    key={unit.virtualId}
                                                                    className={`h-6 text-[10px] leading-none ${bgClass} cursor-default`}
                                                                    style={dynamicStyle}
                                                                    title={`#${unit.virtualId}: ${dayStatus.label}`}
                                                                >
                                                                    {content}
                                                                </div>
                                                            );
                                                        }
                                                        else {
                                                            return null;
                                                        }

                                                        return (
                                                            <div key={unit.virtualId} className={`h-6 text-[10px] leading-none ${bgClass} cursor-default`} title={`#${unit.virtualId}: ${dayStatus.label}`}>
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
