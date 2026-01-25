import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { logsAPI } from '../services/api';

export default function SystemHistory() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters
    // Filters
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [selectedUser, setSelectedUser] = useState('Todos usuários');
    const [selectedModule, setSelectedModule] = useState('Todos módulos');
    const [searchQuery, setSearchQuery] = useState('');

    // Dropdown data
    const [availableUsers, setAvailableUsers] = useState<any[]>([]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchLogs();
        }, 500); // Debounce search
        return () => clearTimeout(timeoutId);
    }, [currentPage, itemsPerPage, selectedUser, selectedModule, dateRange, searchQuery]);

    const fetchUsers = async () => {
        try {
            const users = await logsAPI.getUsers();
            setAvailableUsers(users);
        } catch (error) {
            console.error("Error fetching users for filter", error);
        }
    };

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params: any = {
                page: currentPage,
                limit: itemsPerPage
            };

            if (selectedUser !== 'Todos usuários') params.user = selectedUser;
            if (selectedModule !== 'Todos módulos') params.module = selectedModule;
            if (searchQuery) params.search = searchQuery;
            if (dateRange.start && dateRange.end) {
                params.startDate = dateRange.start;
                params.endDate = dateRange.end;
            }

            const response = await logsAPI.getAll(params);
            setLogs(response.data);
            setTotalItems(response.pagination.total);
            setTotalPages(response.pagination.pages);
        } catch (error) {
            console.error("Error fetching logs", error);
        } finally {
            setLoading(false);
        }
    };

    const formatTimestamp = (isoString: string) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="animate-in fade-in duration-500">
            {/* Header */}
            <h1 className="text-2xl font-bold text-navy mb-8">Histórico do sistema</h1>

            {/* Main Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                {/* Filters Bar */}
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-wrap gap-4 items-center">
                    {/* Date Range Picker Placeholder - Interactive for future improvement, simplified for now */}
                    {/* Search Bar */}
                    <div className="flex-1 min-w-[200px] relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                        <input
                            type="text"
                            placeholder="Buscar por descrição..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-600 outline-none focus:border-blue-500 transition-colors shadow-sm"
                        />
                    </div>

                    {/* Date Range Picker Placeholder - Interactive for future improvement, simplified for now */}
                    <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-2 gap-2 shadow-sm">
                        <input
                            type="date"
                            value={dateRange.start}
                            className="text-sm text-gray-600 outline-none font-medium bg-transparent"
                            onChange={(e) => { setDateRange(prev => ({ ...prev, start: e.target.value })); setCurrentPage(1); }}
                        />
                        <span className="text-gray-400">-</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            className="text-sm text-gray-600 outline-none font-medium bg-transparent"
                            onChange={(e) => { setDateRange(prev => ({ ...prev, end: e.target.value })); setCurrentPage(1); }}
                        />
                    </div>

                    {/* User Dropdown */}
                    <div className="relative">
                        <select
                            value={selectedUser}
                            onChange={(e) => { setSelectedUser(e.target.value); setCurrentPage(1); }}
                            className="appearance-none bg-gray-100 border border-transparent hover:bg-gray-200 text-gray-600 text-sm font-bold rounded-lg pl-4 pr-10 py-2 outline-none cursor-pointer transition-colors"
                        >
                            <option>Todos usuários</option>
                            {availableUsers.map(u => (
                                <option key={u._id} value={u.full_name}>{u.full_name}</option>
                            ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none">expand_more</span>
                    </div>

                    {/* Module Dropdown */}
                    <div className="relative">
                        <select
                            value={selectedModule}
                            onChange={(e) => { setSelectedModule(e.target.value); setCurrentPage(1); }}
                            className="appearance-none bg-gray-100 border border-transparent hover:bg-gray-200 text-gray-600 text-sm font-bold rounded-lg pl-4 pr-10 py-2 outline-none cursor-pointer transition-colors"
                        >
                            <option>Todos módulos</option>
                            <option>Agendamentos</option>
                            <option>Clientes</option>
                            <option>Financeiro</option>
                            <option>Contratos</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none">expand_more</span>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="py-4 px-6 text-[10px] font-black uppercase text-blue-500 tracking-widest flex items-center gap-1 cursor-pointer hover:text-blue-600">
                                    MÓDULO
                                    <span className="material-symbols-outlined text-sm">arrow_upward</span>
                                </th>
                                <th className="py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest w-1/2">DESCRIÇÃO</th>
                                <th className="py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">DATA</th>
                                <th className="py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">USUÁRIO</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-gray-400">Carregando histórico...</td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-gray-400">Nenhum registro encontrado.</td>
                                </tr>
                            ) : (
                                logs.map((item) => (
                                    <tr key={item._id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="py-4 px-6 text-sm font-bold text-gray-700">{item.module}</td>
                                        <td className="py-4 px-6 text-sm text-gray-600">
                                            <span dangerouslySetInnerHTML={{ __html: item.description }} />
                                        </td>
                                        <td className="py-4 px-6 text-sm font-medium text-gray-500">{formatTimestamp(item.timestamp)}</td>
                                        <td className="py-4 px-6 text-sm font-medium text-gray-500">{item.user_name}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer / Pagination */}
                <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex gap-1">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(1)}
                            className="size-8 rounded flex items-center justify-center bg-gray-100 text-gray-400 disabled:opacity-50 hover:bg-gray-200 transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">keyboard_double_arrow_left</span>
                        </button>
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className="size-8 rounded flex items-center justify-center bg-gray-100 text-gray-400 disabled:opacity-50 hover:bg-gray-200 transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">chevron_left</span>
                        </button>

                        <div className="size-8 rounded flex items-center justify-center bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/30">
                            {currentPage}
                        </div>

                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className="size-8 rounded flex items-center justify-center bg-gray-100 text-gray-400 disabled:opacity-50 hover:bg-gray-200 transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                        </button>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(totalPages)}
                            className="size-8 rounded flex items-center justify-center bg-gray-100 text-gray-400 disabled:opacity-50 hover:bg-gray-200 transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">keyboard_double_arrow_right</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <select
                                value={itemsPerPage}
                                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                className="appearance-none bg-gray-100 text-gray-600 text-xs font-bold rounded px-3 py-1.5 pr-6 outline-none cursor-pointer"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">expand_more</span>
                        </div>
                        <span className="text-xs font-bold text-gray-500">
                            Mostrando {logs.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, totalItems)} do total de {totalItems}
                        </span>
                    </div>
                </div>

            </div>
        </div>
    );
}
