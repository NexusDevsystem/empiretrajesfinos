import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Contract, Item } from '../types';
import { viaCepAPI } from '../services/api';

interface NewContractModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const STEPS = [
    { num: 1, title: 'Data e Cliente', icon: 'calendar_month' },
    { num: 2, title: 'Seleção de Itens', icon: 'checkroom' },
    { num: 3, title: 'Revisão e Pagamento', icon: 'payments' },
];

import { CONTRACT_CLAUSES } from '../constants/clauses';
import { maskCPF, maskPhone, maskCEP } from '../utils/maskUtils';

import { useToast } from '../contexts/ToastContext';

export default function NewContractModal({ isOpen, onClose }: NewContractModalProps) {
    const { clients, items, contracts, addContract, addClient, isItemAvailable, navigateTo, setSelectedContractId } = useApp();
    const { showToast } = useToast();
    const [step, setStep] = useState(1);
    const [showReminder, setShowReminder] = useState(false);
    const [pendingContract, setPendingContract] = useState<Contract | null>(null);

    // Client Selection State
    const [clientSearch, setClientSearch] = useState('');
    const [isCreatingNewClient, setIsCreatingNewClient] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Form Data
    const [clientId, setClientId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('18:00');
    const [eventType, setEventType] = useState<import('../types').EventType>('Casamento');
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
    const [discount, setDiscount] = useState('0');
    const [notes, setNotes] = useState('');
    const [paidAmount, setPaidAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<string>('Pix');
    const searchRef = useRef<HTMLDivElement>(null);

    // Close suggestions on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // New Client Details (Full Form)
    const [newClientDetails, setNewClientDetails] = useState({
        name: '',
        phone: '',
        email: '',
        cpf: '',
        address: '',
        neighborhood: '',
        city: '',
        state: '',
        zip: '',
        birthDate: '',
        measurements: {
            height: '', weight: '', shoeSize: '', shirtSize: '', pantsSize: '', jacketSize: '',
            chest: '', waist: '', hips: '', shoulder: '', sleeve: '', inseam: '', neck: ''
        }
    });

    const handleCEPChange = async (cep: string) => {
        const formatted = maskCEP(cep);
        setNewClientDetails(prev => ({ ...prev, zip: formatted }));

        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length === 8) {
            const addressData = await viaCepAPI.getAddress(cleanCep);
            if (addressData) {
                setNewClientDetails(prev => ({
                    ...prev,
                    address: addressData.address,
                    neighborhood: addressData.neighborhood,
                    city: addressData.city,
                    state: addressData.state
                }));
            }
        }
    };

    // Debutante State
    const [debutanteDetails, setDebutanteDetails] = useState({
        name: '', birthDate: '', theme: '', preferredColor: '', instagram: '', preferredMusic: '', eventLocation: ''
    });
    const [packageDetails, setPackageDetails] = useState({
        reception: false, waltz: false, party: false, accessories: false, family: false, firstRental: false
    });

    // Catalog Filter
    const [catFilter, setCatFilter] = useState('Todos');
    const [searchTerm, setSearchTerm] = useState('');

    // Logic
    // Product Grouping Logic
    const productGroups = useMemo(() => {
        if (!startDate || !endDate) return [];
        const groups: Record<string, {
            key: string, name: string, size: string, img: string, price: number, type: string,
            allItems: import('../types').Item[],
            availableQty: number
        }> = {};

        const rStart = new Date(startDate);
        const rEnd = new Date(endDate);
        rStart.setHours(0, 0, 0, 0);
        rEnd.setHours(0, 0, 0, 0);

        items.forEach(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCat = catFilter === 'Todos' || item.type.includes(catFilter);
            if (!matchesSearch || !matchesCat) return;

            const key = `${item.name}-${item.type}-${item.size}`;
            if (!groups[key]) {
                groups[key] = {
                    key, name: item.name, size: item.size, img: item.img, price: item.price, type: item.type,
                    allItems: [], availableQty: 0
                };
            }
            groups[key].allItems.push(item);

            // Calculate rented units for this ID in the selected period
            const rentedInPeriod = contracts.reduce((count, c) => {
                if (c.status === 'Cancelado' || c.status === 'Finalizado') return count;

                const start = new Date(c.startDate);
                const end = new Date(c.endDate);
                start.setHours(0, 0, 0, 0);
                end.setHours(0, 0, 0, 0);

                const overlaps = rStart <= end && rEnd >= start;
                if (!overlaps) return count;

                // Count occurrences of this item ID in the contract
                return count + c.items.filter(id => id === item.id).length;
            }, 0);

            const availableForThisItem = Math.max(0, (item.totalQuantity || 1) - rentedInPeriod);
            groups[key].availableQty += availableForThisItem;
        });

        return Object.values(groups);
    }, [items, contracts, startDate, endDate, searchTerm, catFilter]);

    const filteredClients = useMemo(() => {
        if (!clientSearch) return clients.slice(0, 100); // Show recent or first 100 if empty
        const search = clientSearch.toLowerCase();
        return clients.filter(c =>
            c.name.toLowerCase().includes(search) ||
            c.phone.toLowerCase().includes(search) ||
            (c.cpf && c.cpf.includes(search))
        );
    }, [clients, clientSearch]);

    // Cart Logic - Deduplicate IDs for rendering but keep count for value
    const cartItems = useMemo(() => {
        const uniqueIds = Array.from(new Set(selectedItemIds));
        return uniqueIds.map(id => {
            const item = items.find(i => i.id === id);
            return {
                ...item!,
                quantity: selectedItemIds.filter(sid => sid === id).length
            };
        });
    }, [selectedItemIds, items]);

    const subtotal = selectedItemIds.reduce((acc, id) => {
        const item = items.find(i => i.id === id);
        return acc + (item?.price || 0);
    }, 0);
    const total = subtotal - parseFloat(discount || '0');


    // Validation Logic
    const selectedClient = clients.find(c => c.id === clientId);

    const REQUIRED_FIELDS = [
        { key: 'cpf', label: 'CPF' },
        { key: 'email', label: 'Email' },
        { key: 'address', label: 'Endereço' },
        { key: 'neighborhood', label: 'Bairro' },
        { key: 'city', label: 'Cidade' },
        { key: 'state', label: 'Estado' },
        { key: 'zip', label: 'CEP' },
        { key: 'birthDate', label: 'Data de Nascimento' }
    ];

    // Check missing fields (only if client is selected)
    const missingFields = selectedClient ? REQUIRED_FIELDS.filter(f => !selectedClient[f.key as keyof import('../types').Client]) : [];
    const isClientValid = missingFields.length === 0;

    // For new clients (Step 1 validation only)
    const isNewClientValid = isCreatingNewClient && newClientDetails.name && newClientDetails.phone;

    // Handlers
    const handleSelectClient = (client: import('../types').Client) => {
        setClientId(client.id);
        setClientSearch(client.name);
        setShowSuggestions(false);
        setIsCreatingNewClient(false);
    };

    const handleCreateNewClick = () => {
        setIsCreatingNewClient(true);
        setNewClientDetails(prev => ({ ...prev, name: clientSearch }));
        setShowSuggestions(false);
        setClientId('');
    };

    const handleNext = async () => {
        if (step === 1) {
            // Common Validation for Step 1
            if (!startDate || !endDate) {
                showToast('error', 'Selecione as datas de início e fim.');
                return;
            }

            if (isCreatingNewClient) {
                // Validate New Client
                if (!newClientDetails.name || !newClientDetails.phone) {
                    showToast('error', 'Preencha nome e telefone para continuar.');
                    return;
                }

                try {
                    // Create Client and WAIT for real ID
                    const newId = `TEMP_${Date.now()}`;
                    const newClientObj: import('../types').Client = {
                        ...newClientDetails,
                        id: newId,
                        initials: newClientDetails.name.slice(0, 2).toUpperCase(),
                        rg: ''
                    };

                    const savedClient = await addClient(newClientObj);
                    setClientId(savedClient.id);
                    setIsCreatingNewClient(false);
                    showToast('success', 'Cliente cadastrado com sucesso!');
                    setStep(2); // Manually move to next step after async
                    return;
                } catch (error) {
                    showToast('error', 'Erro ao cadastrar cliente. Tente novamente.');
                    return;
                }
            } else {
                if (!clientId) {
                    showToast('error', 'Selecione um cliente ou cadastre um novo.');
                    return;
                }
            }
        }
        if (step === 2 && selectedItemIds.length === 0) {
            showToast('error', 'Selecione pelo menos um item.');
            return;
        }
        setStep(prev => prev + 1);
    };

    const handleBack = () => setStep(prev => prev - 1);

    const adjustQuantity = (group: any, delta: number) => {
        const groupItemIds = group.allItems.map((i: any) => i.id);
        const selectedFromGroup = selectedItemIds.filter(id => groupItemIds.includes(id)).length;

        if (delta > 0) {
            if (selectedFromGroup < group.availableQty) {
                // For simplicity, we add the first available item in the group
                setSelectedItemIds(prev => [...prev, group.allItems[0].id]);
            } else {
                showToast('error', 'Quantidade máxima disponível atingida para este período.');
            }
        } else {
            // Manual last index find for older TS targets
            let indexToRemove = -1;
            for (let i = selectedItemIds.length - 1; i >= 0; i--) {
                if (groupItemIds.includes(selectedItemIds[i])) {
                    indexToRemove = i;
                    break;
                }
            }

            if (indexToRemove !== -1) {
                setSelectedItemIds(prev => {
                    const next = [...prev];
                    next.splice(indexToRemove, 1);
                    return next;
                });
            }
        }
    };

    const handlePreFinish = () => {
        const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const random = Math.floor(1000 + Math.random() * 9000);
        const contract: Contract = {
            id: `CN-${timestamp}-${random}`,
            clientId,
            clientName: selectedClient?.name || newClientDetails.name,
            items: selectedItemIds,
            startDate,
            startTime,
            endDate,
            endTime,
            totalValue: total,
            status: 'Agendado',
            statusColor: 'blue',
            eventType,
            terms: CONTRACT_CLAUSES[eventType] || '',
            paidAmount: paidAmount || 0,
            paymentMethod,
            balance: total - (paidAmount || 0),
            lesseeSignature: '',
            ...(eventType === 'Debutante' ? { debutanteDetails, packageDetails } : {})
        };
        setPendingContract(contract);
        setShowReminder(true);
    };

    const handleFinalize = async (shouldRedirect: boolean) => {
        if (!pendingContract) return;

        try {
            await addContract(pendingContract);
            showToast('success', 'Reserva confirmada!', { title: 'Sucesso' });

            if (shouldRedirect) {
                setSelectedContractId(pendingContract.id);
                navigateTo('contracts');
            }

            onClose();
        } catch (error: any) {
            console.error('Finalize error:', error);
            showToast('error', `Erro ao salvar contrato: ${error.message || 'Verifique os dados.'}`);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full h-full md:h-auto md:w-full md:max-w-5xl md:max-h-[90vh] md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300 rounded-none">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-navy tracking-tight">Nova Reserva</h2>
                        <p className="text-sm text-gray-500">Crie um novo contrato de aluguel em 3 passos.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-navy transition-colors"><span className="material-symbols-outlined">close</span></button>
                </div>

                {/* Stepper */}
                <div className="bg-white px-6 py-4 border-b border-gray-100 flex justify-center">
                    <div className="flex items-center gap-4">
                        {STEPS.map((s, i) => (
                            <React.Fragment key={s.num}>
                                <div className={`flex items-center gap-2 ${step >= s.num ? 'text-primary' : 'text-gray-300'}`}>
                                    <div className={`size-8 flex items-center justify-center font-bold text-sm transition-all ${step >= s.num ? 'text-primary' : 'text-gray-400'}`}>
                                        {step > s.num ? <span className="material-symbols-outlined text-[16px]">check</span> : s.num}
                                    </div>
                                    <span className="text-sm font-bold hidden sm:block">{s.title}</span>
                                </div>
                                {i < STEPS.length - 1 && <div className={`w-8 h-0.5 rounded ${step > s.num ? 'bg-primary' : 'bg-gray-200'}`}></div>}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto bg-gray-50/30 p-6">
                    {/* Step 1: Info */}
                    {step === 1 && (
                        <div className="max-w-xl mx-auto space-y-6 animate-in slide-in-from-right-8 duration-300">
                            <div className="flex flex-col gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Retirada</label>
                                    <div className="flex gap-4">
                                        <div className="relative flex-1">
                                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white font-medium text-navy shadow-sm transition-all" />
                                            <span className="material-symbols-outlined absolute left-3 top-3 text-gray-400">calendar_today</span>
                                        </div>
                                        <div className="relative w-40">
                                            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white font-medium text-navy shadow-sm transition-all" />
                                            <span className="material-symbols-outlined absolute left-3 top-3 text-gray-400">schedule</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Devolução Prevista</label>
                                    <div className="flex gap-4">
                                        <div className="relative flex-1">
                                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white font-medium text-navy shadow-sm transition-all" />
                                            <span className="material-symbols-outlined absolute left-3 top-3 text-gray-400">event</span>
                                        </div>
                                        <div className="relative w-40">
                                            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white font-medium text-navy shadow-sm transition-all" />
                                            <span className="material-symbols-outlined absolute left-3 top-3 text-gray-400">update</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 relative" ref={searchRef}>
                                <label className="text-xs font-bold text-gray-500 uppercase">Cliente Responsável</label>

                                {!isCreatingNewClient ? (
                                    <div className="relative">
                                        <input
                                            value={clientSearch}
                                            onChange={e => {
                                                setClientSearch(e.target.value);
                                                setShowSuggestions(true);
                                                if (!e.target.value) setClientId('');
                                            }}
                                            onFocus={() => setShowSuggestions(true)}
                                            placeholder="Digite o nome do cliente..."
                                            className={`w-full pl-10 pr-4 py-3 rounded-xl border ${clientId ? 'border-green-500 ring-1 ring-green-500' : 'border-gray-200'} focus:ring-2 focus:ring-primary/20 outline-none bg-white font-medium text-navy shadow-sm`}
                                        />
                                        <span className="material-symbols-outlined absolute left-3 top-3 text-gray-400">search</span>

                                        {/* Suggestions Dropdown */}
                                        {showSuggestions && !clientId && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                                {filteredClients.length > 0 ? (
                                                    <div className="flex flex-col">
                                                        <div className="max-h-60 overflow-y-auto divide-y divide-gray-50 custom-scrollbar">
                                                            {filteredClients.map(client => (
                                                                <div
                                                                    key={client.id}
                                                                    onClick={() => handleSelectClient(client)}
                                                                    className="p-3 hover:bg-primary/5 cursor-pointer transition-colors flex items-center justify-between group"
                                                                >
                                                                    <div>
                                                                        <p className="font-bold text-navy text-sm group-hover:text-primary transition-colors">{client.name}</p>
                                                                        <p className="text-[10px] text-gray-400 font-medium">{client.phone} • {client.cpf || 'Sem CPF'}</p>
                                                                    </div>
                                                                    <span className="material-symbols-outlined text-gray-300 group-hover:text-primary transition-colors text-sm">arrow_forward</span>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Add new option always at bottom when searching */}
                                                        {clientSearch && (
                                                            <button
                                                                onClick={handleCreateNewClick}
                                                                className="p-4 bg-gray-50 hover:bg-primary/5 text-primary border-t border-gray-100 transition-colors flex items-center justify-center gap-2 group"
                                                            >
                                                                <span className="material-symbols-outlined text-[18px] group-hover:scale-110 transition-transform">person_add</span>
                                                                <span className="text-xs font-black uppercase tracking-wider">Cadastrar "{clientSearch}"</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="p-6 text-center">
                                                        <div className="size-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
                                                            <span className="material-symbols-outlined text-gray-300 text-2xl">person_search</span>
                                                        </div>
                                                        <p className="text-sm text-navy font-bold mb-1">Cliente não encontrado</p>
                                                        <p className="text-[11px] text-gray-400 mb-4">Nenhum cadastro corresponde à sua busca.</p>
                                                        <button
                                                            onClick={handleCreateNewClick}
                                                            className="w-full py-3 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">add_circle</span>
                                                            Cadastrar Novo Cliente
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {clientId && (
                                            <div className="absolute right-3 top-2.5 flex items-center gap-2">
                                                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-100 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">check_circle</span> Cliente Selecionado
                                                </span>
                                                <button onClick={() => { setClientId(''); setClientSearch(''); }} className="text-gray-400 hover:text-red-500">
                                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 rounded-xl p-5 border border-dashed border-primary animate-in zoom-in-50 duration-200">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="text-sm font-bold text-navy flex items-center gap-2">
                                                <span className="material-symbols-outlined text-primary">person_add</span>
                                                Novo Cadastro de Cliente
                                            </h4>
                                            <button onClick={() => setIsCreatingNewClient(false)} className="text-xs font-bold text-gray-400 hover:text-red-500 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[14px]">close</span> Cancelar
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nome Completo *</label>
                                                    <input
                                                        value={newClientDetails.name}
                                                        onChange={e => setNewClientDetails({ ...newClientDetails, name: e.target.value })}
                                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                                                        placeholder="Nome do cliente"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Telefone *</label>
                                                    <input
                                                        value={newClientDetails.phone}
                                                        onChange={e => setNewClientDetails({ ...newClientDetails, phone: maskPhone(e.target.value) })}
                                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                                                        placeholder="(00) 00000-0000"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">CPF</label>
                                                    <input
                                                        value={newClientDetails.cpf}
                                                        onChange={e => setNewClientDetails({ ...newClientDetails, cpf: maskCPF(e.target.value) })}
                                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                                                        placeholder="000.000.000-00"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text/[10px] font-bold text-gray-400 uppercase mb-1">Data Nascimento *</label>
                                                    <input
                                                        type="date"
                                                        value={newClientDetails.birthDate}
                                                        onChange={e => setNewClientDetails({ ...newClientDetails, birthDate: e.target.value })}
                                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white font-sans"
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Email</label>
                                                    <input
                                                        value={newClientDetails.email}
                                                        onChange={e => setNewClientDetails({ ...newClientDetails, email: e.target.value })}
                                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                                                        placeholder="email@exemplo.com"
                                                    />
                                                </div>
                                            </div>

                                            {/* Simplified Address */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="col-span-2">
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Endereço</label>
                                                    <input
                                                        value={newClientDetails.address}
                                                        onChange={e => setNewClientDetails({ ...newClientDetails, address: e.target.value })}
                                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                                                        placeholder="Rua, Número, Complemento"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Bairro</label>
                                                    <input
                                                        value={newClientDetails.neighborhood}
                                                        onChange={e => setNewClientDetails({ ...newClientDetails, neighborhood: e.target.value })}
                                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                                                    />
                                                </div>
                                                <div className="col-span-1">
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cidade</label>
                                                    <input
                                                        value={newClientDetails.city}
                                                        onChange={e => setNewClientDetails({ ...newClientDetails, city: e.target.value })}
                                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                                                    />
                                                </div>
                                                <div className="col-span-1">
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Estado</label>
                                                    <select
                                                        value={newClientDetails.state}
                                                        onChange={e => setNewClientDetails({ ...newClientDetails, state: e.target.value })}
                                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white h-9"
                                                    >
                                                        <option value="">UF</option>
                                                        {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
                                                            <option key={uf} value={uf}>{uf}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="col-span-1">
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">CEP</label>
                                                    <input
                                                        value={newClientDetails.zip}
                                                        onChange={e => handleCEPChange(e.target.value)}
                                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                                                        placeholder="00000-000"
                                                    />
                                                </div>
                                            </div>

                                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex gap-2 items-center">
                                                <span className="material-symbols-outlined text-blue-600 text-lg">info</span>
                                                <p className="text-xs text-blue-800 font-medium">As medidas poderão ser cadastradas posteriormente no perfil do cliente.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">Tipo de Evento</label>
                                <div className="relative">
                                    <select value={eventType} onChange={e => setEventType(e.target.value as any)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white font-medium text-navy shadow-sm appearance-none cursor-pointer">
                                        <option value="Casamento">Casamento</option>
                                        <option value="Formatura">Formatura</option>
                                        <option value="Debutante">Debutante</option>
                                        <option value="Noivado">Noivado</option>
                                        <option value="Corporativo">Corporativo</option>
                                        <option value="Outro">Outro</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute left-3 top-3 text-gray-400">celebration</span>
                                    <span className="material-symbols-outlined absolute right-4 top-3 text-gray-400 pointer-events-none">expand_more</span>
                                </div>
                            </div>

                            {/* Debutante Specific Fields */}
                            {eventType === 'Debutante' && (
                                <div className="space-y-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-4">
                                    <h3 className="font-bold text-navy flex items-center gap-2"><span className="material-symbols-outlined text-primary">celebration</span> Detalhes da Debutante</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Debutante</label>
                                            <input value={debutanteDetails.name} onChange={e => setDebutanteDetails({ ...debutanteDetails, name: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Ex: Maria Eduarda" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Nascimento</label>
                                            <input type="date" value={debutanteDetails.birthDate} onChange={e => setDebutanteDetails({ ...debutanteDetails, birthDate: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tema da Festa</label>
                                            <input value={debutanteDetails.theme} onChange={e => setDebutanteDetails({ ...debutanteDetails, theme: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Ex: Paris, Realeza..." />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cor Preferida</label>
                                            <input value={debutanteDetails.preferredColor} onChange={e => setDebutanteDetails({ ...debutanteDetails, preferredColor: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Ex: Rosa Gold" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Instagram</label>
                                            <input value={debutanteDetails.instagram} onChange={e => setDebutanteDetails({ ...debutanteDetails, instagram: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="@usuario" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Música Preferida</label>
                                            <input value={debutanteDetails.preferredMusic} onChange={e => setDebutanteDetails({ ...debutanteDetails, preferredMusic: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Ex: Valsa..." />
                                        </div>
                                        <div className="col-span-1 md:col-span-2">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Local do Evento</label>
                                            <input value={debutanteDetails.eventLocation} onChange={e => setDebutanteDetails({ ...debutanteDetails, eventLocation: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Ex: Buffet Crystal..." />
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase">Pacote (Trajes Inclusos)</label>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {[
                                                { k: 'reception', label: '1. Traje Recepção' },
                                                { k: 'waltz', label: '2. Traje Valsa' },
                                                { k: 'party', label: '3. Traje Balada' },
                                                { k: 'accessories', label: '4. Acessórios' },
                                                { k: 'family', label: '5. Traje Família' },
                                                { k: 'firstRental', label: 'Primeiro Aluguel?' },
                                            ].map((opt) => (
                                                <label key={opt.k} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-100 bg-gray-50 hover:bg-gray-100">
                                                    <input
                                                        type="checkbox"
                                                        checked={(packageDetails as any)[opt.k]}
                                                        onChange={e => setPackageDetails({ ...packageDetails, [opt.k]: e.target.checked })}
                                                        className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                    />
                                                    <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!startDate || !endDate ? (
                                <div className="p-4 bg-blue-50 text-blue-700 rounded-xl text-sm flex gap-3 items-start border border-blue-100">
                                    <span className="material-symbols-outlined">info</span>
                                    <p>Defina as datas primeiro para verificarmos a disponibilidade do acervo em tempo real.</p>
                                </div>
                            ) : (
                                <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl text-sm flex gap-3 items-center border border-emerald-100">
                                    <span className="material-symbols-outlined">check_circle</span>
                                    <p className="font-bold">Datas definidas. Podemos prosseguir.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Catalog */}
                    {step === 2 && (
                        <div className="flex flex-col h-full gap-4 animate-in slide-in-from-right-8 duration-300">
                            {/* Toolbar */}
                            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                                    {['Todos', 'Smoking', 'Terno', 'Fraque', 'Acessório'].map(cat => (
                                        <button key={cat} onClick={() => setCatFilter(cat)}
                                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${catFilter === cat ? 'bg-navy text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                                <div className="relative w-full md:w-64">
                                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400">search</span>
                                    <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} type="text" placeholder="Buscar peça..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                                </div>
                                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-100 px-3 py-2 rounded-lg">
                                    {selectedItemIds.length} selecionados
                                </div>
                            </div>

                            {/* Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
                                {productGroups.map(group => {
                                    const groupItemIds = group.allItems.map(i => i.id);
                                    const selectedInGroup = selectedItemIds.filter(id => groupItemIds.includes(id)).length;
                                    const totalAvail = group.availableQty;
                                    const isOutOfStock = totalAvail <= 0;

                                    return (
                                        <div key={group.key}
                                            className={`group relative bg-white rounded-xl border overflow-hidden transition-all ${selectedInGroup > 0
                                                ? 'ring-2 ring-primary border-primary shadow-lg scale-[1.02]'
                                                : isOutOfStock
                                                    ? 'opacity-60 grayscale border-gray-200'
                                                    : 'border-gray-200 hover:border-primary/50 hover:shadow-md'
                                                }`}
                                        >
                                            {/* Image Area */}
                                            <div className="aspect-[3/4] bg-gray-100 bg-cover bg-center relative" style={{ backgroundImage: `url('${group.img}')` }}>
                                                {isOutOfStock && (
                                                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[1px]">
                                                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">Indisponível</span>
                                                    </div>
                                                )}

                                                {/* Selection Overlay (Quantity Controls) */}
                                                <div className="absolute inset-0 bg-navy/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); adjustQuantity(group, -1); }}
                                                        disabled={selectedInGroup === 0}
                                                        className="size-10 rounded-full bg-white text-navy flex items-center justify-center hover:bg-red-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                                                    >
                                                        <span className="material-symbols-outlined">remove</span>
                                                    </button>
                                                    <span className="text-white font-black text-2xl drop-shadow-md">{selectedInGroup}</span>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); adjustQuantity(group, 1); }}
                                                        disabled={selectedInGroup >= totalAvail}
                                                        className="size-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                                                    >
                                                        <span className="material-symbols-outlined">add</span>
                                                    </button>
                                                </div>

                                                {/* Selected Badge */}
                                                {selectedInGroup > 0 && (
                                                    <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-primary text-white text-[10px] font-black shadow-md animate-in zoom-in">
                                                        {selectedInGroup} SELECIONADO{selectedInGroup > 1 ? 'S' : ''}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info Area */}
                                            <div className="p-3">
                                                <h4 className="font-bold text-navy text-sm leading-tight line-clamp-2">{group.name}</h4>
                                                <div className="flex justify-between items-end mt-2">
                                                    <div>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Tam {group.size}</p>
                                                        <p className={`text-[11px] font-bold mt-0.5 ${totalAvail > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                            {totalAvail} de {group.allItems.reduce((sum, i) => sum + (i.totalQuantity || 1), 0)} disponíveis
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-black text-primary">
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(group.price || 0)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Simple click-to-add for touch-friendly or quick action */}
                                            {selectedInGroup === 0 && !isOutOfStock && (
                                                <div
                                                    onClick={() => adjustQuantity(group, 1)}
                                                    className="absolute inset-0 z-0 cursor-pointer"
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Review */}
                    {step === 3 && (
                        <div className="flex flex-col lg:flex-row gap-8 animate-in slide-in-from-right-8 duration-300">
                            <div className="flex-1 space-y-4">
                                <h3 className="font-bold text-navy text-lg flex items-center gap-2"><span className="material-symbols-outlined">shopping_bag</span> Itens Selecionados</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {cartItems.map(item => (
                                        <div key={item.id} className="group relative bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-all">
                                            <div className="aspect-square bg-gray-100 bg-cover bg-center" style={{ backgroundImage: `url('${item.img}')` }}>
                                                {item.quantity > 1 && (
                                                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-navy text-white text-[10px] font-black z-10">
                                                        {item.quantity}x
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <button
                                                        onClick={() => {
                                                            const index = selectedItemIds.indexOf(item.id);
                                                            if (index > -1) {
                                                                setSelectedItemIds(prev => {
                                                                    const next = [...prev];
                                                                    next.splice(index, 1);
                                                                    return next;
                                                                });
                                                            }
                                                        }}
                                                        className="bg-red-500 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">remove</span>
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="p-3">
                                                <h4 className="font-bold text-navy text-xs truncate">{item.name}</h4>
                                                <div className="flex justify-between items-center mt-1">
                                                    <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[9px] font-bold text-gray-500 uppercase">{item.size}</span>
                                                    <span className="font-bold text-navy text-xs">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((item.price || 0) * item.quantity)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Validation Card */}
                            <div className="w-full lg:w-80 space-y-6">
                                {/* Client Integrity Card */}
                                <div className={`rounded-xl border p-4 ${isClientValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                    <div className="flex items-start gap-3">
                                        <div className={`size-10 flex items-center justify-center shrink-0 ${isClientValid ? 'text-green-600' : 'text-red-600'}`}>
                                            <span className="material-symbols-outlined text-3xl">{isClientValid ? 'verified' : 'gpp_bad'}</span>
                                        </div>
                                        <div>
                                            <h4 className={`font-bold text-sm mb-1 ${isClientValid ? 'text-green-800' : 'text-red-800'}`}>
                                                {isClientValid ? 'Cadastro Completo' : 'Cadastro Incompleto'}
                                            </h4>
                                            {isClientValid ? (
                                                <p className="text-xs text-green-700 leading-relaxed">
                                                    Todos os dados obrigatórios do cliente estão preenchidos.
                                                </p>
                                            ) : (
                                                <div className="text-xs text-red-700 leading-relaxed">
                                                    <p className="mb-2">Para gerar o contrato, é necessário completar o cadastro:</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {missingFields.map(f => (
                                                            <span key={f.key} className="px-1.5 py-0.5 bg-red-100 border border-red-200 rounded text-[10px] font-bold uppercase">
                                                                {f.label}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
                                    <h3 className="font-bold text-navy text-lg flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">payments</span>
                                        Resumo Financeiro
                                    </h3>

                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between text-gray-600">
                                            <span>Subtotal ({cartItems.length} itens)</span>
                                            <span className="font-medium text-navy">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-gray-600">
                                            <span>Desconto</span>
                                            <div className="flex items-center gap-1 w-24">
                                                <span className="text-gray-400">R$</span>
                                                <input
                                                    type="number"
                                                    value={discount}
                                                    onChange={e => setDiscount(e.target.value)}
                                                    className="w-full text-right border-b border-gray-300 focus:border-primary outline-none py-0.5 font-bold text-navy"
                                                />
                                            </div>
                                        </div>
                                        <div className="pt-2 border-t border-gray-100 flex justify-between text-lg font-black text-navy">
                                            <span>Total do Contrato</span>
                                            <span className="text-primary">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-2">
                                        <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100/50 space-y-4">
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Valor da Entrada</label>
                                                    <button
                                                        onClick={() => setPaidAmount(total * 0.5)}
                                                        className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                                                    >
                                                        Sugerir 50%
                                                    </button>
                                                </div>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 font-bold text-sm">R$</span>
                                                    <input
                                                        type="number"
                                                        value={paidAmount || ''}
                                                        onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)}
                                                        className="w-full pl-10 pr-4 py-3 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-200 outline-none font-bold text-navy text-lg shadow-sm"
                                                        placeholder="0,00"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Forma de Pagamento</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {['Pix', 'Dinheiro', 'Cartão', 'Link'].map(method => (
                                                        <button
                                                            key={method}
                                                            onClick={() => setPaymentMethod(method)}
                                                            className={`px-4 py-2.5 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-2 ${paymentMethod === method
                                                                ? 'bg-navy border-navy text-white shadow-lg ring-2 ring-navy/10'
                                                                : 'bg-white border-gray-200 text-gray-600 hover:border-navy/30 hover:bg-gray-50'}`}
                                                        >
                                                            {method === 'Pix' && <span className="material-symbols-outlined text-[16px]">qr_code_2</span>}
                                                            {method === 'Dinheiro' && <span className="material-symbols-outlined text-[16px]">payments</span>}
                                                            {method === 'Cartão' && <span className="material-symbols-outlined text-[16px]">credit_card</span>}
                                                            {method === 'Link' && <span className="material-symbols-outlined text-[16px]">link</span>}
                                                            {method}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center px-2 py-3 bg-red-50 text-red-700 rounded-xl border border-red-100">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-red-500">pending_actions</span>
                                                <span className="text-xs font-black uppercase tracking-tighter">Saldo Remanescente</span>
                                            </div>
                                            <span className="text-lg font-black tracking-tight">
                                                R$ {(total - (paidAmount || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="material-symbols-outlined text-gray-400 text-sm">edit_note</span>
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Observações Internas</label>
                                        </div>
                                        <textarea
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                            rows={2}
                                            className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none bg-gray-50/50"
                                            placeholder="Ex: Cliente virá com stylist..."
                                        ></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-100 bg-white flex justify-between items-center">
                    <button
                        onClick={step === 1 ? onClose : handleBack}
                        className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        {step === 1 ? 'Cancelar' : 'Voltar'}
                    </button>

                    <button
                        onClick={step === 3 ? handlePreFinish : handleNext}
                        disabled={
                            (step === 1 && (
                                isCreatingNewClient
                                    ? (!newClientDetails.name || !newClientDetails.phone)
                                    : (!startDate || !endDate || !clientId)
                            )) ||
                            (step === 2 && selectedItemIds.length === 0) ||
                            (step === 3 && !isClientValid)
                        }
                        className={`px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 
                            ${step === 3 && !isClientValid
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                : 'bg-primary text-white hover:bg-blue-700 hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
                            }`}
                    >
                        {step === 3 ? 'Confirmar Reserva' : 'Próximo Passo'}
                        {step !== 3 && <span className="material-symbols-outlined text-sm">arrow_forward</span>}
                    </button>
                </div>
            </div>

            {/* Signature Reminder Modal */}
            {showReminder && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
                        <div className="size-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                            <span className="material-symbols-outlined text-3xl">ink_pen</span>
                        </div>
                        <h3 className="text-xl font-black text-navy mb-2">Reserva Criada!</h3>
                        <p className="text-gray-500 mb-8">
                            Não esqueça de colher a assinatura do cliente para formalizar o contrato.
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => handleFinalize(true)}
                                className="w-full py-3.5 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">description</span>
                                Ir para Assinatura (Contrato)
                            </button>
                            <button
                                onClick={() => handleFinalize(false)}
                                className="w-full py-3.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                            >
                                Apenas Salvar e Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
