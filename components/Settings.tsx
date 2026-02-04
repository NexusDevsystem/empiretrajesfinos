import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';

export default function Settings() {
    const { signOut, storeSettings, updateStoreSettings } = useApp();
    const [formData, setFormData] = useState<any>(storeSettings || {});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (storeSettings) {
            setFormData(storeSettings);
        }
    }, [storeSettings]);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateStoreSettings(formData);
            alert('Configurações salvas com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert('Erro ao salvar. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-10">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-navy text-3xl font-black leading-tight tracking-tight">Configurações</h1>
                    <p className="text-gray-500 text-sm">Preferências do sistema e da loja.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-navy text-white font-bold rounded-xl shadow-lg shadow-navy/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <span className="material-symbols-outlined text-sm">save</span>
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>

            <div className="space-y-6">
                {/* Store Profile */}
                <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-navy mb-4 border-b border-gray-100 pb-2">Perfil da Loja</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Loja</label>
                            <input
                                className="w-full h-11 px-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                value={formData.store_name || ''}
                                onChange={(e) => handleChange('store_name', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CNPJ</label>
                            <input
                                className="w-full h-11 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                value={formData.store_cnpj || ''}
                                onChange={(e) => handleChange('store_cnpj', e.target.value)}
                                placeholder="00.000.000/0001-00"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Endereço</label>
                            <input
                                className="w-full h-11 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                value={formData.store_address || ''}
                                onChange={(e) => handleChange('store_address', e.target.value)}
                                placeholder="Rua das Flores, 123 - Centro"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone / WhatsApp</label>
                            <input
                                className="w-full h-11 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                value={formData.store_phone || ''}
                                onChange={(e) => handleChange('store_phone', e.target.value)}
                                placeholder="(99) 99999-9999"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Instagram</label>
                            <input
                                className="w-full h-11 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                value={formData.store_instagram || ''}
                                onChange={(e) => handleChange('store_instagram', e.target.value)}
                                placeholder="@loja"
                            />
                        </div>
                    </div>
                </section>

                {/* Notifications */}
                <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-navy mb-4 border-b border-gray-100 pb-2">Notificações</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-bold text-navy text-sm">Alertas de Atraso</p>
                                <p className="text-xs text-gray-500">Receber alerta quando uma devolução estiver atrasada.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" defaultChecked />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                        </div>

                    </div>
                </section>

                {/* System */}
                <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-navy mb-4 border-b border-gray-100 pb-2">Sistema</h2>
                    <div className="flex items-center gap-4">

                        <button onClick={signOut} className="px-4 py-2 border border-red-200 text-red-600 font-bold rounded-lg text-sm hover:bg-red-50 transition-colors">Sair da Conta</button>
                    </div>
                </section>
            </div>
        </div>
    );
}
