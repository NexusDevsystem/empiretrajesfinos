import React, { useState, useEffect } from 'react';
import { Employee } from '../types';

interface NewEmployeeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (employee: Partial<Employee>) => void;
    initialData?: Employee | null;
}

export default function NewEmployeeModal({ isOpen, onClose, onSave, initialData }: NewEmployeeModalProps) {
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [status, setStatus] = useState<Employee['status']>('Ativo');
    const [salary, setSalary] = useState('');
    const [commissionRate, setCommissionRate] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setName(initialData.name);
                setRole(initialData.role);
                setEmail(initialData.email);
                setPhone(initialData.phone);
                setStatus(initialData.status);
                setSalary(initialData.salary?.toString() || '');
                setCommissionRate(initialData.commissionRate?.toString() || '');
            } else {
                setName('');
                setRole('');
                setEmail('');
                setPhone('');
                setStatus('Ativo');
                setSalary('');
                setCommissionRate('');
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            name,
            role,
            email,
            phone,
            status,
            salary: salary ? parseFloat(salary) : 0,
            commissionRate: commissionRate ? parseFloat(commissionRate) : 0,
            admissionDate: initialData?.admissionDate || new Date().toISOString()
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <h2 className="text-xl font-bold text-navy">
                        {initialData ? 'Editar Colaborador' : 'Novo Colaborador'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200/50 rounded-full transition-colors text-gray-500">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto">
                    <form id="employee-form" onSubmit={handleSubmit} className="flex flex-col gap-4">

                        {/* Avatar Placeholder */}
                        <div className="flex justify-center mb-4">
                            <div className="size-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                                <span className="material-symbols-outlined text-gray-400 text-3xl">add_a_photo</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nome Completo</label>
                                <input
                                    required
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="px-3 py-2.5 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    placeholder="Ex: Ana Silva"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cargo / Função</label>
                                <input
                                    required
                                    value={role}
                                    onChange={e => setRole(e.target.value)}
                                    className="px-3 py-2.5 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    placeholder="Ex: Vendedora"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="px-3 py-2.5 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    placeholder="ana@empire.com"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Telefone</label>
                                <input
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    className="px-3 py-2.5 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    placeholder="(11) 99999-9999"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Salário Base (R$)</label>
                                <input
                                    type="number"
                                    value={salary}
                                    onChange={e => setSalary(e.target.value)}
                                    className="px-3 py-2.5 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Comissão (%)</label>
                                <input
                                    type="number"
                                    value={commissionRate}
                                    onChange={e => setCommissionRate(e.target.value)}
                                    className="px-3 py-2.5 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    placeholder="Ex: 5"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</label>
                            <div className="flex gap-2">
                                {(['Ativo', 'Férias', 'Afastado', 'Desligado'] as const).map(s => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setStatus(s)}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${status === s
                                                ? 'bg-navy text-white border-navy shadow-md'
                                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                            }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="employee-form"
                        className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95"
                    >
                        Salvar
                    </button>
                </div>

            </div>
        </div>
    );
}
