import React, { useState, useRef } from 'react';
import { Contract, Client, Item } from '../types';
import { useApp } from '../contexts/AppContext';
import SignatureModal from './SignatureModal';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const LEGACY_FIELDS = [
    { k: 'height', l: 'Altura' },
    { k: 'weight', l: 'Peso' },
    { k: 'shoeSize', l: 'Sapato' },
    { k: 'shirtSize', l: 'Camisa' },
    { k: 'pantsSize', l: 'Calça' },
    { k: 'jacketSize', l: 'Paletó' },
    { k: 'chest', l: 'Tórax' },
    { k: 'waist', l: 'Cintura' },
    { k: 'hips', l: 'Quadril' },
    { k: 'shoulder', l: 'Ombro' },
    { k: 'sleeve', l: 'Manga' },
    { k: 'inseam', l: 'Gancho' },
    { k: 'neck', l: 'Colarinho' }
];

const DEBUTANTE_FIELDS = [
    { k: 'busto', l: 'Busto' },
    { k: 'abBusto', l: 'AB. Busto' },
    { k: 'cintura', l: 'Cintura' },
    { k: 'quadril', l: 'Quadril' },
    { k: 'altQuadril', l: 'Alt. Quadril' },
    { k: 'ombro', l: 'Ombro' },
    { k: 'manga', l: 'Manga' },
    { k: 'cava', l: 'Cava' },
    { k: 'frente', l: 'Frente' },
    { k: 'costa', l: 'Costa' },
    { k: 'comprBlusa', l: 'Compr. Blusa' },
    { k: 'comprSaia', l: 'Compr. Saia' },
    { k: 'comprShort', l: 'Compr. Short' },
    { k: 'comprManga', l: 'Compr. Manga' },
    { k: 'colarinho', l: 'Colarinho' },
    { k: 'largBraco', l: 'Larg. Braço' },
    { k: 'punho', l: 'Punho' }
];

const COMMON_FIELDS = [
    { k: 'busto', l: 'Busto' },
    { k: 'abBusto', l: 'Abaix. Busto' },
    { k: 'cintura', l: 'Cintura' },
    { k: 'terno', l: 'Terno' },
    { k: 'cm', l: 'CM' },
    { k: 'calca', l: 'Calça' },
    { k: 'cc', l: 'CC' },
    { k: 'height', l: 'Altura' }, { k: 'weight', l: 'Peso' }, { k: 'shoeSize', l: 'Sapato' }
];

interface PrintableContractProps {
    contract: Contract;
    client: Client;
    items: Item[];
    onClose: () => void;
}

