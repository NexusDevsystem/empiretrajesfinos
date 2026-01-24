import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { getContractColor } from '../utils/colorUtils';

import NewAppointmentModal from './NewAppointmentModal';
import ConfirmationModal from './ConfirmationModal';
import AlertModal from './AlertModal';

export default function Agenda() {
    const { items, contracts, clients, appointments, updateItem, updateContractStatus, deleteAppointment, updateAppointment } = useApp();
    const { showToast } = useToast();

    // Start with the most recent Monday
    const [viewStartDate, setViewStartDate] = useState(() => {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        return new Date(d.setDate(diff));
    });
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [isApptModalOpen, setIsApptModal] = useState(false);
    const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false); // Mobile Modal State
    const [filterCategory, setFilterCategory] = useState<string>('Todos');

    // Delete Modal State
    const [isDeleteApptModalOpen, setIsDeleteApptModalOpen] = useState(false);
    const [selectedApptToDelete, setSelectedApptToDelete] = useState<string | null>(null);

    // Cancel Contract State
    const [isCancelContractModalOpen, setIsCancelContractModalOpen] = useState(false);
    const [selectedContractToCancel, setSelectedContractToCancel] = useState<string | null>(null);

    // Alert Modal State
    const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; title: string; message: string; type: 'warning' | 'error' | 'success' | 'info' }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });

    // Configuration
    // (Timeline constants removed)

    // Debug
    console.log('Rendering Agenda Component');

    const getDuration = (startStr: string, endStr: string) => {
        const s = new Date(startStr);
        const e = new Date(endStr);
        return Math.floor((e.getTime() - s.getTime()) / (1000 * 3600 * 24)) + 1; // Inclusive
    };

    const shiftDate = (days: number) => {
        const newDate = new Date(viewStartDate);
        newDate.setDate(newDate.getDate() + days);
        setViewStartDate(newDate);
    };

    const goToToday = () => {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        setViewStartDate(new Date(d.setDate(diff)));
    };

    // Calendar Helpers
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    // Get unique categories from items
    const categories = useMemo(() => {
        const types = items.map(i => i.type).filter(Boolean);
        return ['Todos', ...Array.from(new Set(types))];
    }, [items]);

    const getCalendarDays = useMemo(() => {
        const year = viewStartDate.getFullYear();
        const month = viewStartDate.getMonth();

        const daysInMonth = getDaysInMonth(viewStartDate);
        const firstDay = getFirstDayOfMonth(viewStartDate);
        const days = [];

        // Previous month padding
        const prevMonthContainer = new Date(year, month, 0);
        const daysInPrevMonth = prevMonthContainer.getDate();
        for (let i = firstDay - 1; i >= 0; i--) {
            days.push(new Date(year, month - 1, daysInPrevMonth - i));
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }

        // Next month padding (Fixed grid of 42 cells = 6 weeks)
        const totalCells = 42;
        const remaining = totalCells - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push(new Date(year, month + 1, i));
        }

        return days;
    }, [viewStartDate]);

    // Derived Contracts for Calendar
    const calendarContracts = useMemo(() => {
        return contracts.filter(c => {
            const isStatusValid = c.status === 'Ativo' || c.status === 'Agendado';
            if (!isStatusValid) return false;

            if (filterCategory === 'Todos') return true;

            // Check if any item in the contract matches the selected category
            return c.items.some(itemId => {
                const item = items.find(i => i.id === itemId);
                return item?.type === filterCategory;
            });
        });
    }, [contracts, items, filterCategory]);

    // Derived Appointments for Calendar
    const calendarAppointments = useMemo(() => {
        return appointments.filter(a => a.status === 'Agendado');
    }, [appointments]);

    // Layout Logic for Consistent Rows
    const contractLayout = useMemo(() => {
        // Sort contracts same as visual expectation: Start Date ASC, then ID or Duration
        const sorted = [...calendarContracts].sort((a, b) => {
            if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
            const durA = getDuration(a.startDate, a.endDate);
            const durB = getDuration(b.startDate, b.endDate);
            return durB - durA; // Longest first for better packing
        });

        const assignments: Record<string, number> = {};
        const rows: string[] = []; // 'YYYY-MM-DD' of when the row becomes free

        sorted.forEach(c => {
            let placed = false;
            // Try to fit in existing rows
            for (let i = 0; i < rows.length; i++) {
                // Check if space is available. rows[i] is the LAST OCCUPIED DATE.
                // So start date must be > rows[i]
                if (c.startDate > rows[i]) {
                    assignments[c.id] = i;
                    rows[i] = c.endDate;
                    placed = true;
                    break;
                }
            }
            // Create new row if needed
            if (!placed) {
                assignments[c.id] = rows.length;
                rows.push(c.endDate);
            }
        });

        return assignments;
    }, [calendarContracts]);

    const handleAddApptClick = () => {
        setIsApptModal(true);
    };

    const renderDayDetails = () => (
        <>
            {/* Drawer Header - Gradient & Date */}
            <div className="h-40 bg-gradient-to-br from-navy to-primary relative shrink-0 overflow-hidden">
                <div className="absolute -top-4 -right-4 p-4 opacity-10">
                    <span className="material-symbols-outlined text-[180px] text-white rotate-12">calendar_month</span>
                </div>

                <div className="absolute bottom-6 left-6 text-white z-10 w-full pr-6">
                    <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1 shadow-sm">Visão do Dia</p>
                    <h2 className="text-3xl font-black capitalize leading-none shadow-sm mb-1">
                        {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long' })}
                    </h2>
                    <p className="text-white/90 text-lg font-medium shadow-sm">
                        {selectedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
            </div>

            {/* Content Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50/50">

                {/* 1. Quick Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center">
                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center mb-2 text-primary">
                            <span className="material-symbols-outlined">event</span>
                        </div>
                        <span className="text-2xl font-black text-navy leading-none">
                            {calendarAppointments.filter(a => a.date === selectedDate.toISOString().split('T')[0]).length}
                        </span>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Agendamentos</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center">
                        <div className="size-10 rounded-full bg-purple-100 flex items-center justify-center mb-2 text-purple-600">
                            <span className="material-symbols-outlined">checkroom</span>
                        </div>
                        <span className="text-2xl font-black text-navy leading-none">
                            {contracts.filter(c => {
                                const d = selectedDate.toISOString().split('T')[0];
                                const start = c.startDate.split('T')[0];
                                const end = c.endDate.split('T')[0];
                                return start <= d && end >= d && (c.status === 'Ativo' || c.status === 'Agendado');
                            }).length}
                        </span>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Locações</p>
                    </div>
                </div>

                {/* New Appointment Button */}
                <button
                    onClick={handleAddApptClick}
                    className="w-full py-4 bg-navy text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-navy/20 hover:bg-primary transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                    <span className="material-symbols-outlined text-lg">add_task</span>
                    Novo Agendamento
                </button>

                {/* 2. Appointments Section */}
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        Agenda
                    </h3>
                    {calendarAppointments.filter(a => a.date === selectedDate.toISOString().split('T')[0]).length === 0 ? (
                        <div className="p-6 rounded-2xl border border-dashed border-gray-200 text-center bg-white">
                            <span className="material-symbols-outlined text-gray-300 text-4xl mb-2">event_available</span>
                            <p className="text-gray-400 text-sm font-medium">Agenda livre.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {calendarAppointments
                                .filter(a => a.date === selectedDate.toISOString().split('T')[0])
                                .sort((a, b) => a.time.localeCompare(b.time))
                                .map(appt => {
                                    const client = clients.find(cl => cl.id === appt.clientId);

                                    // Dynamic colors based on type
                                    let typeColor = 'text-purple-600 bg-purple-50 border-purple-100';
                                    switch (appt.type) {
                                        case 'Primeira Visita': typeColor = 'text-amber-600 bg-amber-50 border-amber-100'; break;
                                        case 'Prova de Traje': typeColor = 'text-blue-600 bg-blue-50 border-blue-100'; break;
                                        case 'Retirada': typeColor = 'text-emerald-600 bg-emerald-50 border-emerald-100'; break;
                                        case 'Devolução': typeColor = 'text-orange-600 bg-orange-50 border-orange-100'; break;
                                        case 'Ajustes Finais': typeColor = 'text-pink-600 bg-pink-50 border-pink-100'; break;
                                    }

                                    // Status styling
                                    const isCompleted = appt.status === 'Concluído';
                                    const isCancelled = appt.status === 'Cancelado';

                                    return (
                                        <div key={appt.id} className={`relative group bg-white p-4 rounded-2xl border transition-all ${isCompleted ? 'border-green-200 bg-green-50/30' : isCancelled ? 'border-red-200 bg-red-50/30 opacity-75' : 'border-gray-100 hover:border-primary/30 hover:shadow-md'}`}>
                                            {/* Delete Button (Visible on Hover) */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedApptToDelete(appt.id);
                                                    setIsDeleteApptModalOpen(true);
                                                }}
                                                className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                title="Excluir Agendamento"
                                            >
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>

                                            <div className="flex items-start gap-3">
                                                {/* Time Pill */}
                                                <div className={`flex flex-col items-center justify-center shrink-0 w-14 rounded-xl py-2 border ${isCompleted ? 'bg-green-100 border-green-200 text-green-700' : 'bg-gray-50 border-gray-100 text-navy'}`}>
                                                    {isCompleted ? (
                                                        <span className="material-symbols-outlined text-xl">check</span>
                                                    ) : (
                                                        <span className="text-xs font-black">{appt.time}</span>
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className={`text-sm font-bold truncate pr-6 ${isCompleted ? 'text-green-800 line-through decoration-green-500/50' : isCancelled ? 'text-red-800 line-through' : 'text-navy'}`}>
                                                            {appt.clientId ? (client?.name || 'Cliente Carregando...') : (appt.clientName || 'Agendamento')}
                                                        </h4>
                                                    </div>
                                                    <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-md border ${typeColor}`}>
                                                        {appt.type}
                                                    </span>
                                                    {appt.notes && (
                                                        <p className="text-xs text-gray-500 mt-2 line-clamp-2 italic bg-gray-50 p-2 rounded-lg">
                                                            "{appt.notes}"
                                                        </p>
                                                    )}

                                                    {/* Quick Actions for Scheduled Appointments */}
                                                    {appt.status === 'Agendado' && (
                                                        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    updateAppointment({ ...appt, status: 'Concluído' });
                                                                    showToast('success', 'Agendamento concluído!');
                                                                }}
                                                                className="flex-1 h-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-sm hover:shadow-emerald-500/20"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">check</span>
                                                                Concluir
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    updateAppointment({ ...appt, status: 'Cancelado' });
                                                                    showToast('info', 'Agendamento cancelado.');
                                                                }}
                                                                className="flex-1 h-8 bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all border border-gray-200 hover:border-red-200"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">close</span>
                                                                Cancelar
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                        </div>
                    )}
                </div>

                {/* 3. Contracts Section */}
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                        Locações Ativas
                    </h3>
                    {contracts.filter(c => {
                        const d = selectedDate.toISOString().split('T')[0];
                        const start = c.startDate.split('T')[0];
                        const end = c.endDate.split('T')[0];
                        return start <= d && end >= d && (c.status === 'Ativo' || c.status === 'Agendado');
                    }).length === 0 ? (
                        <div className="p-6 rounded-2xl border border-dashed border-gray-200 text-center bg-white">
                            <span className="material-symbols-outlined text-gray-300 text-4xl mb-2">checkroom</span>
                            <p className="text-gray-400 text-sm font-medium">Nenhuma locação.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {contracts.filter(c => {
                                const d = selectedDate.toISOString().split('T')[0];
                                const start = c.startDate.split('T')[0];
                                const end = c.endDate.split('T')[0];
                                return start <= d && end >= d && (c.status === 'Ativo' || c.status === 'Agendado');
                            }).map(contract => {
                                const client = clients.find(cl => cl.id === contract.clientId);
                                const contractItems = items.filter(i => contract.items.includes(i.id));

                                // Handlers
                                const handleConfirmPickup = (e: React.MouseEvent) => {
                                    e.stopPropagation();

                                    // Validation: Check for Lessee Signature
                                    if (!contract.lesseeSignature) {
                                        setAlertConfig({
                                            isOpen: true,
                                            title: 'Retirada Bloqueada',
                                            message: 'É obrigatório que o contrato esteja assinado pelo cliente antes de confirmar a retirada dos itens.',
                                            type: 'warning'
                                        });
                                        return;
                                    }

                                    updateContractStatus(contract.id, 'Ativo');
                                    contract.items.forEach(itemId => {
                                        updateItem(itemId, { status: 'Alugado', statusColor: 'red' });
                                    });
                                    showToast('success', 'Retirada confirmada com sucesso!');
                                };

                                const handleReceiveItem = (e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    updateContractStatus(contract.id, 'Finalizado');
                                    contract.items.forEach(itemId => {
                                        updateItem(itemId, { status: 'Devolução', statusColor: 'orange' });
                                    });
                                    showToast('success', 'Devolução recebida com sucesso!');
                                };

                                const isTodayOrPastStart = new Date() >= new Date(contract.startDate);

                                return (
                                    <div key={contract.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="size-8 rounded-full bg-gray-100 bg-cover bg-center shrink-0" style={{ backgroundImage: `url('${client?.img || ''}')` }}></div>
                                                <div className="min-w-0">
                                                    <h4 className="text-xs font-bold text-navy truncate max-w-[120px]">{client?.name}</h4>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[10px] text-gray-500">#{contract.id.split('-')[2]}</p>
                                                        {contract.contractType === 'Venda' && (
                                                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1 rounded">VENDA</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${contract.status === 'Ativo' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                {contract.status}
                                            </span>
                                        </div>

                                        {/* Signature Badge */}
                                        <div className="flex gap-2 mb-3">
                                            {contract.lesseeSignature ? (
                                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold">
                                                    <span className="material-symbols-outlined text-[12px]">ink_pen</span>
                                                    Assinado
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-bold">
                                                    <span className="material-symbols-outlined text-[12px]">pending</span>
                                                    Pendente
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-gray-50 rounded-xl p-2 space-y-2 mb-3">
                                            {contractItems.map(item => (
                                                <div key={item.id} className="flex items-center gap-2">
                                                    <div className="size-8 rounded-lg bg-white border border-gray-200 bg-cover bg-center shrink-0" style={{ backgroundImage: `url('${item.img}')` }}></div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-bold text-navy truncate">{item.name}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Quick Actions */}
                                        {contract.status === 'Agendado' && isTodayOrPastStart && (
                                            <button
                                                onClick={handleConfirmPickup}
                                                className="w-full py-2 bg-navy text-white text-xs font-bold rounded-lg shadow-sm hover:bg-primary transition-all flex items-center justify-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-sm">output</span>
                                                Confirmar Retirada
                                            </button>
                                        )}

                                        {contract.status === 'Ativo' && (
                                            <button
                                                onClick={handleReceiveItem}
                                                className="w-full py-2 bg-orange-500 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-sm">input</span>
                                                Receber Devolução
                                            </button>
                                        )}

                                        {/* Cancellation (Only if not Finalized or Cancelled) */}
                                        {(contract.status === 'Agendado' || contract.status === 'Ativo') && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedContractToCancel(contract.id);
                                                    setIsCancelContractModalOpen(true);
                                                }}
                                                className="w-full mt-2 py-2 bg-white text-red-500 text-xs font-bold rounded-lg border border-gray-200 hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-sm">block</span>
                                                Cancelar Contrato
                                            </button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm">
            {/* Header Controls */}
            <div className="p-4 md:p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white shrink-0">
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-navy flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">calendar_month</span>
                        Agenda Maestro
                    </h2>
                    <p className="text-gray-500 text-xs md:text-sm">Visualização mensal de agendamentos e locações.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    {/* Navigator */}
                    <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200 w-full sm:w-auto justify-between sm:justify-start">
                        <button onClick={() => shiftDate(-30)} className="size-9 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-gray-600 transition-all">
                            <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                        <div className="flex flex-col items-center px-4">
                            <span className="text-xl font-black text-navy capitalize tracking-tight">
                                {viewStartDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                            </span>
                        </div>
                        <button onClick={() => shiftDate(30)} className="size-9 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-gray-600 transition-all">
                            <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                        <div className="w-px h-4 bg-gray-200 mx-1 hidden sm:block"></div>
                        <button onClick={goToToday} className="px-4 py-1.5 text-xs font-bold text-navy hover:bg-white hover:shadow-sm rounded-lg transition-all">
                            Hoje
                        </button>
                    </div>

                    {/* Category Filter */}
                    <div className="relative group w-full sm:w-48">
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="w-full h-12 pl-10 pr-10 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none appearance-none font-bold text-navy text-xs cursor-pointer shadow-sm"
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">filter_list</span>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] pointer-events-none">expand_more</span>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={() => setIsApptModal(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-navy text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-navy/20 hover:bg-primary transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined text-lg">add_task</span>
                        <span>Agendar Visita</span>
                    </button>
                </div>
            </div>

            {/* Main Layout: Split View */}
            <div className="flex flex-1 overflow-hidden relative flex-col lg:flex-row">

                {/* LEFT COLUMN: Main Calendar View */}
                <div className="flex-1 overflow-hidden relative flex flex-col min-h-0">
                    <div className="flex-1 bg-white p-2 md:p-6 overflow-y-auto">

                        {/* Scroll Wrapper for Mobile */}
                        <div className="overflow-x-auto pb-4">
                            {/* Gapless Grid Container - Autosizing Rows */}
                            <div className="grid grid-cols-7 gap-0 auto-rows-auto border-t border-l border-gray-200 rounded-lg min-w-[800px]">
                                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                                    <div key={day} className="text-center font-bold text-gray-400 text-sm uppercase py-2 border-b border-r border-gray-200 bg-gray-50 sticky top-0 z-20">
                                        {day}
                                    </div>
                                ))}
                                {getCalendarDays.map((date, i) => {
                                    if (!date) return <div key={i} className="bg-gray-50/20 border-r border-b border-gray-200 min-h-[120px]" />;

                                    const dateStr = date.toISOString().split('T')[0];
                                    const isToday = date.toDateString() === new Date().toDateString();
                                    const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();

                                    // Get contracts active on this day
                                    const activeContracts = calendarContracts.filter(c => {
                                        const start = c.startDate.split('T')[0];
                                        const end = c.endDate.split('T')[0];
                                        return start <= dateStr && end >= dateStr;
                                    });

                                    // Row Packing: Determine which row indices are active for THIS day
                                    const activeIndices = activeContracts.map(c => contractLayout[c.id] ?? 0);
                                    const maxRow = activeIndices.length > 0 ? Math.max(...activeIndices) : -1;

                                    // Prepare Rows for Rendering (0..maxRow)
                                    const rowsToRender = [];
                                    for (let r = 0; r <= maxRow; r++) {
                                        const contract = activeContracts.find(c => contractLayout[c.id] === r);
                                        rowsToRender.push(contract);
                                    }

                                    const dayAppts = calendarAppointments.filter(a => a.date === dateStr);

                                    return (
                                        <div
                                            key={i}
                                            onClick={() => {
                                                if (date) {
                                                    setSelectedDate(date);
                                                    setIsMobileDetailOpen(true);
                                                }
                                            }}
                                            className={`
                                                bg-white border-r border-b relative flex flex-col transition-all hover:bg-gray-50 cursor-pointer min-h-[120px] 
                                                ${isToday ? 'bg-primary/5' : ''} 
                                                ${isSelected ? 'ring-2 ring-inset ring-primary z-10' : ''}
                                                ${date.getMonth() !== viewStartDate.getMonth() ? 'opacity-40 grayscale-[0.5]' : ''}
                                            `}
                                        >
                                            {/* Date Number - Standard Flow */}
                                            <div className="flex justify-between items-center p-2">
                                                <span className={`text-[11px] font-bold ${isToday ? 'text-primary' : (date.getMonth() !== viewStartDate.getMonth() ? 'text-gray-300' : 'text-gray-400')}`}>
                                                    {date.getDate()} {date.getDate() === 1 && (
                                                        <span className="ml-1 uppercase text-[9px]">
                                                            {date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '')}
                                                        </span>
                                                    )}
                                                </span>
                                            </div>

                                            {/* Events Container - No Scroll, Grow with content */}
                                            <div className="flex flex-col gap-[1px] pb-1 w-full">

                                                {/* Contracts (Using Row Packing) */}
                                                {rowsToRender.map((c, idx) => {
                                                    if (!c) {
                                                        // Spacer for empty row - Uses exact same height as contract for perfect alignment
                                                        return (
                                                            <div
                                                                key={`spacer-${idx}`}
                                                                className="h-6 w-full invisible flex-shrink-0"
                                                            />
                                                        );
                                                    }

                                                    // Normalize contract dates to ensure correct comparison with cell date (YYYY-MM-DD)
                                                    const isStart = c.startDate.split('T')[0] === dateStr;
                                                    const isEnd = c.endDate.split('T')[0] === dateStr;

                                                    // Visual checks: Identify Visual Start (Left) and Visual End (Right) of the segment in this row
                                                    const isRowStart = i % 7 === 0;
                                                    const isRowEnd = i % 7 === 6;

                                                    // Visual Start: It is the start of the contract OR the start of the week row
                                                    const isVisualStart = isStart || isRowStart;
                                                    // Visual End: It is the end of the contract OR the end of the week row
                                                    const isVisualEnd = isEnd || isRowEnd;

                                                    // Styles
                                                    // 1. Margins: Add margin left/right ONLY if it's a visual start/end. 
                                                    //    Inside the row, we want 0 gaps (seamless).
                                                    // 2. Borders/Rounding: Round the outer edges of the segment. Square the inner connections.

                                                    // FIX: If it is a row start but NOT a true start, do not round the left side and do not add margin-left.
                                                    // This creates the "continuous" look from the previous row.
                                                    const applyLeftRounding = isStart;
                                                    const applyRightRounding = isEnd;

                                                    const marginClass = `
                                                        ${applyLeftRounding ? 'ml-1 rounded-l-md pl-1' : '-ml-[1px] rounded-l-none border-l-0'} 
                                                        ${applyRightRounding ? 'mr-1 rounded-r-md' : '-mr-[1px] rounded-r-none border-r-0'}
                                                    `;

                                                    return (
                                                        <div
                                                            key={c.id}
                                                            style={{ backgroundColor: getContractColor(c.id) }}
                                                            className={`
                                                            h-6 flex items-center text-[10px] font-bold text-white cursor-pointer hover:brightness-110 transition-all z-10
                                                            ${marginClass}
                                                        `}
                                                            title={`#${c.id} - ${c.eventType}`}
                                                        >
                                                            {isStart && ( // Show identifier ONLY at the true start of the contract
                                                                <span className="truncate w-full pr-1 flex items-center gap-1">
                                                                    {c.contractType === 'Venda' && (
                                                                        <span className="bg-emerald-500 text-[8px] px-1 rounded shadow-sm shrink-0 leading-tight">VENDA</span>
                                                                    )}
                                                                    <span className="truncate">#{c.id.split('-')[2]} {c.items.length > 0 ? `• ${items.find(it => it.id === c.items[0])?.name}` : ''}</span>
                                                                </span>
                                                            )}
                                                            {isEnd && (
                                                                <div className="ml-auto mr-1.5 size-1.5 rounded-full bg-white/60 shadow-sm shrink-0 animate-in zoom-in duration-300" />
                                                            )}

                                                        </div>
                                                    );
                                                })}

                                                {/* Appointments (keep as pills) */}
                                                {dayAppts.map(a => {
                                                    // Color Coding
                                                    let bgClass = 'bg-gray-100 text-gray-700 border-gray-200';
                                                    switch (a.type) {
                                                        case 'Primeira Visita': bgClass = 'bg-amber-100 text-amber-700 border-amber-200'; break;
                                                        case 'Prova de Traje': bgClass = 'bg-blue-100 text-blue-700 border-blue-200'; break;
                                                        case 'Retirada': bgClass = 'bg-emerald-100 text-emerald-700 border-emerald-200'; break;
                                                        case 'Devolução': bgClass = 'bg-orange-100 text-orange-700 border-orange-200'; break;
                                                        case 'Ajustes Finais': bgClass = 'bg-pink-100 text-pink-700 border-pink-200'; break;
                                                        default: bgClass = 'bg-purple-100 text-purple-700 border-purple-200'; break;
                                                    }

                                                    return (
                                                        <div key={a.id} className={`mx-1 h-6 flex items-center gap-1 text-[10px] ${bgClass} px-1.5 rounded-md font-bold truncate border relative z-20`} title={`${a.time} - ${a.type} - ${a.clientName || clients.find(c => c.id === a.clientId)?.name}`}>
                                                            <span className="material-symbols-outlined text-[10px]">schedule</span>
                                                            <span className="truncate">{a.time} {a.clientName || clients.find(c => c.id === a.clientId)?.name || 'Agendamento'}</span>
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

                {/* RIGHT COLUMN: Persistent Day Detail Panel (Desktop Only) */}
                <div className="hidden lg:flex w-[400px] border-l border-gray-200 bg-white flex-col shrink-0 relative z-30 shadow-xl overflow-visible">
                    {selectedDate ? renderDayDetails() : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                            <span className="material-symbols-outlined text-gray-300 text-6xl mb-4">calendar_today</span>
                            <p className="text-gray-400 font-medium">Selecione uma data para ver detalhes.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Day Detail Modal */}
            {isMobileDetailOpen && selectedDate && (
                <div className="fixed inset-0 z-50 lg:hidden flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileDetailOpen(false)}>
                    <div
                        className="w-full h-[85vh] bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up relative"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Drag Handle */}
                        <div className="h-1.5 w-12 bg-gray-300 rounded-full mx-auto mt-3 absolute left-1/2 -translate-x-1/2 z-20" />

                        {/* Close Button */}
                        <button
                            onClick={() => setIsMobileDetailOpen(false)}
                            className="absolute top-4 right-4 z-20 p-2 bg-black/20 text-white rounded-full hover:bg-black/40 backdrop-blur-md transition-all active:scale-95"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>

                        {renderDayDetails()}
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={isDeleteApptModalOpen}
                onClose={() => setIsDeleteApptModalOpen(false)}
                onConfirm={() => {
                    if (selectedApptToDelete) {
                        deleteAppointment(selectedApptToDelete);
                        showToast('success', 'Agendamento removido com sucesso!');
                        setIsDeleteApptModalOpen(false);
                    }
                }}
                title="Excluir Agendamento"
                description="Tem certeza que deseja remover este agendamento? Esta ação não pode ser desfeita."
                confirmText="Excluir"
                isDangerous={true}
            />

            <ConfirmationModal
                isOpen={isCancelContractModalOpen}
                onClose={() => setIsCancelContractModalOpen(false)}
                onConfirm={() => {
                    if (selectedContractToCancel) {
                        // 1. Update Contract Status
                        updateContractStatus(selectedContractToCancel, 'Cancelado');

                        // 2. Release Items
                        const contract = contracts.find(c => c.id === selectedContractToCancel);
                        if (contract) {
                            contract.items.forEach(itemId => {
                                updateItem(itemId, { status: 'Disponível', statusColor: 'primary' });
                            });
                        }

                        showToast('info', 'Contrato cancelado e itens liberados.');
                        setIsCancelContractModalOpen(false);
                    }
                }}
                title="Cancelar Contrato"
                description="Tem certeza que deseja cancelar este contrato? Os itens serão liberados imediatamente para novas locações."
                confirmText="Sim, Cancelar"
                isDangerous={true}
            />

            <NewAppointmentModal
                isOpen={isApptModalOpen}
                onClose={() => setIsApptModal(false)}
                initialDate={selectedDate ? selectedDate.toISOString().split('T')[0] : undefined}
            />

            <AlertModal
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
            />

            {/* CSS helper for stripes */}
            <style>{`
                .bg-stripes-gray {
                    background-image: linear-gradient(45deg, #f3f4f6 25%, #e5e7eb 25%, #e5e7eb 50%, #f3f4f6 50%, #f3f4f6 75%, #e5e7eb 75%, #e5e7eb 100%);
                    background-size: 10px 10px;
                }
            `}</style>
        </div>
    );
}
