import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { IMAGES } from '../constants';
import ConfirmationModal from './ConfirmationModal';
import { useToast } from '../contexts/ToastContext';

// Helper functions for masking
const formatCPF = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');
const formatRG = (v: string) => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1})/, '$1-$2');
const formatPhone = (v: string) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2');
const formatCEP = (v: string) => v.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{3})\d+?$/, '$1');


export default function Clients() {
    const { clients, addClient, updateClient, deleteClient, contracts } = useApp();
    const { showToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState<import('../types').Client | null>(null);

    const [newClient, setNewClient] = useState<Partial<import('../types').Client>>({
        name: '',
        // type: 'Noivo', // Deprecated
        phone: '',
        email: '',
        initials: '',
        cpf: '',
        rg: '',
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
                measurements: { height: '', weight: '', shoeSize: '', shirtSize: '', pantsSize: '', jacketSize: '', chest: '', waist: '', hips: '', shoulder: '', sleeve: '', inseam: '', neck: '' }
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
            <div className="flex flex-wrap justify-between items-end gap-4 mb-2">
                <div>
                    <h1 className="text-navy text-3xl font-black leading-tight tracking-tight">Clientes / CRM</h1>
                    <p className="text-gray-500 text-sm">Gerencie o relacionamento e histórico dos clientes.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center justify-center gap-2 rounded-lg h-12 px-6 bg-primary text-white text-sm font-bold shadow-lg hover:bg-blue-700 transition-colors"
                >
                    <span className="material-symbols-outlined text-xl">person_add</span>
                    <span>Novo Cliente</span>
                </button>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex gap-4">
                <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined">search</span>
                    <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-11 pl-10 pr-4 bg-bg-light border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-navy placeholder:text-gray-400"
                        placeholder="Buscar cliente por nome ou email..."
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button className="h-11 px-4 rounded-lg border border-gray-200 text-gray-600 font-bold hover:bg-gray-50">Filtros</button>
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
                                    <span className="material-symbols-outlined text-lg">chat</span>
                                </a>
                                <button
                                    onClick={() => setSelectedClient(client)}
                                    className="size-8 flex items-center justify-center rounded-lg bg-gray-50 text-gray-500 hover:bg-primary/10 hover:text-primary hover:scale-110 transition-all"
                                    title="Ver Perfil"
                                >
                                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Profile Drawer */}
            {selectedClient && (
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
                        <div className="px-8 -mt-20 relative z-20 pb-12">
                            <div className="flex justify-between items-end mb-6">
                                <div className="size-36 rounded-3xl bg-white p-1.5 shadow-xl">
                                    {selectedClient.img ? (
                                        <div className="w-full h-full rounded-2xl bg-cover bg-center border border-gray-100" style={{ backgroundImage: `url('${selectedClient.img}')` }}></div>
                                    ) : (
                                        <div className="w-full h-full rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-4xl font-black text-gray-400 border border-gray-100 select-none">
                                            {selectedClient.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2 mb-2">
                                    <a href={`https://wa.me/55${selectedClient.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg shadow-lg hover:shadow-green-500/30 transition-all text-sm">
                                        <span className="material-symbols-outlined text-lg">chat</span> WhatsApp
                                    </a>
                                    <button onClick={() => handleEdit(selectedClient)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-all text-sm shadow-sm">
                                        <span className="material-symbols-outlined text-lg">edit</span> Editar
                                    </button>
                                    <button onClick={() => handleDeleteClick(selectedClient.id)} className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 text-red-600 font-bold rounded-lg hover:bg-red-100 transition-all text-sm shadow-sm">
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
                                                <p className="text-sm font-bold text-navy">{selectedClient.birthDate?.split('-').reverse().join('/') || '-'}</p>
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
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { k: 'height', l: 'Altura', i: 'height' },
                                            { k: 'weight', l: 'Peso', i: 'monitor_weight' },
                                            { k: 'shoeSize', l: 'Sapato', i: 'steps' },
                                            { k: 'jacketSize', l: 'Paletó', i: 'checkroom' },
                                            { k: 'pantsSize', l: 'Calça', i: 'accessibility_new' },
                                            { k: 'shirtSize', l: 'Camisa', i: 'dry_cleaning' },
                                        ].map((m) => (
                                            <div key={m.k} className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-2 group hover:shadow-md hover:border-primary/20 transition-all cursor-default">
                                                <div className="size-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                                                    <span className="material-symbols-outlined text-lg">{m.i}</span>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">{m.l}</p>
                                                    <p className="text-sm font-black text-navy">{selectedClient.measurements?.[m.k as keyof typeof selectedClient.measurements] || '-'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <hr className="my-8 border-gray-100" />

                            {/* Rental History */}
                            <section>
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">history_edu</span> Histórico de Locações
                                </h3>

                                <div className="relative border-l-2 border-gray-100 ml-3 space-y-8 pl-8">
                                    {contracts?.filter(c => c.clientId === selectedClient.id).length === 0 ? (
                                        <p className="text-gray-400 text-sm italic">Nenhuma locação registrada.</p>
                                    ) : (
                                        contracts?.filter(c => c.clientId === selectedClient.id)
                                            .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                                            .map((contract) => (
                                                <div key={contract.id} className="relative group">
                                                    {/* Timeline Dot */}
                                                    <div className={`absolute -left-[41px] top-1 size-5 rounded-full border-4 border-white shadow-sm ${contract.status === 'Ativo' ? 'bg-green-500' :
                                                        contract.status === 'Agendado' ? 'bg-amber-400' :
                                                            contract.status === 'Finalizado' ? 'bg-gray-400' : 'bg-red-400'
                                                        }`}></div>

                                                    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm group-hover:shadow-md transition-shadow">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div>
                                                                <p className="text-xs font-bold text-gray-400 uppercase">{new Date(contract.startDate).toLocaleDateString('pt-BR')} - {new Date(contract.endDate).toLocaleDateString('pt-BR')}</p>
                                                                <h4 className="font-bold text-navy mt-1">Locação #{contract.id.slice(0, 6)}</h4>
                                                            </div>
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${contract.status === 'Ativo' ? 'bg-green-100 text-green-700' :
                                                                contract.status === 'Agendado' ? 'bg-amber-100 text-amber-700' :
                                                                    'bg-gray-100 text-gray-600'
                                                                }`}>{contract.status}</span>
                                                        </div>
                                                        <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-2 mb-2">
                                                            {contract.items.map((item, idx) => (
                                                                <div key={idx} className="flex items-center gap-2">
                                                                    <span className="size-1.5 rounded-full bg-gray-300"></span>
                                                                    {item}
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <p className="text-sm font-bold text-navy text-right">R$ {contract.totalValue.toLocaleString('pt-BR')}</p>
                                                    </div>
                                                </div>
                                            ))
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Novo Cliente */}
            {isModalOpen && (
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
                                        onChange={e => setNewClient({ ...newClient, rg: formatRG(e.target.value) })}
                                        className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono text-sm"
                                        placeholder="00.000.000-0"
                                        maxLength={12}
                                    />
                                </div>

                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Endereço (Rua, Av, etc)</label>
                                    <input value={newClient.address || ''} onChange={e => setNewClient({ ...newClient, address: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Rua das Flores, 123" />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bairro</label>
                                    <input value={newClient.neighborhood || ''} onChange={e => setNewClient({ ...newClient, neighborhood: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CEP</label>
                                    <input
                                        value={newClient.zip || ''}
                                        onChange={e => setNewClient({ ...newClient, zip: formatCEP(e.target.value) })}
                                        className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono text-sm"
                                        placeholder="00000-000"
                                        maxLength={9}
                                    />
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
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                                    <input value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="cliente@email.com" />
                                </div>

                                <div className="col-span-1 md:col-span-2 pt-4">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-base">straighten</span> Medidas
                                    </label>
                                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                                        {[
                                            { k: 'height', l: 'Altura' }, { k: 'weight', l: 'Peso' },
                                            { k: 'shoeSize', l: 'Sapato' }, { k: 'shirtSize', l: 'Camisa' },
                                            { k: 'pantsSize', l: 'Calça' }, { k: 'jacketSize', l: 'Paletó' },
                                            { k: 'neck', l: 'Pescoço' }, { k: 'chest', l: 'Tórax' },
                                            { k: 'waist', l: 'Cintura' }, { k: 'hips', l: 'Quadril' },
                                            { k: 'shoulder', l: 'Ombro' }, { k: 'sleeve', l: 'Manga' },
                                            { k: 'inseam', l: 'Entrepernas' }
                                        ].map((m) => (
                                            <div key={m.k}>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{m.l}</label>
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
            )}

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
        </div>
    );
}
