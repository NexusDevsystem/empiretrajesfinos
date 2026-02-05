import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
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
        type: '',
        img: '',
        quantity: 1,
        code: '',
        price: 0
    });

    // Camera Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const { items } = useApp();

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


    // Extract unique categories from existing items
    const existingCategories = Array.from(new Set(items.map(i => i.type).filter(Boolean))).sort();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            console.log("File selected:", file.name);
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
                    console.log("Image compressed, updating state...");
                    setNewItem(prev => ({ ...prev, img: compressedDataUrl }));
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
        setNewItem({ status: 'Disponível', statusColor: 'primary', type: '', img: '', price: 0, color: '', code: '' });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4 animate-in fade-in duration-200">
            {step === 'details' && (
                <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:w-full md:max-w-2xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">
                    {/* Header */}
                    <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div>
                            <h2 className="text-2xl font-black text-navy tracking-tight">Novo Item</h2>
                            <p className="text-sm text-gray-500 font-medium">Adicione ao inventário da loja profissionalmente.</p>
                        </div>
                        <button onClick={onClose} className="size-8 rounded-full flex items-center justify-center hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                        <div className="flex flex-col md:flex-row gap-8">

                            {/* Left Column: Image */}
                            <div className="w-full md:w-1/3 flex flex-col gap-4">
                                <div className="aspect-[3/4] rounded-2xl bg-gray-100 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center relative overflow-hidden group hover:border-primary hover:bg-blue-50/30 transition-all cursor-pointer shadow-inner">
                                    {newItem.img ? (
                                        <>
                                            <img src={newItem.img} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Preview" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all backdrop-blur-[2px]">
                                                <span className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">edit</span> Alterar
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center p-4">
                                            <div className="size-12 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-3 text-primary group-hover:scale-110 transition-transform">
                                                <span className="material-symbols-outlined">add_a_photo</span>
                                            </div>
                                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Adicionar Foto</p>
                                        </div>
                                    )}
                                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleFileChange} />
                                </div>

                                <button onClick={startCamera} className="w-full py-2.5 bg-navy text-white rounded-xl text-xs font-bold shadow-lg shadow-navy/20 hover:bg-primary transition-all flex items-center justify-center gap-2 group">
                                    <span className="material-symbols-outlined text-sm group-hover:rotate-12 transition-transform">photo_camera</span>
                                    Usar Câmera
                                </button>
                            </div>

                            {/* Right Column: Form */}
                            <div className="flex-1 space-y-6">
                                {/* Section: Basic Info */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-4 h-0.5 bg-gray-300 rounded-full"></span>
                                        Identificação
                                    </h3>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-navy uppercase ml-1 mb-1.5 block">Nome do Produto <span className="text-red-500">*</span></label>
                                            <input
                                                value={newItem.name || ''}
                                                onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                                className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-bold text-navy placeholder-gray-400"
                                                placeholder="Ex: Smoking Italiano Lã Fria"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-navy uppercase ml-1 mb-1.5 block">Categoria</label>
                                                <div className="relative">
                                                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-[20px]">inventory_2</span>
                                                    <input
                                                        list="categories-list"
                                                        value={newItem.type || ''}
                                                        onChange={e => setNewItem({ ...newItem, type: e.target.value })}
                                                        className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-bold text-navy placeholder-gray-400"
                                                        placeholder="Ex: Vestido, Terno..."
                                                    />
                                                    <datalist id="categories-list">
                                                        {existingCategories.map(cat => (
                                                            <option key={cat} value={cat} />
                                                        ))}
                                                    </datalist>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-xs font-bold text-navy uppercase ml-1 mb-1.5 block">Cor</label>
                                                <div className="relative">
                                                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-[20px]">palette</span>
                                                    <input
                                                        value={newItem.color || ''}
                                                        onChange={e => setNewItem({ ...newItem, color: e.target.value })}
                                                        className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-medium text-navy placeholder-gray-400"
                                                        placeholder="Ex: Azul Marinho"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section: Logistics & Financial */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-4 h-0.5 bg-gray-300 rounded-full"></span>
                                        Logística & Financeiro
                                    </h3>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-navy uppercase ml-1 mb-1.5 block">Tamanho</label>
                                            <input
                                                value={newItem.size || ''}
                                                onChange={e => setNewItem({ ...newItem, size: e.target.value })}
                                                className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-medium text-navy placeholder-gray-400"
                                                placeholder="Ex: 50R"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-navy uppercase ml-1 mb-1.5 block">Código do Produto</label>
                                            <input
                                                value={newItem.code || ''}
                                                onChange={e => setNewItem({ ...newItem, code: e.target.value })}
                                                className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-medium text-navy placeholder-gray-400"
                                                placeholder="Ex: #12345"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-navy uppercase ml-1 mb-1.5 block">Valor de Locação (R$)</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">R$</span>
                                                <input
                                                    type="number"
                                                    value={newItem.price || ''}
                                                    onChange={e => setNewItem({ ...newItem, price: parseFloat(e.target.value) })}
                                                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-bold text-navy placeholder-gray-400"
                                                    placeholder="0,00"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-navy uppercase ml-1 mb-1.5 block">Valor de Venda (R$)</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">R$</span>
                                                <input
                                                    type="number"
                                                    value={newItem.salePrice || ''}
                                                    onChange={e => setNewItem({ ...newItem, salePrice: parseFloat(e.target.value) })}
                                                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-bold text-navy placeholder-gray-400"
                                                    placeholder="0,00"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                                        <label className="text-xs font-bold text-primary uppercase mb-2 block flex items-center gap-2">
                                            <span className="material-symbols-outlined text-sm">inventory_2</span>
                                            Quantidade Inicial
                                        </label>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center bg-white rounded-lg border border-blue-200 p-1 shadow-sm">
                                                <button
                                                    onClick={() => setNewItem({ ...newItem, quantity: Math.max(1, (newItem.quantity || 1) - 1) })}
                                                    className="size-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-primary transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-sm font-bold">remove</span>
                                                </button>
                                                <input
                                                    type="number"
                                                    value={newItem.quantity || 1}
                                                    onChange={e => setNewItem({ ...newItem, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                                                    className="w-12 text-center font-bold text-navy outline-none mx-1"
                                                />
                                                <button
                                                    onClick={() => setNewItem({ ...newItem, quantity: (newItem.quantity || 1) + 1 })}
                                                    className="size-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-primary transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-sm font-bold">add</span>
                                                </button>
                                            </div>
                                            <p className="text-xs text-blue-600/80 leading-relaxed">
                                                Serão criados <strong className="text-blue-700">{newItem.quantity || 1} itens</strong> idênticos no sistema.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                        <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-gray-400 hover:bg-gray-200 hover:text-navy transition-colors">
                            Cancelar
                        </button>
                        <button
                            onClick={handleSaveClick}
                            disabled={!newItem.name}
                            className="px-8 py-2.5 rounded-xl bg-navy text-white font-bold shadow-lg shadow-navy/20 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined">save</span>
                            Salvar {newItem.quantity && newItem.quantity > 1 ? `(${newItem.quantity})` : 'Item'}
                        </button>
                    </div>
                </div>
            )}

            {step === 'camera' && (
                <div className="bg-black fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-12 text-white">
                    <div className="relative w-full h-full md:h-auto md:max-w-xl md:aspect-video bg-neutral-900 md:border md:border-white/5 overflow-hidden flex flex-col shadow-2xl">
                        {/* Minimalist Camera HUD */}
                        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-10 bg-gradient-to-b from-black/50 to-transparent">
                            <button onClick={stopCamera} className="size-10 border border-white/20 flex items-center justify-center hover:bg-white hover:text-black transition-all rounded-full bg-black/20 backdrop-blur-sm">
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                            <span className="text-white/40 text-[8px] font-bold uppercase tracking-[0.5em] mt-3">Cam View_01</span>
                            <div className="size-10" />
                        </div>

                        {/* Video Arena (Compact) */}
                        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-100" />
                            <div className="absolute inset-8 border border-white/5 pointer-events-none hidden md:block" />
                            {/* Mobile guide overlay */}
                            <div className="absolute inset-0 border-[30px] border-black/30 pointer-events-none md:hidden pt-20 pb-32">
                                <div className="w-full h-full border border-white/20 relative">
                                    <div className="absolute top-0 left-0 size-4 border-t-2 border-l-2 border-white/50"></div>
                                    <div className="absolute top-0 right-0 size-4 border-t-2 border-r-2 border-white/50"></div>
                                    <div className="absolute bottom-0 left-0 size-4 border-b-2 border-l-2 border-white/50"></div>
                                    <div className="absolute bottom-0 right-0 size-4 border-b-2 border-r-2 border-white/50"></div>
                                </div>
                            </div>
                        </div>

                        {/* Sharp Trigger (Compact) */}
                        <div className="h-24 bg-black flex items-center justify-center">
                            <button onClick={capturePhoto} className="group relative size-16 rounded-full border border-white/20 flex items-center justify-center transition-all hover:border-white active:scale-95">
                                <div className="size-12 rounded-full bg-white transition-transform group-hover:scale-90" />
                            </button>
                        </div>

                        <canvas ref={canvasRef} className="hidden" />
                    </div>
                </div>
            )}
        </div>
    );
}
