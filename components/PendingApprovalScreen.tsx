import React from 'react';
import { useApp } from '../contexts/AppContext';

export default function PendingApprovalScreen() {
    const { signOut, user } = useApp();

    return (
        <div className="min-h-screen bg-navy flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl text-center animate-in fade-in zoom-in duration-300">
                <div className="size-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="material-symbols-outlined text-4xl">hourglass_empty</span>
                </div>

                <h1 className="text-2xl font-black text-navy mb-2">Quase lá!</h1>
                <p className="text-gray-500 mb-6 leading-relaxed">
                    Seu cadastro foi realizado com sucesso. Para liberar seu acesso, envie seu email abaixo para o administrador da loja.
                </p>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-8 flex items-center justify-between group cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => {
                        navigator.clipboard.writeText(user?.email || '');
                        // Simple alert via browser or toast if available, using alert for simplicity in this distinct component
                        // alert('Email copiado!'); 
                    }}
                    title="Clique para copiar"
                >
                    <div className="flex flex-col text-left">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Seu Email de Cadastro</span>
                        <span className="text-navy font-bold">{user?.email}</span>
                    </div>
                    <span className="material-symbols-outlined text-gray-400 group-hover:text-primary">content_copy</span>
                </div>

                <div className="flex flex-col gap-3">
                    <a
                        href={`mailto:empiretrajesfinos@gmail.com?subject=Solicitação de Acesso - ${user?.email}`}
                        className="w-full h-12 flex items-center justify-center gap-2 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-primary/30"
                    >
                        <span className="material-symbols-outlined">mail</span>
                        Contatar Administrador
                    </a>

                    <button
                        onClick={signOut}
                        className="w-full h-12 flex items-center justify-center gap-2 bg-gray-50 text-gray-500 font-bold rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        <span className="material-symbols-outlined">logout</span>
                        Sair da Conta
                    </button>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100">
                    <p className="text-xs text-center text-gray-300">
                        Empire Trajes Finos | ERP
                    </p>
                </div>
            </div>
        </div>
    );
}
