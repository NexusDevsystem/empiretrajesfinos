import React, { useState, useRef, useEffect } from 'react';
import { Item } from '../types';

interface NewItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: Partial<Item> & { quantity?: number }) => void;
}

export default function NewItemModal({ isOpen, onClose, onSave }: NewItemModalProps) {
    interface NewItemDraft extends Partial<Item> {
        quantity?: number;
    }

    const [step, setStep] = useState<'details' | 'camera'>('details');
    const [newItem, setNewItem] = useState<NewItemDraft>({
        status: 'Disponível',
        statusColor: 'primary',
        type: 'Traje',
        img: '',
        quantity: 1,
        price: 0
    });

    // Camera Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

    // Stop camera when closing or switching steps
    useEffect(() => {
        return () => {
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [cameraStream]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            setCameraStream(stream);
            setStep('camera');
            // Wait for render
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            }, 100);
        } catch (err) {
            console.error("Erro ao acessar camera:", err);
            alert("Não foi possível acessar a câmera. Verifique as permissões.");
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                // Set canvas dimensions to match video
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;

                // Draw
                context.drawImage(videoRef.current, 0, 0);

                // Convert to base64
                const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
                setNewItem({ ...newItem, img: dataUrl });
                stopCamera();
                setStep('details');
            }
        }
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setStep('details');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // Resize to max 800px width/height to save space
                    const MAX_SIZE = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    ctx?.drawImage(img, 0, 0, width, height);

                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7); // 70% quality
                    setNewItem({ ...newItem, img: compressedDataUrl });
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveClick = () => {
        if (!newItem.name) {
            alert("Preencha pelo menos o Nome do produto.");
            return;
        }
        onSave(newItem);
        setNewItem({ status: 'Disponível', statusColor: 'primary', type: 'Traje', img: '', price: 0, color: '' });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4 animate-in fade-in duration-200">
            {step === 'details' && (
                <div className="bg-white w-full h-[100dvh] md:h-auto md:max-h-[90vh] md:w-full md:max-w-3xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col md:animate-in md:slide-in-from-bottom-4 duration-300 rounded-none relative">
                    {/* Header */}
                    <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div>
                            <h2 className="text-2xl font-black text-navy tracking-tight">Novo Item</h2>
                            <p className="text-sm text-gray-500 font-medium">Adicione ao inventário da loja.</p>
                        </div>
                        <button onClick={onClose} className="size-8 rounded-full flex items-center justify-center hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 pt-6 pb-24 md:pb-8">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">

                            {/* Left Column: Image Area */}
                            <div className="md:col-span-4 flex flex-col gap-4 md:sticky md:top-0">
                                <div className="aspect-[3/4] w-full max-w-[280px] mx-auto md:max-w-none rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center relative overflow-hidden group hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer shadow-sm active:scale-[0.98]">
                                    {newItem.img ? (
                                        <>
                                            <img src={newItem.img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Preview" />
                                            <div className="absolute inset-0 bg-navy/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all backdrop-blur-[2px]">
                                                <div className="bg-white/20 backdrop-blur-md rounded-xl p-3 border border-white/30 transform translate-y-4 group-hover:translate-y-0 transition-transform">
                                                    <span className="text-white text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-sm">photo_camera</span> Alterar
                                                    </span>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center p-6 space-y-3">
                                            <div className="size-14 rounded-2xl bg-white shadow-md flex items-center justify-center mx-auto text-primary group-hover:rotate-12 transition-all duration-500">
                                                <span className="material-symbols-outlined text-3xl">add_a_photo</span>
                                            </div>
                                            <div>
                                                <p className="text-xs text-navy font-black uppercase tracking-widest">Adicionar Foto</p>
                                                <p className="text-[10px] text-gray-400 mt-1 font-medium italic">JPG ou PNG</p>
                                            </div>
                                        </div>
                                    )}
                                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleFileChange} />
                                </div>

                                <button
                                    onClick={startCamera}
                                    className="w-full max-w-[280px] mx-auto md:max-w-none py-3.5 bg-navy text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-navy/20 hover:bg-primary hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 group"
                                >
                                    <span className="material-symbols-outlined text-lg group-hover:rotate-12 transition-transform">shutter_speed</span>
                                    Usar Câmera
                                </button>
                            </div>

                            {/* Right Column: Form Sections */}
                            <div className="md:col-span-8 space-y-8">

                                {/* Section: Identificação */}
                                <div className="space-y-5">
                                    <div className="flex items-center gap-3">
                                        <div className="size-2 rounded-full bg-primary animate-pulse"></div>
                                        <h3 className="text-[11px] font-black text-navy/40 uppercase tracking-[0.2em]">Identificação Principal</h3>
                                    </div>

                                    <div className="grid grid-cols-1 gap-5">
                                        <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                                            <label className="text-[10px] font-black text-navy/60 uppercase ml-1 tracking-wider flex items-center gap-1.5">
                                                Nome do Produto
                                                <span className="text-red-500 text-sm">*</span>
                                            </label>
                                            <input
                                                value={newItem.name || ''}
                                                onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                                className="w-full h-12 px-5 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-bold text-navy placeholder-gray-300 shadow-sm"
                                                placeholder="Ex: Smoking Italiano Lã Fria"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-navy/60 uppercase ml-1 tracking-wider">Categoria</label>
                                                <div className="relative group">
                                                    <select
                                                        value={newItem.type || 'Traje'}
                                                        onChange={e => setNewItem({ ...newItem, type: e.target.value })}
                                                        className="w-full h-12 pl-5 pr-12 rounded-2xl border border-gray-100 bg-gray-50/50 group-hover:bg-gray-100/50 focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none appearance-none font-bold text-navy cursor-pointer shadow-sm"
                                                    >
                                                        <option value="Traje">Traje Completo</option>
                                                        <option value="Paletó">Paletó / Blazer</option>
                                                        <option value="Calça">Calça Social</option>
                                                        <option value="Camisa">Camisa</option>
                                                        <option value="Sapato">Sapato</option>
                                                        <option value="Acessório">Acessório</option>
                                                    </select>
                                                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-primary transition-colors">expand_more</span>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-navy/60 uppercase ml-1 tracking-wider">Cor Predominante</label>
                                                <div className="relative">
                                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">palette</span>
                                                    <input
                                                        value={newItem.color || ''}
                                                        onChange={e => setNewItem({ ...newItem, color: e.target.value })}
                                                        className="w-full h-12 pl-12 pr-5 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-bold text-navy placeholder-gray-300 shadow-sm"
                                                        placeholder="Ex: Azul Marinho"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Section: Financeiro */}
                                    <div className="space-y-5">
                                        <div className="flex items-center gap-3">
                                            <div className="size-2 rounded-full bg-emerald-500"></div>
                                            <h3 className="text-[11px] font-black text-navy/40 uppercase tracking-[0.2em]">Financeiro</h3>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-navy/60 uppercase ml-1 tracking-wider">Valor de Locação</label>
                                            <div className="relative group">
                                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-600 font-black text-sm">R$</span>
                                                <input
                                                    type="number"
                                                    value={newItem.price || ''}
                                                    onChange={e => setNewItem({ ...newItem, price: parseFloat(e.target.value) })}
                                                    className="w-full h-12 pl-12 pr-5 rounded-2xl border border-emerald-100 bg-emerald-50/30 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all outline-none font-black text-navy placeholder-emerald-200 shadow-sm"
                                                    placeholder="0,00"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section: Logística */}
                                    <div className="space-y-5">
                                        <div className="flex items-center gap-3">
                                            <div className="size-2 rounded-full bg-amber-500"></div>
                                            <h3 className="text-[11px] font-black text-navy/40 uppercase tracking-[0.2em]">Logística</h3>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-navy/60 uppercase ml-1 tracking-wider">Tam.</label>
                                                <input
                                                    value={newItem.size || ''}
                                                    onChange={e => setNewItem({ ...newItem, size: e.target.value })}
                                                    className="w-full h-12 px-5 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-bold text-navy placeholder-gray-300 shadow-sm uppercase text-center"
                                                    placeholder="50R"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-navy/60 uppercase ml-1 tracking-wider">Local</label>
                                                <input
                                                    value={newItem.loc || ''}
                                                    onChange={e => setNewItem({ ...newItem, loc: e.target.value })}
                                                    className="w-full h-12 px-5 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-bold text-navy placeholder-gray-300 shadow-sm uppercase text-center"
                                                    placeholder="A-12"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section: Quantidade Premium */}
                                <div className="p-6 bg-gradient-to-br from-blue-500/5 to-primary/5 rounded-[2rem] border border-primary/10 shadow-inner relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                                        <span className="material-symbols-outlined text-7xl text-primary">inventory_2</span>
                                    </div>

                                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div className="flex-1">
                                            <label className="text-[11px] font-black text-primary uppercase tracking-[0.15em] mb-2 block flex items-center gap-2">
                                                <span className="material-symbols-outlined text-sm">auto_awesome_motion</span>
                                                Quantidade de Estoque Inicial
                                            </label>
                                            <p className="text-xs text-navy/50 font-medium leading-relaxed max-w-xs">
                                                Deseja cadastrar múltiplos itens com estas mesmas características?
                                            </p>
                                        </div>

                                        <div className="flex items-center bg-white rounded-2xl p-2 shadow-xl shadow-primary/10 border border-primary/5">
                                            <button
                                                onClick={() => setNewItem({ ...newItem, quantity: Math.max(1, (newItem.quantity || 1) - 1) })}
                                                className="size-11 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all active:scale-90"
                                            >
                                                <span className="material-symbols-outlined font-black">remove</span>
                                            </button>
                                            <div className="w-16 flex flex-col items-center">
                                                <input
                                                    type="number"
                                                    value={newItem.quantity || 1}
                                                    onChange={e => setNewItem({ ...newItem, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                                                    className="w-full text-center font-black text-xl text-navy outline-none bg-transparent"
                                                />
                                                <span className="text-[9px] font-black text-gray-300 uppercase -mt-1">Unidades</span>
                                            </div>
                                            <button
                                                onClick={() => setNewItem({ ...newItem, quantity: (newItem.quantity || 1) + 1 })}
                                                className="size-11 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-emerald-50 text-gray-400 hover:text-emerald-500 transition-all active:scale-90"
                                            >
                                                <span className="material-symbols-outlined font-black">add</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer - Apple Style */}
                    <div className="absolute bottom-0 left-0 right-0 px-4 md:px-8 py-4 md:py-6 border-t border-gray-100 bg-white flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4 z-20">
                        <div className="hidden md:block">
                            {newItem.name ? (
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="size-1.5 rounded-full bg-emerald-500"></span>
                                    Pronto para salvar: {newItem.name}
                                </p>
                            ) : (
                                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Preencha o nome do produto</p>
                            )}
                        </div>
                        <div className="flex gap-3 md:gap-4 w-full md:w-auto">
                            <button
                                onClick={onClose}
                                className="flex-1 md:flex-none px-6 md:px-8 py-3.5 rounded-2xl font-black text-[10px] md:text-xs text-gray-400 uppercase tracking-widest hover:bg-gray-50 hover:text-navy transition-all active:scale-95 border border-gray-100 md:border-none"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveClick}
                                disabled={!newItem.name}
                                className="flex-[2] md:flex-none px-6 md:px-12 py-3.5 rounded-2xl bg-navy text-white text-[10px] md:text-xs font-black uppercase tracking-widest shadow-2xl shadow-navy/30 hover:bg-primary hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2 md:gap-3 group"
                            >
                                <span className="material-symbols-outlined text-lg group-hover:rotate-12 transition-transform">verified</span>
                                Salvar {newItem.quantity && newItem.quantity > 1 ? `${newItem.quantity}` : ''}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {step === 'camera' && (
                <div className="bg-black fixed inset-0 z-[60] flex flex-col items-center justify-center">
                    <div className="relative w-full h-full max-w-lg bg-black flex flex-col">
                        {/* Camera Header */}
                        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/50 to-transparent">
                            <button onClick={stopCamera} className="text-white p-2 rounded-full bg-black/20 backdrop-blur-md">
                                <span className="material-symbols-outlined">arrow_back</span>
                            </button>
                            <span className="text-white font-bold text-sm">Ajuste o item no quadro</span>
                            <div className="w-10"></div>
                        </div>

                        {/* Video Feed */}
                        <div className="flex-1 relative flex items-center justify-center bg-gray-900 overflow-hidden">
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
                            {/* Frame Guide */}
                            <div className="absolute inset-10 border-2 border-white/30 rounded-2xl pointer-events-none">
                                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white"></div>
                                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white"></div>
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white"></div>
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white"></div>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="h-32 bg-black flex items-center justify-center gap-8 pb-8">
                            <button onClick={capturePhoto} className="size-16 rounded-full bg-white border-4 border-gray-300 flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                                <div className="size-14 rounded-full bg-white border-2 border-black"></div>
                            </button>
                        </div>

                        {/* Hidden Canvas */}
                        <canvas ref={canvasRef} className="hidden"></canvas>
                    </div>
                </div>
            )}
        </div>
    );
}
