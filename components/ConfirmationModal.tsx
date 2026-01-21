import React from 'react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    isDangerous = false
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 scale-100">
                {/* Visual Header */}
                <div className={`h-24 flex items-center justify-center ${isDangerous ? 'bg-red-50' : 'bg-blue-50'}`}>
                    <div className={`size-12 rounded-full flex items-center justify-center ${isDangerous ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        <span className="material-symbols-outlined text-2xl">
                            {isDangerous ? 'warning' : 'help'}
                        </span>
                    </div>
                </div>

                <div className="p-6 text-center">
                    <h3 className="text-lg font-bold text-navy mb-2">{title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed mb-6">
                        {description}
                    </p>

                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`flex-1 h-10 rounded-xl text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] ${isDangerous
                                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                                    : 'bg-primary hover:bg-blue-700 shadow-blue-500/20'
                                }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
