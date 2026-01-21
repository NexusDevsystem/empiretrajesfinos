import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Employee } from '../types';
import { useToast } from '../contexts/ToastContext';

export default function Team() {
    const { employees, updateEmployee, deleteEmployee, profile: currentUserProfile } = useApp();
    const { showToast } = useToast();
    const [loading, setLoading] = useState<string | null>(null);

    const pendingUsers = employees.filter(e => e.role === 'pending');
    const activeUsers = employees.filter(e => e.role !== 'pending');

    const handleRoleChange = async (employee: Employee, newRole: string) => {
        if (loading) return;
        setLoading(employee.id);
        try {
            await updateEmployee({ ...employee, role: newRole });
            showToast('success', 'Permissão atualizada com sucesso!');
        } catch (error) {
            showToast('error', 'Erro ao atualizar permissão.');
        } finally {
            setLoading(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja remover este colaborador?')) return;
        if (loading) return;
        setLoading(id);
        try {
            await deleteEmployee(id);
            showToast('success', 'Colaborador removido com sucesso!');
        } catch (error) {
            showToast('error', 'Erro ao remover colaborador.');
        } finally {
            setLoading(null);
        }
    };

    // Helper to get role color
    const getRoleColor = (role: string) => {
        switch (role) {
            case 'admin': return 'bg-purple-100 text-purple-700';
            case 'gerente': return 'bg-blue-100 text-blue-700';
            case 'vendedor': return 'bg-green-100 text-green-700';
            case 'pending': return 'bg-yellow-100 text-yellow-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'admin': return 'Administrador';
            case 'gerente': return 'Gerente';
            case 'vendedor': return 'Vendedor';
            case 'pending': return 'Pendente';
            default: return role;
        }
    };

    return (
        <div className="flex flex-col gap-6 md:gap-8 pb-10">
            <div className="flex flex-wrap justify-between items-end gap-4">
                <div>
                    <h1 className="text-navy text-2xl md:text-3xl font-black leading-tight tracking-tight">Equipe</h1>
                    <p className="text-gray-500 text-xs md:text-sm">Gerencie acessos e permissões do sistema.</p>
                </div>
            </div>

            {/* Pending Requests Section */}
            {pendingUsers.length > 0 && (
                <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4 md:p-6 animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                        <div className="size-7 md:size-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-base md:text-lg">person_add</span>
                        </div>
                        <h3 className="font-bold text-navy text-base md:text-lg">Solicitações de Acesso ({pendingUsers.length})</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                        {pendingUsers.map(user => (
                            <div key={user.id} className="bg-white p-3 md:p-4 rounded-xl border border-orange-200 shadow-sm flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="size-9 md:size-10 rounded-full bg-navy text-white flex items-center justify-center font-bold text-xs uppercase">
                                        {user.name.substring(0, 2)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-navy text-sm truncate">{user.name}</p>
                                        <p className="text-[10px] md:text-xs text-gray-500 truncate">{user.email}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-auto">
                                    <button
                                        onClick={() => handleRoleChange(user, 'vendedor')}
                                        disabled={loading === user.id}
                                        className="flex-1 bg-primary text-white text-[10px] md:text-xs font-bold py-2 md:py-2.5 rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-sm md:text-[16px]">check</span>
                                        <span className="hidden sm:inline">Aprovar (Vendedor)</span>
                                        <span className="sm:hidden">Aprovar</span>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(user.id)}
                                        disabled={loading === user.id}
                                        className="size-8 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 flex items-center justify-center transition-colors"
                                        title="Recusar"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">close</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Active List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 md:p-6 border-b border-gray-100 flex items-center gap-2">
                    <span className="material-symbols-outlined text-gray-400 text-xl md:text-2xl">group</span>
                    <h3 className="font-bold text-navy text-sm md:text-base">Membros Ativos</h3>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-gray-100">
                    {activeUsers.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            Nenhum colaborador ativo encontrado.
                        </div>
                    ) : (
                        activeUsers.map((employee) => (
                            <div key={employee.id} className="p-4 space-y-3">
                                <div className="flex items-center gap-3">
                                    {employee.avatar ? (
                                        <div className="size-12 rounded-full bg-cover bg-center border border-gray-200" style={{ backgroundImage: `url('${employee.avatar}')` }}></div>
                                    ) : (
                                        <div className="size-12 rounded-full bg-navy text-white flex items-center justify-center font-bold text-sm border border-gray-200 uppercase">
                                            {employee.name.substring(0, 2)}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-navy text-sm truncate">{employee.name}</p>
                                            {currentUserProfile?.id === employee.id && (
                                                <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold">VOCÊ</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">{employee.email}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getRoleColor(employee.role)}`}>
                                                {getRoleLabel(employee.role)}
                                            </span>
                                            <span className="text-[10px] text-gray-400">
                                                Desde {new Date(employee.admissionDate).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {currentUserProfile?.id !== employee.id && (
                                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                        <select
                                            value={employee.role}
                                            disabled={loading === employee.id}
                                            onChange={(e) => handleRoleChange(employee, e.target.value)}
                                            className="flex-1 text-xs border border-gray-200 rounded-lg p-2 bg-white text-gray-700 outline-none focus:border-primary cursor-pointer"
                                        >
                                            <option value="pending">Pendente</option>
                                            <option value="vendedor">Vendedor</option>
                                            <option value="gerente">Gerente</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                        <button
                                            onClick={() => handleDelete(employee.id)}
                                            disabled={loading === employee.id}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Remover"
                                        >
                                            <span className="material-symbols-outlined text-xl">delete</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                                <th className="p-4 font-bold">Colaborador</th>
                                <th className="p-4 font-bold">Email</th>
                                <th className="p-4 font-bold">Função</th>
                                <th className="p-4 font-bold">Data de Início</th>
                                <th className="p-4 font-bold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {activeUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-400">
                                        Nenhum colaborador ativo encontrado.
                                    </td>
                                </tr>
                            ) : (
                                activeUsers.map((employee) => (
                                    <tr key={employee.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                {employee.avatar ? (
                                                    <div className="size-10 rounded-full bg-cover bg-center border border-gray-200" style={{ backgroundImage: `url('${employee.avatar}')` }}></div>
                                                ) : (
                                                    <div className="size-10 rounded-full bg-navy text-white flex items-center justify-center font-bold text-xs border border-gray-200 uppercase">
                                                        {employee.name.substring(0, 2)}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-bold text-navy text-sm">{employee.name}</p>
                                                    {currentUserProfile?.id === employee.id && (
                                                        <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold">VOCÊ</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">{employee.email}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getRoleColor(employee.role)}`}>
                                                    {getRoleLabel(employee.role)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500">
                                            {new Date(employee.admissionDate).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="p-4 text-right">
                                            {currentUserProfile?.id !== employee.id && (
                                                <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                    <select
                                                        value={employee.role}
                                                        disabled={loading === employee.id}
                                                        onChange={(e) => handleRoleChange(employee, e.target.value)}
                                                        className="text-xs border border-gray-200 rounded-lg p-1.5 bg-white text-gray-700 outline-none focus:border-primary cursor-pointer hover:border-gray-300 transition-colors"
                                                    >
                                                        <option value="pending">Pendente</option>
                                                        <option value="vendedor">Vendedor</option>
                                                        <option value="gerente">Gerente</option>
                                                        <option value="admin">Admin</option>
                                                    </select>

                                                    <button
                                                        onClick={() => handleDelete(employee.id)}
                                                        disabled={loading === employee.id}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Remover"
                                                    >
                                                        <span className="material-symbols-outlined text-[20px]">delete</span>
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
