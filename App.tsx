import React, { useState } from 'react';
import { IMAGES } from './constants';
import { useApp } from './contexts/AppContext';
import LoginScreen from './components/LoginScreen';
import NewContractModal from './components/NewContractModal';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Agenda from './components/Agenda';
import Atelier from './components/Atelier';
import Logistics from './components/Logistics';
import Contracts from './components/Contracts';
import Clients from './components/Clients';
import Financial from './components/Financial';
import Team from './components/Team';
import Settings from './components/Settings';

import PendingApprovalScreen from './components/PendingApprovalScreen';
import NotificationBell from './components/NotificationBell';

export default function App() {
  const { showWizard, openWizard, closeWizard, currentView, navigateTo, user, isLoading, profile, signOut } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (isLoading) return null; // Or a loading spinner
  if (!user) return <LoginScreen />;

  // Show pending screen if role is 'pending'
  if (profile?.role === 'pending') {
    return <PendingApprovalScreen />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'inventory': return <Inventory />;
      case 'agenda': return <Agenda />;
      case 'atelier': return <Atelier />;
      case 'logistics': return <Logistics />;
      case 'contracts': return <Contracts />;
      case 'clients': return <Clients />;
      case 'financial': return <Financial />;
      case 'team': return <Team />;
      case 'settings': return <Settings />;
      default: return <Agenda />;
    }
  };

  const menuGroups = [
    {
      label: 'VISÃO GERAL',
      items: [
        { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
        { id: 'agenda', icon: 'calendar_month', label: 'Agenda' },
      ]
    },
    {
      label: 'COMERCIAL',
      items: [
        { id: 'clients', icon: 'person', label: 'Clientes / CRM' },
        { id: 'contracts', icon: 'description', label: 'Contratos' },
      ]
    },
    {
      label: 'OPERACIONAL',
      items: [
        { id: 'inventory', icon: 'checkroom', label: 'Vestuário' },
        { id: 'atelier', icon: 'content_cut', label: 'Manutenção' },
        { id: 'logistics', icon: 'local_laundry_service', label: 'Logística' },
      ]
    },
    {
      label: 'GESTÃO',
      items: [
        { id: 'financial', icon: 'attach_money', label: 'Financeiro' },
        { id: 'team', icon: 'badge', label: 'Equipe' },
        { id: 'settings', icon: 'settings', label: 'Configurações' },
      ]
    },
  ];

  // Filter menu for 'vendedor'
  const filteredMenuGroups = profile?.role === 'vendedor'
    ? menuGroups.filter(g => g.label !== 'GESTÃO')
    : menuGroups;

  return (
    <div className="flex h-[100dvh] overflow-hidden">

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (Drawer on Mobile, Static on Desktop) */}
      <aside
        className={`
            fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 transition-transform duration-300 ease-in-out
            md:translate-x-0 md:static md:shadow-none
            ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
          `}
      >
        {/* Brand */}
        <div className="flex items-center justify-center py-6 relative">
          {IMAGES.logo ? (
            <img src={IMAGES.logo} alt="Logo" className="w-full h-auto max-h-20 object-contain px-8" />
          ) : (
            <div className="flex items-center gap-3 px-7">
              <div className="size-8 rounded bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined text-white text-[20px]">diamond</span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-navy font-black tracking-tight leading-none text-lg">Empire</h1>
                <p className="text-gold text-[10px] font-bold uppercase tracking-widest">Trajes Finos</p>
              </div>
            </div>
          )}

          {/* Close Button (Mobile Only) */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute right-4 top-1 md:hidden text-gray-400 hover:text-navy"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Action Button */}
        <div className="px-6 mb-6">
          <button
            onClick={() => { openWizard(); setIsMobileMenuOpen(false); }}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white h-11 rounded-xl font-bold hover:bg-primary/90 shadow-lg shadow-primary/30 transition-all active:scale-95 group"
          >
            <span className="material-symbols-outlined group-hover:rotate-90 transition-transform duration-300">add</span>
            <span>Nova Reserva</span>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-6 p-4 overflow-y-auto no-scrollbar">
          {filteredMenuGroups.map((group, idx) => (
            <div key={idx}>
              <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{group.label}</p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { navigateTo(item.id); setIsMobileMenuOpen(false); }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left ${currentView === item.id
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-navy font-medium'
                      }`}
                  >
                    <span className={`material-symbols-outlined text-[20px] ${currentView === item.id ? 'icon-filled' : ''}`}>{item.icon}</span>
                    <span className="text-sm">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
            {profile?.avatar_url ? (
              <div className="size-9 rounded-full bg-cover bg-center border border-gray-200" style={{ backgroundImage: `url('${profile.avatar_url}')` }}></div>
            ) : (
              <div className="size-9 rounded-full bg-navy text-white flex items-center justify-center font-bold text-xs border border-gray-200">
                {profile?.full_name?.substring(0, 2).toUpperCase() || 'US'}
              </div>
            )}
            <div className="flex flex-col min-w-0 flex-1">
              <p className="text-sm font-bold text-navy truncate">{profile?.full_name || 'Usuário'}</p>
              <p className="text-[10px] text-gray-500 truncate uppercase font-bold">{profile?.role || 'Visitante'}</p>
            </div>
            <button
              onClick={() => {
                if (confirm('Deseja realmente sair?')) {
                  signOut();
                }
              }}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Sair"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      < main className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative bg-bg-light" >
        {/* Mobile Header */}
        < div className="md:hidden h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 shadow-sm z-20 relative" >
          {
            IMAGES.logo ? (
              <img src={IMAGES.logo} alt="Empire" className="h-10 w-auto object-contain" /> // Increased to h-10
            ) : (
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">diamond</span>
                <span className="font-bold text-navy">Empire</span>
              </div>
            )
          }
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button onClick={() => setIsMobileMenuOpen(true)} className="text-navy p-2 hover:bg-gray-50 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
          </div>
        </div>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth relative">
          {/* Desktop Header / Toolbar - visible on md+ */}
          <div className="hidden md:flex justify-end items-center mb-6 gap-4">
            {/* We can put other tools here later, like search */}
            <NotificationBell />
          </div>

          {renderView()}
        </div>
      </main >

      {/* Global Wizard Modal */}
      {showWizard && <NewContractModal isOpen={showWizard} onClose={closeWizard} />}
    </div >
  );
}