export default function PrintableContract({ contract, client, items, onClose }: PrintableContractProps) {
    const { updateContract, storeSettings } = useApp();
    const [isGenerating, setIsGenerating] = useState(false);
    const documentRef = useRef<HTMLDivElement>(null);

    const handleDownloadPDF = async () => {
        if (!documentRef.current) return;

        setIsGenerating(true);
        try {
            const element = documentRef.current;

            // Force fixed width during capture
            const originalWidth = element.style.width;
            const originalMaxWidth = element.style.maxWidth;
            const originalPosition = element.style.position;
            const originalLeft = element.style.left;
            const originalHeight = element.style.height;

            element.style.width = '210mm';
            element.style.maxWidth = 'none';
            element.style.position = 'absolute';
            element.style.left = '-10000px'; // Hide off-screen during capture
            element.style.height = 'auto';

            const canvas = await html2canvas(element, {
                scale: 3,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: 1024, // Virtual window width to force desktop layout
                scrollY: -window.scrollY,
                x: 0,
                y: 0
            });

            element.style.width = originalWidth;
            element.style.maxWidth = originalMaxWidth;
            element.style.position = originalPosition;
            element.style.left = originalLeft;
            element.style.height = originalHeight;

            const imgData = canvas.toDataURL('image/png', 1.0);

            // Proporções oficiais A4 (mm)
            const pageWidth = 210;
            const pageHeight = 297;

            const pdf = new jsPDF('p', 'mm', 'a4');

            // Redimensionamento inteligente para encaixar na folha sem distorcer (espremer)
            const widthRatio = pageWidth / canvas.width;
            const heightRatio = pageHeight / canvas.height;
            const ratio = Math.min(widthRatio, heightRatio); // Respeita o limite do menor eixo

            const imgWidth = canvas.width * ratio;
            const imgHeight = canvas.height * ratio;

            // Centraliza o conteúdo na folha final
            const x = (pageWidth - imgWidth) / 2;
            const y = (pageHeight - imgHeight) / 2;

            pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight, undefined, 'FAST');

            pdf.save(`Contrato_${contract.id.split('-').pop()?.toUpperCase() || 'Empire'}.pdf`);
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            alert('Erro ao gerar o PDF. Tente novamente.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[99999] flex flex-col items-center bg-gray-100/95 backdrop-blur-md overflow-y-auto no-scrollbar print:bg-white print:overflow-visible">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { size: A4; margin: 0; }
                    body { visibility: hidden; }
                    .print-controls { display: none !important; }
                    #contract-document { 
                        visibility: visible; 
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        width: 210mm !important;
                        min-height: 297mm !important;
                        margin: 0 !important;
                        padding: 15mm !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                }
            ` }} />
            {/* Print Overlay Controls */}
            <div className="sticky top-0 w-full flex justify-end gap-3 p-4 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm z-[101] shrink-0 print-controls">
                <button
                    onClick={onClose}
                    disabled={isGenerating}
                    className="px-4 h-10 bg-white text-gray-700 font-bold rounded-xl border border-gray-200 shadow-sm hover:bg-gray-50 active:scale-95 disabled:opacity-50 transition-all text-sm"
                >
                    Fechar
                </button>
                <button
                    onClick={handleDownloadPDF}
                    disabled={isGenerating}
                    className="px-4 h-10 bg-navy text-white font-bold rounded-xl shadow-lg shadow-navy/20 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2 text-sm"
                >
                    <span className="material-symbols-outlined text-lg">
                        {isGenerating ? 'sync' : 'download'}
                    </span>
                    {isGenerating ? 'Gerando PDF...' : 'Baixar Contrato (PDF)'}
                </button>
            </div>

            {/* A4 Paper Container - Minimalist Refined */}
            <div
                id="contract-document"
                ref={documentRef}
                className="bg-white w-full max-w-[210mm] min-h-[297mm] shadow-2xl p-6 md:p-6 text-navy font-serif leading-tight relative flex flex-col shrink-0 mb-8"
            >

                {/* Clean Typographic Header */}
                <div className="flex justify-between items-baseline border-b border-navy/20 pb-2 mb-4">
                    <div className="flex items-center gap-4">
                        <img src="/assets/coroapreta.png" alt="Empire Logo" className="h-16 w-auto object-contain" />
                        <div>
                            <h1 className="text-4xl font-serif tracking-tight text-navy">EMPIRE</h1>
                            <p className="text-[10px] uppercase tracking-[0.5em] text-black mt-1 font-sans font-black">Trajes Finos</p>
                        </div>
                    </div>
                    <div className="text-right font-sans">
                        <p className="text-[12px] font-black uppercase tracking-widest text-navy">{storeSettings?.store_name || 'Empire Trajes Finos'}</p>
                        <p className="text-[10px] text-black font-bold mt-1 tracking-wider uppercase">
                            {storeSettings?.store_cnpj || 'CNPJ: 52.377.689/0001-71'} <br />
                            {storeSettings?.store_phone || '(91) 98428-7746'} | {storeSettings?.store_instagram || '@empiretrajesfinos'}
                        </p>
                    </div>
                </div>

                {/* Document Title & Date */}
                <div className="flex justify-between items-center mb-3 pb-1 border-b-2 border-navy">
                    <h2 className="text-xl font-serif italic text-navy">
                        Contrato de {contract.contractType || 'Locação'} #{contract.number || contract.id.split('-').pop()?.toUpperCase()}
                        {contract.packageName && <span className="block text-xs font-sans not-italic font-black text-navy/40 uppercase tracking-widest mt-1">Pacote: {contract.packageName}</span>}
                    </h2>
                    <div className="text-right">
                        <p className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-black">Data: {new Date().toLocaleDateString('pt-BR')}</p>
                        {contract.eventDate && (
                            <p className="text-[11px] font-sans font-black uppercase tracking-[0.1em] text-navy mt-1 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 italic">
                                {contract.contractType === 'Venda' ? 'Data da Entrega: ' : 'Data do Evento: '}
                                {new Date(contract.eventDate).toLocaleDateString('pt-BR')}
                            </p>
                        )}
                    </div>
                </div>

                {/* Dynamic Content based on Event Type */}
                {contract.eventType === 'Debutante' ? (
                    <div className="space-y-2 mb-3 font-sans">
                        {/* Responsible Info */}
                        <section>
                            <h3 className="text-[10px] font-sans font-black uppercase tracking-[0.3em] text-black mb-1 border-b border-gray-100 pb-0.5">Informações sobre o(a) Responsável</h3>
                            <div className="grid grid-cols-3 gap-x-8 gap-y-1 text-[11px]">
                                <div className="col-span-2">
                                    <span className="text-[8px] font-black text-black uppercase block">Nome Completo</span>
                                    <p className="font-bold border-b border-gray-50 uppercase">{client.name}</p>
                                </div>
                                <div>
                                    <span className="text-[8px] font-black text-black uppercase block">CPF</span>
                                    <p className="font-bold border-b border-gray-50">{client.cpf || '___.___.___-__'}</p>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-[8px] font-black text-black uppercase block">Endereço</span>
                                    <p className="font-bold border-b border-gray-50 uppercase">{client.address || '________________________________'}</p>
                                </div>
                                <div>
                                    <span className="text-[8px] font-black text-black uppercase block">RG</span>
                                    <p className="font-bold border-b border-gray-50">{client.rg || '____________'}</p>
                                </div>
                                <div>
                                    <span className="text-[8px] font-black text-black uppercase block">Bairro</span>
                                    <p className="font-bold border-b border-gray-50 uppercase">{client.neighborhood || '__________'}</p>
                                </div>
                                <div>
                                    <span className="text-[8px] font-black text-black uppercase block">CEP</span>
                                    <p className="font-bold border-b border-gray-50">{client.zip || '_____-___'}</p>
                                </div>
                                <div>
                                    <span className="text-[8px] font-black text-black uppercase block">Contatos</span>
                                    <p className="font-bold border-b border-gray-50">{client.phone} {client.email && `| ${client.email}`}</p>
                                </div>
                                <div>
                                    <span className="text-[8px] font-black text-black uppercase block">Cidade</span>
                                    <p className="font-bold border-b border-gray-50 uppercase">{client.city || '__________'}</p>
                                </div>
                                <div>
                                    <span className="text-[8px] font-black text-black uppercase block">Estado</span>
                                    <p className="font-bold border-b border-gray-50 uppercase">{client.state || '__________'}</p>
                                </div>
                            </div>
                        </section>

                        {/* Debutante Info */}
                        <section>
                            <h3 className="text-[10px] font-sans font-black uppercase tracking-[0.3em] text-black mb-1 border-b border-gray-100 pb-0.5">Debutante</h3>
                            <div className="grid grid-cols-4 gap-x-8 gap-y-1 text-[11px]">
                                <div className="col-span-2">
                                    <span className="text-[8px] font-black text-black uppercase block">Nome / Contato</span>
                                    <p className="font-bold border-b border-gray-50 uppercase">{contract.debutanteDetails?.name || '________________'}</p>
                                </div>
                                <div className="col-span-1">
                                    <span className="text-[8px] font-black text-black uppercase block">Data Nasc.</span>
                                    <p className="font-bold border-b border-gray-50">{contract.debutanteDetails?.birthDate ? new Date(contract.debutanteDetails.birthDate).toLocaleDateString('pt-BR') : '__/__/____'}</p>
                                </div>
                                <div className="col-span-1">
                                    <span className="text-[8px] font-black text-black uppercase block">Tema</span>
                                    <p className="font-bold border-b border-gray-50 uppercase">{contract.debutanteDetails?.theme || '__________'}</p>
                                </div>
                                <div className="col-span-1">
                                    <span className="text-[8px] font-black text-black uppercase block">Cor Preferida</span>
                                    <p className="font-bold border-b border-gray-50 uppercase">{contract.debutanteDetails?.preferredColor || '__________'}</p>
                                </div>
                                <div className="col-span-1">
                                    <span className="text-[8px] font-black text-black uppercase block">Instagram</span>
                                    <p className="font-bold border-b border-gray-50 shrink-0">{contract.debutanteDetails?.instagram || '__________'}</p>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-[8px] font-black text-black uppercase block">Música Preferida</span>
                                    <p className="font-bold border-b border-gray-50 uppercase">{contract.debutanteDetails?.preferredMusic || '__________'}</p>
                                </div>
                                <div className="col-span-4">
                                    <span className="text-[8px] font-black text-black uppercase block">Local do Evento</span>
                                    <p className="font-bold border-b border-gray-50 uppercase">{contract.debutanteDetails?.eventLocation || '________________________________'}</p>
                                </div>
                            </div>
                        </section>

                        {/* Package Info */}
                        <section>
                            <h3 className="text-[10px] font-sans font-black uppercase tracking-[0.3em] text-black mb-1 border-b border-gray-100 pb-0.5">Pacote</h3>
                            <div className="flex flex-wrap gap-x-6 gap-y-1 text-[10px] items-center">
                                {[
                                    { label: '( 1 ) Traje Recepção', key: 'reception' },
                                    { label: '( 2 ) Traje Valsa', key: 'waltz' },
                                    { label: '( 3 ) Traje Balada', key: 'party' },
                                    { label: '( 4 ) Acessórios', key: 'accessories' },
                                    { label: '( 5 ) Traje Família', key: 'family' }
                                ].map((pkg) => (
                                    <div key={pkg.key} className="flex items-center gap-2">
                                        <div className={`size-3 border border-navy flex items-center justify-center font-bold text-[8px] ${contract.packageDetails?.[pkg.key as keyof typeof contract.packageDetails] ? 'bg-navy text-white' : 'bg-transparent text-transparent'}`}>X</div>
                                        <span className="font-bold uppercase tracking-tight">{pkg.label}</span>
                                    </div>
                                ))}
                                <div className="ml-auto flex items-center gap-4 border-l border-gray-200 pl-6 h-4">
                                    <span className="font-black text-[9px] uppercase tracking-widest text-black">Confecção Primeiro Aluguel:</span>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5">
                                            <div className={`size-3 border border-navy flex items-center justify-center font-bold text-[8px] ${contract.packageDetails?.firstRental ? 'bg-navy text-white' : ''}`}>
                                                {contract.packageDetails?.firstRental ? 'X' : ''}
                                            </div>
                                            <span className="font-bold uppercase tracking-tight italic">Sim</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className={`size-3 border border-navy flex items-center justify-center font-bold text-[8px] ${!contract.packageDetails?.firstRental ? 'bg-navy text-white' : ''}`}>
                                                {!contract.packageDetails?.firstRental ? 'X' : ''}
                                            </div>
                                            <span className="font-bold uppercase tracking-tight italic">Não</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 mb-4 font-sans">
                        <section>
                            <h3 className="text-[10px] font-sans font-black uppercase tracking-[0.3em] text-black mb-1.5 border-b border-gray-100 pb-0.5">I. Partes Contratantes</h3>
                            <div className="grid grid-cols-6 gap-2 text-[11px]">
                                <div className="col-span-3 md:col-span-4">
                                    <span className="text-[8px] font-black text-black uppercase block">Nome Completo</span>
                                    <p className="font-bold border-b border-gray-50 uppercase h-4">{client.name}</p>
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    <span className="text-[8px] font-black text-black uppercase block">CPF</span>
                                    <p className="font-bold border-b border-gray-50 h-4">{client.cpf || '___.___.___-__'}</p>
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    <span className="text-[8px] font-black text-black uppercase block">RG</span>
                                    <p className="font-bold border-b border-gray-50 h-4">{client.rg || '__________'}</p>
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    <span className="text-[8px] font-black text-black uppercase block">Data Nasc.</span>
                                    <p className="font-bold border-b border-gray-50 h-4">{client.birthDate ? new Date(client.birthDate).toLocaleDateString('pt-BR') : '__/__/____'}</p>
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    <span className="text-[8px] font-black text-black uppercase block">Fone</span>
                                    <p className="font-bold border-b border-gray-50 h-4">{client.phone}</p>
                                </div>

                                <div className="col-span-2 md:col-span-4">
                                    <span className="text-[8px] font-black text-black uppercase block">Endereço</span>
                                    <p className="font-bold border-b border-gray-50 uppercase h-4">{client.address || '________________________________'}</p>
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    <span className="text-[8px] font-black text-black uppercase block">CEP</span>
                                    <p className="font-bold border-b border-gray-50 h-4">{client.zip || '_____-___'}</p>
                                </div>

                                <div className="col-span-1 md:col-span-2">
                                    <span className="text-[8px] font-black text-black uppercase block">Bairro</span>
                                    <p className="font-bold border-b border-gray-50 uppercase h-4">{client.neighborhood || '__________'}</p>
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    <span className="text-[8px] font-black text-black uppercase block">Cidade</span>
                                    <p className="font-bold border-b border-gray-50 uppercase h-4">{client.city || '__________'}</p>
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    <span className="text-[8px] font-black text-black uppercase block">Estado</span>
                                    <p className="font-bold border-b border-gray-50 h-4">{client.state || 'UF'}</p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-[10px] font-sans font-black uppercase tracking-[0.3em] text-black mb-1.5 border-b border-gray-100 pb-0.5">II. Objeto e Período</h3>
                            <div className="grid grid-cols-6 gap-2 text-[11px]">
                                {contract.contractType === 'Venda' ? (
                                    <div className="col-span-6">
                                        <p className="font-bold border-b border-gray-50 h-4">VENDA DEFINITIVA DE TRAJES E/OU ACESSÓRIOS</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="col-span-1 md:col-span-2">
                                            <span className="text-[8px] font-black text-black uppercase block">Retirada</span>
                                            <p className="font-bold border-b border-gray-50 h-4">{new Date(contract.startDate).toLocaleDateString('pt-BR')} às {contract.startTime || '09:00'}</p>
                                        </div>
                                        <div className="col-span-1 md:col-span-2">
                                            <span className="text-[8px] font-black text-black uppercase block">Devolução</span>
                                            <p className="font-bold border-b border-gray-50 h-4">{new Date(contract.endDate).toLocaleDateString('pt-BR')} às {contract.endTime || '18:00'}</p>
                                        </div>
                                    </>
                                )}
                                <div className="col-span-1 md:col-span-2">
                                    <span className="text-[8px] font-black text-black uppercase block">Natureza</span>
                                    <p className="font-bold border-b border-gray-50 uppercase h-4">{contract.eventType || '-'}</p>
                                </div>

                                <div className="col-span-2 md:col-span-3">
                                    <span className="text-[8px] font-black text-black uppercase block">Evento / Local</span>
                                    <p className="font-bold border-b border-gray-50 uppercase h-4">{contract.eventLocation || '____________________'}</p>
                                </div>
                                <div className="col-span-1 md:col-span-3">
                                    <span className="text-[8px] font-black text-black uppercase block">Contato</span>
                                    <p className="font-bold border-b border-gray-50 uppercase h-4">{contract.contact || '__________'}</p>
                                </div>

                                <div className="col-span-2 md:col-span-4 flex items-center gap-6 pt-1">
                                    <div className="flex items-center gap-2">
                                        <div className={`size-3 rounded border border-navy flex items-center justify-center ${contract.guestRole === 'Anfitrião' ? 'bg-navy' : ''}`}>
                                            {contract.guestRole === 'Anfitrião' && <span className="text-white text-[8px] font-black">X</span>}
                                        </div>
                                        <span className="text-[9px] font-bold uppercase tracking-wider">Anfitrião</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`size-3 rounded border border-navy flex items-center justify-center ${contract.guestRole === 'Convidado' ? 'bg-navy' : ''}`}>
                                            {contract.guestRole === 'Convidado' && <span className="text-white text-[8px] font-black">X</span>}
                                        </div>
                                        <span className="text-[9px] font-bold uppercase tracking-wider">Convidado</span>
                                    </div>
                                    {contract.contractType === 'Aluguel' && (
                                        <div className="flex items-center gap-2 ml-4">
                                            <div className={`size-3 rounded border border-navy flex items-center justify-center ${contract.isFirstRental ? 'bg-navy' : ''}`}>
                                                {contract.isFirstRental && <span className="text-white text-[8px] font-black">X</span>}
                                            </div>
                                            <span className="text-[9px] font-bold uppercase tracking-wider">Confecção 1º Aluguel</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {/* Technical / Fitting Info Section */}
                {contract.contractType !== 'Venda' && (
                    <section className="mb-3 font-sans">
                        <h3 className="text-[10px] font-sans font-black uppercase tracking-[0.3em] text-black mb-1 border-b border-navy/10 pb-0.5 italic">III. Detalhes de Prova e Medidas</h3>
                        <div className="grid grid-cols-2 gap-8">
                            {/* Fitting Date */}
                            <div className="bg-gray-50/50 p-2 rounded border border-gray-100 flex justify-between items-center">
                                <div>
                                    <span className="text-[8px] font-black text-black uppercase block">Data e Hora da Prova</span>
                                    <p className="text-[12px] font-black text-navy uppercase tracking-tight">
                                        {contract.fittingDate ? new Date(contract.fittingDate.split('T')[0] + 'T00:00:00').toLocaleDateString('pt-BR') : '____/____/____'}
                                        {contract.fittingTime ? ` às ${contract.fittingTime}` : ' às ____:____'}
                                    </p>
                                </div>
                                <span className="material-symbols-outlined text-navy/20 text-xl">schedule</span>
                            </div>

                            {/* Measurements Table (Dynamic) */}
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-x-3 gap-y-1">
                                {((!client.profileType ? LEGACY_FIELDS : (client.profileType === 'Debutante' ? DEBUTANTE_FIELDS : COMMON_FIELDS))).map((m) => (
                                    <div key={m.k} className="border-b border-gray-100 flex flex-col">
                                        <span className="text-[6.5px] font-black text-gray-400 uppercase leading-none truncate">{m.l}</span>
                                        <span className="text-[9px] font-black text-navy h-3">{contract.measurements?.[m.k] || '____'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* Items Table - Minimalist Table */}
                <section className="mb-3">
                    <h3 className="text-[10px] font-sans font-black uppercase tracking-[0.3em] text-black italic">IV. Itens e Valores</h3>
                    <table className="w-full text-left font-sans border-collapse">
                        <thead>
                            <tr className="border-b border-navy">
                                <th className="py-3 font-black uppercase text-[10px] tracking-widest text-black">Descrição do Item</th>
                                <th className="py-3 font-black uppercase text-[10px] tracking-widest text-navy/40 text-center">Tipo</th>
                                <th className="py-3 font-black uppercase text-[10px] tracking-widest text-navy/40 text-center">Tamanho</th>
                                <th className="py-3 font-black uppercase text-[10px] tracking-widest text-navy/40 text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 italic">
                            {items.map((item, i) => (
                                <tr key={i}>
                                    <td className="py-1 font-bold text-navy uppercase">{item.name}</td>
                                    <td className="py-1 text-center text-[10px] font-black uppercase text-gray-400">{item.type}</td>
                                    <td className="py-1 font-bold text-navy text-center text-sm">{item.size}</td>
                                    <td className="py-1 text-right font-black">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                            (contract.saleItems?.includes(item.id) ? (item.salePrice || item.price) : item.price) || 0
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="border-t-2 border-navy">
                            <tr>
                                <td colSpan={3} className="py-4">
                                    <div className="flex flex-row justify-between items-center gap-6 font-sans">
                                        {/* Total Geral */}
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-black">Total {contract.contractType === 'Venda' ? 'da Venda' : 'do Contrato'}:</span>
                                            <span className="text-lg font-black text-navy">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.totalValue)}</span>
                                        </div>

                                        {/* Adiantamento / Pago */}
                                        <div className="flex items-baseline gap-2 opacity-60">
                                            <span className="text-[8px] font-bold uppercase tracking-widest text-black">
                                                {contract.contractType === 'Venda' ? 'Valor Pago:' : `Reserva (${contract.paymentMethod || 'Pix'}):`}
                                            </span>
                                            <span className="text-[12px] font-black italic">
                                                -{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.paidAmount || 0)}
                                            </span>
                                        </div>

                                        {/* Saldo Pendente */}
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-[9px] font-black uppercase tracking-tighter text-red-600">
                                                {contract.contractType === 'Venda' ? 'Saldo Pendente:' : 'Saldo na Retirada:'}
                                            </span>
                                            <span className="text-xl font-black text-red-600">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.balance ?? (contract.totalValue - (contract.paidAmount || 0)))}
                                            </span>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </section>

                {/* Delivery & Return Policy */}
                {contract.contractType === 'Aluguel' ? (
                    <section className="mb-2 border-t border-gray-100 pt-0.5">
                        <h3 className="text-[10px] font-sans font-black uppercase tracking-[0.3em] text-black mb-0 px-1 italic">V. Entrega e Devolução</h3>
                        <p className="text-[7.5px] leading-tight text-black text-justify font-sans px-1">
                            O traje será entregue lavado, passado, ajustado e embalado em capa e na cruzeta. Proibido fazer ajustes. Proibido usar ferro elétrico. Proibido lavar. Deve ser devolvido sem danos. Perda, extravio ou dano do objeto será cobrado o valor equivalente ao mesmo. Atrasos na devolução será cobrado multa por dia de atraso. Caso ocorra alguma eventualidade quanto ao prazo de retirada ou devolução do traje, é obrigação informar antecipação. Antecipação de Retirada será cobrado taxa.
                        </p>
                    </section>
                ) : (
                    <section className="mb-2 border-t border-gray-100 pt-0.5">
                        <h3 className="text-[10px] font-sans font-black uppercase tracking-[0.3em] text-black mb-0 px-1 italic">V. Entrega da Venda</h3>
                        <p className="text-[7.5px] leading-tight text-black text-justify font-sans px-1">
                            A mercadoria acima descrita é vendida em caráter definitivo. Após a entrega e conferência pelo comprador, a Empire Trajes Finos não se responsabiliza por danos causados por uso inadequado, lavagem incorreta ou armazenamento impróprio pelo cliente. Não aceitamos devoluções de peças de venda após a saída do estabelecimento.
                        </p>
                    </section>
                )}

                {/* Observations (NEW) */}
                {contract.observations && (
                    <section className="mb-2 border border-blue-50 bg-blue-50/20 p-1.5 rounded">
                        <h3 className="text-[8px] font-sans font-black uppercase tracking-widest text-blue-900 mb-0.5">Observações Adicionais</h3>
                        <p className="text-[8.5px] font-bold text-blue-900 leading-tight italic">{contract.observations}</p>
                    </section>
                )}

                {/* Legal Clauses - Modern Legal Typography */}
                <section className="mb-2 border-t border-gray-100 pt-0.5">
                    <h3 className="text-[10px] font-sans font-black uppercase tracking-[0.3em] text-black mb-0.5 px-1 italic">VI. Cláusulas e Condições Gerais</h3>
                    <div className="text-[7.5px] leading-[1.4] text-black text-justify font-sans space-y-2">
                        {contract.contractType === 'Aluguel' ? (
                            <>
                                <p><span className="font-black text-navy">1.1</span> A LOCAÇÃO É FIRMADA MEDIANTE A ENTRADA DE 50% DO VALOR DO SERVIÇO NO QUE SE REFERE A RESERVA, AOS AJUSTES, À LAVAGEM E À ORGANIZAÇÃO DO MESMO. TRATANDO-SE DE CONFECÇÃO DE PRIMEIRO ALUGUEL, O VALOR DE ENTRADA 60% DO VALOR ORÇADO.</p>
                                <p><span className="font-black text-navy">1.2</span> EM CASO DE DESISTÊNCIA OU TROCA DO TRAJE RESERVADO, O VALOR DE ENTRADA NÃO SERÁ ESTORNADO, POIS REFERE-SE A CLAUSULA 1.1, GERANDO MULTA PELA DESISTÊNCIA. PODENDO SER DESCONTADA NO VALOR DA ENTRADA.</p>
                                <p><span className="font-black text-navy">1.3</span> EM CASO DE MUDANÇA DE DATA DA LOCAÇÃO, O VALOR FICA RETIDO COMO RESERVA PARA PRÓXIMO ALUGUEL COM PRAZO DE LIMITE NO PERÍODO ANUAL VIGENTE.</p>
                                <p><span className="font-black text-navy">1.4</span> QUALQUER ALTERAÇÃO SOLICITADA NO TRAJE E/OU CONFECÇÃO, SERÁ COBRADO VALOR ADICIONAL.</p>
                                <p><span className="font-black text-navy">1.5</span> A PROVA É OBRIGATÓRIA ANTES DA RETIRADA DO TRAJE. DEVE SER MARCADA NO PERÍODO DE FUNCIONAMENTO DO ESTABELECIMENTO. SE O LOCATÁRIO ALEGAR INDISPONIBILIDADE DE HORÁRIO PARA A REALIZAÇÃO DA PROVA, O TRAJE NÃO PODERÁ SER RETIRADO. AJUSTE ADICIONAL SERÁ COBRADO.</p>
                                <p><span className="font-black text-navy">1.6</span> A DEVOLUÇÃO DO TRAJE DEVERÁ SER FEITA NA DATA DEFINIDA PELO ESTABELECIMENTO. O ATRASO IMPLICARÁ NA COBRANÇA DE MULTA POR ATRASO. E O VALOR COBRADO PODERÁ SER MULTA POR DIA OU VALOR DE ALUGUEL, DEPENDENDO DA OCORRÊNCIA.</p>
                                <p><span className="font-black text-navy">1.7</span> O TRAJE OS ITENS QUE OS ACOMPANHAM DEVERÃO SER DEVOLVIDOS COM O MESMO ESTADO DE CONSERVAÇÃO QUE FOI ENTREGUE. EM CASO DE DANO, SERÁ COBRADO O VALOR DO DANO E/OU DO ITEM. SE O PRODUTO FOR EXTRAVIADO OU IRREPARÁVEL, SERÁ COBRADO O VALOR TOTAL DO PRODUTO.</p>
                                <p><span className="font-black text-navy">1.8</span> AUTORIZO A EMPIRE TRAJES FINOS FAZER USO DE MINHA IMAGEM EM MATERIAIS DE MARKETING ON LINE E IMPRESSO DA EMPRESA.</p>
                            </>
                        ) : (
                            <>
                                <p><span className="font-black text-navy">1.1</span> A VENDA É FIRMADA EM CARÁTER DE DEFINITIVIDADE. O PAGAMENTO INTEGRAL DEVE SER REALIZADO NO ATO DA COMPRA OU CONFORME ACORDADO PREVIAMENTE.</p>
                                <p><span className="font-black text-navy">1.2</span> EM CASO DE DESISTÊNCIA DA COMPRA ANTES DA ENTREGA DA MERCADORIA, A EMPIRE TRAJES FINOS RESERVA-SE O DIREITO DE COBRAR MULTA DE 20% DO VALOR TOTAL PARA CUSTEOS OPERACIONAIS.</p>
                                <p><span className="font-black text-navy">1.3</span> NÃO SERÃO ACEITAS DEVOLUÇÕES OU TROCAS DE MERCADORIAS APÓS A SAÍDA DO ESTABELECIMENTO, UMA VEZ QUE O COMPRADOR TEVE A OPORTUNIDADE DE CONFERIR A INTEGRIDADE DO PRODUTO NO ATO DA ENTREGA.</p>
                                <p><span className="font-black text-navy">1.4</span> QUALQUER AJUSTE SOLICITADO EM PEÇAS DE VENDA FORA DO ACORDADO INICIALMENTE SERÁ COBRADO À PARTE.</p>
                                <p><span className="font-black text-navy">1.5</span> A EMPIRE TRAJES FINOS NÃO SE RESPONSABILIZA POR MAL USO, LAVAGEM INCORRETA OU ALTERAÇÕES FEITAS POR TERCEIROS NAS PEÇAS VENDIDAS.</p>
                                <p><span className="font-black text-navy">1.6</span> AUTORIZO A EMPIRE TRAJES FINOS FAZER USO DE MINHA IMAGEM EM MATERIAIS DE MARKETING ON LINE E IMPRESSO DA EMPRESA.</p>
                            </>
                        )}
                    </div>
                </section>

                {/* Signatures Area - Anchored Bottom */}
                <div className="mt-auto grid grid-cols-2 gap-8 pt-2">
                    <div className="text-center">
                        <div className="h-14 flex items-center justify-center mb-1">
                            {contract.attendantSignature && (
                                <img src={contract.attendantSignature} alt="Assinatura Locador" className="h-full w-auto object-contain" />
                            )}
                        </div>
                        <p className="border-t border-navy w-full mb-1"></p>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-navy">Empire Trajes Finos</p>
                        <p className="text-[8px] font-bold text-black uppercase tracking-widest">{contract.contractType === 'Venda' ? 'Vendedor' : 'Contratada / Locador'}</p>
                    </div>

                    <div className="text-center">
                        <div className="h-14 flex items-center justify-center mb-1">
                            {contract.lesseeSignature && (
                                <img src={contract.lesseeSignature} alt="Assinatura Contratante" className="h-full w-auto object-contain" />
                            )}
                        </div>
                        <div className="border-t border-navy w-full mb-1"></div>
                        <p className="text-[10px] font-black uppercase tracking-tighter text-navy">{client.name}</p>
                        <p className="text-[8px] font-bold text-black uppercase tracking-widest">{contract.contractType === 'Venda' ? 'Comprador' : 'Contratante / Locatário'}</p>
                    </div>
                </div>

            </div>
        </div>
    );
}
