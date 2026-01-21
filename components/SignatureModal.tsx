import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface SignatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (signatureData: string) => void;
    title: string;
}

export default function SignatureModal({ isOpen, onClose, onSave, title }: SignatureModalProps) {
    const sigPad = useRef<SignatureCanvas>(null);
    const [isEmpty, setIsEmpty] = useState(true);

    if (!isOpen) return null;

    const clear = () => {
        sigPad.current?.clear();
        setIsEmpty(true);
    };

    const save = () => {
        if (sigPad.current) {
            if (sigPad.current.isEmpty()) {
                alert("Por favor, assine antes de salvar.");
                return;
            }
            // Using getCanvas() instead of getTrimmedCanvas() due to bundling issues with trim-canvas
            const dataUrl = sigPad.current.getCanvas().toDataURL('image/png');
            onSave(dataUrl);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg text-navy flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">ink_pen</span>
                        {title}
                    </h3>
                    <button onClick={onClose} className="size-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Canvas Area */}
                <div className="p-6 bg-gray-100 flex justify-center">
                    <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl shadow-inner relative">
                        <SignatureCanvas
                            ref={sigPad}
                            penColor="black"
                            canvasProps={{
                                width: 500,
                                height: 250,
                                className: 'signature-canvas max-w-full h-auto cursor-crosshair'
                            }}
                            onBegin={() => setIsEmpty(false)}
                            velocityFilterWeight={0.7}
                            minWidth={1.5}
                            maxWidth={3.5}
                        />
                        {isEmpty && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                                <span className="text-4xl font-handwriting text-gray-400 rotate-[-10deg]">Assine Aqui</span>
                            </div>
                        )}
                        <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
                            <div className="h-px bg-gray-200 w-3/4 mx-auto mb-1"></div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-white">
                    <button
                        onClick={clear}
                        className="px-4 py-2 rounded-lg text-sm font-bold text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                        Limpar
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={save}
                            className="px-6 py-2 rounded-lg text-sm font-bold bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[18px]">check_circle</span>
                            Confirmar Assinatura
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
