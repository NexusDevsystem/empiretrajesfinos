import React, { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';

export default function Dashboard() {
  const { contracts, items, clients, updateContractStatus, updateItem, transactions } = useApp();
  const { showToast } = useToast();

  const handleQuickStart = (contract: any) => {
    updateContractStatus(contract.id, 'Ativo');
    contract.items.forEach((itemId: string) => {
      updateItem(itemId, { status: 'Alugado', statusColor: 'red' });
    });
    showToast('success', `Contrato #${contract.id} iniciado!`);
  };

  const handleQuickReturn = (contract: any) => {
    updateContractStatus(contract.id, 'Finalizado');
    contract.items.forEach((itemId: string) => {
      updateItem(itemId, { status: 'Devolução', statusColor: 'orange' });
    });
    showToast('success', `Contrato #${contract.id} finalizado!`);
  };

  // --- ANALYTICS LOGIC --- //

  // 1. Financial Stats
  const stats = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;

    let totalRevenue = 0;
    let estimatedRevenue = 0;
    let currentMonthRevenue = 0;
    let lastMonthRevenue = 0;
    let activeRentals = 0;

    // 1. Contract Revenue
    contracts.forEach(c => {
      if (c.status !== 'Cancelado') {
        const paidValue = c.paidAmount || 0;
        totalRevenue += paidValue;

        const d = new Date(c.startDate);
        if (d.getMonth() === currentMonth && d.getFullYear() === today.getFullYear()) {
          currentMonthRevenue += paidValue;
        } else if (d.getMonth() === lastMonth) {
          lastMonthRevenue += paidValue;
        }
      }

      // Receita estimada = saldo a receber de contratos AGENDADOS ou ATIVOS (exatamente como no Financeiro)
      if (c.status !== 'Cancelado' && c.status !== 'Finalizado') {
        estimatedRevenue += (c.totalValue - (c.paidAmount || 0));
      }

      if (c.status === 'Ativo') activeRentals++;
    });

    // 2. Add Manual Income Transactions
    transactions.filter(t => t.type === 'income').forEach(t => {
      totalRevenue += t.amount;
      const d = new Date(t.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === today.getFullYear()) {
        currentMonthRevenue += t.amount;
      } else if (d.getMonth() === lastMonth) {
        lastMonthRevenue += t.amount;
      }
    });

    let growth = 0;
    if (lastMonthRevenue > 0) growth = ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    else if (currentMonthRevenue > 0) growth = 100;

    return { revenue: totalRevenue, estimated: estimatedRevenue, active: activeRentals, growth: growth.toFixed(0) };
  }, [contracts]);

  // 2. Chart Data
  const chartData = useMemo(() => {
    const data = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = d.getMonth();
      const yearKey = d.getFullYear();

      const monthlyContractRevenue = contracts
        .filter(c => {
          const cDate = new Date(c.startDate);
          return cDate.getMonth() === monthKey && cDate.getFullYear() === yearKey && c.status !== 'Cancelado';
        })
        .reduce((acc, c) => acc + (c.paidAmount || 0), 0);

      const monthlyManualRevenue = transactions
        .filter(t => {
          const tDate = new Date(t.date);
          return tDate.getMonth() === monthKey && tDate.getFullYear() === yearKey && t.type === 'income';
        })
        .reduce((acc, t) => acc + t.amount, 0);

      data.push({
        name: d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase(),
        uv: monthlyContractRevenue + monthlyManualRevenue
      });
    }
    return data;
  }, [contracts]);

  // 3. Top Rentals Logic
  const topItems = useMemo(() => {
    const counts: Record<string, number> = {};
    contracts.filter(c => c.status !== 'Cancelado').forEach(c => {
      c.items.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4)
      .map(([id, count]) => {
        const item = items.find(i => i.id === id);
        return item ? { ...item, count } : null;
      })
      .filter(Boolean);
  }, [contracts, items]);

  // 4. Occupancy Logic (Based on Total Units)
  const occupancyData = useMemo(() => {
    // Total units in collection
    const totalUnits = items.reduce((sum, i) => sum + (i.totalQuantity || 1), 0);

    // Units currently rented (Status = Alugado)
    // For multi-unit items, we count rentedUnits or just total - available if status is Alugado.
    // To be precise, we sum totalQuantity - (availableQuantity || 0) for currently active rentals.
    const rentedUnits = items.filter(i => i.status === 'Alugado').reduce((sum, i) => {
      // If status is 'Alugado', it means at least one unit is rented. 
      // We use totalQuantity - availableQuantity as a proxy for current occupancy.
      return sum + Math.max(1, (i.totalQuantity || 1) - (i.availableQuantity || 0));
    }, 0);

    const available = Math.max(0, totalUnits - rentedUnits);

    return [
      { name: 'Alugado', value: rentedUnits, color: '#1B2A4E' }, // navy
      { name: 'Disponível', value: available, color: '#e5e7eb' }, // gray-200
    ];
  }, [items]);

  const occupancyRate = useMemo(() => {
    const totalUnits = items.reduce((sum, i) => sum + (i.totalQuantity || 1), 0);
    if (totalUnits === 0) return 0;

    const rentedUnits = items.filter(i => i.status === 'Alugado').reduce((sum, i) => {
      return sum + Math.max(1, (i.totalQuantity || 1) - (i.availableQuantity || 0));
    }, 0);

    return Math.round((rentedUnits / totalUnits) * 100);
  }, [items]);


  // 5. Daily Ops
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
  const pickupsToday = contracts.filter(c => c.startDate.split('T')[0] === todayStr && c.status === 'Agendado');
  const returnsToday = contracts.filter(c => c.endDate.split('T')[0] === todayStr && c.status === 'Ativo');
  const overdueContracts = contracts.filter(c => c.endDate.split('T')[0] < todayStr && c.status === 'Ativo');

  // 6. New Stats
  const itemsInMaintenance = items.filter(i => ['Em Manutenção', 'Lavanderia', 'Costura', 'Ajuste'].includes(i.status)).length;
  const maintenanceStatusColor = itemsInMaintenance > 5 ? 'text-red-600 bg-red-100' : 'text-blue-600 bg-blue-100';

  // 7. Recent Activity
  const recentActivity = useMemo(() => {
    const contractEvents = contracts.map(c => {
      const client = clients.find(cl => cl.id === c.clientId);
      const clientName = client?.name || 'Cliente';
      const isReserved = c.status === 'Agendado';

      return {
        id: c.id,
        type: 'contract',
        desc: `${isReserved ? 'Agendamento' : 'Contrato'} para ${clientName} criado`,
        date: new Date(c.startDate), // Proxy creation date
        icon: 'description',
        color: 'bg-navy/10 text-navy'
      };
    });
    const transactionEvents = transactions?.map(t => ({
      id: t.id,
      type: 'transaction',
      desc: t.description,
      date: new Date(t.date),
      icon: t.type === 'income' ? 'arrow_upward' : 'arrow_downward',
      color: t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
    })) || [];

    return [...contractEvents, ...transactionEvents]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);
  }, [contracts, transactions]);


  return (
    <div className="pb-20 animate-in fade-in duration-700">

      {/* Header */}
      <div className="sticky top-0 z-40 mb-8 -mx-8 px-8 py-4 bg-gray-50/80 backdrop-blur-xl border-b border-gray-200/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all">
        <div>
          <h1 className="text-4xl font-black text-navy tracking-tighter">
            DASHBOARD
            <span className="text-transparent bg-clip-text bg-gradient-to-tr from-primary to-purple-500">.</span>
          </h1>
          <p className="text-gray-400 font-medium text-sm tracking-wide mt-0.5">Visão estratégica em tempo real</p>
        </div>
      </div>

      {/* BENTO GRID LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-auto gap-5">

        {/* 1. Main Stats (Revenue) - Large Card */}
        <div className="md:col-span-2 row-span-1 bg-gradient-to-br from-navy to-[#111] rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl shadow-navy/20 group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-primary/30"></div>
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <p className="text-white/60 font-medium text-sm uppercase tracking-widest mb-2">Receita Total</p>
              <h2 className="text-5xl font-black tracking-tight">R$ {stats.revenue.toLocaleString('pt-BR')}</h2>
            </div>
            <div className="mt-8 flex items-center gap-4">
              <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/10 text-xs font-bold flex items-center gap-1 text-emerald-400">
                <span className="material-symbols-outlined text-sm">trending_up</span>
                +{stats.growth}% esse mês
              </div>
              <div className="h-px flex-1 bg-white/10"></div>
              <p className="text-white/40 text-xs font-medium">Atualizado agora</p>
            </div>
          </div>
        </div>

        {/* 2. Client Stats - Small Card */}
        <div className="md:col-span-1 bg-white rounded-[32px] p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between relative group hover:border-blue-200 transition-all">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <span className="material-symbols-outlined text-2xl">groups</span>
            </div>
            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded">Total</span>
          </div>
          <div>
            <h3 className="text-4xl font-black text-navy mt-4">{clients.length}</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Clientes Cadastrados</p>
          </div>
        </div>

        {/* 3. Maintenance Stats - Small Card */}
        <div className="md:col-span-1 bg-white rounded-[32px] p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between relative group hover:border-red-200 transition-all">
          <div className="flex justify-between items-start">
            <div className={`p-3 rounded-2xl ${maintenanceStatusColor}`}>
              <span className="material-symbols-outlined text-2xl">build</span>
            </div>
            {itemsInMaintenance > 0 && <span className="text-[10px] font-bold text-white bg-red-400 px-2 py-0.5 rounded animate-pulse">Atenção</span>}
          </div>
          <div>
            <h3 className="text-4xl font-black text-navy mt-4">{itemsInMaintenance}</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Itens em Manutenção</p>
          </div>
        </div>


        {/* 4. Revenue Chart - Wide Card */}
        <div className="md:col-span-3 bg-white rounded-[32px] p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-navy">Fluxo Financeiro</h3>
              <p className="text-xs text-gray-400 font-medium">Últimos 6 meses</p>
            </div>
            {/* Occupancy Mini-Chart in Header */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-lg font-black text-navy">{occupancyRate}%</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Ocupação</p>
              </div>
              <div className="h-10 w-10">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={occupancyData} innerRadius={12} outerRadius={18} paddingAngle={2} dataKey="value">
                      {occupancyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="h-64 cursor-crosshair">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorGold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(val) => `R$${val / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1B2A4E', border: 'none', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
                  labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="uv" stroke="#D4AF37" strokeWidth={3} fillOpacity={1} fill="url(#colorGold)" activeDot={{ r: 6, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5. Recent Activity Feed - Sidebar Card */}
        <div className="md:col-span-1 md:row-span-2 bg-white rounded-[32px] p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col">
          <h3 className="text-lg font-bold text-navy mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-gray-400">history</span>
            Atividade Recente
          </h3>
          <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            {recentActivity.map((activity, i) => (
              <div key={i} className="flex gap-3 relative">
                {/* Connecting Line */}
                {i !== recentActivity.length - 1 && <div className="absolute left-[15px] top-8 bottom-[-16px] w-[2px] bg-gray-100"></div>}

                <div className={`size-8 rounded-full flex items-center justify-center shrink-0 z-10 text-xs ${activity.color}`}>
                  <span className="material-symbols-outlined text-[14px]">{activity.icon}</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-navy leading-tight">{activity.desc}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{activity.date.toLocaleDateString('pt-BR')} {activity.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && <p className="text-center text-xs text-gray-400 italic">Nenhuma atividade recente.</p>}
          </div>
        </div>

        {/* 6. Today's Ops (Pickups) */}
        <div className="md:col-span-2 bg-white rounded-[32px] p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] group hover:border-blue-200 transition-all flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-navy flex items-center gap-2">
              <div className="size-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <span className="material-symbols-outlined text-sm">output</span>
              </div>
              Saídas Hoje
            </h3>
            <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg">{pickupsToday.length}</span>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[300px]">
            {pickupsToday.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-3xl opacity-20">inventory</span>
                Nenhuma saída agendada.
              </div>
            ) : pickupsToday.map(c => {
              const client = clients.find(cl => cl.id === c.clientId);
              const itemNames = c.items.map(id => items.find(i => i.id === id)?.name).filter(Boolean).join(', ');
              const isSigned = !!c.lesseeSignature;

              return (
                <div key={c.id} className="flex flex-col gap-2 p-4 rounded-2xl bg-gray-50/50 hover:bg-blue-50/50 transition-all border border-transparent hover:border-blue-100 group/row">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-black text-navy truncate">{client?.name || 'Cliente não encontrado'}</p>
                        {!isSigned && (
                          <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-600 text-[10px] font-black uppercase tracking-tighter">Não Assinado</span>
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-gray-400 mb-2">Contrato #{c.id.split('-')[1] || c.id}</p>
                      <div className="flex flex-wrap gap-1">
                        {c.items.slice(0, 3).map((id, idx) => {
                          const itemName = items.find(i => i.id === id)?.name;
                          return itemName ? (
                            <span key={idx} className="px-2 py-0.5 rounded-md bg-white border border-gray-100 text-[10px] text-gray-500 font-bold">{itemName}</span>
                          ) : null;
                        })}
                        {c.items.length > 3 && (
                          <span className="px-2 py-0.5 rounded-md bg-white border border-gray-100 text-[10px] text-gray-400 font-bold">+{c.items.length - 3} itens</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleQuickStart(c)}
                      className="ml-4 size-10 flex items-center justify-center bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 hover:scale-105 active:scale-95 transition-all"
                      title="Marcar como Entregue"
                    >
                      <span className="material-symbols-outlined text-xl">check</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 7. Today's Ops (Returns) */}
        <div className="md:col-span-1 bg-white rounded-[32px] p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] group hover:border-orange-200 transition-all flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-navy flex items-center gap-2">
              <div className="size-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                <span className="material-symbols-outlined text-sm">input</span>
              </div>
              Devoluções
            </h3>
            <span className="text-xs font-bold bg-orange-50 text-orange-700 px-2.5 py-1 rounded-lg">{returnsToday.length}</span>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[300px]">
            {returnsToday.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-3xl opacity-20">assignment_return</span>
                Nenhuma.
              </div>
            ) : returnsToday.map(c => {
              const client = clients.find(cl => cl.id === c.clientId);
              return (
                <div key={c.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50/50 hover:bg-orange-50/50 transition-all border border-transparent hover:border-orange-100">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black text-navy truncate uppercase tracking-tight">{client?.name?.split(' ')[0] || 'Cliente'}</p>
                    <p className="text-[10px] font-medium text-gray-500">#{c.id.split('-')[1] || c.id}</p>
                  </div>
                  <button
                    onClick={() => handleQuickReturn(c)}
                    className="ml-2 size-8 flex items-center justify-center bg-orange-600 text-white rounded-lg hover:bg-orange-700 shadow-lg shadow-orange-200 hover:scale-105 active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">keyboard_return</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}