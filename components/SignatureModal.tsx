import React, { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface SignatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (signatureData: string) => void;
    title: string;
}

export default function SignatureModal({ isOpen, onClose, onSave, title }: SignatureModalProps) {
    const sigPad = useRef<SignatureCanvas>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isEmpty, setIsEmpty] = useState(true);
    const [canvasSize, setCanvasSize] = useState({ width: 500, height: 300 });

    // Handle Resize
    useEffect(() => {
        if (!isOpen) return;

        const updateSize = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                setCanvasSize({
                    width: clientWidth,
                    height: clientHeight
                });
            }
        };

        // Small delay to ensure modal animation finished and layout is stable
        const timer = setTimeout(updateSize, 100);
        window.addEventListener('resize', updateSize);

        return () => {
            window.removeEventListener('resize', updateSize);
            clearTimeout(timer);
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const clear = () => {
        sigPad.current?.clear();
        setIsEmpty(true);
    };

    const save = () => {
        if (sigPad.current) {
            if (sigPad.current.isEmpty()) {
                return;
            }
            // Get high quality canvas data
            const canvas = sigPad.current.getCanvas();
            const dataUrl = canvas.toDataURL('image/png');
            onSave(dataUrl);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-navy/90 backdrop-blur-md animate-in fade-in duration-300 p-0 md:p-6">
            <div className="bg-white w-full h-full md:h-auto md:max-w-2xl md:rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">

                {/* Header */}
                <div className="px-6 py-6 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-2xl">ink_pen</span>
                        </div>
                        <div>
                            <h3 className="font-black text-xl text-navy tracking-tight">{title}</h3>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Assinatura Digital Segura</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="size-10 flex items-center justify-center rounded-2xl hover:bg-gray-100 text-gray-400 transition-all active:scale-90">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Canvas Area */}
                <div className="flex-1 p-6 md:p-8 flex flex-col bg-gray-50/50">
                    <div
                        ref={containerRef}
                        className="flex-1 min-h-[300px] bg-white border-2 border-gray-200 rounded-[24px] shadow-sm relative group transition-all focus-within:border-primary/30"
                    >
                        <SignatureCanvas
                            ref={sigPad}
                            penColor="#1A1F2C"
                            canvasProps={{
                                width: canvasSize.width,
                                height: canvasSize.height,
                                className: 'signature-canvas w-full h-full cursor-crosshair'
                            }}
                            onBegin={() => setIsEmpty(false)}
                            velocityFilterWeight={0.7}
                            minWidth={1.8}
                            maxWidth={4.2}
                        />

                        {/* Interactive Guides */}
                        {isEmpty && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-opacity duration-500">
                                <div className="size-20 rounded-full bg-gray-50 flex items-center justify-center mb-4 border border-gray-100">
                                    <span className="material-symbols-outlined text-4xl text-gray-200">gesture</span>
                                </div>
                                <span className="text-2xl font-black text-gray-200 tracking-tight">Assine aqui seu nome</span>
                                <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest mt-2 px-6 py-1 border border-gray-100 rounded-full">Use o mouse ou o dedo</p>
                            </div>
                        )}

                        <div className="absolute bottom-10 left-10 right-10 pointer-events-none opacity-20">
                            <div className="h-0.5 bg-gradient-to-r from-transparent via-gray-400 to-transparent w-full"></div>
                            <p className="text-center text-[8px] font-black uppercase tracking-[0.3em] mt-2 text-gray-400">Linha de Assinatura</p>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 justify-center text-gray-400">
                        <span className="material-symbols-outlined text-sm">verified_user</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Documento com validade jurídica confirmada via Empire ERP</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 md:p-8 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center bg-white gap-4 shrink-0">
                    <button
                        onClick={clear}
                        disabled={isEmpty}
                        className="w-full sm:w-auto px-6 py-3 rounded-2xl text-sm font-black text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:bg-transparent transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                    >
                        <span className="material-symbols-outlined text-xl">delete_sweep</span>
                        Limpar Campo
                    </button>

                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <button
                            onClick={onClose}
                            className="px-8 py-3 rounded-2xl text-sm font-black text-gray-500 hover:bg-gray-50 transition-all border border-gray-100"
                        >
                            CANCELAR
                        </button>
                        <button
                            onClick={save}
                            disabled={isEmpty}
                            className={`px-10 py-4 rounded-2xl text-sm font-black text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest ${isEmpty
                                    ? 'bg-gray-200 cursor-not-allowed shadow-none'
                                    : 'bg-primary hover:bg-blue-700 shadow-primary/20'
                                }`}
                        >
                            <span className="material-symbols-outlined">verified</span>
                            Confirmar Assinatura
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
