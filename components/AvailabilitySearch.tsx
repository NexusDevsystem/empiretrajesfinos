import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Item } from '../types';

export default function AvailabilitySearch() {
    const { items, contracts, isItemAvailable, openWizard } = useApp();

    // Filters State
    const [searchTypes, setSearchTypes] = useState<string[]>([]);
    const [searchSizes, setSearchSizes] = useState<string[]>([]);
    const [searchColor, setSearchColor] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    // Timeline Modal State
    const [selectedItemForTimeline, setSelectedItemForTimeline] = useState<Item | null>(null);

    // Derived unique values for filters
    const types = useMemo(() => Array.from(new Set(items.map(i => i.type).filter(Boolean))), [items]);
    const sizes = useMemo(() => Array.from(new Set(items.map(i => i.size).filter(Boolean))).sort(), [items]);
    const colors = useMemo(() => Array.from(new Set(items.map(i => i.color).filter(Boolean))), [items]);

    // Search Logic
    const results = useMemo(() => {
        if (!isSearching) return [];

        return items.filter(item => {
            const matchesType = searchTypes.length === 0 || searchTypes.includes(item.type);
            const matchesSize = searchSizes.length === 0 || searchSizeIncludes(item.size, searchSizes);
            const matchesColor = !searchColor || item.color === searchColor;

            if (!matchesType || !matchesSize || !matchesColor) return false;

            // Date validation
            if (!startDate || !endDate) return true; // Show all if dates not set, but search was triggered?

            return isItemAvailable(item.id, startDate, endDate);
        });
    }, [isSearching, items, searchTypes, searchSizes, searchColor, startDate, endDate, isItemAvailable]);

    function searchSizeIncludes(itemSize: string, selectedSizes: string[]) {
        return selectedSizes.some(s => itemSize.toUpperCase().includes(s.toUpperCase()));
    }

    const handleSearch = () => {
        if (!startDate || !endDate) {
            alert('Por favor, selecione as datas de retirada e devolução.');
            return;
        }
        setIsSearching(true);
    };

    const handleToggleType = (type: string) => {
        setSearchTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
    };

    const handleToggleSize = (size: string) => {
        setSearchSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
    };

    const handleReserve = (item: Item) => {
        openWizard({
            startDate,
            endDate,
            itemIds: [item.id]
        });
    };

    return (
        <div className="flex flex-col h-full lg:h-full bg-gray-50/50 lg:overflow-hidden">
            {/* Header */}
            <div className="p-6 bg-white border-b border-gray-200 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined">analytics</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-navy tracking-tight">Busca e Disponibilidade Inteligente</h2>
                        <p className="text-sm text-gray-500 font-medium">Encontre o item perfeito livre para as datas do seu cliente.</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden">
                {/* Lateral Filters - Desktop / Top Filters - Mobile */}
                <div className="w-full lg:w-80 bg-white border-b lg:border-r border-gray-100 lg:overflow-y-auto p-6 shrink-0 custom-scrollbar">
                    <div className="space-y-8">
                        {/* Dates Section */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-navy uppercase tracking-widest flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">calendar_month</span> Período Solicitado
                            </h3>
                            <div className="space-y-3">
                                <div className="space-y-1.5 text-left">
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Data de Retirada</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        className="w-full h-11 px-4 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none font-bold text-navy"
                                    />
                                </div>
                                <div className="space-y-1.5 text-left">
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Data de Devolução</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        className="w-full h-11 px-4 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none font-bold text-navy"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Types Section */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-navy uppercase tracking-widest flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">checkroom</span> Categorias
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {types.map(type => (
                                    <button
                                        key={type}
                                        onClick={() => handleToggleType(type)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${searchTypes.includes(type) ? 'bg-navy text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sizes Section */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-navy uppercase tracking-widest flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">straighten</span> Tamanhos
                            </h3>
                            <div className="grid grid-cols-4 gap-2">
                                {sizes.map(size => (
                                    <button
                                        key={size}
                                        onClick={() => handleToggleSize(size)}
                                        className={`h-9 flex items-center justify-center rounded-lg text-xs font-bold transition-all border ${searchSizes.includes(size) ? 'bg-primary border-primary text-white shadow-md' : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'}`}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Colors Section */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-navy uppercase tracking-widest flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">palette</span> Cor Predominante
                            </h3>
                            <select
                                value={searchColor}
                                onChange={e => setSearchColor(e.target.value)}
                                className="w-full h-11 px-4 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none font-bold text-navy appearance-none"
                            >
                                <option value="">Qualquer Cor</option>
                                {colors.map(color => (
                                    <option key={color} value={color}>{color}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={handleSearch}
                            className="w-full py-4 bg-navy text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-navy/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 active:scale-95"
                        >
                            <span className="material-symbols-outlined text-lg">search</span>
                            Buscar Disponíveis
                        </button>
                    </div>
                </div>

                {/* Results Area */}
                <div className="flex-1 lg:overflow-y-auto p-6 md:p-8 custom-scrollbar">
                    {!isSearching ? (
                        <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
                            <div className="size-20 rounded-3xl bg-white shadow-xl flex items-center justify-center text-gray-200">
                                <span className="material-symbols-outlined text-5xl">manage_search</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-navy">Inicie sua busca</h3>
                                <p className="text-gray-400 font-medium text-sm mt-2">Utilize os filtros à esquerda para encontrar peças exclusivas que estejam livres no período do cliente.</p>
                            </div>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
                            <div className="size-20 rounded-3xl bg-red-50 text-red-100 flex items-center justify-center">
                                <span className="material-symbols-outlined text-5xl">heart_broken</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-navy">Nenhum item encontrado</h3>
                                <p className="text-gray-400 font-medium text-sm mt-2">Não encontramos peças com estes critérios nas datas solicitadas. Tente ajustar os filtros ou as datas.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {results.map(item => (
                                <div key={item.id} className="group bg-white rounded-[2rem] border border-gray-100 overflow-hidden hover:shadow-2xl hover:shadow-primary/10 transition-all hover:-translate-y-1">
                                    {/* Image */}
                                    <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
                                        <img src={item.img} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                        <div className="absolute top-4 left-4">
                                            <span className="px-3 py-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                                                Disponível
                                            </span>
                                        </div>
                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-navy/40 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px] flex flex-col items-center justify-center p-6 gap-3">
                                            <button
                                                onClick={() => handleReserve(item)}
                                                className="w-full py-3 bg-white text-navy rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary hover:text-white transition-all transform translate-y-4 group-hover:translate-y-0 duration-300"
                                            >
                                                Reservar Agora
                                            </button>
                                            <button
                                                onClick={() => setSelectedItemForTimeline(item)}
                                                className="w-full py-3 bg-white/20 backdrop-blur-md text-white border border-white/30 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/30 transition-all transform translate-y-4 group-hover:translate-y-0 duration-500"
                                            >
                                                Ver Calendário
                                            </button>
                                        </div>
                                    </div>
                                    {/* Info */}
                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-black text-navy text-sm leading-tight line-clamp-2">{item.name}</h4>
                                            <span className="text-[10px] font-black text-gray-400 border border-gray-100 px-2 py-0.5 rounded uppercase">{item.size}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold mb-4">
                                            <span className="material-symbols-outlined text-[14px]">palette</span> {item.color}
                                            <span className="size-1 rounded-full bg-gray-200"></span>
                                            <span className="capitalize">{item.type}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                                            <p className="text-xs font-black text-primary">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price || 0)}
                                            </p>
                                            <div className="size-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-300 group-hover:text-primary transition-colors">
                                                <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Mini-Timeline Modal */}
            {selectedItemForTimeline && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2rem] md:rounded-[2.5rem] shadow-2xl overflow-y-auto animate-in zoom-in-95 duration-300 custom-scrollbar">
                        {/* Modal Header */}
                        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <div className="size-12 rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden bg-cover bg-center" style={{ backgroundImage: `url('${selectedItemForTimeline.img}')` }}></div>
                                <div>
                                    <h3 className="text-xl font-black text-navy">{selectedItemForTimeline.name}</h3>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Código: {selectedItemForTimeline.id.split('-').pop()?.toUpperCase()}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedItemForTimeline(null)} className="size-10 rounded-full flex items-center justify-center hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-8">
                            <h4 className="text-xs font-black text-navy uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg text-primary">timeline</span>
                                Cronograma de Ocupação (Mês Atual)
                            </h4>

                            <div className="grid grid-cols-7 gap-1 bg-gray-100 border border-gray-100 rounded-2xl overflow-hidden shadow-inner">
                                {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map(day => (
                                    <div key={day} className="h-10 flex items-center justify-center bg-gray-50 text-[10px] font-black text-gray-400">
                                        {day}
                                    </div>
                                ))}
                                {(() => {
                                    const now = new Date();
                                    const year = now.getFullYear();
                                    const month = now.getMonth();
                                    const firstDay = new Date(year, month, 1).getDay();
                                    const lastDate = new Date(year, month + 1, 0).getDate();
                                    const days = [];

                                    // Padding
                                    for (let i = 0; i < firstDay; i++) days.push(<div key={`pad-${i}`} className="h-20 bg-gray-50/50" />);

                                    // Item Contracts
                                    const itemContracts = contracts.filter(c => c.items.includes(selectedItemForTimeline.id) && c.status !== 'Cancelado');

                                    for (let d = 1; d <= lastDate; d++) {
                                        const current = new Date(year, month, d);
                                        const dateStr = current.toISOString().split('T')[0];

                                        // Specific Statuses for this day
                                        const isProposal = startDate && endDate && dateStr >= startDate && dateStr <= endDate;

                                        const isOccupied = itemContracts.some(c => dateStr >= c.startDate && dateStr <= c.endDate);

                                        // Sanitation Buffer Check
                                        const bufferDays = 2;
                                        const isBuffer = !isOccupied && itemContracts.some(c => {
                                            const cEnd = new Date(c.endDate);
                                            const bufferEnd = new Date(cEnd.getTime() + bufferDays * 24 * 60 * 60 * 1000);
                                            const bufferEndStr = bufferEnd.toISOString().split('T')[0];
                                            return dateStr > c.endDate && dateStr <= bufferEndStr;
                                        });

                                        days.push(
                                            <div key={d} className="h-24 bg-white border border-gray-50 p-2 relative flex flex-col gap-1">
                                                <span className="text-[10px] font-bold text-gray-300">{d}</span>

                                                {isOccupied && (
                                                    <div className="h-2 bg-red-400 rounded-full w-full" title="Locação confirmada" />
                                                )}

                                                {isBuffer && (
                                                    <div className="h-2 bg-gray-200 rounded-full w-full border border-dashed border-gray-300" title="Buffer de Higienização" />
                                                )}

                                                {isProposal && (
                                                    <div className="h-2 bg-primary rounded-full w-full animate-pulse" title="Período selecionado na busca" />
                                                )}

                                                {isProposal && isBuffer && (
                                                    <div className="h-2 bg-gray-400 rounded-full w-full border border-dashed border-gray-400 opacity-50" title="Buffer do período solicitado" />
                                                )}
                                            </div>
                                        );
                                    }

                                    return days;
                                })()}
                            </div>

                            <div className="mt-8 flex flex-wrap gap-6 justify-center">
                                <div className="flex items-center gap-2">
                                    <div className="size-3 rounded-full bg-primary" />
                                    <span className="text-[10px] font-black text-navy uppercase tracking-widest">Simulação Atual</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="size-3 rounded-full bg-red-400" />
                                    <span className="text-[10px] font-black text-navy uppercase tracking-widest">Já Alugado</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="size-3 rounded-full bg-gray-200 border border-dashed border-gray-300" />
                                    <span className="text-[10px] font-black text-navy uppercase tracking-widest">Higienização</span>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-4">
                            <button
                                onClick={() => setSelectedItemForTimeline(null)}
                                className="px-6 py-3 rounded-xl font-bold text-xs text-gray-400 uppercase tracking-widest hover:text-navy transition-all"
                            >
                                Fechar
                            </button>
                            <button
                                onClick={() => handleReserve(selectedItemForTimeline)}
                                className="px-8 py-3 bg-navy text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-navy/20 hover:bg-primary transition-all"
                            >
                                Confirmar Seleção
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
