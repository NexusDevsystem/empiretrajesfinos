import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Appointment, Client, AppointmentType } from '../types';

interface NewAppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const APPOINTMENT_TYPES: { type: AppointmentType; icon: string; label: string; desc: string }[] = [
    { type: 'Primeira Visita', icon: 'storefront', label: 'Primeira Visita', desc: 'Conhecer a coleção' },
    { type: 'Prova de Traje', icon: 'checkroom', label: 'Prova de Traje', desc: 'Ajustes e medidas' },
    { type: 'Retirada', icon: 'shopping_bag', label: 'Retirada', desc: 'Levar para evento' },
    { type: 'Devolução', icon: 'assignment_return', label: 'Devolução', desc: 'Retorno do traje' },
    { type: 'Ajustes Finais', icon: 'cut', label: 'Ajustes Finais', desc: 'Costura e bainha' },
    { type: 'Outro', icon: 'event', label: 'Outro', desc: 'Reunião geral' },
];

export default function NewAppointmentModal({ isOpen, onClose }: NewAppointmentModalProps) {
    const { clients, addAppointment, addClient } = useApp();

    // Form State
    const [clientId, setClientId] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [type, setType] = useState<AppointmentType>('Primeira Visita');
    const [notes, setNotes] = useState('');

    // Quick Client State
    const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);
    const [quickClient, setQuickClient] = useState({ name: '', phone: '' });

    if (!isOpen) return null;

    const handleQuickClientSave = () => {
        if (!quickClient.name || !quickClient.phone) return;
        const newId = `C_${Date.now()}`;
        const newClientObj: Client = {
            id: newId,
            name: quickClient.name,
            phone: quickClient.phone,
            email: '',
        };
        addClient(newClientObj);
        setClientId(newId);
        setIsQuickClientOpen(false);
        setQuickClient({ name: '', phone: '' });
    };

    const handleSave = () => {
        if (!clientId || !date || !time) return;

        const newAppointment: Appointment = {
            id: `APT-${Date.now()}`,
            clientId,
            date,
            time,
            type,
            notes,
            status: 'Agendado'
        };

        addAppointment(newAppointment);
        setClientId('');
        setDate('');
        setTime('');
        setNotes('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop - Standard Gray Overlay */}
            <div className="absolute inset-0 bg-black/50 transition-opacity duration-300" onClick={onClose} />

            {/* Main Modal Container - Solid White */}
            <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 slide-in-from-bottom-5 duration-300">

                {/* Header - Simple Clean */}
                <div className="relative p-8 pb-4 shrink-0 flex justify-between items-center bg-white">
                    <div>
                        <h2 className="text-2xl font-bold text-navy">Novo Momento</h2>
                        <p className="text-gray-500 text-sm mt-1">Agende uma experiência incrível para seu cliente.</p>
                    </div>
                    <button onClick={onClose} className="size-10 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-navy transition-all">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content Scrollable Area */}
                <div className="relative p-8 pt-2 overflow-y-auto custom-scrollbar space-y-8 bg-white">

                    {/* Section 1: Client */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Cliente VIP</label>
                        {isQuickClientOpen ? (
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 animate-in fade-in space-y-3">
                                <input
                                    className="w-full bg-white border border-gray-200 rounded-lg p-3 text-navy placeholder:text-gray-400 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                    placeholder="Nome do Cliente"
                                    value={quickClient.name}
                                    onChange={e => setQuickClient(prev => ({ ...prev, name: e.target.value }))}
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <input
                                        className="w-full bg-white border border-gray-200 rounded-lg p-3 text-navy placeholder:text-gray-400 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                        placeholder="Telefone"
                                        value={quickClient.phone}
                                        onChange={e => setQuickClient(prev => ({ ...prev, phone: e.target.value }))}
                                    />
                                    <button onClick={handleQuickClientSave} className="bg-primary hover:bg-primary/90 text-white font-bold px-4 rounded-lg transition-all">
                                        Salvar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-3">
                                <div className="relative flex-1 group">
                                    <select
                                        value={clientId}
                                        onChange={e => setClientId(e.target.value)}
                                        className="block w-full bg-gray-50 hover:bg-gray-100 border border-transparent hover:border-gray-200 rounded-xl text-navy text-base font-medium p-3 pr-10 appearance-none cursor-pointer transition-all outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary"
                                    >
                                        <option value="" className="text-gray-400">Selecione o Cliente...</option>
                                        {clients.map(client => (
                                            <option key={client.id} value={client.id} className="text-navy">{client.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400 group-hover:text-primary transition-colors">
                                        <span className="material-symbols-outlined">expand_more</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsQuickClientOpen(true)}
                                    className="size-[50px] bg-white border border-gray-200 rounded-xl text-primary hover:bg-gray-50 flex items-center justify-center transition-all"
                                    title="Novo Registro"
                                >
                                    <span className="material-symbols-outlined text-xl">person_add</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Section 2: Type Grid */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Tipo de Experiência</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {APPOINTMENT_TYPES.map(t => (
                                <button
                                    key={t.type}
                                    onClick={() => setType(t.type)}
                                    className={`relative group flex flex-col p-4 rounded-xl border transition-all duration-200 text-left ${type === t.type
                                        ? 'bg-primary text-white border-primary shadow-md'
                                        : 'bg-white border-gray-100 text-gray-400 hover:border-primary/50 hover:text-navy hover:shadow-sm'
                                        }`}
                                >
                                    <span className={`material-symbols-outlined text-2xl mb-2 transition-colors ${type === t.type ? 'text-white' : 'text-gray-400 group-hover:text-primary'}`}>
                                        {t.icon}
                                    </span>
                                    <span className="text-sm font-bold">
                                        {t.label}
                                    </span>
                                    <span className={`text-[10px] mt-1 ${type === t.type ? 'text-white/80' : 'text-gray-400'}`}>
                                        {t.desc}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Section 3: Time & Date */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Quando?</label>
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="block w-full bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 focus:bg-white focus:border-primary rounded-xl text-navy p-3 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Que horas?</label>
                            <input
                                type="time"
                                value={time}
                                onChange={e => setTime(e.target.value)}
                                className="block w-full bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 focus:bg-white focus:border-primary rounded-xl text-navy p-3 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Section 4: Notes */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Detalhes Adicionais</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="block w-full bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 focus:bg-white focus:border-primary rounded-xl text-navy p-3 min-h-[100px] outline-none transition-all resize-none placeholder:text-gray-400"
                            placeholder="Alguma observação especial para este agendamento?"
                        />
                    </div>
                </div>

                {/* Footer Action */}
                <div className="relative p-6 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-6 py-3 rounded-lg text-gray-500 font-bold hover:bg-gray-50 hover:text-navy transition-all">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!clientId || !date || !time}
                        className="px-8 py-3 bg-primary text-white font-bold rounded-lg shadow-sm hover:bg-primary/90 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
}
