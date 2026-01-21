import React from 'react';
import { useApp } from '../contexts/AppContext';

export default function Atelier() {
  const { items, updateItemStatus } = useApp();

  // Filter items needing attention
  const atelierItems = items.filter(i => ['No Atelier', 'Na Lavanderia', 'Quarentena'].includes(i.status));

  const stats = {
    atelier: items.filter(i => i.status === 'No Atelier').length,
    laundry: items.filter(i => i.status === 'Na Lavanderia').length,
    quarantine: items.filter(i => i.status === 'Quarentena').length
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-navy tracking-tight">Manutenção</h1>
          <p className="text-gray-500 mt-1">Gerencie itens em manutenção, ajuste ou limpeza.</p>
        </div>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-gray-500 text-sm font-medium">No Atelier</p>
            <span className="material-symbols-outlined text-purple-600 bg-purple-50 p-1 rounded-md text-[20px]">content_cut</span>
          </div>
          <span className="text-3xl font-bold text-navy">{stats.atelier}</span>
        </div>
        <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-gray-500 text-sm font-medium">Na Lavanderia</p>
            <span className="material-symbols-outlined text-cyan-600 bg-cyan-50 p-1 rounded-md text-[20px]">local_laundry_service</span>
          </div>
          <span className="text-3xl font-bold text-navy">{stats.laundry}</span>
        </div>
        <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-gray-500 text-sm font-medium">Quarentena / Danos</p>
            <span className="material-symbols-outlined text-red-600 bg-red-50 p-1 rounded-md text-[20px]">warning</span>
          </div>
          <span className="text-3xl font-bold text-navy">{stats.quarantine}</span>
        </div>
      </section>

      {/* List */}
      <section className="flex flex-col gap-4">
        {atelierItems.length === 0 ? (
          <div className="p-10 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
            <span className="material-symbols-outlined text-4xl mb-2 text-gray-300">check_circle</span>
            <p>Nenhum item na fila de manutenção.</p>
          </div>
        ) : atelierItems.map(item => (
          <div key={item.id} className="group relative flex flex-col md:flex-row gap-0 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="w-full md:w-32 h-40 md:h-auto flex-shrink-0 bg-gray-100 relative overflow-hidden">
              <img src={item.img} className="w-full h-full object-cover" alt={item.name} />
              <div className={`absolute top-2 left-2 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm ${item.status === 'Quarentena' ? 'bg-red-500' :
                item.status === 'Na Lavanderia' ? 'bg-cyan-500' : 'bg-purple-500'
                }`}>
                {item.status.toUpperCase()}
              </div>
            </div>
            <div className="flex-1 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded tracking-wide font-mono">{item.sku}</span>
                </div>
                <h3 className="text-lg font-bold text-navy">{item.name}</h3>
                <p className="text-sm text-gray-500">{item.loc}</p>
              </div>
              {item.status === 'Quarentena' && (
                <div className="bg-red-50 p-3 rounded-lg border border-red-100 mt-2">
                  <p className="text-sm text-red-700 font-medium">Item reportado com dano. Verificar antes de liberar.</p>
                </div>
              )}
            </div>
            <div className="flex flex-row md:flex-col justify-between items-center md:items-end gap-2 p-4 md:pl-0 border-t md:border-t-0 md:border-l border-gray-100 min-w-[160px] bg-gray-50/50">
              <button
                onClick={() => updateItemStatus(item.id, 'Disponível')}
                className="w-full md:w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">check</span> Pronto
              </button>
              {item.status !== 'Na Lavanderia' && (
                <button
                  onClick={() => updateItemStatus(item.id, 'Na Lavanderia')}
                  className="w-full md:w-auto text-cyan-600 hover:text-cyan-700 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 py-2 px-3 rounded hover:bg-cyan-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">local_laundry_service</span> Lavanderia
                </button>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}