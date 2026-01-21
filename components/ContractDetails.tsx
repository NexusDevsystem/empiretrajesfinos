import React, { useState } from 'react';
import { Contract, Client, Item } from '../types';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import ConfirmationModal from './ConfirmationModal';
import { getContractColor } from '../utils/colorUtils';

interface ContractDetailsProps {
    contract: Contract;
    client: Client;
    items: Item[];
    onClose: () => void;
    onPrint: () => void;
}

export default function ContractDetails({ contract, client, items, onClose, onPrint }: ContractDetailsProps) {
    const { updateContractStatus, updateItem } = useApp();
    const { showToast } = useToast();
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

    const handleCancelContract = () => {
        // 1. Update Contract Status
        updateContractStatus(contract.id, 'Cancelado');

        // 2. Release Items
        contract.items.forEach(itemId => {
            updateItem(itemId, { status: 'Disponível', statusColor: 'primary' });
        });

        showToast('info', 'Contrato cancelado e itens liberados.');
        onClose();
    };

    const statusColors = {
        'Ativo': 'bg-emerald-100 text-emerald-700 border-emerald-200',
        'Agendado': 'bg-blue-100 text-blue-700 border-blue-200',
        'Finalizado': 'bg-gray-100 text-gray-700 border-gray-200',
        'Cancelado': 'bg-red-100 text-red-700 border-red-200',
        'Aguardando Assinatura': 'bg-amber-100 text-amber-700 border-amber-200',
        'Rascunho': 'bg-gray-100 text-gray-500 border-gray-200'
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-navy/20 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

            {/* Drawer */}
            <div className="relative w-full md:max-w-2xl bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-navy">Detalhes do Contrato</h2>
                        <p className="text-gray-400 text-sm font-medium">#{contract.id}</p>
                    </div>
                    <button onClick={onClose} className="size-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-navy hover:shadow-md transition-all">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8">

                    {/* Status Banner */}
                    <div className={`p-4 rounded-2xl border flex items-center gap-4 ${statusColors[contract.status] || statusColors['Agendado']}`}>
                        <div className="size-10 rounded-full bg-white/50 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined">
                                {contract.status === 'Cancelado' ? 'block' : 'info'}
                            </span>
                        </div>
                        <div>
                            <p className="text-xs font-bold opacity-70 uppercase tracking-widest">Status Atual</p>
                            <p className="text-lg font-black leading-none">{contract.status}</p>
                        </div>
                    </div>

                    {/* Client Info */}
                    <section>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">person</span>
                            Dados do Cliente
                        </h3>
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-4">
                            <div className="size-16 rounded-xl bg-gray-100 bg-cover bg-center shrink-0" style={{ backgroundImage: `url('${client.img}')` }}></div>
                            <div className="text-center sm:text-left">
                                <h4 className="text-lg font-bold text-navy">{client.name}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 mt-2">
                                    <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-gray-600">
                                        <span className="material-symbols-outlined text-[16px] text-gray-400">call</span>
                                        {client.phone}
                                    </div>
                                    <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-gray-600">
                                        <span className="material-symbols-outlined text-[16px] text-gray-400">mail</span>
                                        {client.email}
                                    </div>
                                    {client.cpf && (
                                        <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-gray-600 md:col-span-2">
                                            <span className="material-symbols-outlined text-[16px] text-gray-400">badge</span>
                                            CPF: {client.cpf}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Rental Details */}
                    <section>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">event</span>
                            Detalhes da Locação
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="text-xs text-gray-500 mb-1">Data de Retirada</p>
                                <p className="text-lg font-bold text-navy">{new Date(contract.startDate.split('T')[0] + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="text-xs text-gray-500 mb-1">Data de Devolução</p>
                                <p className="text-lg font-bold text-navy">{new Date(contract.endDate.split('T')[0] + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                            </div>
                            <div className="md:col-span-2 p-4 bg-navy/5 rounded-2xl border border-navy/10 flex justify-between items-center">
                                <div>
                                    <p className="text-xs text-navy/70 uppercase font-bold text-nowrap">Valor Total</p>
                                    <p className="text-xl md:text-2xl font-black text-navy text-nowrap">R$ {contract.totalValue.toFixed(2)}</p>
                                </div>
                                <span className="px-3 py-1 bg-white rounded-lg text-xs font-bold border border-gray-100 shadow-sm text-navy ml-4">
                                    {contract.items.length} Itens
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* Items List */}
                    <section>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">checkroom</span>
                            Itens do Contrato
                        </h3>
                        <div className="space-y-3">
                            {items.map(item => (
                                <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:shadow-sm transition-all bg-white">
                                    <div className="size-12 rounded-lg bg-gray-50 bg-cover bg-center border border-gray-200" style={{ backgroundImage: `url('${item.img}')` }}></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-navy truncate">{item.name}</p>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            <span className="text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 uppercase font-bold">{item.type}</span>
                                            <span className="text-xs text-gray-500">Tam: <strong>{item.size}</strong></span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-navy text-sm">R$ {item.price}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Signatures */}
                    <section>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">ink_pen</span>
                            Assinaturas
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className={`p-4 rounded-xl border ${contract.lesseeSignature ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`material-symbols-outlined text-sm ${contract.lesseeSignature ? 'text-emerald-600' : 'text-gray-400'}`}>
                                        {contract.lesseeSignature ? 'check_circle' : 'pending'}
                                    </span>
                                    <span className="text-xs font-bold uppercase text-gray-600">Cliente</span>
                                </div>
                                {contract.lesseeSignature ? (
                                    <img src={contract.lesseeSignature} alt="Assinatura Cliente" className="h-12 object-contain" />
                                ) : (
                                    <p className="text-xs text-gray-400 italic">Pendente</p>
                                )}
                            </div>
                            <div className={`p-4 rounded-xl border ${contract.attendantSignature ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`material-symbols-outlined text-sm ${contract.attendantSignature ? 'text-emerald-600' : 'text-gray-400'}`}>
                                        {contract.attendantSignature ? 'check_circle' : 'pending'}
                                    </span>
                                    <span className="text-xs font-bold uppercase text-gray-600">Atendente</span>
                                </div>
                                {contract.attendantSignature ? (
                                    <img src={contract.attendantSignature} alt="Assinatura Atendente" className="h-12 object-contain" />
                                ) : (
                                    <p className="text-xs text-gray-400 italic">Pendente</p>
                                )}
                            </div>
                        </div>
                    </section>

                </div>

                {/* Footer Actions */}
                <div className="p-4 md:p-6 border-t border-gray-200 bg-white flex flex-col sm:flex-row gap-3 shrink-0">
                    {(contract.status === 'Agendado' || contract.status === 'Ativo') && (
                        <button
                            onClick={() => setIsCancelModalOpen(true)}
                            className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">block</span>
                            Cancelar
                        </button>
                    )}

                    <div className="hidden sm:block flex-1"></div>

                    <button
                        onClick={onPrint}
                        className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold bg-navy text-white shadow-lg shadow-navy/20 hover:bg-navy/90 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">print</span>
                        Imprimir / Assinar
                    </button>
                </div>
            </div>

            {/* Cancel Modal */}
            <ConfirmationModal
                isOpen={isCancelModalOpen}
                onClose={() => setIsCancelModalOpen(false)}
                onConfirm={handleCancelContract}
                title="Cancelar Contrato"
                description="Tem certeza que deseja cancelar este contrato? Os itens serão liberados para novas locações imediatamente."
                confirmText="Sim, Cancelar Contrato"
                isDangerous={true}
            />
        </div>
    );
}
