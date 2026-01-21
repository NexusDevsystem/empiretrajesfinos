import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';

export default function NotificationBell() {
    const { notifications, unreadCount, markAsRead, navigateTo } = useApp();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = (id: string, link?: string) => {
        markAsRead(id);
        if (link) {
            // Parse link (simple logic for now, e.g. /contracts)
            // If link is just a view name like 'contracts', navigate to it.
            // If it's internal like '/contracts/123', we might need complex routing.
            // For now, assume link is the view name.
            navigateTo(link.replace('/', ''));
            setIsOpen(false);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'alert': return 'error';
            case 'warning': return 'warning';
            case 'success': return 'check_circle';
            default: return 'info';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'alert': return 'text-red-500 bg-red-50';
            case 'warning': return 'text-amber-500 bg-amber-50';
            case 'success': return 'text-emerald-500 bg-emerald-50';
            default: return 'text-blue-500 bg-blue-50';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-xl text-gray-400 hover:text-navy hover:bg-gray-100 transition-all active:scale-95"
            >
                <span className="material-symbols-outlined text-[24px]">notifications</span>
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 overflow-hidden animation-fade-in-up">
                    <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-navy">Notificações</h3>
                        {unreadCount > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-600 rounded-full">
                                {unreadCount} nova(s)
                            </span>
                        )}
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">notifications_off</span>
                                <p className="text-sm">Nenhuma notificação</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {notifications.map(notification => (
                                    <button
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification.id, notification.link)}
                                        className={`w-full text-left p-4 hover:bg-gray-50 transition-colors flex gap-3 ${!notification.read ? 'bg-blue-50/30' : ''}`}
                                    >
                                        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getTypeColor(notification.type)}`}>
                                            <span className="material-symbols-outlined text-sm">{getTypeIcon(notification.type)}</span>
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex justify-between items-baseline gap-2">
                                                <p className={`text-sm font-bold truncate ${!notification.read ? 'text-navy' : 'text-gray-600'}`}>
                                                    {notification.title}
                                                </p>
                                                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                                    {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                                {notification.message}
                                            </p>
                                        </div>
                                        {!notification.read && (
                                            <div className="shrink-0 self-center">
                                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-center">
                        <button className="text-xs font-bold text-primary hover:text-blue-700 transition-colors">
                            Ver todas
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
