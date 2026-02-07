import React, { useState } from 'react';
import { Contract, Client, Item } from '../types';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import ConfirmationModal from './ConfirmationModal';
import SignatureModal from './SignatureModal';
import { getContractColor } from '../utils/colorUtils';
import { receiptsAPI } from '../services/api';
import { Receipt } from '../types';
import PrintableReceipt from './PrintableReceipt';
import ContractItemsEditor from './ContractItemsEditor';
import ContractInfoEditor from './ContractInfoEditor';

const LEGACY_FIELDS = [
    { k: 'height', l: 'Altura' },
    { k: 'weight', l: 'Peso' },
    { k: 'shoeSize', l: 'Sapato' },
    { k: 'shirtSize', l: 'Camisa' },
    { k: 'pantsSize', l: 'Calça' },
    { k: 'jacketSize', l: 'Paletó' },
    { k: 'chest', l: 'Tórax' },
    { k: 'waist', l: 'Cintura' },
    { k: 'hips', l: 'Quadril' },
    { k: 'shoulder', l: 'Ombro' },
    { k: 'sleeve', l: 'Manga' },
    { k: 'inseam', l: 'Gancho' },
    { k: 'neck', l: 'Colarinho' }
];

const DEBUTANTE_FIELDS = [
    { k: 'busto', l: 'Busto' },
    { k: 'abBusto', l: 'AB. Busto' },
    { k: 'cintura', l: 'Cintura' },
    { k: 'quadril', l: 'Quadril' },
    { k: 'altQuadril', l: 'Alt. Quadril' },
    { k: 'ombro', l: 'Ombro' },
    { k: 'manga', l: 'Manga' },
    { k: 'cava', l: 'Cava' },
    { k: 'frente', l: 'Frente' },
    { k: 'costa', l: 'Costa' },
    { k: 'comprBlusa', l: 'Compr. Blusa' },
    { k: 'comprSaia', l: 'Compr. Saia' },
    { k: 'comprShort', l: 'Compr. Short' },
    { k: 'comprManga', l: 'Compr. Manga' },
    { k: 'colarinho', l: 'Colarinho' },
    { k: 'largBraco', l: 'Larg. Braço' },
    { k: 'punho', l: 'Punho' }
];

const COMMON_FIELDS = [
    { k: 'busto', l: 'Busto' },
    { k: 'abBusto', l: 'Abaix. Busto' },
    { k: 'cintura', l: 'Cintura' },
    { k: 'terno', l: 'Terno' },
    { k: 'cm', l: 'CM' },
    { k: 'calca', l: 'Calça' },
    { k: 'cc', l: 'CC' },
    { k: 'height', l: 'Altura' }, { k: 'weight', l: 'Peso' }, { k: 'shoeSize', l: 'Sapato' }
];

interface ContractDetailsProps {
    contract: Contract;
    client: Client;
    items: Item[];
    onClose: () => void;
    onPrint: () => void;
}

