import React, { useEffect } from 'react';
import { Toast as ToastType } from '../types';

interface ToastProps {
    toast: ToastType;
    onRemove: (id: string) => void;
}

const ICONS = {
    success: 'check_circle',
    error: 'error',
    info: 'info',
    warning: 'warning'
};

const STYLES = {
    success: 'bg-white border-l-4 border-green-500 text-green-800',
    error: 'bg-white border-l-4 border-red-500 text-red-800',
    info: 'bg-white border-l-4 border-blue-500 text-blue-800',
    warning: 'bg-white border-l-4 border-amber-500 text-amber-800'
};

const ICON_COLORS = {
    success: 'text-green-500',
    error: 'text-red-500',
    info: 'text-blue-500',
    warning: 'text-amber-500'
};

export const Toast: React.FC<ToastProps> = ({ toast, onRemove }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onRemove(toast.id);
        }, toast.duration);

        return () => clearTimeout(timer);
    }, [toast, onRemove]);

    return (
        <div className={`
            relative flex items-start gap-3 p-4 rounded-lg shadow-lg shadow-gray-200/50 
            min-w-[320px] max-w-[400px] animate-in slide-in-from-right-full duration-300
            ${STYLES[toast.type]}
        `}>
            <span className={`material-symbols-outlined mt-0.5 ${ICON_COLORS[toast.type]}`}>
                {ICONS[toast.type]}
            </span>
            <div className="flex-1 pr-6">
                {toast.title && <h4 className="font-bold text-sm mb-1">{toast.title}</h4>}
                <p className="text-sm font-medium opacity-90 leading-relaxed">{toast.message}</p>
            </div>
            <button
                onClick={() => onRemove(toast.id)}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
                <span className="material-symbols-outlined text-lg">close</span>
            </button>
        </div>
    );
};
