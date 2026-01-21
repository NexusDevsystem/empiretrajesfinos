import React from 'react';
import { Toast } from './Toast';
import { Toast as ToastType } from '../types';

interface ToastContainerProps {
    toasts: ToastType[];
    onRemove: (id: string) => void;
}

export default function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
            <div className="flex flex-col gap-3 pointer-events-auto">
                {toasts.map(toast => (
                    <Toast key={toast.id} toast={toast} onRemove={onRemove} />
                ))}
            </div>
        </div>
    );
};
