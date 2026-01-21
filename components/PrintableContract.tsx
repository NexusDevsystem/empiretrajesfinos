import React, { useState } from 'react';
import { Contract, Client, Item } from '../types';
import { useApp } from '../contexts/AppContext';
import SignatureModal from './SignatureModal';

interface PrintableContractProps {
    contract: Contract;
    client: Client;
    items: Item[];
    onClose: () => void;
}

export default function PrintableContract({ contract, client, items, onClose }: PrintableContractProps) {
    // Current Date for signature
    const today = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    const { updateContract, storeSettings } = useApp();
    const [showSigModal, setShowSigModal] = useState(false);
    const [sigType, setSigType] = useState<'lessee' | 'attendant'>('lessee');

    const handleOpenSig = (type: 'lessee' | 'attendant') => {
        setSigType(type);
        setShowSigModal(true);
    };

    const handleSaveSig = (data: string) => {
        if (sigType === 'lessee') {
            updateContract(contract.id, { lesseeSignature: data });
        } else {
            updateContract(contract.id, { attendantSignature: data });
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center py-8 bg-gray-100/90 backdrop-blur-sm overflow-auto print-only print:p-0 print:block print:bg-white print:overflow-visible">
            {/* Print Overlay Controls (Hidden on Print) */}
            <div className="fixed top-4 right-4 flex gap-4 print:hidden z-50">
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-white text-gray-700 font-bold rounded-lg shadow-lg hover:bg-gray-100"
                >
                    Fechar
                </button>
                <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-primary text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 flex items-center gap-2"
                >
                    <span className="material-symbols-outlined">print</span>
                    Imprimir
                </button>
            </div>

            {/* A4 Paper Container */}
            <div className="bg-white w-[210mm] min-w-[210mm] px-[12mm] py-[6mm] shadow-2xl print:shadow-none print:!m-0 print:!w-full print:!min-w-0 print:!max-w-full print:!p-[6mm] text-navy font-serif leading-normal relative text-[13px] flex flex-col">

                {/* Header */}
                <header className="flex justify-between items-start border-b border-navy pb-2 mb-2">
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter text-navy leading-none">Empire</h1>
                        <p className="text-gold font-bold uppercase tracking-[0.3em] text-[10px] mt-0.5">Trajes Finos</p>
                    </div>
                    <div className="text-right text-[11px] text-navy/60 font-medium leading-tight">
                        <p className="font-bold text-navy text-[12px] mb-0.5">{storeSettings?.store_name || 'Empire Trajes Finos'}</p>
                        <p>{storeSettings?.store_cnpj ? `CNPJ: ${storeSettings.store_cnpj}` : 'CNPJ: 52.377.689/0001-71'}</p>
                        <p>{storeSettings?.store_phone || '(91) 98428-7746'}</p>
                        <p>{storeSettings?.store_instagram || '@empiretrajesfinos'}</p>
                    </div>
                </header>

                <div className="flex-grow">
                    {/* Contract Info Sub-header */}
                    <div className="flex justify-between items-center mb-2">
                        <p className="font-black text-lg text-navy uppercase tracking-tighter">Contrato {contract.id ? `#${contract.id.toUpperCase().replace('#', '')}` : ''}</p>
                        <p className="text-navy/60 text-[10px] uppercase font-bold">Emissão: {new Date().toLocaleDateString('pt-BR')}</p>
                    </div>

                    {/* 1. Identification */}
                    <section className="mb-2">
                        <h2 className="text-[12px] font-black uppercase text-navy border-l-2 border-gold pl-2 mb-2 tracking-wide">1. Identificação do Locatário</h2>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                            <p><span className="font-black text-navy/50 text-[11px] uppercase">Nome:</span> <span className="uppercase font-bold">{client.name}</span></p>
                            <p><span className="font-black text-navy/50 text-[11px] uppercase">Documento (CPF):</span> <span className="font-bold">{client.cpf || '___.___.___-__'}</span></p>
                            <p><span className="font-black text-navy/50 text-[11px] uppercase">Telefone:</span> <span className="font-bold">{client.phone}</span></p>
                            <p><span className="font-black text-navy/50 text-[11px] uppercase">Email:</span> <span className="font-bold lowercase">{client.email}</span></p>
                            <div className="col-span-2">
                                <p><span className="font-black text-navy/50 text-[11px] uppercase">Endereço:</span> <span className="font-bold uppercase">{client.address || '____________________________________________________'}</span></p>
                            </div>
                        </div>
                    </section>

                    {/* 1.1 Measurements (Medidas) */}
                    {client.measurements && (
                        <section className="mb-2">
                            <h2 className="text-[11px] font-bold uppercase text-navy/60 mb-1 pl-2">1.1 Medidas</h2>
                            <div className="grid grid-cols-5 gap-x-3 gap-y-1 text-[11px] bg-gray-50/50 p-2 rounded border border-gray-100 italic">
                                {Object.entries(client.measurements).map(([key, value]) => {
                                    const translations: Record<string, string> = {
                                        height: 'Altura',
                                        weight: 'Peso',
                                        shoeSize: 'Sapato',
                                        shirtSize: 'Camisa',
                                        pantsSize: 'Calça',
                                        jacketSize: 'Paletó',
                                        chest: 'Tórax',
                                        waist: 'Cintura',
                                        hips: 'Quadril',
                                        shoulder: 'Ombro',
                                        sleeve: 'Manga',
                                        inseam: 'Gancho',
                                        neck: 'Pescoço'
                                    };
                                    const label = translations[key] || key;
                                    return value && (
                                        <p key={key} title={label} className="truncate">
                                            <span className="font-bold uppercase text-navy/40 text-[9px] not-italic">{label}:</span> {value}
                                        </p>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* 2. Rental Items */}
                    <section className="mb-3">
                        <h2 className="text-[12px] font-black uppercase text-navy border-l-2 border-gold pl-2 mb-2 tracking-wide">2. Detalhes da Locação</h2>
                        <div className="flex justify-between mb-2 text-[12px] bg-gray-50 p-3 rounded border border-gray-100">
                            <div>
                                <span className="text-[10px] text-navy/40 uppercase font-black block leading-none mb-0.5">Retirada</span>
                                <span className="font-black text-navy">{new Date(contract.startDate).toLocaleDateString('pt-BR')} {contract.startTime || '09:00'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-navy/40 uppercase font-black block leading-none mb-0.5">Devolução</span>
                                <span className="font-black text-navy">{new Date(contract.endDate).toLocaleDateString('pt-BR')} {contract.endTime || '18:00'}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] text-navy/40 uppercase font-black block leading-none mb-0.5">Evento</span>
                                <span className="uppercase font-black text-gold">{contract.eventType || '-'}</span>
                            </div>
                        </div>

                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b-2 border-navy">
                                    <th className="py-1 font-black uppercase text-[10px] text-navy/50 w-24">SKU / Ref</th>
                                    <th className="py-1 font-black uppercase text-[10px] text-navy/50">Item</th>
                                    <th className="py-1 font-black uppercase text-[10px] text-navy/50 text-center w-16">Tam.</th>
                                    <th className="py-1 font-black uppercase text-[10px] text-navy/50 text-right w-24">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {items.map((item, i) => (
                                    <tr key={i}>
                                        <td className="py-2.5 font-mono text-[11px] text-navy/30"></td>
                                        <td className="py-2.5 font-black text-navy uppercase text-[13px] tracking-tight">{item.name}</td>
                                        <td className="py-2.5 font-black text-primary text-xl text-center">{item.size}</td>
                                        <td className="py-2.5 text-right font-bold text-[14px] tracking-tighter">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price || 0)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="border-t-2 border-navy/10">
                                <tr>
                                    <td colSpan={3} className="pt-2 text-right text-[11px] text-navy/40 uppercase font-bold">Total:</td>
                                    <td className="pt-2 text-right text-xl text-navy font-black">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.totalValue)}
                                    </td>
                                </tr>

                                <tr className="text-emerald-700">
                                    <td colSpan={3} className="py-0.5 text-right text-[11px] uppercase font-bold">
                                        Entrada ({contract.paymentMethod || 'Pix'}):
                                    </td>
                                    <td className="py-0.5 text-right text-base font-black">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.paidAmount || 0)}
                                    </td>
                                </tr>

                                <tr className="text-red-600 bg-red-50/50">
                                    <td colSpan={3} className="py-2 text-right text-[12px] font-black uppercase tracking-tight">
                                        Saldo a Pagar:
                                    </td>
                                    <td className="py-2 text-right text-2xl font-black border-b-2 border-red-200">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.balance ?? (contract.totalValue - (contract.paidAmount || 0)))}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </section>

                    {/* 3. Delivery & Return */}
                    <section className="mb-4 border border-navy/5 p-3 text-[11px] bg-gray-50 rounded-lg leading-snug">
                        <h3 className="font-black uppercase mb-1 text-navy text-[12px] border-b border-navy/5 pb-0.5 tracking-tight">Política de Entrega e Devolução</h3>
                        <p className="text-justify font-medium italic opacity-70">
                            O traje deve retornar lavado, ajustado e embalado. Proibido ajustes manuais, ferro ou lavagem doméstica. Danos/extravio cobrados pelo valor de reposição. Atrasos geram multa.
                        </p>
                    </section>

                    {/* 4. Clauses */}
                    <section className="mb-4">
                        <h2 className="text-[11px] font-black uppercase text-navy/40 mb-1.5">Cláusulas</h2>
                        <div className="text-[9px] space-y-1 text-navy/70 leading-tight">
                            <p><span className="font-bold text-navy">1.1</span> A locação é firmada mediante a entrada de 50% do valor do serviço no que se refere a reserva, aos ajustes, à lavagem e à organização/devolução. Tratando-se de confecção, o valor da entrada não será estornado, pois refere-se à cláusula 1.1, gerando multa pela desistência.</p>

                            <p><span className="font-bold text-navy">1.2</span> Em caso de desistência ou troca do traje reservado, o valor da entrada não será estornado, pois refere-se à cláusula 1.1, gerando multa pela desistência e perda do crédito no período de 1 ano.</p>

                            <p><span className="font-bold text-navy">1.3</span> Em caso de mudança de data da locação, o valor fica retido como reserva para próximo aluguel, com prazo de limite no período anual vigente.</p>

                            <p><span className="font-bold text-navy">1.4</span> Qualquer alteração solicitada no traje pós-confecção, será cobrado valor adicional.</p>

                            <p><span className="font-bold text-navy">1.5</span> Prova obrigatória. A retirada do traje deverá ter a marcação de período de funcionamento do estabelecimento. Se o locatário alegar indisponibilidade de horário para a realização da prova, o traje não poderá ser retirado. Ajuste adicional será cobrado.</p>

                            <p><span className="font-bold text-navy">1.6</span> A devolução do traje deverá ser feita na data definida pelo estabelecimento. O atraso implicará na cobrança de multa por dia de atraso. É o valor cobrado pela diária da locação. Dependendo da gravidade, será cobrada a multa de 100% do valor da locação, dependência e atraso e o valor cobrado poderá ser maior que a multa.</p>

                            <p><span className="font-bold text-navy">1.7</span> Os itens do traje que por ventura deverão ser devolvidos com o mesmo estado de conservação que foi entregue. Em caso de dano, será cobrado o valor do dano igual ao item ou estrutura que foi danificado. Caso não haja possibilidade de reparo, será cobrado o valor total do produto.</p>

                            <p><span className="font-bold text-navy">1.8</span> Autorizo a Empire Trajes Finos a fazer uso de minha imagem em materiais de marketing on-line e impressa da empresa.</p>
                        </div>
                    </section>
                </div>

                {/* Signs Section */}
                <section className="mt-2 pt-2 border-t border-gray-100">
                    <div className="flex justify-between items-end gap-16">
                        <div className="w-1/2 text-center flex flex-col items-center">
                            <div className="h-10 flex items-center justify-center w-full mb-1">
                                {contract.attendantSignature ? (
                                    <img src={contract.attendantSignature} alt="Assinatura" className="h-[35px] w-auto object-contain" onClick={() => handleOpenSig('attendant')} />
                                ) : (
                                    <button onClick={() => handleOpenSig('attendant')} className="text-[10px] font-bold uppercase text-primary border border-primary/10 px-3 py-1 rounded transition-all print:hidden">Assinar Loja</button>
                                )}
                            </div>
                            <div className="border-b border-navy w-full mb-1 opacity-20"></div>
                            <p className="text-[12px] font-black uppercase text-navy">Empire</p>
                        </div>

                        <div className="w-1/2 text-center flex flex-col items-center">
                            <div className="h-10 flex items-center justify-center w-full mb-1">
                                {contract.lesseeSignature ? (
                                    <img src={contract.lesseeSignature} alt="Assinatura" className="h-[35px] w-auto object-contain" onClick={() => handleOpenSig('lessee')} />
                                ) : (
                                    <button onClick={() => handleOpenSig('lessee')} className="text-[10px] font-bold uppercase text-primary border border-primary/10 px-3 py-1 rounded transition-all print:hidden">Assinar Cliente</button>
                                )}
                            </div>
                            <div className="border-b border-navy w-full mb-1 opacity-20"></div>
                            <p className="text-[12px] font-black uppercase text-navy">{client.name}</p>
                        </div>
                    </div>

                    {/* Final Document Footer */}
                    <div className="mt-1 text-center text-[9px] text-navy/30 font-mono italic">
                        Empire ERP • Documento Digital • {new Date().toLocaleString('pt-BR')}
                    </div>
                </section>

            </div>
            {/* Signature Modal */}
            <SignatureModal
                isOpen={showSigModal}
                onClose={() => setShowSigModal(false)}
                onSave={handleSaveSig}
                title={sigType === 'lessee' ? 'Assinatura do Cliente' : 'Assinatura do Atendente'}
            />
        </div>
    );
}
