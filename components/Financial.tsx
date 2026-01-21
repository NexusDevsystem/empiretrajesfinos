import React, { useMemo, useState } from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useApp } from '../contexts/AppContext';
import NewTransactionModal from './NewTransactionModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Financial() {
    const { contracts, transactions, clients } = useApp();
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

    const handleGenerateReport = () => {
        const doc = new jsPDF();
        const now = new Date();
        const dateStr = now.toLocaleDateString('pt-BR');
        const timeStr = now.toLocaleTimeString('pt-BR');

        // --- PDF STYLING & HEADER --- //
        doc.setFillColor(15, 23, 42); // Navy color
        doc.rect(0, 0, 210, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('EMPIRE TRAJES FINOS', 15, 20);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('RELATÓRIO FINANCEIRO EXECUTIVO', 15, 28);
        doc.text(`Gerado em: ${dateStr} às ${timeStr}`, 145, 28);

        // --- SUMMARY METRICS --- //
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Sumário Executivo', 15, 55);

        const currentMonthName = now.toLocaleString('pt-BR', { month: 'long' }).toUpperCase();

        autoTable(doc, {
            startY: 60,
            head: [['Descrição', 'Valor (BRL)']],
            body: [
                ['Faturamento Real (Entradas)', `R$ ${financialStats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
                ['Despesas Totais', `R$ ${financialStats.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
                ['Lucro Líquido Real', `R$ ${financialStats.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
                ['Contas a Receber (Pendente)', `R$ ${financialStats.pendingRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
                ['Margem de Lucro', `${financialStats.margin.toFixed(1)}%`],
            ],
            theme: 'striped',
            headStyles: { fillColor: [15, 23, 42] },
            styles: { fontSize: 10 }
        });

        // --- RECENT CASH FLOW --- //
        doc.text('Fluxo de Caixa Recente', 15, (doc as any).lastAutoTable.finalY + 15);

        const activityBody = recentActivity.map(t => [
            t.title,
            t.subtitle,
            t.type === 'income' ? 'Entrada' : 'Saída',
            `R$ ${t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        ]);

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 20,
            head: [['Título', 'Referência', 'Tipo', 'Valor']],
            body: activityBody,
            headStyles: { fillColor: [16, 185, 129] }, // Emerald for cash flow
            styles: { fontSize: 9 }
        });

        // --- ACCOUNTS RECEIVABLE --- //
        doc.text('Pendências (Contas a Receber)', 15, (doc as any).lastAutoTable.finalY + 15);

        const receivableBody = accountsReceivableList.map(r => [
            r.client,
            r.id,
            r.deadline,
            `R$ ${r.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        ]);

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 20,
            head: [['Cliente', 'Contrato', 'Vencimento', 'Saldo devedor']],
            body: receivableBody,
            headStyles: { fillColor: [234, 88, 12] }, // Orange for receivables
            styles: { fontSize: 9 }
        });

        // --- FOOTER --- //
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Página ${i} de ${pageCount} - Empire ERP Financial Suite`, 15, 285);
        }

        doc.save(`Relatorio_Financeiro_${dateStr.replace(/\//g, '-')}.pdf`);
    };

    // --- ANALYTICS LOGIC --- //

    const financialStats = useMemo(() => {
        // 1. Revenue from Contracts (Actual Paid Amount)
        const contractRevenue = contracts
            .filter(c => c.status !== 'Cancelado')
            .reduce((acc, c) => acc + (c.paidAmount || 0), 0);

        // 2. Revenue from Manual Transactions
        const manualRevenue = transactions
            .filter(t => t.type === 'income')
            .reduce((acc, t) => acc + t.amount, 0);

        const totalRevenue = contractRevenue + manualRevenue;

        // 3. Accounts Receivable (Balance from unfinished contracts)
        const pendingRevenue = contracts
            .filter(c => c.status !== 'Cancelado' && c.status !== 'Finalizado')
            .reduce((acc, c) => acc + (c.totalValue - (c.paidAmount || 0)), 0);

        // 4. Expenses from Manual Transactions
        const totalExpenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((acc, t) => acc + t.amount, 0);

        const netProfit = totalRevenue - totalExpenses;
        const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        return { totalRevenue, pendingRevenue, totalExpenses, netProfit, margin };
    }, [contracts, transactions]);

    // Chart Data (Last 6 Months)
    const chartData = useMemo(() => {
        const data = [];
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthKey = d.getMonth();
            const yearKey = d.getFullYear();

            // Contract Revenue for Month (Paid Amount)
            const monthlyContractRevenue = contracts
                .filter(c => {
                    const cDate = new Date(c.startDate);
                    return cDate.getMonth() === monthKey && cDate.getFullYear() === yearKey && c.status !== 'Cancelado';
                })
                .reduce((acc, c) => acc + (c.paidAmount || 0), 0);

            // Transaction Revenue for Month
            const monthlyManualRevenue = transactions
                .filter(t => {
                    const tDate = new Date(t.date);
                    return tDate.getMonth() === monthKey && tDate.getFullYear() === yearKey && t.type === 'income';
                })
                .reduce((acc, t) => acc + t.amount, 0);

            // Transaction Expenses for Month
            const monthlyExpenses = transactions
                .filter(t => {
                    const tDate = new Date(t.date);
                    return tDate.getMonth() === monthKey && tDate.getFullYear() === yearKey && t.type === 'expense';
                })
                .reduce((acc, t) => acc + t.amount, 0);

            const totalMonthRevenue = monthlyContractRevenue + monthlyManualRevenue;

            data.push({
                name: d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase(),
                Receita: totalMonthRevenue,
                Despesas: monthlyExpenses,
                Lucro: totalMonthRevenue - monthlyExpenses
            });
        }
        return data;
    }, [contracts, transactions]);

    // Combined Recent Transactions List
    const recentActivity = useMemo(() => {
        // Contract "Income" entries (Based on paidAmount)
        const contractEntries = contracts
            .filter(c => c.status !== 'Cancelado' && (c.paidAmount || 0) > 0)
            .map(c => ({
                id: c.id,
                title: `Contrato #${c.id.split('-')[1] || c.id}`,
                subtitle: new Date(c.startDate).toLocaleDateString('pt-BR') + ' (Entrada)',
                amount: c.paidAmount || 0,
                type: 'income',
                date: new Date(c.startDate),
                icon: 'receipt_long'
            }));

        // Manual Transactions
        const manualEntries = transactions.map(t => ({
            id: t.id,
            title: t.description,
            subtitle: new Date(t.date).toLocaleDateString('pt-BR'),
            amount: t.amount,
            type: t.type,
            date: new Date(t.date),
            icon: t.type === 'income' ? 'attach_money' : 'payments'
        }));

        return [...contractEntries, ...manualEntries]
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .slice(0, 10);
    }, [contracts, transactions]);

    // Accounts Receivable detailed list
    const accountsReceivableList = useMemo(() => {
        return contracts
            .filter(c => c.status !== 'Cancelado' && c.status !== 'Finalizado' && (c.totalValue - (c.paidAmount || 0)) > 0)
            .map(c => ({
                id: c.id,
                client: clients.find(cl => cl.id === c.clientId)?.name || 'Cliente',
                balance: c.totalValue - (c.paidAmount || 0),
                deadline: new Date(c.startDate).toLocaleDateString('pt-BR')
            }))
            .sort((a, b) => b.balance - a.balance)
            .slice(0, 10);
    }, [contracts, clients]);

    return (
        <div className="pb-10 md:pb-20 animate-in fade-in duration-700">
            {/* Header */}
            <div className="sticky top-0 z-40 mb-6 md:mb-8 -mx-4 md:-mx-8 px-4 md:px-8 py-3 md:py-4 bg-gray-50/80 backdrop-blur-xl border-b border-gray-200/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all">
                <div>
                    <h1 className="text-2xl md:text-4xl font-black text-navy tracking-tighter">
                        FINANCEIRO
                        <span className="text-transparent bg-clip-text bg-gradient-to-tr from-emerald-400 to-green-600">.</span>
                    </h1>
                    <p className="text-gray-400 font-medium text-xs md:text-sm tracking-wide mt-0.5">Gestão de caixa e lucratividade</p>
                </div>
                <div className="flex gap-2 md:gap-3 w-full sm:w-auto">
                    <button
                        onClick={handleGenerateReport}
                        className="flex-1 sm:flex-none h-9 md:h-10 px-3 md:px-4 rounded-xl bg-white border border-gray-200 text-navy text-[10px] md:text-xs font-bold hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm flex items-center justify-center gap-1.5 md:gap-2"
                    >
                        <span className="material-symbols-outlined text-base md:text-lg">download</span>
                        <span className="hidden sm:inline">Relatório</span>
                    </button>
                    <button
                        onClick={() => setIsTransactionModalOpen(true)}
                        className="flex-1 sm:flex-none h-9 md:h-10 px-3 md:px-4 rounded-xl bg-navy text-white text-[10px] md:text-xs font-bold hover:bg-navy/90 transition-all shadow-lg shadow-navy/20 flex items-center justify-center gap-1.5 md:gap-2"
                    >
                        <span className="material-symbols-outlined text-base md:text-lg">add</span>
                        <span>Lançar Despesa</span>
                    </button>
                </div>
            </div>

            {/* BENTO GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">

                {/* 1. KEY METRIC: Net Profit (Large Card) */}
                <div className="md:col-span-2 bg-gradient-to-br from-emerald-600 to-teal-800 rounded-2xl md:rounded-[32px] p-6 md:p-8 text-white relative overflow-hidden shadow-2xl shadow-emerald-500/20 group">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 transition-all group-hover:bg-white/15"></div>

                    <div className="relative z-10 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start">
                            <div className="p-2.5 md:p-3 bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl">
                                <span className="material-symbols-outlined text-xl md:text-2xl">account_balance_wallet</span>
                            </div>
                            <span className="bg-white/20 backdrop-blur px-2.5 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-bold border border-white/10">Cash Flow Real</span>
                        </div>

                        <div className="mt-6 md:mt-8">
                            <p className="text-emerald-100 font-medium text-xs md:text-sm uppercase tracking-widest mb-1">Lucro Líquido</p>
                            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-2">R$ {financialStats.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
                            <p className="text-emerald-200 text-xs md:text-sm font-medium flex flex-wrap items-center gap-2">
                                <span className="bg-emerald-400/20 px-1.5 py-0.5 rounded text-emerald-100 font-bold text-[10px] md:text-xs">{financialStats.margin.toFixed(1)}% de Margem</span>
                                <span className="text-[10px] md:text-sm">• Baseado em Entradas Realizadas</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. Monthly Goal (Progress Card) */}
                <div className="bg-white rounded-2xl md:rounded-[32px] p-6 md:p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 md:p-8 opacity-5">
                        <span className="material-symbols-outlined text-6xl md:text-8xl">flag</span>
                    </div>
                    <h3 className="text-navy font-bold text-base md:text-lg mb-4 md:mb-6 relative z-10">Meta Mensal</h3>

                    <div className="relative z-10">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-3xl md:text-4xl font-black text-navy">{Math.min(100, Math.round((financialStats.totalRevenue / 15000) * 100))}%</span>
                            <span className="text-[10px] md:text-xs font-bold text-gray-400 mb-1">Meta: R$ 15k</span>
                        </div>
                        <div className="h-3 md:h-4 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-navy to-primary rounded-full transition-all duration-1000"
                                style={{ width: `${Math.min(100, (financialStats.totalRevenue / 15000) * 100)}%` }}
                            ></div>
                        </div>
                        <p className="text-[10px] md:text-xs text-gray-400 mt-3 md:mt-4 text-center">Referente apenas a <strong>faturamento realizado</strong>.</p>
                    </div>
                </div>

                {/* 3. Breakdown Stats (Small Cards) */}
                <div className="bg-white rounded-2xl md:rounded-[32px] p-4 md:p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between group hover:border-green-200 transition-all">
                    <div>
                        <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Faturamento Real</p>
                        <h4 className="text-xl md:text-2xl font-black text-navy">R$ {financialStats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
                    </div>
                    <div className="size-10 md:size-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center text-lg md:text-xl group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined">trending_up</span>
                    </div>
                </div>

                <div className="bg-white rounded-2xl md:rounded-[32px] p-4 md:p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between group hover:border-red-200 transition-all">
                    <div>
                        <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Despesas</p>
                        <h4 className="text-xl md:text-2xl font-black text-navy">R$ {financialStats.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
                    </div>
                    <div className="size-10 md:size-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-lg md:text-xl group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined">trending_down</span>
                    </div>
                </div>

                <div className="bg-white rounded-2xl md:rounded-[32px] p-4 md:p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between group hover:border-orange-200 transition-all">
                    <div>
                        <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">A Receber</p>
                        <h4 className="text-xl md:text-2xl font-black text-navy">R$ {financialStats.pendingRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
                    </div>
                    <div className="size-10 md:size-12 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center text-lg md:text-xl group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined">pending</span>
                    </div>
                </div>

                {/* 4. Main Chart: Cash Flow */}
                <div className="md:col-span-2 bg-white rounded-2xl md:rounded-[32px] p-6 md:p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <div className="flex justify-between items-center mb-6 md:mb-8">
                        <div>
                            <h3 className="text-base md:text-xl font-bold text-navy">Fluxo de Caixa Real</h3>
                            <p className="text-[10px] md:text-xs text-gray-500 font-medium">Entradas vs Saídas Efetivas</p>
                        </div>
                    </div>
                    <div className="h-[250px] md:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 600 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(val) => `R$${val / 1000}k`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                                    formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                />
                                <Area type="monotone" dataKey="Receita" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                                <Area type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 5. Accounts Receivable List */}
                <div className="md:col-span-1 bg-white rounded-2xl md:rounded-[32px] p-5 md:p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col">
                    <h3 className="text-base md:text-lg font-bold text-navy mb-4 md:mb-6 flex items-center justify-between">
                        <span>Contas a Receber</span>
                        <div className="size-7 md:size-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                            <span className="material-symbols-outlined text-sm">payments</span>
                        </div>
                    </h3>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 md:space-y-4 custom-scrollbar max-h-[350px] md:max-h-[400px]">
                        {accountsReceivableList.length === 0 ? (
                            <p className="text-gray-400 text-xs md:text-sm italic py-6 md:py-8 text-center">Tudo recebido!</p>
                        ) : accountsReceivableList.map((item, i) => (
                            <div key={i} className="flex items-center gap-3 p-2.5 md:p-3 hover:bg-orange-50/50 rounded-xl md:rounded-2xl transition-all border border-transparent hover:border-orange-100 group">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs md:text-sm font-black text-navy truncate tracking-tight">{item.client}</p>
                                    <p className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-tighter mt-0.5">#{item.id.split('-')[1] || item.id} • {item.deadline}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs md:text-sm font-black text-orange-600">
                                        R$ {item.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 6. Recent Activity List (Bottom) */}
                <div className="md:col-span-3 bg-white rounded-2xl md:rounded-[32px] p-6 md:p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <h3 className="text-base md:text-xl font-bold text-navy mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <span>Fluxo de Caixa Recente</span>
                        <span className="text-[10px] md:text-xs font-bold text-gray-400 bg-gray-50 px-2.5 md:px-3 py-1 rounded-full uppercase tracking-widest w-fit">Últimos 10 lançamentos</span>
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 md:gap-x-12 gap-y-3 md:gap-y-4">
                        {recentActivity.map((t, i) => (
                            <div key={i} className="flex items-center gap-3 md:gap-4 p-2.5 md:p-3 hover:bg-gray-50 rounded-xl md:rounded-2xl transition-colors">
                                <div className={`size-10 md:size-12 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 ${t.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                    <span className="material-symbols-outlined text-lg md:text-xl">
                                        {t.icon}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs md:text-sm font-black text-navy truncate tracking-tight">{t.title}</p>
                                    <p className="text-[10px] md:text-xs text-gray-500 font-medium">{t.subtitle}</p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-sm md:text-base font-black ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                        {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            <NewTransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
            />
        </div>
    );
}