export default function ContractDetails({ contract, client, items, onClose, onPrint }: ContractDetailsProps) {
    const { updateContractStatus, updateItem, updateContract, deleteContract } = useApp();
    const { showToast } = useToast();
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [sigType, setSigType] = useState<'lessee' | 'attendant'>('lessee');
    const [createdReceipt, setCreatedReceipt] = useState<Receipt | null>(null);
    const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);
    const [isReceiptConfirmOpen, setIsReceiptConfirmOpen] = useState(false);
    const [isEditItemsOpen, setIsEditItemsOpen] = useState(false);
    const [isEditInfoOpen, setIsEditInfoOpen] = useState(false);

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

    const handleDeleteContract = async () => {
        try {
            // 1. Delete Contract
            await deleteContract(contract.id);

            // 2. Release Items (if not already released)
            contract.items.forEach(itemId => {
                updateItem(itemId, { status: 'Disponível', statusColor: 'primary' });
            });

            showToast('success', 'Contrato excluído permanentemente.');
            onClose();
        } catch (error) {
            console.error('Erro ao excluir contrato:', error);
            showToast('error', 'Erro ao excluir contrato.');
        }
    };

    const handleOpenSig = (type: 'lessee' | 'attendant') => {
        setSigType(type);
        setIsSignatureModalOpen(true);
    };

    const handleSaveSig = async (data: string) => {
        try {
            if (sigType === 'lessee') {
                await updateContract(contract.id, { lesseeSignature: data, isPhysicallySigned: false });
            } else {
                await updateContract(contract.id, { attendantSignature: data });
            }
            showToast('success', `Assinatura do ${sigType === 'lessee' ? 'cliente' : 'atendente'} salva com sucesso!`);
        } catch (error) {
            showToast('error', 'Erro ao salvar assinatura.');
        }
    };

    const handleTogglePhysicalSignature = async () => {
        try {
            const newValue = !contract.isPhysicallySigned;
            await updateContract(contract.id, {
                isPhysicallySigned: newValue,
                // If marking as physically signed, clear digital signatures to avoid confusion
                lesseeSignature: newValue ? undefined : contract.lesseeSignature,
                attendantSignature: newValue ? undefined : contract.attendantSignature
            });
            showToast('success', newValue ? 'Contrato marcado como Assinado no Papel.' : 'Assinatura física removida.');
        } catch (error) {
            showToast('error', 'Erro ao atualizar status de assinatura.');
        }
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
                        <p className="text-gray-400 text-sm font-medium">#{contract.number || contract.id}</p>
                    </div>
                    <button onClick={onClose} className="size-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-navy hover:shadow-md transition-all">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-4 md:p-8 space-y-6 md:space-y-8">

                        {/* Status Banner */}
                        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${statusColors[contract.status] || statusColors['Agendado']}`}>
                            <div className="flex items-center gap-4">
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

                            <button
                                onClick={() => setIsEditInfoOpen(true)}
                                className="px-4 py-2 bg-white/40 hover:bg-white/60 text-current rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95"
                            >
                                <span className="material-symbols-outlined text-sm">edit_note</span>
                                Editar Dados
                            </button>
                        </div>

                        {/* Client Info */}
                        <section>
                            <h3 className="text-xs font-bold text-black uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">person</span>
                                {contract.eventType === 'Debutante' ? 'Dados do Responsável' : 'Dados do Cliente'}
                            </h3>
                            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-4">
                                <div
                                    className="size-16 rounded-xl bg-gray-100 bg-cover bg-center shrink-0 flex items-center justify-center text-gray-400 font-black text-xl select-none"
                                    style={client.img ? { backgroundImage: `url('${client.img}')` } : {}}
                                >
                                    {!client.img && (client.name[0] || '?')}
                                </div>
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
                                            <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-gray-600">
                                                <span className="material-symbols-outlined text-[16px] text-gray-400">badge</span>
                                                CPF: {client.cpf}
                                            </div>
                                        )}
                                        {client.rg && (
                                            <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-gray-600">
                                                <span className="material-symbols-outlined text-[16px] text-gray-400">id_card</span>
                                                RG: {client.rg}
                                            </div>
                                        )}
                                        {client.birthDate && (
                                            <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-gray-600">
                                                <span className="material-symbols-outlined text-[16px] text-gray-400">cake</span>
                                                Nasc: {new Date(client.birthDate).toLocaleDateString('pt-BR')}
                                            </div>
                                        )}
                                        {client.address && (
                                            <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-gray-600 md:col-span-2">
                                                <span className="material-symbols-outlined text-[16px] text-gray-400">location_on</span>
                                                {client.address}, {client.neighborhood} - {client.city}/{client.state}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Debutante Info (If applicable) */}
                        {
                            contract.eventType === 'Debutante' ? (
                                <section>
                                    <h3 className="text-xs font-bold text-black uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">celebration</span>
                                        Dados da Debutante
                                    </h3>
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase font-black">Nome</p>
                                                <p className="font-bold text-navy">{contract.debutanteDetails?.name || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase font-black">Data Nasc.</p>
                                                <p className="font-bold text-navy">{contract.debutanteDetails?.birthDate ? new Date(contract.debutanteDetails.birthDate).toLocaleDateString('pt-BR') : '-'}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase font-black">Tema</p>
                                                <p className="font-bold text-navy">{contract.debutanteDetails?.theme || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase font-black">Local</p>
                                                <p className="font-bold text-navy">{contract.debutanteDetails?.eventLocation || '-'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            ) : (
                                <section>
                                    <h3 className="text-xs font-bold text-black uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">event_note</span>
                                        Informações Complementares
                                    </h3>
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase font-black">Local do Evento</p>
                                                <p className="font-bold text-navy">{contract.eventLocation || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase font-black">Contato Evento</p>
                                                <p className="font-bold text-navy">{contract.contact || '-'}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-50">
                                            <div className="flex items-center gap-2">
                                                <span className={`material-symbols-outlined text-lg ${contract.guestRole === 'Anfitrião' ? 'text-primary' : 'text-gray-300'}`}>
                                                    {contract.guestRole === 'Anfitrião' ? 'stars' : 'ads_click'}
                                                </span>
                                                <span className={`text-[11px] font-bold uppercase ${contract.guestRole === 'Anfitrião' ? 'text-navy' : 'text-gray-400'}`}>
                                                    Anfitrião
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`material-symbols-outlined text-lg ${contract.guestRole === 'Convidado' ? 'text-primary' : 'text-gray-300'}`}>
                                                    {contract.guestRole === 'Convidado' ? 'check_circle' : 'ads_click'}
                                                </span>
                                                <span className={`text-[11px] font-bold uppercase ${contract.guestRole === 'Convidado' ? 'text-navy' : 'text-gray-400'}`}>
                                                    Convidado
                                                </span>
                                            </div>
                                            {contract.isFirstRental && (
                                                <div className="flex items-center gap-2 ml-auto bg-primary/5 px-3 py-1 rounded-lg border border-primary/10">
                                                    <span className="material-symbols-outlined text-primary text-lg">new_releases</span>
                                                    <span className="text-[10px] font-black uppercase text-primary tracking-tighter">1º Aluguel</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </section>
                            )
                        }

                        {/* Contract Dates / Sale Details */}
                        <section>
                            <h3 className="text-xs font-bold text-black uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">{contract.contractType === 'Venda' ? 'shopping_bag' : 'event'}</span>
                                {contract.contractType === 'Venda' ? 'Detalhes da Venda' : 'Detalhes da Locação'}
                            </h3>
                            {contract.contractType === 'Venda' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20">
                                        <p className="text-xs text-primary/70 mb-1 font-bold italic uppercase tracking-tighter">Data da Venda/Entrega</p>
                                        <p className="text-lg font-bold text-primary">{contract.eventDate ? new Date(contract.eventDate.split('T')[0] + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informada'}</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
                                        <span className="material-symbols-outlined text-gray-400">check_circle</span>
                                        <p className="text-xs font-bold text-navy uppercase tracking-widest">Venda Definitiva</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <p className="text-xs text-gray-500 mb-1">Retirada</p>
                                        <p className="text-lg font-bold text-navy">{new Date(contract.startDate.split('T')[0] + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                                    </div>
                                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20">
                                        <p className="text-xs text-primary/70 mb-1 font-bold">Data do Evento</p>
                                        <p className="text-lg font-bold text-primary">{contract.eventDate ? new Date(contract.eventDate.split('T')[0] + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informada'}</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <p className="text-xs text-gray-500 mb-1">Devolução</p>
                                        <p className="text-lg font-bold text-navy">{new Date(contract.endDate.split('T')[0] + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Technical Details (Fitting, Measurements & Observations) */}
                        <section className="animate-in fade-in slide-in-from-top-4 duration-500">
                            <h3 className="text-xs font-bold text-black uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">straighten</span>
                                Detalhes Técnicos
                            </h3>
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex flex-col sm:flex-row justify-between gap-4">
                                    {contract.contractType !== 'Venda' && (
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase font-black mb-1">Prova de Roupa</p>
                                            <div className="flex items-center gap-2 text-navy">
                                                <span className="material-symbols-outlined text-lg text-primary">schedule</span>
                                                <span className="font-bold">
                                                    {contract.fittingDate ? new Date(contract.fittingDate.split('T')[0] + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não agendada'}
                                                    {contract.fittingTime && ` às ${contract.fittingTime}`}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    {contract.paymentMethod && (
                                        <div className={contract.contractType === 'Venda' ? 'text-left' : 'text-right'}>
                                            <p className="text-[10px] text-gray-400 uppercase font-black mb-1">Forma de Pagamento</p>
                                            <span className="px-3 py-1 bg-white rounded-lg text-xs font-bold border border-gray-200 shadow-sm text-navy uppercase tracking-wider">
                                                {contract.paymentMethod}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Measurements Snapshot */}
                                    {contract.contractType !== 'Venda' ? (
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase font-black mb-3">Medidas no Contrato ({client.profileType || 'Legado'})</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {contract.measurements && Object.keys(contract.measurements).length > 0 ? (
                                                    (!client.profileType ? LEGACY_FIELDS : (client.profileType === 'Debutante' ? DEBUTANTE_FIELDS : COMMON_FIELDS))
                                                        .filter(m => contract.measurements?.[m.k])
                                                        .map((m) => (
                                                            <div key={m.k} className="flex justify-between items-center p-2 bg-gray-50/50 rounded-lg border border-gray-100">
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase">{m.l}</span>
                                                                <span className="text-xs font-black text-navy">{String(contract.measurements![m.k]) || '--'}</span>
                                                            </div>
                                                        ))
                                                ) : (
                                                    <p className="text-xs text-gray-400 italic col-span-2">Sem medidas registradas.</p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 h-fit">
                                            <span className="material-symbols-outlined text-gray-400">inventory_2</span>
                                            <p className="text-[11px] font-bold text-gray-500 uppercase">Item vendido: Medidas e provas não aplicáveis.</p>
                                        </div>
                                    )}

                                    {/* Observations */}
                                    <div className="flex flex-col">
                                        <p className="text-[10px] text-gray-400 uppercase font-black mb-3 text-right">Observações</p>
                                        <div className="flex-1 p-3 bg-blue-50/30 rounded-xl border border-blue-50 text-xs text-navy/80 italic leading-relaxed">
                                            {contract.observations || 'Nenhuma observação interna.'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Package Info (NEW) */}
                        {
                            contract.packageName && (
                                <section className="animate-in fade-in slide-in-from-top-4 duration-500 delay-150">
                                    <div className="p-4 bg-navy/5 rounded-2xl border border-navy/10 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="size-12 rounded-xl bg-navy text-white flex items-center justify-center shadow-lg shadow-navy/20">
                                                <span className="material-symbols-outlined">inventory_2</span>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Plano / Pacote de Trajes</p>
                                                <p className="text-xl font-black text-navy">{contract.packageName}</p>
                                            </div>
                                        </div>
                                        <div className="hidden sm:block px-4 py-1.5 bg-white rounded-full border border-navy/5 shadow-sm">
                                            <span className="text-[10px] font-black text-navy uppercase tracking-tighter">Fulfillment Ativo</span>
                                        </div>
                                    </div>
                                </section>
                            )
                        }

                        {/* Items List */}
                        <section>
                            <h3 className="text-xs font-bold text-black uppercase tracking-widest mb-4 flex items-center gap-2 justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">checkroom</span>
                                    Itens do Contrato
                                </div>
                                {(contract.status === 'Agendado' || contract.status === 'Rascunho') && (
                                    <button
                                        onClick={() => setIsEditItemsOpen(true)}
                                        className="text-[10px] bg-primary/10 text-primary hover:bg-primary hover:text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">edit</span>
                                        Editar Itens
                                    </button>
                                )}
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
                                            <p className="font-bold text-navy text-sm">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                                    (contract.saleItems?.includes(item.id) ? (item.salePrice || item.price) : item.price) || 0
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Signatures */}
                        <section>
                            <h3 className="text-xs font-bold text-black uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">ink_pen</span>
                                Assinaturas
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div
                                    onClick={() => handleOpenSig('lessee')}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${contract.lesseeSignature || contract.isPhysicallySigned ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100 hover:border-primary/30'}`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`material-symbols-outlined text-sm ${contract.lesseeSignature || contract.isPhysicallySigned ? 'text-emerald-600' : 'text-gray-400'}`}>
                                                {contract.lesseeSignature || contract.isPhysicallySigned ? 'check_circle' : 'pending'}
                                            </span>
                                            <span className="text-xs font-bold uppercase text-gray-600">{contract.contractType === 'Venda' ? 'Comprador' : 'Cliente / Locatário'}</span>
                                        </div>
                                        {contract.isPhysicallySigned && (
                                            <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded uppercase tracking-tighter">Papel</span>
                                        )}
                                    </div>
                                    {contract.lesseeSignature ? (
                                        <img src={contract.lesseeSignature} alt="Assinatura Cliente" className="h-12 object-contain" />
                                    ) : contract.isPhysicallySigned ? (
                                        <div className="h-12 flex items-center gap-2 text-emerald-700">
                                            <span className="material-symbols-outlined">description</span>
                                            <p className="text-xs font-bold">Contrato Assinado Manualmente</p>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 italic">Clique para assinar digitalmente</p>
                                    )}
                                </div>
                                <div
                                    onClick={() => handleOpenSig('attendant')}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${contract.attendantSignature || contract.isPhysicallySigned ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100 hover:border-primary/30'}`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`material-symbols-outlined text-sm ${contract.attendantSignature || contract.isPhysicallySigned ? 'text-emerald-600' : 'text-gray-400'}`}>
                                                {contract.attendantSignature || contract.isPhysicallySigned ? 'check_circle' : 'pending'}
                                            </span>
                                            <span className="text-xs font-bold uppercase text-gray-600">Representante Empire</span>
                                        </div>
                                        {contract.isPhysicallySigned && (
                                            <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded uppercase tracking-tighter">Papel</span>
                                        )}
                                    </div>
                                    {contract.attendantSignature ? (
                                        <img src={contract.attendantSignature} alt="Assinatura Atendente" className="h-12 object-contain" />
                                    ) : contract.isPhysicallySigned ? (
                                        <div className="h-12 flex items-center gap-2 text-emerald-700">
                                            <span className="material-symbols-outlined">description</span>
                                            <p className="text-xs font-bold">Assinado no Papel</p>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 italic">Clique para assinar</p>
                                    )}
                                </div>
                            </div>

                            {/* Manual Signature Toggle Overlay */}
                            <div className="mt-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className={`size-10 rounded-xl flex items-center justify-center transition-all ${contract.isPhysicallySigned ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white text-gray-400 border border-gray-200'}`}>
                                        <span className="material-symbols-outlined">{contract.isPhysicallySigned ? 'inventory_2' : 'history_edu'}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-navy group-hover:text-primary transition-colors">Assinatura no Papel (Manual)</p>
                                        <p className="text-[11px] text-gray-500 font-medium">Use se o cliente já assinou o contrato impresso manualmente.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleTogglePhysicalSignature}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${contract.isPhysicallySigned ? 'bg-emerald-500' : 'bg-gray-200'}`}
                                >
                                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${contract.isPhysicallySigned ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </section>


                        {/* Footer Actions - Now part of the scrollable area */}
                        <div className="p-6 md:p-8 border-t border-gray-100 bg-gray-50/30 flex flex-col sm:flex-row gap-6 justify-between items-stretch sm:items-center mt-8">
                            {/* Left Actions (Destructive) */}
                            <div className="flex flex-col gap-2 w-full sm:w-auto">
                                {(contract.status === 'Agendado' || contract.status === 'Ativo') && (
                                    <button
                                        onClick={() => setIsCancelModalOpen(true)}
                                        className="w-full px-5 py-3 rounded-2xl font-bold bg-white text-red-500 border border-red-100 hover:bg-red-50 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest shadow-sm active:scale-95"
                                    >
                                        <span className="material-symbols-outlined text-sm">block</span>
                                        Cancelar Contrato
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsDeleteModalOpen(true)}
                                    className="w-full px-5 py-3 rounded-2xl font-bold bg-white text-gray-400 border border-gray-100 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest shadow-sm active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                    Excluir
                                </button>
                            </div>

                            {/* Right Actions (Operational) */}
                            <div className="flex flex-wrap gap-3 w-full sm:w-auto justify-center sm:justify-end">
                                <button
                                    onClick={() => handleOpenSig('lessee')}
                                    disabled={contract.isPhysicallySigned}
                                    className={`flex-1 sm:flex-none px-6 py-4 rounded-2xl font-black border transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest ${(contract.lesseeSignature || contract.isPhysicallySigned) && contract.attendantSignature
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                        : 'bg-white text-navy border-navy/20 hover:bg-gray-50'
                                        } ${contract.isPhysicallySigned ? 'opacity-50 cursor-not-allowed' : 'active:scale-95 shadow-sm'}`}
                                >
                                    <span className="material-symbols-outlined text-[20px]">
                                        {(contract.lesseeSignature || contract.isPhysicallySigned) && contract.attendantSignature ? 'check_circle' : 'ink_pen'}
                                    </span>
                                    {contract.isPhysicallySigned ? 'Assinado Manual' : (contract.lesseeSignature && contract.attendantSignature ? 'Assinado' : 'Assinar')}
                                </button>

                                <button
                                    onClick={onPrint}
                                    className={`flex-1 sm:flex-none px-6 py-4 rounded-2xl font-black text-white shadow-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest ${(contract.lesseeSignature || contract.isPhysicallySigned) && contract.attendantSignature
                                        ? 'bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700'
                                        : 'bg-navy shadow-navy/20 hover:scale-[1.02] active:scale-95'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-[20px]">visibility</span>
                                    Visualizar
                                </button>

                                <button
                                    onClick={() => setIsReceiptConfirmOpen(true)}
                                    disabled={isGeneratingReceipt}
                                    className="w-full sm:w-auto px-6 py-4 rounded-2xl font-black bg-white text-navy border border-navy/20 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest shadow-sm active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                                    Recibo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals outside Drawer */}
            <ConfirmationModal
                isOpen={isReceiptConfirmOpen}
                onClose={() => setIsReceiptConfirmOpen(false)}
                onConfirm={async () => {
                    setIsGeneratingReceipt(true);
                    try {
                        const receipt = await receiptsAPI.create({
                            value: contract.totalValue,
                            clientName: client.name,
                            clientId: client.id,
                            date: new Date().toISOString().split('T')[0],
                            concept: `Pagamento integral referente ao contrato #${contract.number || contract.id}${contract.packageName ? ` (${contract.packageName})` : ''}`,
                            paymentMethod: contract.paymentMethod || 'PIX',
                            contractId: contract.id
                        });
                        setCreatedReceipt(receipt);
                        showToast('success', 'Recibo gerado com sucesso!');
                    } catch (error) {
                        console.error(error);
                        showToast('error', 'Erro ao gerar recibo.');
                    } finally {
                        setIsGeneratingReceipt(false);
                    }
                }}
                title="Gerar Recibo"
                description={`Deseja gerar um recibo no valor de R$ ${contract.totalValue.toLocaleString('pt-BR')} para ${client.name}?`}
                confirmText="Gerar Recibo"
                cancelText="Cancelar"
                isDangerous={false}
            />

            {/* Receipt Modal */}
            {
                createdReceipt && (
                    <PrintableReceipt
                        receipt={createdReceipt}
                        onClose={() => setCreatedReceipt(null)}
                    />
                )
            }

            {/* Signature Modal Integration */}
            <SignatureModal
                isOpen={isSignatureModalOpen}
                onClose={() => setIsSignatureModalOpen(false)}
                onSave={handleSaveSig}
                title={sigType === 'lessee' ? (contract.contractType === 'Venda' ? 'Assinatura do Comprador' : 'Assinatura do Cliente / Locatário') : 'Assinatura Representante Empire'}
            />

            {/* Cancel Modal */}
            <ConfirmationModal
                isOpen={isCancelModalOpen}
                onClose={() => setIsCancelModalOpen(false)}
                onConfirm={handleCancelContract}
                title="Cancelar Contrato"
                description={contract.contractType === 'Venda' ? "Tem certeza que deseja cancelar esta venda? Os itens retornarão ao estoque imediatamente." : "Tem certeza que deseja cancelar este contrato? Os itens serão liberados para novas locações imediatamente."}
                confirmText="Sim, Cancelar Contrato"
                isDangerous={true}
            />

            {/* Delete Modal */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteContract}
                title="Excluir Contrato Permanentemente"
                description="Tem certeza que deseja EXCLUIR este contrato? Esta ação não pode ser desfeita e todos os dados serão perdidos. Os itens vinculados serão liberados."
                confirmText="Sim, Excluir Permanentemente"
                isDangerous={true}
            />

            {/* Edit Items Modal */}
            {
                isEditItemsOpen && (
                    <ContractItemsEditor
                        contract={contract}
                        isOpen={isEditItemsOpen}
                        onClose={() => setIsEditItemsOpen(false)}
                    />
                )
            }

            {/* Edit Info Modal */}
            {
                isEditInfoOpen && (
                    <ContractInfoEditor
                        contract={contract}
                        isOpen={isEditInfoOpen}
                        onClose={() => setIsEditInfoOpen(false)}
                    />
                )
            }
        </div>
    );
}
