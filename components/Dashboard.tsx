import React, { useMemo } from 'react';
import { useApp } from '../contexts/AppContext';

export default function Dashboard() {
  const { contracts, appointments, transactions } = useApp();

  const stats = useMemo(() => {
    const today = new Date();
    // Normalize today to YYYY-MM-DD string to avoid timezone issues with toLocaleDateString
    const toYMD = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Normalizing DB date strings (often ISO) to YYYY-MM-DD
    const normalizeDate = (dateStr: string) => {
      if (!dateStr) return '';
      if (dateStr.includes('T')) return dateStr.split('T')[0];
      return dateStr;
    };

    const todayStr = toYMD(today);

    // Helpers
    const isOverdue = (dateStr: string) => normalizeDate(dateStr) < todayStr;
    const isToday = (dateStr: string) => normalizeDate(dateStr) === todayStr;
    const isNext10Days = (dateStr: string) => {
      const dStr = normalizeDate(dateStr);
      if (!dStr) return false;

      const target = new Date(dStr + 'T12:00:00');
      const start = new Date(todayStr + 'T00:00:00');
      const end = new Date(todayStr + 'T23:59:59');
      end.setDate(end.getDate() + 10);

      // strictly greater than "end of today" basically implies starting tomorrow?
      // But typically "Next 10 days" includes upcoming days. 
      // Let's stick to strict range check on dates objects to be safe
      return target > new Date(todayStr + 'T23:59:59') && target <= end;
    };

    // --- LOGISTICS COUNTS ---

    // 1. OVERDUE
    const overdue = {
      fittings: appointments.filter(a => isOverdue(a.date) && a.type === 'Prova de Traje' && a.status !== 'Concluído').length,
      pickups: contracts.filter(c => isOverdue(c.startDate.split('T')[0]) && c.status === 'Agendado').length,
      returns: contracts.filter(c => isOverdue(c.endDate.split('T')[0]) && c.status === 'Ativo').length
    };

    // 2. TODAY
    const dailyops = {
      fittings: appointments.filter(a => isToday(a.date) && a.type === 'Prova de Traje').length,
      pickups: contracts.filter(c => isToday(c.startDate.split('T')[0]) && c.status === 'Agendado').length,
      returns: contracts.filter(c => isToday(c.endDate.split('T')[0]) && c.status === 'Ativo').length
    };

    // 3. NEXT 10 DAYS
    const next10 = {
      fittings: appointments.filter(a => isNext10Days(a.date) && a.type === 'Prova de Traje').length,
      pickups: contracts.filter(c => isNext10Days(c.startDate.split('T')[0]) && c.status === 'Agendado').length,
      returns: contracts.filter(c => isNext10Days(c.endDate.split('T')[0]) && c.status === 'Ativo').length
    };

    // --- FINANCIAL RESULTS ---
    // Note: Using startDate as proxy for "Order Date" since createdAt is not available on frontend types easily
    // For "Total Recebido", we sum paidAmount of contracts in that period + income transactions.

    const calculateFinancials = (startDate: Date, endDate: Date) => {
      let totalOrders = 0;
      let totalReceived = 0;
      let numOrders = 0;

      // Filter contracts within period
      contracts.forEach(c => {
        const d = new Date(c.startDate); // Proxy for order date
        if (d >= startDate && d <= endDate && c.status !== 'Cancelado') {
          totalOrders += c.totalValue;
          totalReceived += (c.paidAmount || 0); // Simplified: assumes payment happens on order date
          numOrders++;
        }
      });

      // Add standalone transactions
      transactions.forEach(t => {
        const d = new Date(t.date);
        if (t.type === 'income' && d >= startDate && d <= endDate) {
          totalReceived += t.amount;
        }
      });

      return { totalOrders, totalReceived, numOrders };
    };

    // Day
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    const dayStats = calculateFinancials(dayStart, dayEnd);

    // Week
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    const weekStats = calculateFinancials(weekStart, weekEnd);

    // Month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
    const monthStats = calculateFinancials(monthStart, monthEnd);

    return { overdue, dailyops, next10, dayStats, weekStats, monthStats };
  }, [contracts, appointments, transactions]);

  // --- PAYABLES / RECEIVABLES (Added) ---
  const receivables = useMemo(() => {
    const activeContracts = contracts.filter(c => c.status !== 'Cancelado' && c.status !== 'Rascunho' && (c.balance || 0) > 0);
    const total = activeContracts.reduce((acc, c) => acc + (c.balance || 0), 0);
    return { total, count: activeContracts.length };
  }, [contracts]);

  const payables = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const futureExpenses = transactions.filter(t => t.type === 'expense' && new Date(t.date).toISOString().split('T')[0] >= todayStr);
    const total = futureExpenses.reduce((acc, t) => acc + t.amount, 0);
    return { total, count: futureExpenses.length };
  }, [transactions]);

  // --- AGENDA TODAY ---
  const agendaToday = useMemo(() => {
    const isToday = (dateStr: string) => dateStr === new Date().toLocaleDateString('en-CA');
    return appointments
      .filter(a => isToday(a.date))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments]);

  const KPI_Card = ({ title, data, type }: { title: string, data: { total: number, count: number }, type: 'pay' | 'receive' }) => {
    const isPay = type === 'pay';
    const bgIcon = isPay ? 'bg-red-50 text-red-500' : 'bg-teal-50 text-teal-500';
    const icon = isPay ? 'payments' : 'attach_money';

    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
        <h3 className="font-bold text-navy mb-6 text-lg">{title}</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`size-10 rounded-xl ${bgIcon} flex items-center justify-center`}>
                <span className="material-symbols-outlined">{icon}</span>
              </div>
              <span className="font-bold text-sm text-navy">Total</span>
            </div>
            <div className="px-3 py-1 rounded-lg bg-gray-50 text-gray-600 text-xs font-bold">
              R$ {data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`size-10 rounded-xl ${isPay ? 'bg-red-50 text-red-500' : 'bg-teal-50 text-teal-500'} flex items-center justify-center`}>
                <span className="material-symbols-outlined">{isPay ? 'arrow_upward' : 'arrow_downward'}</span>
              </div>
              <span className="font-bold text-sm text-navy">Quantidade</span>
            </div>
            <div className="px-3 py-1 rounded-lg bg-gray-50 text-gray-600 text-xs font-bold">
              {data.count}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const CardRow = ({ label, value, icon, colorClass, iconClass }: any) => (
    <div className={`flex items-center justify-between p-4 rounded-lg mb-3 ${colorClass}`}>
      <div className="flex items-center gap-3">
        <span className={`material-symbols-outlined ${iconClass} text-xl`}>{icon}</span>
        <span className={`font-semibold text-sm ${iconClass}`}>{label}</span>
      </div>
      <span className={`font-bold text-sm ${iconClass}`}>{value}</span>
    </div>
  );

  const FinRow = ({ label, value, icon, isCurrency = false }: any) => (
    <div className="flex items-center justify-between py-4 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-500">
          <span className="material-symbols-outlined text-lg">{icon}</span>
        </div>
        <span className="font-bold text-sm text-navy">{label}</span>
      </div>
      <span className="font-bold text-sm text-gray-500">
        {isCurrency ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : value}
      </span>
    </div>
  );

  return (
    <div className="pb-20 animate-in fade-in duration-700 p-6 md:p-8">

      {/* Top Row: Logistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

        {/* Card 1: Em atraso */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-navy mb-6 text-lg">Em atraso</h3>
          <CardRow
            label="Provas"
            value={stats.overdue.fittings}
            icon="checkroom"
            colorClass="bg-red-50"
            iconClass="text-red-400"
          />
          <CardRow
            label="Retiradas"
            value={stats.overdue.pickups}
            icon="output"
            colorClass="bg-red-50"
            iconClass="text-red-400"
          />
          <CardRow
            label="Devoluções"
            value={stats.overdue.returns}
            icon="input"
            colorClass="bg-red-50"
            iconClass="text-red-400"
          />
        </div>

        {/* Card 2: Hoje */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-navy mb-6 text-lg">Hoje</h3>
          <CardRow
            label="Provas"
            value={stats.dailyops.fittings}
            icon="checkroom"
            colorClass="bg-blue-50"
            iconClass="text-blue-400"
          />
          <CardRow
            label="Retiradas"
            value={stats.dailyops.pickups}
            icon="output"
            colorClass="bg-blue-50"
            iconClass="text-blue-400"
          />
          <CardRow
            label="Devoluções"
            value={stats.dailyops.returns}
            icon="input"
            colorClass="bg-blue-50"
            iconClass="text-blue-400"
          />
        </div>

        {/* Card 3: Próximos 10 dias */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-navy mb-6 text-lg">Próximos 10 dias</h3>
          <CardRow
            label="Provas"
            value={stats.next10.fittings}
            icon="checkroom"
            colorClass="bg-teal-50"
            iconClass="text-teal-400"
          />
          <CardRow
            label="Retiradas"
            value={stats.next10.pickups}
            icon="output"
            colorClass="bg-teal-50"
            iconClass="text-teal-400"
          />
          <CardRow
            label="Devoluções"
            value={stats.next10.returns}
            icon="input"
            colorClass="bg-teal-50"
            iconClass="text-teal-400"
          />
        </div>
      </div>

      {/* Bottom Row: Financials */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Card 4: Daily Results */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-navy mb-6 text-lg">Resultados do dia</h3>
          <div className="flex flex-col">
            <FinRow label="Total de pedidos" value={stats.dayStats.totalOrders} icon="assignment" isCurrency />
            <FinRow label="Total recebido" value={stats.dayStats.totalReceived} icon="payments" isCurrency />
            <FinRow label="Número de pedidos" value={stats.dayStats.numOrders} icon="shopping_cart" />
          </div>
        </div>

        {/* Card 5: Weekly Results */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-navy mb-6 text-lg">Resultados da semana</h3>
          <div className="flex flex-col">
            <FinRow label="Total de pedidos" value={stats.weekStats.totalOrders} icon="assignment" isCurrency />
            <FinRow label="Total recebido" value={stats.weekStats.totalReceived} icon="payments" isCurrency />
            <FinRow label="Número de pedidos" value={stats.weekStats.numOrders} icon="shopping_cart" />
          </div>
        </div>

        {/* Card 6: Monthly Results */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-navy mb-6 text-lg">Resultados do mês</h3>
          <div className="flex flex-col">
            <FinRow label="Total de pedidos" value={stats.monthStats.totalOrders} icon="assignment" isCurrency />
            <FinRow label="Total recebido" value={stats.monthStats.totalReceived} icon="payments" isCurrency />
            <FinRow label="Número de pedidos" value={stats.monthStats.numOrders} icon="shopping_cart" />
          </div>
        </div>

      </div>

      {/* 3. Account & Agenda Row (New) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <KPI_Card title="Contas a pagar" data={payables} type="pay" />
        <KPI_Card title="Contas a receber" data={receivables} type="receive" />

        {/* Agenda Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-navy mb-4 text-lg">Agenda do dia</h3>
          <div className="space-y-3 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
            {agendaToday.length === 0 ? (
              <p className="text-gray-400 text-sm mt-2">Nenhum compromisso marcado pra hoje...</p>
            ) : (
              agendaToday.map(apt => (
                <div key={apt.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-bold shrink-0">
                    {apt.time}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-navy truncate">{apt.clientName || 'Cliente'}</p>
                    <p className="text-[10px] text-gray-500 truncate">{apt.type}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
}