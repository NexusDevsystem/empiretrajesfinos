import React, { createContext, useContext, useState, useCallback } from 'react';
import ToastContainer from '../components/ToastContainer';
import { Toast, ToastType } from '../types';

interface ToastContextType {
    showToast: (type: ToastType, message: string, options?: { title?: string; duration?: number }) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((type: ToastType, message: string, options?: { title?: string; duration?: number }) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newToast: Toast = {
            id,
            type,
            message,
            title: options?.title,
            duration: options?.duration || 4000
        };

        setToasts(prev => [...prev, newToast]);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast, removeToast }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
