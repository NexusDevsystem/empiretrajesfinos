import React, { useState } from 'react';
import { usePackages, Package } from '../contexts/PackageContext';
import { useApp } from '../contexts/AppContext';

export default function Packages() {
    const { items } = useApp();
    const { packages, addPackage, updatePackage, deletePackage, loading } = usePackages();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedItemsForConfig, setSelectedItemsForConfig] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [catFilter, setCatFilter] = useState('Todos');
    const [editingPackage, setEditingPackage] = useState<Package | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [itemsConfig, setItemsConfig] = useState<{ category: string, quantity: number }[]>([]);

    // Categories
    const CATEGORIES = ['Paletó', 'Calça', 'Colete', 'Camisa', 'Gravata', 'Sapato', 'Cinto', 'Suspensório', 'Acessório'];

    const handleOpenModal = (pkg?: Package) => {
        if (pkg) {
            setEditingPackage(pkg);
            setName(pkg.name);
            setPrice(pkg.price.toString());
            setDescription(pkg.description || '');
            setItemsConfig(pkg.items_config);
        } else {
            setEditingPackage(null);
            setName('');
            setPrice('');
            setDescription('');
            setItemsConfig([]);
        }
        setIsModalOpen(true);
    };

    const handleAddItemConfig = () => {
        setItemsConfig([...itemsConfig, { category: 'Paletó', quantity: 1 }]);
    };

    const handleRemoveItemConfig = (index: number) => {
        setItemsConfig(itemsConfig.filter((_, i) => i !== index));
    };

    const handleConfigChange = (index: number, field: 'category' | 'quantity', value: string | number) => {
        const newConfig = [...itemsConfig];
        if (field === 'quantity') {
            newConfig[index].quantity = parseInt(value as string) || 1;
        } else {
            newConfig[index].category = value as string;
        }
        setItemsConfig(newConfig);
    };

    const handleSave = async () => {
        if (!name || !price) return;

        try {
            const pkgData = {
                name,
                description,
                price: parseFloat(price),
                items_config: itemsConfig
            };

            if (editingPackage) {
                await updatePackage(editingPackage._id, pkgData);
            } else {
                await addPackage(pkgData);
            }
            setIsModalOpen(false);
        } catch (error) {
            // Toast handled in context
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-navy tracking-tight">Pacotes & Combos</h1>
                    <p className="text-sm text-gray-500 mt-1">Gerencie os pacotes promocionais e pré-definidos.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="w-full md:w-auto bg-navy hover:scale-[1.02] text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-navy/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-outlined">add</span>
                    Novo Pacote
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>
            ) : (
                <div className="space-y-4">
                    {packages.map(pkg => (
                        <div key={pkg._id} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:shadow-navy/5 transition-all relative group overflow-hidden flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
                            {/* Accent Bar */}
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#D4AF37] opacity-60"></div>

                            {/* Left Side: Name and Price */}
                            <div className="flex-1 w-full md:min-w-[250px]">
                                <h3 className="text-xl font-black text-navy leading-none mb-2">{pkg.name}</h3>
                                <p className="text-2xl font-black text-[#D4AF37] tracking-tight">
                                    <span className="text-xs font-bold mr-1 opacity-60">R$</span>
                                    {pkg.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                                {pkg.description && (
                                    <p className="text-[11px] text-gray-400 font-medium mt-3 leading-relaxed italic line-clamp-2">
                                        "{pkg.description}"
                                    </p>
                                )}
                            </div>

                            {/* Middle: Composition (Horizontal List) */}
                            <div className="flex-[2] w-full bg-gray-50/50 rounded-2xl p-4 md:p-5 border border-gray-100/50 flex flex-wrap gap-2 md:gap-3 items-start md:items-center">
                                <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] w-full mb-2">Composição do Pacote</span>
                                {pkg.items_config.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm transition-all hover:scale-105">
                                        <span className="text-[10px] font-black text-navy/70 uppercase tracking-tight">{item.category}</span>
                                        <span className="text-[10px] font-black text-gray-300">x{item.quantity}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Right Side: Actions */}
                            <div className="flex gap-2 w-full md:w-auto justify-start md:justify-end shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-gray-100 md:border-transparent">
                                <button onClick={() => handleOpenModal(pkg)} className="size-10 flex items-center justify-center bg-white border border-gray-100 shadow-sm hover:border-primary/30 rounded-xl text-blue-600 transition-all hover:scale-110">
                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                </button>
                                <button onClick={() => { if (confirm('Excluir este pacote?')) deletePackage(pkg._id) }} className="size-10 flex items-center justify-center bg-white border border-gray-100 shadow-sm hover:border-red-200 rounded-xl text-red-500 transition-all hover:scale-110">
                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                </button>
                            </div>
                        </div>
                    ))}

                    {packages.length === 0 && (
                        <div className="py-12 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <span className="material-symbols-outlined text-4xl mb-2">inventory_2</span>
                            <p>Nenhum pacote cadastrado.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-navy">{editingPackage ? 'Editar Pacote' : 'Novo Pacote'}</h3>
                            <button onClick={() => setIsModalOpen(false)}><span className="material-symbols-outlined text-gray-400">close</span></button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Pacote</label>
                                <input value={name} onChange={e => setName(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Ex: Kit Noivo Completo" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Preço (R$)</label>
                                <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="0.00" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none" rows={2} placeholder="Detalhes opcionais..." />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase">Itens do Pacote (Composição)</label>
                                    <button
                                        onClick={() => {
                                            setSelectionMode(true);
                                            setCatFilter('Todos');
                                            setSearchTerm('');
                                        }}
                                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-sm">add_circle</span>
                                        Adicionar do Estoque
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {itemsConfig.length === 0 ? (
                                        <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs">
                                            Nenhum item adicionado.
                                        </div>
                                    ) : (
                                        itemsConfig.map((item, index) => (
                                            <div key={index} className="flex gap-2 items-center bg-white p-2 border border-gray-100 rounded-xl shadow-sm">
                                                <div className="size-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 font-bold text-xs uppercase">
                                                    {item.category.substring(0, 2)}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-navy text-sm">{item.category}</p>
                                                    <p className="text-xs text-gray-400">Categoria</p>
                                                </div>
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={e => handleConfigChange(index, 'quantity', e.target.value)}
                                                    className="w-16 p-2 rounded-lg border border-gray-200 text-sm text-center font-bold"
                                                    min="1"
                                                />
                                                <button onClick={() => handleRemoveItemConfig(index)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors">
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700">Cancelar</button>
                            <button onClick={handleSave} className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-primary/20">Salvar Pacote</button>
                        </div>
                    </div>
                </div>
            )}

            {/* SELECTION MODAL */}
            {selectionMode && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-5xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center bg-white z-10 gap-4">
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <button onClick={() => setSelectionMode(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <span className="material-symbols-outlined text-gray-500">arrow_back</span>
                                </button>
                                <div>
                                    <h3 className="font-bold text-navy text-lg leading-tight">Adicionar Item</h3>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Escolha a categoria</p>
                                </div>
                            </div>
                            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                                <div className="relative w-full md:w-64">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                                    <input
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-primary/20"
                                        placeholder="Buscar..."
                                        autoFocus
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        const newConfig = [...itemsConfig];
                                        selectedItemsForConfig.forEach(item => {
                                            const existingIndex = newConfig.findIndex(c => c.category === item.type);
                                            if (existingIndex >= 0) {
                                                newConfig[existingIndex].quantity += 1;
                                            } else {
                                                newConfig.push({ category: item.type, quantity: 1 });
                                            }
                                        });
                                        setItemsConfig(newConfig);
                                        setSelectionMode(false);
                                        setSelectedItemsForConfig([]);
                                        setSearchTerm('');
                                    }}
                                    disabled={selectedItemsForConfig.length === 0}
                                    className="w-full md:w-auto bg-primary hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-sm">check</span>
                                    Confirmar ({selectedItemsForConfig.length})
                                </button>
                            </div>
                        </div>

                        {/* Grid Content */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50/50">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                {items
                                    .filter(i => {
                                        const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
                                        const matchesCat = catFilter === 'Todos' || i.type === catFilter;
                                        return matchesSearch && matchesCat;
                                    })
                                    .slice(0, 50)
                                    .map(item => {
                                        const isSelected = selectedItemsForConfig.some(i => i.id === item.id);
                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedItemsForConfig(prev => prev.filter(i => i.id !== item.id));
                                                    } else {
                                                        setSelectedItemsForConfig(prev => [...prev, item]);
                                                    }
                                                }}
                                                className={`relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer group shadow-sm hover:shadow-xl transition-all duration-300 ring-2 ${isSelected ? 'ring-primary scale-[1.02]' : 'ring-gray-100 hover:ring-primary/50'}`}
                                                style={{ backgroundImage: `url('${item.img || ''}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity opacity-90" />
                                                <div className="absolute top-3 left-3 flex gap-2">
                                                    <span className="bg-white/20 backdrop-blur-md text-white border border-white/10 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                                        {item.type}
                                                    </span>
                                                    {isSelected && (
                                                        <span className="bg-primary text-white size-6 flex items-center justify-center rounded-full shadow-lg">
                                                            <span className="material-symbols-outlined text-xs">check</span>
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                                                    <h4 className="font-bold text-sm leading-tight mb-1 line-clamp-2 drop-shadow-md">{item.name}</h4>
                                                    <span className="px-2 py-0.5 bg-white/20 rounded text-[10px] uppercase font-bold backdrop-blur-sm">
                                                        Tam: {item.size}
                                                    </span>
                                                </div>
                                                <div className={`absolute inset-0 flex items-center justify-center backdrop-blur-[1px] transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                    <span className="bg-white text-primary px-4 py-2 rounded-xl font-bold text-xs shadow-xl">
                                                        {isSelected ? 'Selecionado' : 'Selecionar'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>

                            {items.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                                    <span className="material-symbols-outlined text-6xl mb-4">checkroom</span>
                                    <p>Nenhum item disponível.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
