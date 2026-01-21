import React from 'react';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    type?: AlertType;
    buttonText?: string;
}

export default function AlertModal({
    isOpen,
    onClose,
    title,
    message,
    type = 'info',
    buttonText = 'Entendi'
}: AlertModalProps) {
    if (!isOpen) return null;

    const styles = {
        success: {
            bg: 'bg-emerald-50',
            iconBg: 'bg-emerald-100',
            iconColor: 'text-emerald-600',
            icon: 'check_circle',
            button: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
        },
        error: {
            bg: 'bg-red-50',
            iconBg: 'bg-red-100',
            iconColor: 'text-red-600',
            icon: 'error',
            button: 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
        },
        warning: {
            bg: 'bg-amber-50',
            iconBg: 'bg-amber-100',
            iconColor: 'text-amber-600',
            icon: 'lock',
            button: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
        },
        info: {
            bg: 'bg-blue-50',
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-600',
            icon: 'info',
            button: 'bg-primary hover:bg-blue-700 shadow-blue-500/20'
        }
    };

    const currentStyle = styles[type];

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Visual Header */}
                <div className={`h-28 flex items-center justify-center ${currentStyle.bg}`}>
                    <div className={`size-16 rounded-full flex items-center justify-center ${currentStyle.iconBg} ${currentStyle.iconColor} shadow-inner animate-bounce`}>
                        <span className="material-symbols-outlined text-3xl">
                            {currentStyle.icon}
                        </span>
                    </div>
                </div>

                <div className="p-6 text-center">
                    <h3 className="text-xl font-black text-navy mb-2">{title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed mb-6 font-medium">
                        {message}
                    </p>

                    <button
                        onClick={onClose}
                        className={`w-full h-11 rounded-xl text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] ${currentStyle.button}`}
                    >
                        {buttonText}
                    </button>
                </div>
            </div>
        </div>
    );
}
