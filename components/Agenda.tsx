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

    const [viewStartDate, setViewStartDate] = useState(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = d.getMonth();
        return new Date(year, month, 1);
    });
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [isApptModalOpen, setIsApptModal] = useState(false);
    const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
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

    const getDuration = (startStr: string, endStr: string) => {
        const s = new Date(startStr);
        const e = new Date(endStr);
        return Math.floor((e.getTime() - s.getTime()) / (1000 * 3600 * 24)) + 1; // Inclusive
    };

    const shiftMonth = (delta: number) => {
        const newDate = new Date(viewStartDate);
        newDate.setMonth(viewStartDate.getMonth() + delta);
        setViewStartDate(newDate);
    };

    const goToToday = () => {
        const d = new Date();
        setViewStartDate(new Date(d.getFullYear(), d.getMonth(), 1));
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
            return c.items.some(itemId => {
                const item = items.find(i => i.id === itemId);
                return item?.type === filterCategory;
            });
        });
    }, [contracts, items, filterCategory]);

    const calendarAppointments = useMemo(() => {
        return appointments.filter(a => a.status === 'Agendado');
    }, [appointments]);

    const renderDayDetails = () => (
        <>
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

            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50/50">
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
                                    let typeColor = 'text-purple-600 bg-purple-50 border-purple-100';
                                    switch (appt.type) {
                                        case 'Primeira Visita': typeColor = 'text-amber-600 bg-amber-50 border-amber-100'; break;
                                        case 'Prova de Traje': typeColor = 'text-blue-600 bg-blue-50 border-blue-100'; break;
                                        case 'Retirada': typeColor = 'text-emerald-600 bg-emerald-50 border-emerald-100'; break;
                                        case 'Devolução': typeColor = 'text-orange-600 bg-orange-50 border-orange-100'; break;
                                        case 'Ajustes Finais': typeColor = 'text-pink-600 bg-pink-50 border-pink-100'; break;
                                    }
                                    const isCompleted = appt.status === 'Concluído';
                                    const isCancelled = appt.status === 'Cancelado';

                                    return (
                                        <div key={appt.id} className={`relative group bg-white p-4 rounded-2xl border transition-all ${isCompleted ? 'border-green-200 bg-green-50/30' : isCancelled ? 'border-red-200 bg-red-50/30 opacity-75' : 'border-gray-100 hover:border-primary/30 hover:shadow-md'}`}>
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

                                const handleConfirmPickup = (e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    if (!contract.lesseeSignature && !contract.isPhysicallySigned) {
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

                                        <div className="flex gap-2 mb-3">
                                            {contract.lesseeSignature || contract.isPhysicallySigned ? (
                                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold">
                                                    <span className="material-symbols-outlined text-[12px]">ink_pen</span>
                                                    {contract.isPhysicallySigned ? 'Assinado (Manual)' : 'Assinado'}
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
        <div className="flex flex-col lg:h-full lg:overflow-hidden bg-white border border-gray-200 rounded-[2rem] lg:rounded-lg shadow-sm">
            {/* Header Controls */}
            <div className="p-4 md:p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white shrink-0">
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-navy flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">calendar_month</span>
                        Agenda
                    </h2>
                    <p className="text-gray-500 text-xs md:text-sm">Visualização mensal de agendamentos e locações.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    {/* Navigator */}
                    <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200 w-full sm:w-auto justify-between sm:justify-start">
                        <button onClick={() => shiftMonth(-1)} className="size-9 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-gray-600 transition-all">
                            <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                        <div className="flex flex-col items-center px-4">
                            <span className="text-base font-black text-navy capitalize tracking-tight whitespace-nowrap">
                                {viewStartDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                            </span>
                        </div>
                        <button onClick={() => shiftMonth(1)} className="size-9 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-gray-600 transition-all">
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

                    <button
                        onClick={() => setIsApptModal(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-navy text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-navy/20 hover:bg-primary transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined text-lg">add_task</span>
                        <span>Agendar Visita</span>
                    </button>
                </div>
            </div>

            {/* Main Layout */}
            <div className="flex flex-1 lg:overflow-hidden relative flex-col lg:flex-row">
                <div className="flex-1 lg:overflow-hidden relative flex flex-col min-h-0">
                    <div className="flex-1 bg-white p-2 lg:p-6 lg:overflow-y-auto">
                        <div className="hidden lg:block overflow-x-auto pb-4 h-full">
                            <div className="grid grid-cols-7 gap-0 auto-rows-auto border-t border-l border-gray-200 rounded-xl lg:min-w-[800px]">
                                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => (
                                    <div key={idx} className="text-center font-black text-gray-400 text-[10px] lg:text-sm uppercase py-2 border-b border-r border-gray-200 bg-gray-50 sticky top-0 z-20">
                                        {day}
                                    </div>
                                ))}
                                {getCalendarDays.map((date, i) => {
                                    const dateStr = date.toISOString().split('T')[0];
                                    const isToday = date.toDateString() === new Date().toDateString();
                                    const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                                    const dayAppts = calendarAppointments.filter(a => a.date === dateStr);
                                    const dayContractEvents = calendarContracts.flatMap(c => {
                                        const events = [];
                                        if (c.startDate.split('T')[0] === dateStr) {
                                            events.push({ type: c.contractType === 'Venda' ? 'VENDA' : 'RETIRADA', contract: c, time: c.startTime || '09:00' });
                                        }
                                        if (c.contractType === 'Aluguel' && c.endDate.split('T')[0] === dateStr) {
                                            events.push({ type: 'DEVOLUÇÃO', contract: c, time: c.endTime || '18:00' });
                                        }
                                        return events;
                                    });

                                    return (
                                        <div
                                            key={i}
                                            onClick={() => { setSelectedDate(date); setIsMobileDetailOpen(true); }}
                                            className={`bg-white border-r border-b relative flex flex-col transition-all hover:bg-gray-50 cursor-pointer min-h-[70px] lg:min-h-[120px] ${isToday ? 'bg-primary/5' : ''} ${isSelected ? 'ring-2 ring-inset ring-primary z-10' : ''} ${date.getMonth() !== viewStartDate.getMonth() ? 'opacity-40 grayscale-[0.5]' : ''}`}
                                        >
                                            <div className="flex justify-between items-center p-1 lg:p-2">
                                                <span className={`text-[9px] lg:text-[11px] font-black ${isToday ? 'text-primary' : (date.getMonth() !== viewStartDate.getMonth() ? 'text-gray-200' : 'text-gray-400')}`}>
                                                    {date.getDate()} {date.getDate() === 1 && (
                                                        <span className="ml-1 uppercase text-[9px]">{date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-1 pb-1 w-full px-1">
                                                {dayContractEvents.map(evt => (
                                                    <div key={`${evt.contract.id}-${evt.type}`} className={`h-auto min-h-[20px] flex items-center gap-1 text-[9px] lg:text-[10px] ${evt.type === 'RETIRADA' || evt.type === 'VENDA' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-orange-100 text-orange-700 border-orange-200'} px-1.5 py-0.5 rounded-md font-bold border leading-tight`}>
                                                        <span className="material-symbols-outlined text-[10px] sm:text-[12px] shrink-0">{evt.type === 'RETIRADA' || evt.type === 'VENDA' ? 'output' : 'input'}</span>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="leading-none truncate">{evt.type === 'VENDA' ? 'VENDA' : evt.type}</span>
                                                            <span className="truncate font-medium opacity-80">{evt.time} - {clients.find(cl => cl.id === evt.contract.clientId)?.name || evt.contract.clientName}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {dayAppts.map(a => {
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
                                                        <div key={a.id} className={`h-auto min-h-[20px] flex items-center gap-1 text-[9px] lg:text-[10px] ${bgClass} px-1.5 py-0.5 rounded-md font-bold border leading-tight`}>
                                                            <span className="material-symbols-outlined text-[10px] sm:text-[12px] shrink-0">schedule</span>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="leading-none truncate">{a.type}</span>
                                                                <span className="truncate font-medium opacity-80">{a.time} - {a.clientName || clients.find(c => c.id === a.clientId)?.name}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* MOBILE MONTH LIST VIEW */}
                        <div className="block lg:hidden space-y-4">
                            {getCalendarDays.filter(d => d && d.getMonth() === viewStartDate.getMonth()).map((date, i) => {
                                const dateStr = date.toISOString().split('T')[0];
                                const isToday = dateStr === new Date().toISOString().split('T')[0];
                                const dayAppts = calendarAppointments.filter(a => a.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
                                const dayLogistics = calendarContracts.flatMap(c => {
                                    const items = [];
                                    if (c.startDate.split('T')[0] === dateStr) items.push({ ...c, logType: c.contractType === 'Venda' ? 'VENDA' : 'RETIRADA' });
                                    if (c.contractType === 'Aluguel' && c.endDate.split('T')[0] === dateStr) items.push({ ...c, logType: 'DEVOLUÇÃO' });
                                    return items;
                                });
                                if (dayAppts.length === 0 && dayLogistics.length === 0) return null;

                                return (
                                    <div key={i} className={`rounded-2xl border ${isToday ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-200 bg-white shadow-sm'} overflow-hidden`}>
                                        <div className={`px-4 py-3 border-b flex items-center justify-between ${isToday ? 'border-primary/10 bg-primary/5' : 'border-gray-100 bg-gray-50'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`text-center leading-none ${isToday ? 'text-primary' : 'text-gray-400'}`}>
                                                    <span className="block text-xl font-black">{date.getDate()}</span>
                                                    <span className="block text-[10px] uppercase font-bold">{date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                                                </div>
                                                <div className={`h-8 w-px ${isToday ? 'bg-primary/20' : 'bg-gray-200'}`}></div>
                                                <p className={`text-xs font-bold uppercase tracking-widest ${isToday ? 'text-primary' : 'text-gray-500'}`}>{date.toLocaleDateString('pt-BR', { weekday: 'long' })}</p>
                                            </div>
                                        </div>
                                        <div className="p-3 space-y-2">
                                            {dayAppts.map(a => (
                                                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 shadow-sm relative overflow-hidden" onClick={() => { setSelectedDate(date); setIsMobileDetailOpen(true); }}>
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500"></div>
                                                    <div className="flex flex-col items-center justify-center size-10 rounded-lg bg-gray-50 shrink-0">
                                                        <span className="text-[10px] font-black text-navy">{a.time}</span>
                                                        <span className="material-symbols-outlined text-[14px] text-gray-400">schedule</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-purple-600 mb-0.5">{a.type}</p>
                                                        <p className="text-sm font-bold text-navy truncate">{clients.find(cl => cl.id === a.clientId)?.name || a.clientName}</p>
                                                    </div>
                                                    <span className="material-symbols-outlined text-gray-300">chevron_right</span>
                                                </div>
                                            ))}
                                            {dayLogistics.map((c, idx) => (
                                                <div key={`${c.id}-${idx}`} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 shadow-sm relative overflow-hidden" onClick={() => { setSelectedDate(date); setIsMobileDetailOpen(true); }}>
                                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${c.logType === 'DEVOLUÇÃO' ? 'bg-orange-500' : 'bg-emerald-500'}`}></div>
                                                    <div className={`flex flex-col items-center justify-center size-10 rounded-lg shrink-0 ${c.logType === 'DEVOLUÇÃO' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                        <span className="material-symbols-outlined text-lg">{c.logType === 'DEVOLUÇÃO' ? 'input' : 'output'}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${c.logType === 'DEVOLUÇÃO' ? 'text-orange-600' : 'text-emerald-600'}`}>{c.logType === 'DEVOLUÇÃO' ? 'Devolução' : 'Retirada'}</p>
                                                        <p className="text-sm font-bold text-navy truncate">{clients.find(cl => cl.id === c.clientId)?.name}</p>
                                                        <p className="text-[10px] text-gray-400">Contrato #{c.id.split('-')[2]}</p>
                                                    </div>
                                                    <span className="material-symbols-outlined text-gray-300">chevron_right</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Persistent Day Detail Panel */}
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
                    <div className="w-full h-[85vh] bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up relative" onClick={e => e.stopPropagation()}>
                        <div className="h-1.5 w-12 bg-gray-300 rounded-full mx-auto mt-3 absolute left-1/2 -translate-x-1/2 z-20" />
                        <button onClick={() => setIsMobileDetailOpen(false)} className="absolute top-4 right-4 z-20 p-2 bg-black/20 text-white rounded-full hover:bg-black/40 backdrop-blur-md transition-all active:scale-95">
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
                        updateContractStatus(selectedContractToCancel, 'Cancelado');
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

            <style>{`.bg-stripes-gray { background-image: linear-gradient(45deg, #f3f4f6 25%, #e5e7eb 25%, #e5e7eb 50%, #f3f4f6 50%, #f3f4f6 75%, #e5e7eb 75%, #e5e7eb 100%); background-size: 10px 10px; }`}</style>
        </div>
    );
}
