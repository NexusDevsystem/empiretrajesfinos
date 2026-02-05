import React, { useRef, useState } from 'react';
import { Receipt } from '../types';
import { useApp } from '../contexts/AppContext';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { numberToExtenso } from '../utils/formatters';

interface PrintableReceiptProps {
    receipt: Receipt;
    onClose: () => void;
}

export default function PrintableReceipt({ receipt, onClose }: PrintableReceiptProps) {
    const { storeSettings } = useApp();
    const [isGenerating, setIsGenerating] = useState(false);
    const receiptRef = useRef<HTMLDivElement>(null);

    const handleDownloadPDF = async () => {
        if (!receiptRef.current) return;
        setIsGenerating(true);

        // Save original style
        const element = receiptRef.current;
        const originalTransform = element.style.transform;

        // Reset scale for capture to ensure high quality A4 PDF
        element.style.transform = 'scale(1)';

        try {
            // Capture High Res
            const canvas = await html2canvas(element, {
                scale: 3,
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png', 1.0);

            // A4 Dimensions: 210mm x 297mm
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            // const pdfHeight = pdf.internal.pageSize.getHeight();

            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

            // Render maintaining aspect ratio
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight, undefined, 'FAST');

            pdf.save(`Recibo_${receipt.number}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Erro ao gerar PDF');
        } finally {
            // Restore scale
            element.style.transform = originalTransform;
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex flex-col items-center bg-gray-900/50 backdrop-blur-md overflow-y-auto pt-10 pb-10">
            {/* Controls */}
            <div className="w-full max-w-[210mm] flex justify-center md:justify-end gap-3 mb-8 px-4 md:px-0 z-10 relative">
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-white text-gray-700 font-bold rounded-lg shadow-sm hover:bg-gray-50 text-sm md:text-base"
                >
                    Fechar
                </button>
                <button
                    onClick={handleDownloadPDF}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-primary text-white font-bold rounded-lg shadow-lg hover:bg-primary/90 flex items-center gap-2 text-sm md:text-base"
                >
                    <span className="material-symbols-outlined text-[20px]">download</span>
                    {isGenerating ? 'Gerando...' : 'Baixar PDF'}
                </button>
            </div>

            <div className="relative w-full flex justify-center overflow-hidden md:overflow-visible pb-20 md:pb-0">
                <div
                    ref={receiptRef}
                    className="bg-white w-[210mm] h-[297mm] min-w-[210mm] min-h-[297mm] shrink-0 shadow-2xl relative text-navy flex flex-col p-[15mm] overflow-hidden box-border transform scale-[0.45] md:scale-100 origin-top transition-transform duration-300"
                >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-8 border-b-2 border-navy pb-4">
                        <div className="w-1/2">
                            <div className="flex items-center gap-3 mb-2">
                                <img src="/assets/coroapreta.png" alt="Empire Logo" className="h-12 w-auto object-contain" />
                                <div>
                                    <h1 className="text-xl font-bold tracking-widest uppercase text-navy">Empire</h1>
                                    <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500">Trajes Finos</p>
                                </div>
                            </div>
                            <div className="text-xs text-gray-500 mt-2">
                                {storeSettings?.store_address && <p>{storeSettings.store_address}</p>}
                                {storeSettings?.store_phone && <p>Tel: {storeSettings.store_phone}</p>}
                                <p>CNPJ: {storeSettings?.store_cnpj || '99.999.999/9999-99'}</p>
                            </div>
                        </div>
                        <div className="text-right w-1/2">
                            <h2 className="text-3xl font-bold text-navy tracking-tight mb-2 uppercase">Recibo de Pagamento</h2>
                            <div className="bg-navy/5 p-2 rounded inline-block min-w-[150px] text-center mt-2 border border-navy/10">
                                <p className="text-xs font-bold text-gray-500 uppercase">Número</p>
                                <p className="text-xl font-mono font-bold text-navy">#{receipt.number.toString().padStart(6, '0')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Value Highlight */}
                    <div className="bg-gray-50 border border-gray-200 p-6 mb-8 flex justify-between items-center rounded-lg shadow-sm">
                        <div>
                            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Valor Total</p>
                            <p className="text-4xl font-bold text-navy">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receipt.value)}
                            </p>
                        </div>
                        <div className="w-2/3 text-right">
                            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Valor por Extenso</p>
                            <p className="text-lg italic text-gray-700 font-medium capitalize">
                                ({numberToExtenso(receipt.value)})
                            </p>
                        </div>
                    </div>

                    {/* Legal Text Body */}
                    <div className="mb-8 text-lg leading-relaxed text-justify text-gray-800">
                        <p>
                            <strong>Recebemos de</strong> <span className="uppercase font-bold px-1">{receipt.clientName}</span>
                            {receipt.clientDoc && <>, inscrito(a) no CPF/CNPJ sob o nº <span className="font-mono text-base">{receipt.clientDoc}</span>,</>}
                            &nbsp;a importância supramencionada de <span className="font-bold">{numberToExtenso(receipt.value)}</span>.
                        </p>
                        <p className="mt-4">
                            <strong>Referente a:</strong> {receipt.concept}.
                        </p>
                        <p className="mt-6 text-base text-gray-500 italic">
                            Para maior clareza, firmamos o presente recibo para que produza os seus efeitos legais, dando plena e rasa quitação da importância recebida.
                        </p>
                    </div>

                    {/* Payment Details */}
                    <div className="mb-8 border-t border-b border-gray-100 py-4">
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Pagamento realizado via</p>
                        <div className="flex gap-6 flex-wrap">
                            {['Dinheiro', 'Pix', 'Crédito', 'Débito', 'Transferência'].map((method) => {
                                const isSelected = receipt.paymentMethod.toLowerCase() === method.toLowerCase() ||
                                    (method === 'Transferência' && receipt.paymentMethod.toLowerCase().includes('transferencia'));
                                return (
                                    <div key={method} className="flex items-center gap-2">
                                        <div className={`size-5 border-2 rounded flex items-center justify-center ${isSelected ? 'border-navy bg-navy' : 'border-gray-300'}`}>
                                            {isSelected && (
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                                                    <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </div>
                                        <span className={`${isSelected ? 'text-navy font-bold' : 'text-gray-500'}`}>
                                            {method}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex-1"></div>

                    {/* Date and Signatures */}
                    <div className="mb-8">
                        <p className="text-right text-lg text-gray-700 mb-16">
                            {storeSettings?.store_address ? storeSettings.store_address.split(',')[0] : 'Belém'}, {new Date(receipt.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.
                        </p>

                        <div className="grid grid-cols-2 gap-20">
                            <div className="text-center">
                                <div className="border-b border-navy mb-3"></div>
                                <p className="font-bold text-sm text-navy uppercase tracking-wider">{storeSettings?.store_name || 'Empire Trajes Finos'}</p>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Beneficiário (CNPJ: {storeSettings?.store_cnpj || '00.000.000/0001-00'})</p>
                            </div>
                            <div className="text-center opacity-70">
                                <div className="border-b border-gray-400 mb-3"></div>
                                <p className="font-bold text-sm text-gray-700 uppercase tracking-wider">{receipt.clientName}</p>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Pagador (Assinatura)</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
