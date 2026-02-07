import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { Contract, EventType } from '../types';

interface ContractInfoEditorProps {
    contract: Contract;
    isOpen: boolean;
    onClose: () => void;
}

export default function ContractInfoEditor({ contract, isOpen, onClose }: ContractInfoEditorProps) {
    const { updateContract } = useApp();
    const { showToast } = useToast();

    // Basic Info State
    const [startDate, setStartDate] = useState(contract.startDate?.split('T')[0] || '');
    const [endDate, setEndDate] = useState(contract.endDate?.split('T')[0] || '');
    const [eventDate, setEventDate] = useState(contract.eventDate?.split('T')[0] || '');
    const [eventType, setEventType] = useState(contract.eventType || '');
    const [eventLocation, setEventLocation] = useState(contract.eventLocation || '');

    // Financial State
    const [totalValue, setTotalValue] = useState(contract.totalValue || 0);
    const [paidAmount, setPaidAmount] = useState(contract.paidAmount || 0);
    const [discount, setDiscount] = useState(0); // Optional: if we want to add to existing, for now let's just let edit total
    const [paymentMethod, setPaymentMethod] = useState(contract.paymentMethod || 'Pix');

    const [observations, setObservations] = useState(contract.observations || '');
    const [isSaving, setIsSaving] = useState(false);

    // Categories for EventType (Matching NewContractModal or standard list)
    const eventTypes = ['Casamento', 'Formatura', '15 Anos', 'Debutante', 'Corporativo', 'Outro'];

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updatedData: Partial<Contract> = {
                startDate,
                endDate,
                eventDate,
                eventType,
                eventLocation,
                totalValue,
                paidAmount,
                paymentMethod,
                observations,
                balance: totalValue - paidAmount
            };

            await updateContract(contract.id, updatedData);
            showToast('success', 'Contrato atualizado com sucesso!');
            onClose();
        } catch (error) {
            console.error('[ContractInfoEditor] Save error:', error);
            showToast('error', 'Erro ao salvar alterações.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-navy text-white flex items-center justify-center shadow-lg shadow-navy/20">
                            <span className="material-symbols-outlined">edit_note</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-navy uppercase tracking-tight">Editar Dados do Contrato</h2>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-0.5">#{contract.number || contract.id}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="size-10 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-navy transition-all border border-transparent hover:border-gray-200"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Form Body */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
                    {/* Dates Section */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-navy/40 uppercase tracking-[0.2em] flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">calendar_month</span>
                            Datas e Prazos
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">Retirada</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="w-full h-12 px-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-navy"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">Devolução</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="w-full h-12 px-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-navy"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">Data do Evento</label>
                                <input
                                    type="date"
                                    value={eventDate}
                                    onChange={e => setEventDate(e.target.value)}
                                    className="w-full h-12 px-4 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-navy shadow-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Event Info */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-navy/40 uppercase tracking-[0.2em] flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">celebration</span>
                            Informações do Evento
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">Ocasião</label>
                                <select
                                    value={eventType}
                                    onChange={e => setEventType(e.target.value)}
                                    className="w-full h-12 px-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-navy appearance-none"
                                >
                                    {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">Local do Evento</label>
                                <input
                                    type="text"
                                    value={eventLocation}
                                    onChange={e => setEventLocation(e.target.value)}
                                    placeholder="Ex: Maison Buffet"
                                    className="w-full h-12 px-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-navy"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Financial Section */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-navy/40 uppercase tracking-[0.2em] flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">payments</span>
                            Financeiro
                        </h3>
                        <div className="p-6 bg-navy/[0.02] rounded-[2rem] border border-navy/5 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">Valor Total</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-navy font-bold text-sm">R$</span>
                                        <input
                                            type="number"
                                            value={totalValue}
                                            onChange={e => setTotalValue(parseFloat(e.target.value) || 0)}
                                            className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white border border-gray-200 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-black text-navy text-lg shadow-sm"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-blue-600 uppercase tracking-wider ml-1">Valor Pago (Entrada)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 font-bold text-sm">R$</span>
                                        <input
                                            type="number"
                                            value={paidAmount}
                                            onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)}
                                            className="w-full h-12 pl-12 pr-4 rounded-2xl bg-blue-50 border border-blue-100 focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all font-black text-navy text-lg"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">Forma de Pagamento</label>
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                    {['Pix', 'Dinheiro', 'Crédito', 'Débito', 'Link'].map(method => (
                                        <button
                                            key={method}
                                            onClick={() => setPaymentMethod(method)}
                                            className={`h-11 rounded-xl font-bold text-[10px] uppercase border transition-all flex flex-col items-center justify-center gap-1 ${paymentMethod === method
                                                ? 'bg-navy border-navy text-white shadow-lg ring-4 ring-navy/5 scale-[1.02]'
                                                : 'bg-white border-gray-100 text-gray-500 hover:border-navy/20 hover:bg-gray-50'}`}
                                        >
                                            {method}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-navy/5 flex justify-between items-center px-2">
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Saldo Devedor:</span>
                                <span className={`text-xl font-black ${totalValue - paidAmount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                    R$ {(totalValue - paidAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Observations */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-navy/40 uppercase tracking-[0.2em] flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">notes</span>
                            Observações Gerais
                        </h3>
                        <textarea
                            value={observations}
                            onChange={e => setObservations(e.target.value)}
                            placeholder="Notas técnicas, ajustes solicitados ou detalhes financeiros extras..."
                            className="w-full min-h-[100px] p-4 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-medium text-navy text-sm resize-none"
                        />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 md:p-8 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-gray-400 hover:text-navy hover:bg-white transition-all text-xs uppercase tracking-widest"
                    >
                        Descartar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-navy text-white font-black shadow-2xl shadow-navy/20 hover:bg-primary active:scale-95 transition-all flex items-center justify-center gap-3 text-xs uppercase tracking-widest"
                    >
                        {isSaving ? (
                            <>
                                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Salvando...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                Salvar Alterações
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
