import React, { useState } from 'react';
import Packages from './components/Packages';
import { IMAGES } from './constants';
import { useApp } from './contexts/AppContext';
import { ToastProvider } from './contexts/ToastContext';
import { AppProvider } from './contexts/AppContext';
import { PackageProvider } from './contexts/PackageContext';
import LoginScreen from './components/LoginScreen';
import NewContractModal from './components/NewContractModal';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Agenda from './components/Agenda';
import Logistics from './components/Logistics';
import Contracts from './components/Contracts';
import Clients from './components/Clients';
import Financial from './components/Financial';
import Team from './components/Team';
import Settings from './components/Settings';
import AvailabilitySearch from './components/AvailabilitySearch';

import PendingApprovalScreen from './components/PendingApprovalScreen';
import NotificationBell from './components/NotificationBell';
import SystemHistory from './components/SystemHistory';
import Payables from './components/Payables';
import Receipts from './components/Receipts';

function AppContent() {
  const { showWizard, openWizard, closeWizard, currentView, navigateTo, user, isLoading, profile, signOut } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  if (isLoading) return null; // Or a loading spinner
  if (!user) return <LoginScreen />;

  // Show pending screen if role is 'pending'
  if (profile?.role === 'pending') {
    return <PendingApprovalScreen />;
  }

  const renderView = () => {
    const role = profile?.role || user?.role;
    const isVendedor = role === 'vendedor';

    // Restricted views for 'vendedor'
    const restrictedViews = ['financial', 'team', 'settings', 'history', 'payables'];

    if (isVendedor && restrictedViews.includes(currentView)) {
      return <Agenda />;
    }

    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'inventory': return <Inventory />;
      case 'packages': return <Packages />;
      case 'agenda': return <Agenda />;
      case 'logistics': return <Logistics />;
      case 'contracts': return <Contracts />;
      case 'clients': return <Clients />;
      case 'financial': return <Financial />;
      case 'team': return <Team />;
      case 'settings': return <Settings />;
      case 'availability': return <AvailabilitySearch />;
      case 'history': return <SystemHistory />;
      case 'payables': return <Payables />;
      case 'receipts': return <Receipts />;
      default: return <Agenda />;
    }
  };

  const menuGroups = [
    {
      label: 'VISÃO GERAL',
      items: [
        { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
        { id: 'agenda', icon: 'calendar_month', label: 'Agenda' },
        { id: 'availability', icon: 'analytics', label: 'Busca Inteligente' },
      ]
    },
    {
      label: 'COMERCIAL',
      items: [
        { id: 'clients', icon: 'person', label: 'Clientes / CRM' },
        { id: 'contracts', icon: 'description', label: 'Contratos' },
        { id: 'receipts', icon: 'receipt_long', label: 'Recibos' },
      ]
    },
    {
      label: 'OPERACIONAL',
      items: [
        { id: 'logistics', icon: 'local_laundry_service', label: 'Logística' },
        { id: 'inventory', icon: 'checkroom', label: 'Vestuário' },
        { id: 'packages', icon: 'inventory_2', label: 'Pacotes / Combos' },
      ]
    },
    {
      label: 'GESTÃO',
      items: [
        { id: 'financial', icon: 'attach_money', label: 'Financeiro' },
        { id: 'payables', icon: 'payments', label: 'Contas a Pagar' },
        { id: 'team', icon: 'badge', label: 'Equipe' },
        { id: 'history', icon: 'history', label: 'Histórico' },
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
            fixed inset-y-0 left-0 z-50 ${isSidebarCollapsed ? 'w-[80px]' : 'w-64'} bg-white border-r border-gray-200 flex flex-col shrink-0 transition-all duration-300 ease-in-out
            md:translate-x-0 md:static md:shadow-none
            ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
          `}
      >
        {/* Brand */}
        <div className={`flex items-start ${isSidebarCollapsed ? 'justify-center p-0' : 'justify-center p-0'} relative group border-b border-gray-50 overflow-hidden ${isSidebarCollapsed ? 'h-14' : 'h-36'}`}>
          {!isSidebarCollapsed && (
            IMAGES.logo ? (
              <img src={IMAGES.logo} alt="Logo" className="w-full h-auto -mt-10" />
            ) : (
              <div className="flex items-center gap-3 mt-6">
                <div className="size-8 rounded bg-navy flex items-center justify-center shrink-0 shadow-lg shadow-navy/20">
                  <span className="material-symbols-outlined text-white text-[20px]">diamond</span>
                </div>
                <div className="flex flex-col">
                  <h1 className="text-navy font-black tracking-tight leading-none text-lg">Empire</h1>
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Trajes Finos</p>
                </div>
              </div>
            )
          )}

          {isSidebarCollapsed && (
            <div className="size-12 flex items-center justify-center shrink-0">
              <img src={IMAGES.logoShort} alt="Logo" className="w-full h-auto object-contain" />
            </div>
          )}

        </div>

        {/* Toggle Button (Desktop Only) */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={`
            hidden md:flex absolute -right-[14px] ${isSidebarCollapsed ? 'top-10' : 'top-32'} -translate-y-1/2 size-7 bg-white border border-gray-200 rounded-lg items-center justify-center text-gray-400 hover:text-navy hover:border-navy transition-all z-50 shadow-md
          `}
        >
          <span className="material-symbols-outlined text-[18px]">side_navigation</span>
        </button>

        {/* Close Button (Mobile Only) */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="absolute right-4 top-1 md:hidden text-gray-400 hover:text-navy"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {/* Action Button */}
        <div className={`${isSidebarCollapsed ? 'px-4' : 'px-6'} mb-6 ${isSidebarCollapsed ? 'mt-4' : 'mt-10'} transition-all`}>
          <button
            onClick={() => { openWizard(); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center justify-center gap-2 bg-navy text-white ${isSidebarCollapsed ? 'h-12 w-12 rounded-full mx-auto' : 'h-11 rounded-xl'} font-bold hover:bg-navy/90 shadow-lg shadow-navy/30 transition-all active:scale-95 group overflow-hidden`}
          >
            <span className="material-symbols-outlined group-hover:rotate-90 transition-transform duration-300">add</span>
            {!isSidebarCollapsed && <span className="whitespace-nowrap">Nova Reserva</span>}
          </button>
        </div>

        {/* Nav */}
        <nav className={`flex-1 flex flex-col gap-6 ${isSidebarCollapsed ? 'p-2' : 'p-4'} overflow-y-auto no-scrollbar`}>
          {filteredMenuGroups.map((group, idx) => (
            <div key={idx} className="flex flex-col">
              {!isSidebarCollapsed && (
                <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{group.label}</p>
              )}
              {isSidebarCollapsed && (
                <div className="h-px bg-gray-100 mx-2 mb-4" />
              )}
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { navigateTo(item.id); setIsMobileMenuOpen(false); }}
                    className={`
                      flex items-center transition-all text-left group/nav
                      ${isSidebarCollapsed ? 'justify-center p-3 rounded-xl' : 'gap-3 px-3 py-2 rounded-lg'}
                      ${currentView === item.id
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-navy font-medium'
                      }
                    `}
                    title={isSidebarCollapsed ? item.label : ''}
                  >
                    <span className={`material-symbols-outlined ${isSidebarCollapsed ? 'text-[24px]' : 'text-[20px]'} ${currentView === item.id ? 'icon-filled' : ''} transition-transform group-hover/nav:scale-110`}>
                      {item.icon}
                    </span>
                    {!isSidebarCollapsed && <span className="text-sm whitespace-nowrap">{item.label}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile */}
        <div className={`${isSidebarCollapsed ? 'p-2' : 'p-4'} border-t border-gray-100 transition-all`}>
          <div className={`flex items-center bg-gray-50 rounded-xl border border-gray-100 overflow-hidden ${isSidebarCollapsed ? 'flex-col gap-2 p-2' : 'gap-3 px-3 py-2'}`}>
            {profile?.avatar_url ? (
              <div className={`${isSidebarCollapsed ? 'size-10' : 'size-9'} rounded-full bg-cover bg-center border border-gray-200 shrink-0`} style={{ backgroundImage: `url('${profile.avatar_url}')` }}></div>
            ) : (
              <div className={`${isSidebarCollapsed ? 'size-10' : 'size-9'} rounded-full bg-navy text-white flex items-center justify-center font-bold text-xs border border-gray-200 shrink-0`}>
                {profile?.full_name?.substring(0, 2).toUpperCase() || 'US'}
              </div>
            )}

            {!isSidebarCollapsed && (
              <div className="flex flex-col min-w-0 flex-1">
                <p className="text-sm font-bold text-navy truncate">{profile?.full_name || 'Usuário'}</p>
                <p className="text-[10px] text-gray-500 truncate uppercase font-bold">{profile?.role || 'Visitante'}</p>
              </div>
            )}

            <button
              onClick={() => {
                if (confirm('Deseja realmente sair?')) {
                  signOut();
                }
              }}
              className={`${isSidebarCollapsed ? 'w-full p-2' : 'p-1.5'} text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center`}
              title="Sair"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>

        {/* Version */}
        <div className="px-6 py-2 border-t border-gray-50 bg-gray-50/30 flex justify-center shrink-0">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-50">
            v1.0.0
          </span>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative bg-bg-light">
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
          < div className="flex items-center gap-2" >
            <NotificationBell />
            <button onClick={() => setIsMobileMenuOpen(true)} className="text-navy p-2 hover:bg-gray-50 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
          </div >
        </div >

        {/* View Content */}
        < div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth relative" >
          {/* Desktop Header / Toolbar - visible on md+ */}
          < div className="hidden md:flex justify-end items-center mb-6 gap-4" >
            {/* We can put other tools here later, like search */}
            < NotificationBell />
          </div >

          {renderView()}
        </div >
      </main >

      {/* Global Wizard Modal */}
      {showWizard && <NewContractModal isOpen={showWizard} onClose={closeWizard} />}
    </div >
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <PackageProvider>
          <AppContent />
        </PackageProvider>
      </AppProvider>
    </ToastProvider>
  );
}