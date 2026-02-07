import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { usePackages, Package } from '../contexts/PackageContext';
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

import { CONTRACT_CLAUSES } from '../constants/clauses';
import { maskCPF, maskPhone, maskCEP } from '../utils/maskUtils';

import { useToast } from '../contexts/ToastContext';

export default function NewContractModal({ isOpen, onClose }: NewContractModalProps) {
    const { clients, items, contracts, addContract, addClient, isItemAvailable, navigateTo, setSelectedContractId, wizardInitialData } = useApp();
    const { packages } = usePackages();
    const { showToast } = useToast();
    const [step, setStep] = useState(1);
    const [showReminder, setShowReminder] = useState(false);
    const [pendingContract, setPendingContract] = useState<Contract | null>(null);
    const [contractType, setContractType] = useState<'Aluguel' | 'Venda'>('Aluguel');

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
    const [eventDate, setEventDate] = useState('');
    const [eventType, setEventType] = useState<import('../types').EventType>('');
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
    const [saleItemIds, setSaleItemIds] = useState<string[]>([]);
    const [discount, setDiscount] = useState('0');
    const [notes, setNotes] = useState('');
    const [paidAmount, setPaidAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<string>('Pix');

    // Package Logic
    const [viewMode, setViewMode] = useState<'items' | 'packages' | 'slot_selection'>('items');
    const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
    const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
    const [packageSlots, setPackageSlots] = useState<Record<number, string>>({}); // index -> itemId

    // Fitting and measurements
    const [fittingDate, setFittingDate] = useState('');
    const [fittingTime, setFittingTime] = useState('09:00');
    const [contractMeasurements, setContractMeasurements] = useState<any>(null);

    // Normal / Generic Specifics
    const [eventLocation, setEventLocation] = useState('');
    const [contact, setContact] = useState('');
    const [guestRole, setGuestRole] = useState<'Anfitrião' | 'Convidado'>('Anfitrião');
    const [isFirstRental, setIsFirstRental] = useState(false);

    // New Client (Matching CRM structure)

    const searchRef = useRef<HTMLDivElement>(null);

    // Initialize from Wizard Initial Data
    useEffect(() => {
        if (isOpen && wizardInitialData) {
            if (wizardInitialData.startDate) setStartDate(wizardInitialData.startDate);
            if (wizardInitialData.endDate) setEndDate(wizardInitialData.endDate);
            if (wizardInitialData.itemIds) {
                setSelectedItemIds(wizardInitialData.itemIds);
                setStep(2); // Jump to catalog step if items are pre-selected
            }
        } else if (isOpen && !wizardInitialData) {
            // Reset if no initial data
            setStartDate('');
            setEndDate('');
            setEventDate('');
            setSelectedItemIds([]);
            setStep(1);
        }
    }, [isOpen, wizardInitialData]);

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

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState<import('../types').Client | null>(null);
    const [newClient, setNewClient] = useState<Partial<import('../types').Client>>({
        name: '', phone: '', cpf: '', rg: '', email: '', birthDate: '',
        address: '', neighborhood: '', city: '', state: '', zip: '',
        profileType: 'Comum',
        measurements: {}
    });

    const handleCEPChange = async (cep: string) => {
        const formatted = maskCEP(cep);
        setNewClient(prev => ({ ...prev, zip: formatted }));

        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length === 8) {
            const addressData = await viaCepAPI.getAddress(cleanCep);
            if (addressData) {
                setNewClient(prev => ({
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
    // const [searchTerm, setSearchTerm] = useState(''); // Moved up

    // Dynamic Categories for Filter
    const availableCategories = useMemo(() => {
        const cats = Array.from(new Set(items.map(i => i.type).filter(Boolean)));
        return ['Todos', ...cats.sort()];
    }, [items]);

    // Logic
    // Product Grouping Logic
    const productGroups = useMemo(() => {
        if (contractType === 'Aluguel' && (!startDate || !endDate)) return [];
        const groups: Record<string, {
            key: string, name: string, size: string, img: string, price: number, type: string,
            allItems: import('../types').Item[],
            availableQty: number
        }> = {};

        const rStart = new Date(contractType === 'Venda' ? (eventDate || new Date().toISOString().split('T')[0]) : startDate);
        const rEnd = new Date(contractType === 'Venda' ? (eventDate || new Date().toISOString().split('T')[0]) : endDate);
        rStart.setHours(0, 0, 0, 0);
        rEnd.setHours(0, 0, 0, 0);

        items.forEach(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.code && item.code.toLowerCase().includes(searchTerm.toLowerCase()));
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
    }, [items, contracts, startDate, endDate, eventDate, contractType, searchTerm, catFilter]);

    const eventTypes = useMemo(() => {
        const defaultTypes = ['Casamento', 'Formatura', 'Debutante', '15 Anos', 'Noivado', 'Corporativo', 'Outro'];
        const existingTypes = contracts.map(c => c.eventType).filter(Boolean);
        return Array.from(new Set([...defaultTypes, ...existingTypes]));
    }, [contracts]);

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
    }, [selectedItemIds, items, selectedPackage]);

    const subtotal = useMemo(() => {
        let baseValue = 0;

        // Value from avulsos (individual items)
        baseValue += selectedItemIds.reduce((acc, id) => {
            const item = items.find(i => i.id === id);
            const isSale = saleItemIds.includes(id);
            return acc + (isSale ? (item?.salePrice || item?.price || 0) : (item?.price || 0));
        }, 0);

        // Value from package
        if (selectedPackage) {
            baseValue += selectedPackage.price;
        }

        return baseValue;
    }, [selectedItemIds, saleItemIds, items, selectedPackage]);
    const total = subtotal - parseFloat(discount || '0');


    // Validation Logic
    // const selectedClient = useMemo(() => clients.find(c => c.id === clientId), [clients, clientId]); // Now a state variable

    // Sync profile type with event type
    useEffect(() => {
        if (isCreatingNewClient) {
            if (eventType === 'Debutante') {
                setNewClient(prev => ({ ...prev, profileType: 'Debutante' }));
            } else {
                setNewClient(prev => ({ ...prev, profileType: 'Comum' }));
            }
        }
    }, [eventType, isCreatingNewClient]);

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
    const isNewClientValid = isCreatingNewClient && newClient.name && newClient.phone;

    // Handlers
    const handleSelectClient = (client: import('../types').Client) => {
        setClientId(client.id);
        setSelectedClient(client); // Set the selected client state
        setClientSearch(client.name);
        setShowSuggestions(false);
        setIsCreatingNewClient(false);
        // Sync profile type for measurement rendering
        setNewClient(prev => ({ ...prev, profileType: client.profileType }));
        // Pre-fill contract measurements with client's current measurements
        if (client.measurements) {
            setContractMeasurements(client.measurements);
        }
    };

    const handleCreateNewClick = () => {
        setIsCreatingNewClient(true);
        setNewClient(prev => ({ ...prev, name: clientSearch }));
        setShowSuggestions(false);
        setClientId('');
        setSelectedClient(null); // Clear selected client when creating new
    };

    const handleNext = async () => {
        if (step === 1) {
            // Common Validation for Step 1
            if (contractType === 'Aluguel' && (!startDate || !endDate || !eventDate)) {
                showToast('error', 'Selecione as datas de início, fim e do evento.');
                return;
            }

            if (contractType === 'Venda' && !eventDate) {
                // For sales, we might only need eventDate or just today? 
                // Let's assume eventDate is still useful for reference.
                showToast('error', 'Selecione a data do evento/entreperna.');
                return;
            }

            if (isCreatingNewClient) {
                // Validate New Client
                if (!newClient.name || !newClient.phone) {
                    showToast('error', 'Preencha nome e telefone para continuar.');
                    return;
                }

                try {
                    // Create Client and WAIT for real ID
                    const newId = `TEMP_${Date.now()}`;
                    const clientData: Partial<import('../types').Client> = { // Changed type to Partial
                        ...newClient,
                        id: newId,
                        initials: (newClient.name || '').slice(0, 2).toUpperCase()
                    };

                    const savedClient = await addClient(clientData as import('../types').Client); // Cast to Client
                    setClientId(savedClient.id);
                    setSelectedClient(savedClient); // Set the newly created client as selected
                    setContractMeasurements(newClient.measurements);
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
        if (step === 2 && selectedItemIds.length === 0 && !selectedPackage) {
            showToast('error', 'Selecione pelo menos um item ou pacote.');
            return;
        }
        setStep(prev => prev + 1);
    };

    const handleBack = () => setStep(prev => prev - 1);

    const toggleSaleItem = (id: string) => {
        setSaleItemIds(prev =>
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    };

    const adjustQuantity = (group: any, delta: number) => {
        const groupItemIds = group.allItems.map((i: any) => i.id);
        const selectedFromGroup = selectedItemIds.filter(id => groupItemIds.includes(id)).length;

        if (delta > 0) {
            if (selectedFromGroup < group.availableQty) {
                // For simplicity, we add the first available item in the group
                const newItemId = group.allItems[0].id;
                setSelectedItemIds(prev => [...prev, newItemId]);
                if (contractType === 'Venda') {
                    setSaleItemIds(prev => [...prev, newItemId]);
                }
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
                    const removedId = next[indexToRemove];
                    next.splice(indexToRemove, 1);
                    // Also remove from sale items if it was there
                    setSaleItemIds(prevSales => prevSales.filter((id, i) => {
                        // This is tricky because we don't have indexes in saleItemIds
                        // but since they are the same IDs, we just remove one instance
                        return true; // Simplified for now, the UI toggle is primary
                    }).filter((id, i, arr) => {
                        // Better logic: if we remove an item from selected, 
                        // and it was a sale item, remove ONE instance of it from saleItemIds
                        return true;
                    }));

                    // Improved saleItemIds correction
                    const removedItemId = removedId;
                    setSaleItemIds(currentSales => {
                        const idx = currentSales.indexOf(removedItemId);
                        if (idx > -1) {
                            const updated = [...currentSales];
                            updated.splice(idx, 1);
                            return updated;
                        }
                        return currentSales;
                    });

                    return next;
                });
            }
        }
    };

    const autoFulfillPackageItems = (pkg: Package, silent = false) => {
        const slots: Record<number, string> = {};
        const usedIds: string[] = [];
        let allFulfilled = true;
        const missingCategories: string[] = [];

        const sDate = contractType === 'Venda' ? (eventDate || new Date().toISOString().split('T')[0]) : startDate;
        const eDate = contractType === 'Venda' ? (eventDate || new Date().toISOString().split('T')[0]) : endDate;

        if (!sDate || !eDate) {
            if (!silent) showToast('error', 'Selecione as datas antes de selecionar um pacote.');
            return false;
        }

        let currentSlot = 0;
        pkg.items_config.forEach(cfg => {
            for (let i = 0; i < cfg.quantity; i++) {
                // Find first available item of this type not already over-committed in this contract
                const availableItem = items.find(item => {
                    if (item.type !== cfg.category) return false;

                    // Availability in other contracts
                    if (!isItemAvailable(item.id, sDate, eDate)) return false;

                    // Availability in THIS contract (Package Slots + Items Avulsos)
                    const countInThisPackage = usedIds.filter(id => id === item.id).length;
                    const countInAvulsos = selectedItemIds.filter(id => id === item.id).length;
                    const totalInThisContract = countInThisPackage + countInAvulsos;

                    // Get available units across all contracts for this ID
                    // isItemAvailable logic: return countOfItem(id).filter(overlaps).length < item.totalQuantity
                    // We need to know HOW MANY are left.
                    const bufferDays = 2;
                    const bufferTime = bufferDays * 24 * 60 * 60 * 1000;
                    const rStart = new Date(sDate);
                    const rEnd = new Date(eDate);
                    rStart.setHours(0, 0, 0, 0);
                    rEnd.setHours(0, 0, 0, 0);

                    const rentedInOtherContracts = contracts.reduce((count, c) => {
                        if (c.status === 'Cancelado' || c.status === 'Finalizado') return count;
                        const cStart = new Date(c.startDate);
                        const cEnd = new Date(c.endDate);
                        cStart.setHours(0, 0, 0, 0);
                        cEnd.setHours(0, 0, 0, 0);
                        const cEndWithBuffer = new Date(cEnd.getTime() + bufferTime);
                        const overlaps = !(rEnd < cStart || rStart > cEndWithBuffer);
                        return overlaps ? count + c.items.filter(id => id === item.id).length : count;
                    }, 0);

                    const leftGlobal = (item.totalQuantity || 1) - rentedInOtherContracts;

                    return totalInThisContract < leftGlobal;
                });

                if (availableItem) {
                    slots[currentSlot] = availableItem.id;
                    usedIds.push(availableItem.id);
                } else {
                    allFulfilled = false;
                    if (!missingCategories.includes(cfg.category)) {
                        missingCategories.push(cfg.category);
                    }
                }
                currentSlot++;
            }
        });

        setPackageSlots(slots);

        if (!silent) {
            if (!allFulfilled) {
                showToast('warning', `Alguns itens (${missingCategories.join(', ')}) não possuem unidades disponíveis para estas datas.`, { title: 'Aviso de Estoque' });
            } else {
                showToast('success', `Pacote "${pkg.name}" selecionado. Itens do acervo vinculados.`);
            }
        }

        return true;
    };

    // Auto-sync package items when dates change
    useEffect(() => {
        if (selectedPackage && (startDate || endDate || eventDate)) {
            autoFulfillPackageItems(selectedPackage, true); // Silent sync
        }
    }, [startDate, endDate, eventDate, selectedPackage]);

    const handlePreFinish = () => {
        const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const random = Math.floor(1000 + Math.random() * 9000);

        const contract: Contract = {
            id: `CN-${timestamp}-${random}`,
            contractType,
            clientId,
            clientName: selectedClient?.name || newClient.name || '',
            items: [
                ...selectedItemIds.filter(id => !saleItemIds.includes(id)),
                ...(selectedPackage ? Object.values(packageSlots) : [])
            ],
            saleItems: selectedItemIds.filter(id => saleItemIds.includes(id)),
            startDate: contractType === 'Venda' ? eventDate : startDate,
            startTime,
            endDate: contractType === 'Venda' ? eventDate : endDate,
            endTime,
            totalValue: total,
            status: 'Agendado',
            statusColor: 'blue',
            eventType,
            eventDate,
            terms: CONTRACT_CLAUSES[eventType] || '',
            paidAmount: paidAmount || 0,
            paymentMethod,
            balance: total - (paidAmount || 0),
            lesseeSignature: '',
            fittingDate,
            fittingTime,
            measurements: contractMeasurements || selectedClient?.measurements,
            observations: notes,
            ...(eventType === 'Debutante' ? { debutanteDetails, packageDetails } : {
                eventLocation,
                contact,
                guestRole,
                isFirstRental
            }),
            ...(selectedPackage ? {
                packageId: selectedPackage._id as any,
                packageName: selectedPackage.name,
                packageDetails: {
                    original_price: selectedPackage.price,
                    slots: packageSlots
                }
            } : {})
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
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4 animate-in fade-in duration-200" >
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
                            {/* Contract Type Toggle */}
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setContractType('Aluguel')}
                                    className={`py-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${contractType === 'Aluguel' ? 'bg-primary/5 border-primary ring-4 ring-primary/10' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                                >
                                    <span className={`material-symbols-outlined text-2xl ${contractType === 'Aluguel' ? 'text-primary' : 'text-gray-400'}`}>calendar_month</span>
                                    <span className={`text-xs font-black uppercase tracking-widest ${contractType === 'Aluguel' ? 'text-primary' : 'text-gray-400'}`}>Aluguel</span>
                                </button>
                                <button
                                    onClick={() => setContractType('Venda')}
                                    className={`py-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${contractType === 'Venda' ? 'bg-primary/5 border-primary ring-4 ring-primary/10' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                                >
                                    <span className={`material-symbols-outlined text-2xl ${contractType === 'Venda' ? 'text-primary' : 'text-gray-400'}`}>shopping_bag</span>
                                    <span className={`text-xs font-black uppercase tracking-widest ${contractType === 'Venda' ? 'text-primary' : 'text-gray-400'}`}>Venda</span>
                                </button>
                            </div>

                            <div className="flex flex-col gap-6">
                                {contractType === 'Aluguel' && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-black uppercase tracking-wider">Retirada <span className="text-red-500">*</span></label>
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
                                            <label className="text-xs font-bold text-black uppercase tracking-wider">Devolução Prevista <span className="text-red-500">*</span></label>
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
                                    </>
                                )}

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-black uppercase tracking-wider">
                                        {contractType === 'Aluguel' ? 'Data do Evento' : 'Data da Entrega/Venda'} <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white font-medium text-navy shadow-sm transition-all" />
                                        <span className="material-symbols-outlined absolute left-3 top-3 text-gray-400">{contractType === 'Aluguel' ? 'celebration' : 'local_shipping'}</span>
                                    </div>
                                </div>

                                {eventType !== 'Debutante' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-black uppercase tracking-wider">Local do Evento</label>
                                            <input
                                                value={eventLocation}
                                                onChange={e => setEventLocation(e.target.value)}
                                                placeholder="Salão, Chácara, etc"
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white font-medium text-navy shadow-sm transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-black uppercase tracking-wider">Contato do Evento</label>
                                            <input
                                                value={contact}
                                                onChange={e => setContact(e.target.value)}
                                                placeholder="Nome ou Telefone"
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white font-medium text-navy shadow-sm transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-black uppercase tracking-wider">Tipo de Locação</label>
                                            <div className="flex gap-4">
                                                <button
                                                    onClick={() => setGuestRole('Anfitrião')}
                                                    className={`flex-1 py-3 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all ${guestRole === 'Anfitrião' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white text-gray-400 border-gray-200 hover:border-primary/30'}`}
                                                >
                                                    Anfitrião
                                                </button>
                                                <button
                                                    onClick={() => setGuestRole('Convidado')}
                                                    className={`flex-1 py-3 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all ${guestRole === 'Convidado' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white text-gray-400 border-gray-200 hover:border-primary/30'}`}
                                                >
                                                    Convidado
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 pt-6">
                                            <button
                                                onClick={() => setIsFirstRental(!isFirstRental)}
                                                className={`size-6 rounded-lg border-2 flex items-center justify-center transition-all ${isFirstRental ? 'bg-primary border-primary text-white' : 'border-gray-200 bg-white'}`}
                                            >
                                                {isFirstRental && <span className="material-symbols-outlined text-sm font-black">check</span>}
                                            </button>
                                            <span className="text-xs font-bold text-navy uppercase tracking-wider">Confecção 1º Aluguel</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2 relative" ref={searchRef}>
                                <label className="text-xs font-bold text-gray-500 uppercase">Cliente Responsável <span className="text-red-500">*</span></label>

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
                                                            className="w-full py-3 bg-navy text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-navy/20 hover:scale-[1.05] transition-all active:scale-95 flex items-center justify-center gap-2"
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
                                                    <label className="block text-[10px] font-bold text-black uppercase mb-1">Nome Completo *</label>
                                                    <input
                                                        value={newClient.name || ''}
                                                        onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                                                        placeholder="Nome do cliente"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-black uppercase mb-1">Telefone *</label>
                                                    <input
                                                        value={newClient.phone}
                                                        onChange={e => setNewClient({ ...newClient, phone: maskPhone(e.target.value) })}
                                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                                                        placeholder="(00) 00000-0000"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-black uppercase mb-1">CPF <span className="text-red-500">*</span></label>
                                                    <input
                                                        value={newClient.cpf}
                                                        onChange={e => setNewClient({ ...newClient, cpf: maskCPF(e.target.value) })}
                                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                                                        placeholder="000.000.000-00"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-black uppercase mb-1">RG</label>
                                                    <input
                                                        value={newClient.rg}
                                                        onChange={e => setNewClient({ ...newClient, rg: e.target.value })}
                                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                                                        placeholder="00.000.000-0"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text/[10px] font-bold text-gray-400 uppercase mb-1">Data Nascimento *</label>
                                                    <input
                                                        type="date"
                                                        value={newClient.birthDate}
                                                        onChange={e => setNewClient({ ...newClient, birthDate: e.target.value })}
                                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white font-sans"
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-[10px] font-bold text-black uppercase mb-1">Email <span className="text-red-500">*</span></label>
                                                    <input
                                                        value={newClient.email}
                                                        onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                                                        placeholder="email@exemplo.com"
                                                    />
                                                </div>
                                            </div>

                                            {/* Simplified Address */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="col-span-2">
                                                    <label className="block text-[10px] font-bold text-black uppercase mb-1">Endereço <span className="text-red-500">*</span></label>
                                                    <input
                                                        value={newClient.address}
                                                        onChange={e => setNewClient({ ...newClient, address: e.target.value })}
                                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                                                        placeholder="Rua, Número, Complemento"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-black uppercase mb-1">Bairro <span className="text-red-500">*</span></label>
                                                    <input
                                                        value={newClient.neighborhood}
                                                        onChange={e => setNewClient({ ...newClient, neighborhood: e.target.value })}
                                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                                                    />
                                                </div>
                                                <div className="col-span-1">
                                                    <label className="block text-[10px] font-bold text-black uppercase mb-1">Cidade <span className="text-red-500">*</span></label>
                                                    <input
                                                        value={newClient.city}
                                                        onChange={e => setNewClient({ ...newClient, city: e.target.value })}
                                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                                                    />
                                                </div>
                                                <div className="col-span-1">
                                                    <label className="block text-[10px] font-bold text-black uppercase mb-1">Estado <span className="text-red-500">*</span></label>
                                                    <select
                                                        value={newClient.state}
                                                        onChange={e => setNewClient({ ...newClient, state: e.target.value })}
                                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white h-9"
                                                    >
                                                        <option value="">UF</option>
                                                        {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
                                                            <option key={uf} value={uf}>{uf}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="col-span-1">
                                                    <label className="block text-[10px] font-bold text-black uppercase mb-1">CEP <span className="text-red-500">*</span></label>
                                                    <input
                                                        value={newClient.zip}
                                                        onChange={e => handleCEPChange(e.target.value)}
                                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                                                        placeholder="00000-000"
                                                    />
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-gray-100">
                                                <div className="flex justify-between items-center mb-3">
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-base">straighten</span> Medidas (Opcional - {isCreatingNewClient || newClient.profileType ? (newClient.profileType || 'Comum') : 'Legado'})
                                                    </label>
                                                    {(isCreatingNewClient || newClient.profileType) ? (
                                                        <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                                                            <button
                                                                type="button"
                                                                onClick={() => setNewClient({ ...newClient, profileType: 'Comum' })}
                                                                className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${newClient.profileType !== 'Debutante' ? 'bg-white shadow text-navy' : 'text-gray-400 hover:text-gray-600'}`}
                                                            >
                                                                Comum
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setNewClient({ ...newClient, profileType: 'Debutante' })}
                                                                className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${newClient.profileType === 'Debutante' ? 'bg-white shadow text-navy' : 'text-gray-400 hover:text-gray-600'}`}
                                                            >
                                                                Debutante
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[9px] text-gray-400 italic font-medium">Perfil Legado Preservado</span>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                                                    {(!isCreatingNewClient && !newClient.profileType ? LEGACY_FIELDS : (newClient.profileType === 'Debutante' ? DEBUTANTE_FIELDS : COMMON_FIELDS)).map((m) => (
                                                        <div key={m.k}>
                                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{m.l}</label>
                                                            <input
                                                                value={(newClient.measurements as any)?.[m.k] || ''}
                                                                onChange={e => setNewClient({
                                                                    ...newClient,
                                                                    measurements: { ...newClient.measurements, [m.k]: e.target.value }
                                                                })}
                                                                className="w-full h-9 px-2 text-center rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none text-sm font-bold text-navy"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Event Type (Custom Styled Dropdown) */}
                            <div className="relative group/dropdown">
                                <label className="text-[10px] font-black text-navy uppercase tracking-widest mb-1 block">
                                    Tipo de Evento <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        list="event-types-list-hidden" // Keep native list for accessibility but hide it visually if needed, or just remove
                                        className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-navy font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 peer"
                                        placeholder="Selecione ou digite..."
                                        value={eventType}
                                        onChange={(e) => setEventType(e.target.value as import('../types').EventType)}
                                    />
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                        <span className="material-symbols-outlined text-lg">celebration</span>
                                    </div>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform duration-300 peer-focus:rotate-180">
                                        <span className="material-symbols-outlined text-lg">arrow_drop_down</span>
                                    </div>

                                    {/* Custom Dropdown List */}
                                    <div className="absolute top-[110%] left-0 w-full bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden hidden peer-focus:block hover:block z-50">
                                        <div className="max-h-48 overflow-y-auto p-1">
                                            {eventTypes.map((type) => (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onMouseDown={() => setEventType(type as import('../types').EventType)} // onMouseDown fires before onBlur
                                                    className="w-full text-left px-3 py-2 rounded-lg text-sm font-bold text-navy hover:bg-navy/5 hover:text-primary transition-colors flex items-center gap-2"
                                                >
                                                    <span className="material-symbols-outlined text-sm text-gray-300">navigate_next</span>
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Debutante Specific Fields */}
                            {eventType === 'Debutante' && (
                                <div className="space-y-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-4">
                                    <h3 className="font-bold text-navy flex items-center gap-2"><span className="material-symbols-outlined text-primary">celebration</span> Detalhes da Debutante</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-black uppercase mb-1">Nome Debutante</label>
                                            <input value={debutanteDetails.name} onChange={e => setDebutanteDetails({ ...debutanteDetails, name: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Ex: Maria Eduarda" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-black uppercase mb-1">Data Nascimento</label>
                                            <input type="date" value={debutanteDetails.birthDate} onChange={e => setDebutanteDetails({ ...debutanteDetails, birthDate: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-black uppercase mb-1">Tema da Festa</label>
                                            <input value={debutanteDetails.theme} onChange={e => setDebutanteDetails({ ...debutanteDetails, theme: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Ex: Paris, Realeza..." />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-black uppercase mb-1">Cor Preferida</label>
                                            <input value={debutanteDetails.preferredColor} onChange={e => setDebutanteDetails({ ...debutanteDetails, preferredColor: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Ex: Rosa Gold" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-black uppercase mb-1">Instagram</label>
                                            <input value={debutanteDetails.instagram} onChange={e => setDebutanteDetails({ ...debutanteDetails, instagram: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="@usuario" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-black uppercase mb-1">Música Preferida</label>
                                            <input value={debutanteDetails.preferredMusic} onChange={e => setDebutanteDetails({ ...debutanteDetails, preferredMusic: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Ex: Valsa..." />
                                        </div>
                                        <div className="col-span-1 md:col-span-2">
                                            <label className="block text-xs font-bold text-black uppercase mb-1">Local do Evento</label>
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

                            {/* SLOT SELECTION VIEW */}
                            {viewMode === 'slot_selection' && (
                                <div className="flex flex-col h-full animate-in slide-in-from-right-8 duration-300">
                                    <div className="flex items-center gap-2 mb-4">
                                        <button
                                            onClick={() => {
                                                setViewMode('packages');
                                                setCatFilter('Todos');
                                            }}
                                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-navy transition-colors"
                                        >
                                            <span className="material-symbols-outlined">arrow_back</span>
                                        </button>
                                        <div>
                                            <h3 className="font-bold text-navy text-lg">Selecione: {catFilter}</h3>
                                            <p className="text-xs text-gray-400">Escolha o item para compor o pacote</p>
                                        </div>
                                    </div>

                                    {/* Toolbar (Duplicate from Items View) */}
                                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm mb-4">
                                        <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
                                            {availableCategories.map(cat => (
                                                <button
                                                    key={cat}
                                                    onClick={() => setCatFilter(cat)}
                                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${catFilter === cat ? 'bg-white shadow text-navy' : 'text-gray-500 hover:text-navy'}`}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="relative w-full md:w-64">
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                                            <input
                                                type="text"
                                                placeholder="Buscar item..."
                                                value={searchTerm}
                                                onChange={e => setSearchTerm(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20 overflow-y-auto">
                                        {productGroups.map((group) => {
                                            const totalAvail = group.availableQty;
                                            const isOutOfStock = totalAvail === 0;

                                            return (
                                                <div
                                                    key={group.key}
                                                    onClick={() => {
                                                        if (isOutOfStock) return;

                                                        const usedItemIds = Object.values(packageSlots);
                                                        const availableItem = group.allItems.find(i =>
                                                            !usedItemIds.includes(i.id)
                                                        );

                                                        if (availableItem && activeSlotIndex !== null) {
                                                            setPackageSlots(prev => ({
                                                                ...prev,
                                                                [activeSlotIndex]: availableItem.id
                                                            }));
                                                            setViewMode('packages');
                                                            setCatFilter('Todos');
                                                        } else {
                                                            showToast('error', 'Item indisponível ou já selecionado.');
                                                        }
                                                    }}
                                                    className={`relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300
                                                        ${isOutOfStock ? 'grayscale opacity-60 cursor-not-allowed' : 'hover:scale-[1.02] shadow-sm hover:shadow-xl'}
                                                    `}
                                                    style={{ backgroundImage: `url('${group.img || ''}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                                                >
                                                    {/* Gradient Overlay */}
                                                    <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent transition-opacity duration-300 ${isOutOfStock ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`} />

                                                    {/* Status & Badges */}
                                                    <div className="absolute top-3 left-3 z-10">
                                                        <span className="bg-white/20 backdrop-blur-md text-white border border-white/10 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                                            {group.type}
                                                        </span>
                                                    </div>

                                                    <div className="absolute top-3 right-3 z-10">
                                                        <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 backdrop-blur-md border ${isOutOfStock
                                                            ? 'bg-red-500/20 border-red-500/30 text-red-200'
                                                            : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-200'
                                                            }`}>
                                                            <span className={`size-1.5 rounded-full ${isOutOfStock ? 'bg-red-500' : 'bg-emerald-400'}`}></span>
                                                            {isOutOfStock ? 'Esgotado' : 'Disponível'}
                                                        </span>
                                                    </div>

                                                    {/* Content */}
                                                    <div className="absolute bottom-0 left-0 right-0 p-4 z-10 text-white">
                                                        <div className="flex justify-between items-end mb-1">
                                                            <span className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                                                {group.size}
                                                            </span>
                                                            <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">
                                                                Total: {group.allItems.length}
                                                            </span>
                                                        </div>

                                                        <h3 className="font-bold text-lg leading-tight mb-2 drop-shadow-sm line-clamp-2">
                                                            {group.name}
                                                        </h3>

                                                        {/* Footer Stats */}
                                                        <div className="flex justify-between items-center pt-2 border-t border-white/10">
                                                            <div className="flex flex-col">
                                                                <span className="text-[9px] uppercase tracking-wider opacity-60 font-bold">Disponíveis</span>
                                                                <span className={`text-sm font-black ${isOutOfStock ? 'text-red-300' : 'text-white'}`}>
                                                                    {totalAvail} <span className="text-[9px] font-normal opacity-60">unid.</span>
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-col text-right">
                                                                <span className="text-[9px] uppercase tracking-wider opacity-60 font-bold">Alugados</span>
                                                                <span className="text-sm font-black text-white/80">
                                                                    {group.allItems.length - totalAvail} <span className="text-[9px] font-normal opacity-60">unid.</span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Hover Overlay Effect */}
                                                    {!isOutOfStock && (
                                                        <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {productGroups.length === 0 && (
                                            <div className="col-span-full py-12 text-center text-gray-400">
                                                <span className="material-symbols-outlined text-4xl block mb-2">search_off</span>
                                                Nenhum item encontrado nesta categoria.
                                            </div>
                                        )}
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

                    {/* Step 2: Catalog or Packages */}
                    {step === 2 && (
                        <div className="flex flex-col h-full gap-4 animate-in slide-in-from-right-8 duration-300">
                            {/* Mode Toggle */}
                            <div className="flex justify-center mb-2">
                                <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
                                    <button
                                        onClick={() => setViewMode('items')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'items' ? 'bg-white shadow text-navy' : 'text-gray-500 hover:text-navy'}`}
                                    >
                                        Itens Avulsos
                                    </button>
                                    <button
                                        onClick={() => setViewMode('packages')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'packages' ? 'bg-white shadow text-navy' : 'text-gray-500 hover:text-navy'}`}
                                    >
                                        Pacotes & Combos
                                    </button>
                                </div>
                            </div>

                            {/* ITEM VIEW */}
                            {viewMode === 'items' && (
                                <>
                                    {/* Toolbar */}
                                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                                        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 custom-scrollbar">
                                            {availableCategories.map(cat => (
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
                                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                                                        (contractType === 'Venda' ? (group.allItems[0].salePrice || group.price) : group.price) || 0
                                                                    )}
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
                                </>
                            )}

                            {/* PACKAGE VIEW */}
                            {viewMode === 'packages' && (
                                <div className="h-full overflow-y-auto pb-20">
                                    {!selectedPackage ? (
                                        <div className="flex flex-col gap-4">
                                            {packages.map(pkg => (
                                                <div key={pkg._id} className="bg-white rounded-3xl border border-gray-100 p-6 hover:shadow-xl hover:shadow-navy/5 transition-all cursor-pointer group flex flex-col md:flex-row md:items-center gap-6 md:gap-8 relative overflow-hidden" onClick={() => {
                                                    if (autoFulfillPackageItems(pkg)) {
                                                        setSelectedPackage(pkg);
                                                    }
                                                }}>
                                                    {/* Accent Bar */}
                                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#D4AF37] opacity-60 transition-all group-hover:w-2"></div>

                                                    {/* Left: Name and Price */}
                                                    <div className="flex-1 w-full md:min-w-[200px]">
                                                        <h3 className="text-lg font-black text-navy leading-none mb-2 group-hover:text-primary transition-colors">{pkg.name}</h3>
                                                        <p className="text-2xl font-black text-[#D4AF37] tracking-tight">
                                                            <span className="text-xs font-bold mr-1 opacity-60">R$</span>
                                                            {pkg.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </p>
                                                    </div>

                                                    {/* Middle: Composition */}
                                                    <div className="flex-[2] w-full bg-gray-50/50 rounded-2xl p-4 border border-gray-100/50 flex flex-wrap gap-2 items-start md:items-center">
                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] w-full mb-1">Itens Inclusos</span>
                                                        {pkg.items_config.map((cfg, idx) => (
                                                            <div key={idx} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm">
                                                                <span className="text-[10px] font-bold text-navy/70 uppercase tracking-tight">{cfg.category}</span>
                                                                <span className="text-[10px] font-black text-gray-300">x{cfg.quantity}</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Right: CTA */}
                                                    <div className="w-full md:w-auto flex justify-end shrink-0 pt-2 md:pt-0">
                                                        <div className="size-12 rounded-2xl bg-navy text-white flex items-center justify-center transition-all group-hover:bg-primary group-active:scale-95 shadow-lg shadow-navy/10 group-hover:shadow-primary/20">
                                                            <span className="material-symbols-outlined">add_circle</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {packages.length === 0 && (
                                                <div className="col-span-full text-center py-12 text-gray-400">
                                                    <span className="material-symbols-outlined text-4xl block mb-2">inventory_2</span>
                                                    Nenhum pacote disponível.
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="bg-navy text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                                                <div className="relative z-10 flex justify-between items-center">
                                                    <div>
                                                        <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Pacote Selecionado</p>
                                                        <h2 className="text-2xl font-black">{selectedPackage.name}</h2>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-3xl font-black text-gold">R$ {selectedPackage.price.toFixed(2)}</p>
                                                        <button onClick={() => setSelectedPackage(null)} className="text-xs text-white/80 hover:text-white underline mt-1">Alterar Pacote</button>
                                                    </div>
                                                </div>
                                                <div className="absolute -right-10 -bottom-10 opacity-10">
                                                    <span className="material-symbols-outlined text-[150px]">inventory_2</span>
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="font-bold text-navy mb-4 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-primary">checkroom</span>
                                                    Itens do Pacote
                                                </h3>
                                                <div className="space-y-3">
                                                    {selectedPackage.items_config.flatMap((cfg, cfgIdx) => {
                                                        return Array.from({ length: cfg.quantity }).map((_, qtyIdx) => {
                                                            const globalSlotIndex = selectedPackage.items_config
                                                                .slice(0, cfgIdx)
                                                                .reduce((sum, c) => sum + c.quantity, 0) + qtyIdx;

                                                            const selectedItemId = packageSlots[globalSlotIndex];
                                                            const selectedItem = selectedItemId ? items.find(i => i.id === selectedItemId) : null;

                                                            return (
                                                                <div key={`${cfgIdx}-${qtyIdx}`} className="bg-white border border-gray-200 rounded-xl p-4">
                                                                    <div className="flex justify-between items-center mb-2">
                                                                        <h4 className="font-bold text-gray-700">{cfg.category} <span className="text-gray-400 text-xs">#{qtyIdx + 1}</span></h4>
                                                                        {selectedItem ? (
                                                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                                                                                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                                                                Selecionado
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500 font-bold">Pendente</span>
                                                                        )}
                                                                    </div>

                                                                    {selectedItem ? (
                                                                        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200 relative group">
                                                                            <div className="size-10 bg-white rounded-md bg-cover bg-center border border-gray-200" style={{ backgroundImage: `url('${selectedItem.img || ''}')` }} />
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="font-bold text-navy text-sm truncate">{selectedItem.name}</p>
                                                                                <p className="text-xs text-gray-500">Tam: {selectedItem.size}</p>
                                                                            </div>
                                                                            <button
                                                                                onClick={() => {
                                                                                    const next = { ...packageSlots };
                                                                                    delete next[globalSlotIndex];
                                                                                    setPackageSlots(next);
                                                                                }}
                                                                                className="size-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                            >
                                                                                <span className="material-symbols-outlined">delete</span>
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <div
                                                                            onClick={() => {
                                                                                setActiveSlotIndex(globalSlotIndex);
                                                                                setCatFilter('Todos'); // Default to All as requested, or reset
                                                                                setViewMode('slot_selection');
                                                                            }}
                                                                            className="p-3 bg-gray-50 rounded-lg text-center border border-dashed border-gray-300 text-sm text-gray-400 cursor-pointer hover:bg-gray-100 hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-2"
                                                                        >
                                                                            <span className="material-symbols-outlined">add_circle</span>
                                                                            Selecionar {cfg.category}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        });
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {step === 3 && (
                        <div className="flex flex-col lg:flex-row gap-8 animate-in slide-in-from-right-8 duration-300">
                            <div className="flex-1 space-y-6">
                                {selectedPackage && (
                                    <div className="space-y-4">
                                        <h3 className="font-bold text-navy text-lg flex items-center gap-2">
                                            <span className="material-symbols-outlined text-primary">inventory_2</span>
                                            Pacote Selecionado
                                        </h3>
                                        <div className="bg-navy text-white p-5 rounded-2xl shadow-lg relative overflow-hidden flex justify-between items-center">
                                            <div className="relative z-10">
                                                <h4 className="font-black text-xl">{selectedPackage.name}</h4>
                                                <p className="text-xs text-white/60 font-medium">Itens de pacote inclusos</p>
                                            </div>
                                            <div className="relative z-10 text-right">
                                                <p className="text-2xl font-black text-gold">R$ {selectedPackage.price.toFixed(2)}</p>
                                            </div>
                                            <div className="absolute -right-6 -bottom-6 opacity-10">
                                                <span className="material-symbols-outlined text-8xl">inventory_2</span>
                                            </div>
                                        </div>

                                        {/* Package Items Mini List */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {Object.values(packageSlots).map(itemId => {
                                                const item = items.find(i => i.id === itemId);
                                                if (!item) return null;
                                                return (
                                                    <div key={itemId} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                                        <div className="size-8 rounded bg-white shadow-sm bg-cover bg-center border border-gray-200" style={{ backgroundImage: `url('${item.img}')` }} />
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-bold text-navy truncate">{item.name}</p>
                                                            <p className="text-[8px] text-gray-400 font-black uppercase">Tam {item.size}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <h3 className="font-bold text-navy text-lg flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">shopping_bag</span>
                                        {selectedPackage ? 'Itens Adicionais (Avulsos)' : 'Itens Selecionados'}
                                    </h3>

                                    {cartItems.length === 0 && selectedPackage ? (
                                        <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-400">
                                            <p className="text-sm font-medium">Nenhum item adicional selecionado.</p>
                                        </div>
                                    ) : (
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
                                                        <div className="flex flex-col gap-2 mt-2">
                                                            <div className="flex justify-between items-center">
                                                                <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[9px] font-bold text-gray-500 uppercase">{item.size}</span>
                                                                <button
                                                                    onClick={() => toggleSaleItem(item.id)}
                                                                    className={`px-2 py-1 rounded text-[9px] font-black uppercase transition-all border ${saleItemIds.includes(item.id)
                                                                        ? 'bg-gold text-navy border-gold shadow-sm'
                                                                        : 'bg-blue-50 text-primary border-blue-100'}`}
                                                                >
                                                                    {saleItemIds.includes(item.id) ? 'Venda' : 'Aluguel'}
                                                                </button>
                                                            </div>
                                                            <div className="flex justify-between items-center bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                                                                <span className="text-[10px] font-bold text-gray-400">Total</span>
                                                                <span className="font-black text-navy text-xs">
                                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                                                        (saleItemIds.includes(item.id) ? (item.salePrice || item.price || 0) : (item.price || 0)) * item.quantity
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {/* Fitting and Technical Details */}
                                {contractType === 'Aluguel' && (
                                    <div className="space-y-6">
                                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                            <h3 className="font-bold text-navy text-lg flex items-center gap-2 mb-4">
                                                <span className="material-symbols-outlined text-primary">straighten</span>
                                                Prova e Medidas
                                            </h3>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-black uppercase tracking-wider">Data da Prova</label>
                                                        <div className="flex gap-2">
                                                            <div className="relative flex-1">
                                                                <input type="date" value={fittingDate} onChange={e => setFittingDate(e.target.value)} className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary/10 text-sm font-medium" />
                                                                <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-gray-400 text-lg">calendar_today</span>
                                                            </div>
                                                            <div className="relative w-28">
                                                                <input type="time" value={fittingTime} onChange={e => setFittingTime(e.target.value)} className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary/10 text-sm font-medium" />
                                                                <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-gray-400 text-lg">schedule</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-3">
                                                        <span className="material-symbols-outlined text-navy/40">info</span>
                                                        <p className="text-[11px] text-gray-600 leading-relaxed">
                                                            A prova é fundamental para garantir o ajuste perfeito. O horário sugerido é o de abertura da loja.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <label className="text-xs font-bold text-black uppercase tracking-wider block">Resumo de Medidas</label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {[
                                                            { label: 'Altura', key: 'height' },
                                                            { label: 'Peso', key: 'weight' },
                                                            { label: 'Sapato', key: 'shoeSize' },
                                                            { label: 'Camisa', key: 'shirtSize' },
                                                            { label: 'Calça', key: 'pantsSize' },
                                                            { label: 'Paletó', key: 'jacketSize' },
                                                            { label: 'Tórax', key: 'chest' },
                                                            { label: 'Cintura', key: 'waist' },
                                                            { label: 'Quadril', key: 'hips' },
                                                            { label: 'Ombro', key: 'shoulder' },
                                                            { label: 'Manga', key: 'sleeve' },
                                                            { label: 'Entrepernas', key: 'inseam' },
                                                            { label: 'Pescoço', key: 'neck' }
                                                        ].map((m) => (
                                                            <div key={m.key} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg border border-gray-100">
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase">{m.label}</span>
                                                                <input
                                                                    value={contractMeasurements?.[m.key] || ''}
                                                                    onChange={e => setContractMeasurements({ ...contractMeasurements, [m.key]: e.target.value })}
                                                                    className="w-12 text-right bg-transparent border-b border-gray-200 focus:border-primary outline-none text-xs font-black text-navy"
                                                                    placeholder="--"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 italic text-center italic">As medidas acima são um snapshot para este contrato.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
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
                                        {selectedPackage && (
                                            <div className="flex justify-between text-navy font-bold">
                                                <span>Subtotal Pacote</span>
                                                <span>R$ {selectedPackage.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        )}
                                        {cartItems.length > 0 && (
                                            <div className="flex justify-between text-gray-600">
                                                <span>Itens Avulsos ({cartItems.length})</span>
                                                <span className="font-medium text-navy">
                                                    R$ {selectedItemIds.reduce((acc, id) => {
                                                        const item = items.find(i => i.id === id);
                                                        const isSale = saleItemIds.includes(id);
                                                        return acc + (isSale ? (item?.salePrice || item?.price || 0) : (item?.price || 0));
                                                    }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        )}
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
                                        {contractType === 'Aluguel' ? (
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
                                                        {['Pix', 'Dinheiro', 'Crédito', 'Débito', 'Link'].map(method => (
                                                            <button
                                                                key={method}
                                                                onClick={() => setPaymentMethod(method)}
                                                                className={`px-4 py-2.5 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-2 ${paymentMethod === method
                                                                    ? 'bg-navy border-navy text-white shadow-lg ring-2 ring-navy/10'
                                                                    : 'bg-white border-gray-200 text-gray-600 hover:border-navy/30 hover:bg-gray-50'}`}
                                                            >
                                                                {method === 'Pix' && <span className="material-symbols-outlined text-[16px]">qr_code_2</span>}
                                                                {method === 'Dinheiro' && <span className="material-symbols-outlined text-[16px]">payments</span>}
                                                                {method === 'Crédito' && <span className="material-symbols-outlined text-[16px]">credit_card</span>}
                                                                {method === 'Débito' && <span className="material-symbols-outlined text-[16px]">credit_score</span>}
                                                                {method === 'Link' && <span className="material-symbols-outlined text-[16px]">link</span>}
                                                                {method}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Forma de Pagamento (Venda Total)</label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {['Pix', 'Dinheiro', 'Crédito', 'Débito', 'Link'].map(method => (
                                                            <button
                                                                key={method}
                                                                onClick={() => {
                                                                    setPaymentMethod(method);
                                                                    setPaidAmount(total); // Auto-set total paid for sales
                                                                }}
                                                                className={`px-4 py-2.5 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-2 ${paymentMethod === method
                                                                    ? 'bg-navy border-navy text-white shadow-lg ring-2 ring-navy/10'
                                                                    : 'bg-white border-gray-200 text-gray-600 hover:border-navy/30 hover:bg-gray-50'}`}
                                                            >
                                                                {method === 'Pix' && <span className="material-symbols-outlined text-[16px]">qr_code_2</span>}
                                                                {method === 'Dinheiro' && <span className="material-symbols-outlined text-[16px]">payments</span>}
                                                                {method === 'Crédito' && <span className="material-symbols-outlined text-[16px]">credit_card</span>}
                                                                {method === 'Débito' && <span className="material-symbols-outlined text-[16px]">credit_score</span>}
                                                                {method === 'Link' && <span className="material-symbols-outlined text-[16px]">link</span>}
                                                                {method}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-3">
                                                    <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                                                    <p className="text-[11px] font-black text-emerald-800 uppercase">Venda Definitiva: Valor Total será faturado.</p>
                                                </div>
                                            </div>
                                        )}

                                        {contractType === 'Aluguel' && (
                                            <div className="flex justify-between items-center px-2 py-3 bg-red-50 text-red-700 rounded-xl border border-red-100">
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-red-500">pending_actions</span>
                                                    <span className="text-xs font-black uppercase tracking-tighter">Saldo Remanescente</span>
                                                </div>
                                                <span className="text-lg font-black tracking-tight">
                                                    R$ {(total - (paidAmount || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        )}
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
                                    ? (!newClient.name || '' || !newClient.phone)
                                    : (contractType === 'Aluguel' ? (!startDate || !endDate || !clientId) : (!eventDate || !clientId))
                            )) ||
                            (step === 2 && selectedItemIds.length === 0 && !selectedPackage) ||
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
            </div >

            {/* Signature Reminder Modal */}
            {
                showReminder && (
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
                )
            }
        </div >
    );
}
