import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { IMAGES } from '../constants';
import ConfirmationModal from './ConfirmationModal';
import { useToast } from '../contexts/ToastContext';
import { viaCepAPI } from '../services/api';

// Helper functions for masking
const formatCPF = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');
const formatRG = (v: string) => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1})/, '$1-$2');
const formatPhone = (v: string) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2');
const formatCEP = (v: string) => v.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{3})\d+?$/, '$1');


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

export default function Clients() {
    const { clients, addClient, updateClient, deleteClient, contracts } = useApp();
    const { showToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState<import('../types').Client | null>(null);
    const [newClient, setNewClient] = useState<Partial<import('../types').Client>>({
        name: '', phone: '', cpf: '', rg: '', email: '', birthDate: '',
        address: '', neighborhood: '', city: '', state: '', zip: '',
        profileType: 'Comum',
        measurements: {}
    });

    const handleCEPChange = async (cep: string) => {
        const formatted = formatCEP(cep);
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

    const handleSave = () => {
        if (newClient.name && newClient.phone) {
            const clientData = {
                id: newClient.id || crypto.randomUUID(),
                name: newClient.name!,
                phone: newClient.phone!,
                email: newClient.email!,
                initials: newClient.name!.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase(),
                cpf: newClient.cpf,
                rg: newClient.rg,
                address: newClient.address,
                neighborhood: newClient.neighborhood,
                city: newClient.city,
                state: newClient.state,
                zip: newClient.zip,
                birthDate: newClient.birthDate,
                profileType: newClient.profileType,
                measurements: newClient.measurements
            };

            if (newClient.id) {
                updateClient(clientData as import('../types').Client);
                if (selectedClient && selectedClient.id === clientData.id) {
                    setSelectedClient(clientData as import('../types').Client);
                }
                showToast('success', 'Cliente atualizado com sucesso!');
            } else {
                addClient(clientData as import('../types').Client);
                showToast('success', 'Cliente cadastrado com sucesso!');
            }

            setIsModalOpen(false);
            setNewClient({
                name: '', phone: '', email: '', initials: '',
                cpf: '', rg: '', address: '', neighborhood: '', city: '', state: '', zip: '', birthDate: '',
                profileType: 'Comum',
                measurements: {}
            });
        }
    };

    const handleEdit = (client: import('../types').Client) => {
        setNewClient({ ...client });
        setIsModalOpen(true);
    };

    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const handleDeleteClick = (clientId: string) => {
        setConfirmDeleteId(clientId);
    };

    const handleConfirmDelete = () => {
        if (confirmDeleteId) {
            deleteClient(confirmDeleteId);
            showToast('info', 'Cliente removido.', { duration: 3000 });
            setSelectedClient(null);
            setConfirmDeleteId(null);
        }
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col gap-6 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                <div>
                    <h1 className="text-navy text-2xl md:text-3xl font-black leading-tight tracking-tight">Base de Clientes</h1>
                    <p className="text-gray-500 text-xs md:text-sm">Gerencie o relacionamento e histórico dos clientes.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full md:w-auto flex items-center justify-center gap-2 rounded-xl h-12 px-8 bg-navy text-white text-xs md:text-sm font-black uppercase tracking-widest shadow-lg shadow-navy/20 hover:scale-[1.02] transition-all active:scale-95"
                >
                    <span className="material-symbols-outlined text-lg">person_add</span>
                    <span>Novo Cliente</span>
                </button>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-3 md:p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined">search</span>
                    <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-12 pl-10 pr-4 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-navy placeholder:text-gray-400 font-medium"
                        placeholder="Buscar cliente por nome ou email..."
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button className="h-12 flex-1 sm:flex-none px-6 rounded-xl border border-gray-100 text-gray-500 text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-lg">tune</span>
                        Filtros
                    </button>
                </div>
            </div>

            {/* Clients Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                {filteredClients.map((client) => {
                    // Calculate Client Stats
                    const clientContracts = contracts?.filter(c => c.clientId === client.id) || [];
                    const activeCount = clientContracts.filter(c => c.status === 'Ativo').length;
                    const totalSpent = clientContracts.filter(c => c.status !== 'Cancelado').reduce((acc, c) => acc + c.totalValue, 0);

                    return (
                        <div key={client.id} className="group flex items-center p-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                            {/* Avatar */}
                            <div className="relative shrink-0">
                                {client.img ? (
                                    <div className="size-16 rounded-xl bg-gray-100 bg-cover bg-center border border-gray-100" style={{ backgroundImage: `url('${client.img}')` }}></div>
                                ) : (
                                    <div className="size-16 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center text-xl font-black text-gray-400 border border-gray-100 select-none">
                                        {client.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                                    </div>
                                )}
                                {activeCount > 0 && (
                                    <div className="absolute -top-1 -right-1 size-3.5 bg-green-500 border-2 border-white rounded-full shadow-sm animate-pulse"></div>
                                )}
                            </div>

                            {/* Main Info */}
                            <div className="ml-4 flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <h3 className="text-base font-bold text-navy truncate group-hover:text-primary transition-colors">{client.name}</h3>
                                    {totalSpent > 1000 && (
                                        <span className="material-symbols-outlined text-[14px] text-amber-400" title="Cliente VIP">verified</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500 mb-1.5">
                                    <span className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[12px]">location_on</span>
                                        {client.city}
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                    <span>{clientContracts.length} locações</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-md bg-green-50 text-green-700 text-[10px] font-bold border border-green-100">
                                        R$ {totalSpent.toLocaleString('pt-BR')}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-1 ml-2 pl-2 border-l border-gray-50">
                                <a
                                    href={`https://wa.me/55${client.phone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="size-8 flex items-center justify-center rounded-lg bg-green-50 text-green-600 hover:bg-green-100 hover:scale-110 transition-all"
                                    title="WhatsApp"
                                >
                                    <svg viewBox="0 0 24 24" className="size-5 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967c-.273-.099-.471-.148-.67.15c-.197.297-.767.966-.94 1.164c-.173.197-.347.222-.643.075c-.297-.15-1.255-.463-2.39-1.475c-.883-.788-1.48-1.761-1.653-2.059c-.173-.297-.018-.458.13-.606c.134-.133.298-.347.446-.52c.149-.174.198-.298.298-.497c.099-.198.05-.371-.025-.52c-.075-.149-.669-1.612-.916-2.207c-.242-.579-.487-.5-.669-.51a12.876 12.876 0 0 0-.57-.01c-.198 0-.52.074-.792.372c-.272.297-1.04 1.016-1.04 2.479c0 1.462 1.065 2.875 1.213 3.074c.149.198 2.096 3.2 5.077 4.487c.709.306 1.262.489 1.694.625c.712.227 1.36.195 1.871.118c.571-.085 1.758-.719 2.006-1.413c.248-.694.248-1.289.173-1.413c-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214l-3.741.982l.998-3.648l-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884c2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
                                </a >
                                <button
                                    onClick={() => setSelectedClient(client)}
                                    className="size-8 flex items-center justify-center rounded-lg bg-gray-50 text-gray-500 hover:bg-primary/10 hover:text-primary hover:scale-110 transition-all"
                                    title="Ver Perfil"
                                >
                                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                </button>
                            </div >
                        </div >
                    );
                })}
            </div >

            {/* Profile Drawer */}
            {
                selectedClient && (
                    <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-md flex justify-end">
                        <div className="w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-500 overflow-x-hidden">
                            {/* Decorative Header Background */}
                            <div className="h-40 bg-gradient-to-r from-navy via-navy to-primary relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                    <span className="material-symbols-outlined text-[200px] text-white rotate-12">person</span>
                                </div>
                                <button onClick={() => setSelectedClient(null)} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-sm z-10">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            {/* Profile Info */}
                            <div className="px-6 md:px-8 -mt-16 md:-mt-20 relative z-20 pb-12">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
                                    <div className="size-28 md:size-36 rounded-3xl bg-white p-1.5 shadow-xl shrink-0">
                                        {selectedClient.img ? (
                                            <div className="w-full h-full rounded-2xl bg-cover bg-center border border-gray-100" style={{ backgroundImage: `url('${selectedClient.img}')` }}></div>
                                        ) : (
                                            <div className="w-full h-full rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-3xl md:text-4xl font-black text-gray-400 border border-gray-100 select-none">
                                                {selectedClient.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                                        <a href={`https://wa.me/55${selectedClient.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg hover:shadow-green-500/30 transition-all text-sm">
                                            <svg viewBox="0 0 24 24" className="size-5 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967c-.273-.099-.471-.148-.67.15c-.197.297-.767.966-.94 1.164c-.173.197-.347.222-.643.075c-.297-.15-1.255-.463-2.39-1.475c-.883-.788-1.48-1.761-1.653-2.059c-.173-.297-.018-.458.13-.606c.134-.133.298-.347.446-.52c.149-.174.198-.298.298-.497c.099-.198.05-.371-.025-.52c-.075-.149-.669-1.612-.916-2.207c-.242-.579-.487-.5-.669-.51a12.876 12.876 0 0 0-.57-.01c-.198 0-.52.074-.792.372c-.272.297-1.04 1.016-1.04 2.479c0 1.462 1.065 2.875 1.213 3.074c.149.198 2.096 3.2 5.077 4.487c.709.306 1.262.489 1.694.625c.712.227 1.36.195 1.871.118c.571-.085 1.758-.719 2.006-1.413c.248-.694.248-1.289.173-1.413c-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214l-3.741.982l.998-3.648l-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884c2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg> WhatsApp
                                        </a>
                                        <button onClick={() => handleEdit(selectedClient)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all text-sm shadow-sm">
                                            <span className="material-symbols-outlined text-lg">edit</span> Editar
                                        </button>
                                        <button onClick={() => handleDeleteClick(selectedClient.id)} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 border border-red-100 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-all text-sm shadow-sm">
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <h2 className="text-3xl font-black text-navy tracking-tight">{selectedClient.name}</h2>
                                    <p className="text-gray-500 font-medium mt-1 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-base">location_on</span>
                                        {selectedClient.city} • {selectedClient.state}
                                    </p>
                                </div>

                                {/* Stats Cards */}
                                <div className="grid grid-cols-3 gap-4 mt-8">
                                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Gasto</p>
                                        <p className="text-xl font-black text-green-600">
                                            R$ {contracts?.filter(c => c.clientId === selectedClient.id && c.status !== 'Cancelado').reduce((acc, c) => acc + c.totalValue, 0).toLocaleString('pt-BR')}
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Locações</p>
                                        <p className="text-xl font-black text-navy">
                                            {contracts?.filter(c => c.clientId === selectedClient.id).length}
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</p>
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold ${contracts?.some(c => c.clientId === selectedClient.id && c.status === 'Ativo')
                                            ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                                            }`}>
                                            <span className={`size-2 rounded-full ${contracts?.some(c => c.clientId === selectedClient.id && c.status === 'Ativo') ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                                            {contracts?.some(c => c.clientId === selectedClient.id && c.status === 'Ativo') ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </div>
                                </div>

                                <hr className="my-8 border-gray-100" />

                                {/* Info Section */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-lg">badge</span> Dados Pessoais
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="size-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                                    <span className="material-symbols-outlined text-sm">call</span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase">Telefone</p>
                                                    <p className="text-sm font-bold text-navy">{selectedClient.phone}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="size-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                                    <span className="material-symbols-outlined text-sm">mail</span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase">Email</p>
                                                    <p className="text-sm font-bold text-navy truncate max-w-[200px]" title={selectedClient.email}>{selectedClient.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="size-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                                    <span className="material-symbols-outlined text-sm">cake</span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase">Nascimento</p>
                                                    <p className="text-sm font-bold text-navy">
                                                        {selectedClient.birthDate ? new Date(selectedClient.birthDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="size-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                                    <span className="material-symbols-outlined text-sm">home_pin</span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase">Endereço</p>
                                                    <p className="text-sm font-bold text-navy leading-tight">{selectedClient.address}</p>
                                                    <p className="text-xs text-gray-400">{selectedClient.neighborhood} - CEP {selectedClient.zip}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-lg">straighten</span> Medidas
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {(!selectedClient.profileType ? LEGACY_FIELDS : (selectedClient.profileType === 'Debutante' ? DEBUTANTE_FIELDS : COMMON_FIELDS))
                                                .filter(m => {
                                                    const val = selectedClient.measurements?.[m.k as keyof typeof selectedClient.measurements];
                                                    return val && val !== "" && val !== "0";
                                                })
                                                .map((m) => (
                                                    <div key={m.k} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-1 group hover:shadow-md hover:border-primary/20 transition-all cursor-default">
                                                        <div className="text-center">
                                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">{m.l}</p>
                                                            <p className="text-xs font-black text-navy">{selectedClient.measurements?.[m.k as keyof typeof selectedClient.measurements]}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            {(!selectedClient.measurements ||
                                                Object.values(selectedClient.measurements).every(v => v === "" || v === "0")) && (
                                                    <p className="col-span-full text-center text-xs text-gray-400 italic py-4">Nenhuma medida registrada para este perfil.</p>
                                                )}
                                        </div>
                                    </div>
                                </div>

                                <hr className="my-8 border-gray-100" />

                                {/* Rental History */}
                                <section>
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-lg">history_edu</span> Histórico de Locações
                                    </h3>

                                    <div className="relative border-l border-gray-100 ml-3 space-y-4 pl-6 py-2">
                                        {contracts?.filter(c => c.clientId === selectedClient.id).length === 0 ? (
                                            <p className="text-gray-400 text-sm italic">Nenhuma locação registrada.</p>
                                        ) : (
                                            contracts?.filter(c => c.clientId === selectedClient.id)
                                                .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                                                .map((contract) => {
                                                    const isPickup = contract.status === 'Ativo' || contract.status === 'Agendado'; // Simplifying logic for visual match
                                                    // Actually, user wants it to look like the 'RETIRADA' card.
                                                    // In Agenda, RETIRADA is green (emerald). DEVOLUÇÃO is orange.
                                                    // Let's rely on status. If Active/Scheduled -> Green (Retirada logic). If Finalized -> Orange (Devolução logic matching Agenda return).
                                                    // But wait, history shows the CONTRACT. A contract has both pickup and return.
                                                    // The user's image shows "RETIRADA 09:00 - João...". This is a specific event.
                                                    // For the history list, we are listing CONTRACTS.
                                                    // I will style it as a "RETIRADA" card if it's active/scheduled, ensuring the green look.

                                                    const isGreen = contract.status === 'Ativo' || contract.status === 'Agendado';
                                                    const colorClass = isGreen
                                                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                        : 'bg-orange-100 text-orange-700 border-orange-200'; // Defaulting others to orange-ish for contrast or maybe gray?
                                                    // If finalized, maybe gray or orange? Agenda uses orange for Return. Let's use Gray for finalized to be neutral or Orange if we consider it "Returned".
                                                    // Actually, let's stick to the requested Green style for the active/main ones.

                                                    // PRECISE MATCH TO IMAGE 2:
                                                    // bg-emerald-100, text-emerald-700, border-emerald-200 (if active/scheduled)
                                                    // rounded-md, p-1.5, flex gap-1...

                                                    return (
                                                        <div key={contract.id} className="relative">
                                                            {/* Timeline Dot */}
                                                            <div className={`absolute -left-[31px] top-3 size-2.5 rounded-full border-2 border-white shadow-sm ring-1 ring-gray-100 ${contract.status === 'Ativo' ? 'bg-green-500' :
                                                                contract.status === 'Agendado' ? 'bg-amber-400' :
                                                                    contract.status === 'Finalizado' ? 'bg-gray-400' : 'bg-red-400'
                                                                }`}></div>

                                                            <div className={`h-auto min-h-[40px] flex items-center gap-2 ${contract.status === 'Ativo' || contract.status === 'Agendado' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-600 border-gray-200'} px-2 py-1.5 rounded-lg border font-bold leading-tight cursor-pointer hover:brightness-95 transition-all shadow-sm`}>
                                                                <span className="material-symbols-outlined text-lg shrink-0">
                                                                    {contract.status === 'Ativo' || contract.status === 'Agendado' ? 'output' : 'input'}
                                                                </span>
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="leading-none text-[10px] uppercase mb-0.5">
                                                                        {contract.contractType === 'Venda' ? 'VENDA' : (contract.status === 'Ativo' || contract.status === 'Agendado' ? 'RETIRADA' : 'FINALIZADO')}
                                                                    </span>
                                                                    <span className="truncate font-medium opacity-90 text-xs">
                                                                        {new Date(contract.startDate).toLocaleDateString('pt-BR')} - Locação #{contract.id.split('-')[2]}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                        )}
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal Novo Cliente */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 animate-in fade-in zoom-in duration-200">
                            <h2 className="text-xl font-bold text-navy mb-4">{newClient.id ? 'Editar Cliente' : 'Novo Cliente'}</h2>
                            <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo</label>
                                        <input value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Ex: João da Silva" />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CPF</label>
                                        <input
                                            value={newClient.cpf || ''}
                                            onChange={e => setNewClient({ ...newClient, cpf: formatCPF(e.target.value) })}
                                            className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono text-sm"
                                            placeholder="000.000.000-00"
                                            maxLength={14}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">RG</label>
                                        <input
                                            value={newClient.rg || ''}
                                            onChange={e => setNewClient({ ...newClient, rg: e.target.value })}
                                            className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono text-sm"
                                            placeholder="RG"
                                            maxLength={20}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CEP</label>
                                        <input
                                            value={newClient.zip || ''}
                                            onChange={e => handleCEPChange(e.target.value)}
                                            className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono text-sm"
                                            placeholder="00000-000"
                                            maxLength={9}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bairro</label>
                                        <input value={newClient.neighborhood || ''} onChange={e => setNewClient({ ...newClient, neighborhood: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none" />
                                    </div>

                                    <div className="col-span-1 md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Endereço (Rua, Av, etc)</label>
                                        <input value={newClient.address || ''} onChange={e => setNewClient({ ...newClient, address: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Rua das Flores, 123" />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cidade</label>
                                        <input value={newClient.city || ''} onChange={e => setNewClient({ ...newClient, city: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado (UF)</label>
                                        <input value={newClient.state || ''} onChange={e => setNewClient({ ...newClient, state: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none" maxLength={2} placeholder="SP" />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Nascimento</label>
                                        <input type="date" value={newClient.birthDate || ''} onChange={e => setNewClient({ ...newClient, birthDate: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none" />
                                    </div>
                                    {/* Type Removed */}

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone</label>
                                        <input
                                            value={newClient.phone}
                                            onChange={e => setNewClient({ ...newClient, phone: formatPhone(e.target.value) })}
                                            className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono text-sm"
                                            placeholder="(00) 00000-0000"
                                            maxLength={15}
                                        />
                                    </div>
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                                            {newClient.id && !newClient.profileType ? 'Cliente Legado (Medidas Antigas)' : 'Tipo de Cliente'}
                                        </label>
                                        {(!newClient.id || newClient.profileType) ? (
                                            <div className="flex gap-4">
                                                <button
                                                    onClick={() => setNewClient({ ...newClient, profileType: 'Comum' })}
                                                    className={`flex-1 py-3 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all ${newClient.profileType !== 'Debutante' ? 'bg-navy text-white border-navy shadow-lg' : 'bg-white text-gray-400 border-gray-200'}`}
                                                >
                                                    Comum
                                                </button>
                                                <button
                                                    onClick={() => setNewClient({ ...newClient, profileType: 'Debutante' })}
                                                    className={`flex-1 py-3 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all ${newClient.profileType === 'Debutante' ? 'bg-navy text-white border-navy shadow-lg' : 'bg-white text-gray-400 border-gray-200'}`}
                                                >
                                                    Debutante
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-xs text-gray-500 font-medium italic">
                                                Este cliente foi cadastrado antes do novo sistema de medidas. Suas medidas originais serão preservadas.
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                                        <input value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="cliente@email.com" />
                                    </div>

                                    <div className="col-span-1 md:col-span-2 pt-4">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-base">straighten</span> Medidas ({newClient.profileType})
                                        </label>
                                        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                                            {(!newClient.profileType ? LEGACY_FIELDS : (newClient.profileType === 'Debutante' ? DEBUTANTE_FIELDS : COMMON_FIELDS)).map((m) => (
                                                <div key={m.k}>
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1" title={m.k}>{m.l}</label>
                                                    <input
                                                        value={newClient.measurements?.[m.k as keyof typeof newClient.measurements] || ''}
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

                                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                                    <button onClick={() => setIsModalOpen(false)} className="h-10 px-4 rounded-lg border border-gray-200 font-bold text-gray-600 hover:bg-gray-50">Cancelar</button>
                                    <button onClick={handleSave} className="h-10 px-6 rounded-lg bg-primary text-white font-bold hover:bg-blue-700">Salvar Cliente</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!confirmDeleteId}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={handleConfirmDelete}
                title="Excluir Cliente"
                description="Tem certeza que deseja excluir esse cliente? Todo o histórico de locações e pagamentos será perdido permanentemente."
                confirmText="Excluir Cliente"
                isDangerous={true}
            />
        </div >
    );
}
