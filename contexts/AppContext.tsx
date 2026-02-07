import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Item, Contract, Client, ContractStatus, Appointment, Transaction, Employee } from '../types';
import { authAPI, itemsAPI, clientsAPI, contractsAPI, appointmentsAPI, transactionsAPI, employeesAPI, notificationsAPI, settingsAPI } from '../services/api';

// --- Interfaces ---

interface AuthUser {
    id: string;
    email: string;
    full_name: string;
    role: string;
}

interface AppContextType {
    items: Item[];
    contracts: Contract[];
    clients: Client[];
    appointments: Appointment[];
    transactions: Transaction[];
    employees: Employee[];

    addItem: (item: Item) => Promise<void>;
    updateItemStatus: (itemId: string, status: Item['status'], loc?: string) => Promise<void>;
    updateItem: (itemId: string, data: Partial<Item>) => Promise<void>;
    deleteItem: (itemId: string) => Promise<void>;

    addContract: (contract: Contract) => Promise<Contract>;
    updateContractStatus: (contractId: string, status: ContractStatus) => Promise<void>;
    updateContract: (contractId: string, data: Partial<Contract>) => Promise<void>;
    deleteContract: (contractId: string) => Promise<void>;

    addClient: (client: Client) => Promise<Client>;
    updateClient: (client: Client) => Promise<void>;
    deleteClient: (clientId: string) => Promise<void>;

    addAppointment: (appointment: Appointment) => Promise<void>;
    updateAppointment: (appointment: Appointment) => Promise<void>;
    deleteAppointment: (appointmentId: string) => Promise<void>;

    addTransaction: (transaction: Transaction) => Promise<void>;
    updateTransaction: (transactionId: string, data: Partial<Transaction>) => Promise<void>;
    deleteTransaction: (transactionId: string) => Promise<void>;

    addEmployee: (employee: Employee) => Promise<void>;
    updateEmployee: (employee: Employee) => Promise<void>;
    deleteEmployee: (employeeId: string) => Promise<void>;

    isItemAvailable: (itemId: string, startDate: string, endDate: string, excludeContractId?: string) => boolean;

    currentView: string;
    navigateTo: (view: string) => void;
    showWizard: boolean;
    closeWizard: () => void;

    user: AuthUser | null;
    profile: any;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, full_name: string) => Promise<void>;
    signOut: () => Promise<void>;
    isLoading: boolean;

    storeSettings: any;
    updateStoreSettings: (settings: any) => Promise<void>;

    notifications: any[];
    unreadCount: number;
    markAsRead: (id: string) => Promise<void>;
    markAllRead: (id: string) => Promise<void>; // id can be 'all'
    addNotification: (notification: any) => Promise<void>;
    selectedContractId: string | null;
    setSelectedContractId: (id: string | null) => void;
    wizardInitialData: { startDate?: string; endDate?: string; itemIds?: string[] } | null;
    openWizard: (initialData?: { startDate?: string; endDate?: string; itemIds?: string[] }) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Mappers
const mapItemFromDB = (db: any): Item => ({
    id: db._id,
    name: db.name,
    type: db.type || '',
    size: db.size || '',
    color: db.color || '',
    price: db.rental_price,
    salePrice: db.sale_price,
    status: db.status,
    statusColor: db.status_color || 'primary',
    img: db.image_url || '',
    loc: db.location || '',
    code: db.code || '',
    note: db.notes || '',

    // Campos de quantidade
    totalQuantity: db.total_quantity,
    availableQuantity: db.available_quantity,
    rentedUnits: db.rented_units
});

const mapItemToDB = (item: Item) => ({
    name: item.name,
    type: item.type,
    size: item.size,
    color: item.color,
    rental_price: item.price,
    sale_price: item.salePrice,
    status: item.status,
    status_color: item.statusColor,
    image_url: item.img,

    // Campos de quantidade
    total_quantity: item.totalQuantity,
    available_quantity: item.availableQuantity,
    rented_units: item.rentedUnits,
    location: item.loc,
    code: item.code,
    notes: item.note
});

const mapClientFromDB = (db: any): Client => ({
    id: db._id,
    name: db.name,
    email: db.email || '',
    phone: db.phone || '',
    cpf: db.cpf,
    rg: db.rg,
    address: db.address_street,
    number: db.address_number,
    neighborhood: db.address_neighborhood,
    city: db.address_city,
    state: db.address_state,
    zip: db.address_zip,
    birthDate: db.birth_date,
    profileType: db.profile_type,
    measurements: db.measurements,
    img: ''
});

const mapAppointmentFromDB = (db: any): Appointment => ({
    id: db.id || db._id,
    clientId: db.clientId,
    clientName: db.clientName,
    contractId: db.contractId,
    date: db.date ? (typeof db.date === 'string' ? db.date.split('T')[0] : new Date(db.date).toISOString().split('T')[0]) : '',
    time: db.time,
    type: db.type,
    notes: db.notes,
    status: db.status
});

const mapClientToDB = (client: Client) => ({
    name: client.name,
    email: client.email,
    phone: client.phone,
    cpf: client.cpf || null,
    rg: client.rg,
    address_street: client.address,
    address_number: client.number,
    address_neighborhood: client.neighborhood,
    address_city: client.city,
    address_state: client.state,
    address_zip: client.zip,
    birth_date: client.birthDate,
    profile_type: client.profileType,
    measurements: client.measurements
});

export function AppProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<Item[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [currentView, setCurrentView] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('empire_trajes_last_view') || 'dashboard';
        }
        return 'dashboard';
    });
    const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
    const [showWizard, setShowWizard] = useState(false);
    const [wizardInitialData, setWizardInitialData] = useState<{ startDate?: string; endDate?: string; itemIds?: string[] } | null>(null);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [profile, setProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [storeSettings, setStoreSettings] = useState<any>({
        store_name: 'Empire Trajes Finos',
        store_cnpj: '52.377.689/0001-71',
        store_address: 'Av. Transmangueirão, Belém - PA',
        store_phone: '(91) 98428-7746',
        store_email: 'empiretrajesfinos@gmail.com',
        store_instagram: '@empiretrajesfinos',
        monthly_goal: 15000
    }); // Default fallback while loading
    const [notifications, setNotifications] = useState<any[]>([]);

    const unreadCount = notifications.filter(n => !n.read).length;

    // Monitor for pending payables and generate alerts
    useEffect(() => {
        if (transactions.length > 0 && (user?.role === 'admin' || user?.role === 'gerente')) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            setNotifications(prev => {
                const currentNotifs = [...prev];
                let hasChanges = false;

                transactions.forEach(t => {
                    if (t.type === 'expense' && t.status === 'pendente' && t.dueDate) {
                        const dueDate = new Date(t.dueDate);
                        dueDate.setHours(0, 0, 0, 0);

                        const diffTime = dueDate.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        const alertId = `debt-${t.id}`;
                        const alreadyExists = currentNotifs.some(n => n.id === alertId);

                        if (!alreadyExists) {
                            if (diffDays <= 3 && diffDays >= 0) {
                                currentNotifs.unshift({
                                    id: alertId,
                                    title: diffDays === 0 ? 'Vence Hoje! 💸' : 'Vencimento Próximo 🔔',
                                    message: `A conta "${t.description}" de R$ ${t.amount.toLocaleString('pt-BR')} vence ${diffDays === 0 ? 'hoje' : 'em ' + diffDays + ' dias'}.`,
                                    type: 'warning',
                                    date: new Date().toISOString(),
                                    read: false
                                });
                                hasChanges = true;
                            } else if (diffDays < 0) {
                                currentNotifs.unshift({
                                    id: alertId,
                                    title: 'Conta em Atraso ⚠️',
                                    message: `A conta "${t.description}" de R$ ${t.amount.toLocaleString('pt-BR')} venceu em ${dueDate.toLocaleDateString('pt-BR')}.`,
                                    type: 'error',
                                    date: new Date().toISOString(),
                                    read: false
                                });
                                hasChanges = true;
                            }
                        }
                    }
                });

                return hasChanges ? currentNotifs : prev;
            });
        }
    }, [transactions, user]);

    const openWizard = (initialData?: { startDate?: string; endDate?: string; itemIds?: string[] }) => {
        if (initialData) {
            setWizardInitialData(initialData);
        } else {
            setWizardInitialData(null);
        }
        setShowWizard(true);
    };
    const closeWizard = () => {
        setShowWizard(false);
        setWizardInitialData(null);
    };
    const navigateTo = (view: string) => {
        setCurrentView(view);
        localStorage.setItem('empire_trajes_last_view', view);
    };

    // Load data on mount
    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const userData = await authAPI.getMe();
                    setUser(userData);
                    setProfile(userData);
                    await loadData(userData.role);
                } catch (error) {
                    localStorage.removeItem('token');
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
            }
        };

        initAuth();
    }, []);

    const loadData = async (userRole?: string) => {
        try {
            // Basic data - Everyone can see
            const [itemsData, clientsData, contractsData, appointmentsData, notificationsData] = await Promise.all([
                itemsAPI.getAll().catch(err => { console.error('Items load error:', err); return []; }),
                clientsAPI.getAll().catch(err => { console.error('Clients load error:', err); return []; }),
                contractsAPI.getAll().catch(err => { console.error('Contracts load error:', err); return []; }),
                appointmentsAPI.getAll().catch(err => { console.error('Appointments load error:', err); return []; }),
                notificationsAPI.getAll().catch(err => { console.error('Notifications load error:', err); return []; })
            ]);

            setItems(itemsData.map(mapItemFromDB));
            setClients(clientsData.map(mapClientFromDB));
            setContracts(contractsData);
            setAppointments(appointmentsData.map(mapAppointmentFromDB));
            setNotifications(notificationsData);

            // Restricted data - Check role
            const role = userRole || profile?.role || user?.role;
            if (role === 'admin' || role === 'gerente') {
                try {
                    const [employeesData, transactionsData] = await Promise.all([
                        employeesAPI.getAll(),
                        transactionsAPI.getAll()
                    ]);

                    setTransactions(transactionsData);
                    setEmployees(employeesData.map((e: any) => ({
                        id: e.id,
                        name: e.name,
                        email: e.email,
                        role: e.role,
                        phone: '',
                        admissionDate: e.created_at,
                        status: 'Ativo',
                        avatar: e.avatar_url
                    })));
                } catch (error) {
                    console.error('Error loading restricted management data:', error);
                }
            }
        } catch (error) {
            console.error('Core data load error:', error);
        } finally {
            // Load store settings
            try {
                const settings = await settingsAPI.getAll();
                if (settings && settings._id) {
                    setStoreSettings(settings);
                }
            } catch (error) {
                console.error('[AppContext] Error loading settings:', error);
            }

            setIsLoading(false);
        }
    };

    // Auth
    const signIn = async (email: string, password: string) => {
        console.log('[AppContext] signIn called', { email });
        try {
            const result = await authAPI.login(email, password);
            console.log('[AppContext] login API success', result);
            const { token, user: authUser } = result;

            localStorage.setItem('token', token);
            console.log('[AppContext] Token saved');

            setUser(authUser);
            setProfile(authUser);
            console.log('[AppContext] User state updated');

            await loadData(authUser.role);
            console.log('[AppContext] loadData completed');
        } catch (error) {
            console.error('[AppContext] signIn error', error);
            throw error;
        }
    };

    const signUp = async (email: string, password: string, full_name: string) => {
        const { token, user: authUser } = await authAPI.register(email, password, full_name);
        localStorage.setItem('token', token);
        setUser(authUser);
        setProfile(authUser);
        await loadData(authUser.role);
    };

    const signOut = async () => {
        localStorage.removeItem('token');
        localStorage.removeItem('empire_trajes_last_view');
        setUser(null);
        setProfile(null);
        setItems([]);
        setClients([]);
        setContracts([]);
        setCurrentView('dashboard');
    };

    // Items
    const addItem = async (item: Item) => {
        // Optimistic UI Update
        const tempId = crypto.randomUUID();
        const tempItem: Item = { ...item, id: tempId };

        // 1. Update UI immediately
        setItems(prev => [...prev, tempItem]);

        try {
            // 2. Perform API call
            const dbItem = mapItemToDB(item);
            const saved = await itemsAPI.create(dbItem);
            const savedItem = mapItemFromDB(saved);

            // 3. Replace temp item with real item
            setItems(prev => prev.map(i => i.id === tempId ? savedItem : i));
        } catch (error) {
            console.error('[AppContext] Error adding item:', error);
            // Revert optimistic update
            setItems(prev => prev.filter(i => i.id !== tempId));
            throw error; // Let caller handle/show toast
        }
    };

    const updateItemStatus = async (itemId: string, status: Item['status'], loc?: string) => {
        await itemsAPI.update(itemId, { status, location: loc });
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, status, loc: loc || i.loc } : i));
    };

    const updateItem = async (itemId: string, data: Partial<Item>) => {
        const dbData = mapItemToDB(data as Item);
        await itemsAPI.update(itemId, dbData);
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...data } : i));
    };

    const deleteItem = async (itemId: string) => {
        await itemsAPI.delete(itemId);
        setItems(prev => prev.filter(i => i.id !== itemId));
    };

    // Clients
    const addClient = async (client: Client) => {
        // Optimistic UI Update
        const tempId = crypto.randomUUID();
        const tempClient: Client = { ...client, id: tempId };

        // 1. Update UI immediately
        setClients(prev => [...prev, tempClient]);

        try {
            const dbClient = mapClientToDB(client);
            const saved = await clientsAPI.create(dbClient);
            const mapped = mapClientFromDB(saved);

            // 2. Replace temp client with real client
            setClients(prev => prev.map(c => c.id === tempId ? mapped : c));
            return mapped;
        } catch (error) {
            console.error('[AppContext] Error adding client:', error);
            // Revert optimistic update
            setClients(prev => prev.filter(c => c.id !== tempId));
            throw error;
        }
    };

    const updateClient = async (client: Client) => {
        const dbClient = mapClientToDB(client);
        await clientsAPI.update(client.id, dbClient);
        setClients(prev => prev.map(c => c.id === client.id ? client : c));
    };

    const deleteClient = async (clientId: string) => {
        await clientsAPI.delete(clientId);
        setClients(prev => prev.filter(c => c.id !== clientId));
    };

    // Contracts
    const addContract = async (contract: Contract) => {
        // Optimistic UI Update
        const tempId = crypto.randomUUID();
        const tempContract: Contract = { ...contract, id: tempId };

        // 1. Update UI immediately
        setContracts(prev => [...prev, tempContract]);

        // Optimistic update for inventory reduction
        const originalItems = [...items]; // Backup for rollback
        if (contract.saleItems && contract.saleItems.length > 0) {
            const salesMap: Record<string, number> = {};
            contract.saleItems.forEach(id => {
                salesMap[id] = (salesMap[id] || 0) + 1;
            });
            setItems(prev => prev.map(item => {
                if (salesMap[item.id]) {
                    const newTotal = (item.totalQuantity || 1) - salesMap[item.id];
                    const newAvail = (item.availableQuantity || 1) - salesMap[item.id];
                    return { ...item, totalQuantity: Math.max(0, newTotal), availableQuantity: Math.max(0, newAvail) };
                }
                return item;
            }));
        }


        try {
            const saved = await contractsAPI.create(contract);

            // 2. Replace temp contract with real contract
            setContracts(prev => prev.map(c => c.id === tempId ? saved : c));

            // Sync inventory reduction with API (backend handles logic, but we persist state)
            // Ideally we would fetch updated items here, but to avoid extra requests we trust the optimistic logic matches backend
            // For now, let's keep the updateItem calls as "catch-up" or ensure backend did it.
            // Since backend "create contract" usually decrements stock if it's a sale, we might not need to call updateItem manually
            // unless the backend API doesn't handle stock decrement.
            // Assuming the original code called updateItem purely to sync frontend->backend manual decrement:
            // Since we are optimizing, let's trust the backend or fire-and-forget the update items if needed.
            // The original code was calculating and calling updateItem. Let's keep doing it properly in background.

            if (contract.saleItems && contract.saleItems.length > 0) {
                const salesMap: Record<string, number> = {};
                contract.saleItems.forEach(id => {
                    salesMap[id] = (salesMap[id] || 0) + 1;
                });

                for (const [itemId, qty] of Object.entries(salesMap)) {
                    // We already optimistically updated UI. Now perform backend update to be safe if `create contract` doesn't do it automagically
                    const item = originalItems.find(i => i.id === itemId);
                    if (item) {
                        const newTotal = (item.totalQuantity || 1) - qty;
                        const newAvail = (item.availableQuantity || 1) - qty;
                        // Await these updates without blocking the UI return since we already updated state
                        updateItem(itemId, {
                            totalQuantity: Math.max(0, newTotal),
                            availableQuantity: Math.max(0, newAvail)
                        }).catch(e => console.error('Background item update failed', e));
                    }
                }
            }

            return saved;
        } catch (error) {
            console.error('[AppContext] Error adding contract:', error);
            // Revert optimistic updates
            setContracts(prev => prev.filter(c => c.id !== tempId));
            setItems(originalItems); // Rollback items
            throw error;
        }
    };

    const updateContractStatus = async (contractId: string, status: ContractStatus) => {
        try {
            const contract = contracts.find(c => c.id === contractId);
            const updateData: any = { status };

            // Se estiver finalizando, garantir que o valor pago seja igual ao valor total
            if (status === 'Finalizado' && contract) {
                updateData.paidAmount = contract.totalValue;
                updateData.balance = 0;
            }

            const saved = await contractsAPI.update(contractId, updateData);
            setContracts(prev => prev.map(c => c.id === contractId ? saved : c));
        } catch (error) {
            console.error('[AppContext] Error updating contract status:', error);
        }
    };

    const updateContract = async (contractId: string, data: Partial<Contract>) => {
        const saved = await contractsAPI.update(contractId, data);
        setContracts(prev => prev.map(c => c.id === contractId ? saved : c));
    };

    const deleteContract = async (contractId: string) => {
        await contractsAPI.delete(contractId);
        setContracts(prev => prev.filter(c => c.id !== contractId));
    };

    // Appointments
    const addAppointment = async (appointment: Appointment) => {
        // Optimistic UI Update
        const tempId = crypto.randomUUID();
        const tempAppt: Appointment = { ...appointment, id: tempId };

        // 1. Update UI immediately
        setAppointments(prev => [...prev, tempAppt]);

        try {
            const saved = await appointmentsAPI.create(appointment);

            // 2. Replace temp appointment with real one
            setAppointments(prev => prev.map(a => a.id === tempId ? mapAppointmentFromDB(saved) : a));
        } catch (error) {
            console.error('[AppContext] Error adding appointment:', error);
            // Revert optimistic update
            setAppointments(prev => prev.filter(a => a.id !== tempId));
            throw error;
        }
    };

    const updateAppointment = async (appointment: Appointment) => {
        const saved = await appointmentsAPI.update(appointment.id, appointment);
        setAppointments(prev => prev.map(a => a.id === appointment.id ? mapAppointmentFromDB(saved) : a));
    };

    const deleteAppointment = async (appointmentId: string) => {
        await appointmentsAPI.delete(appointmentId);
        setAppointments(prev => prev.filter(a => a.id !== appointmentId));
    };

    // Transactions (placeholder)
    const addTransaction = async (transaction: Transaction) => {
        const saved = await transactionsAPI.create(transaction);
        setTransactions(prev => [saved, ...prev]);
    };

    const updateTransaction = async (transactionId: string, data: Partial<Transaction>) => {
        const saved = await transactionsAPI.update(transactionId, data);
        setTransactions(prev => prev.map(t => t.id === transactionId ? saved : t));
    };

    const deleteTransaction = async (transactionId: string) => {
        await transactionsAPI.delete(transactionId);
        setTransactions(prev => prev.filter(t => t.id !== transactionId));
    };

    // Employees
    const addEmployee = async (employee: Employee) => {
        // Not implemented in backend yet
        setEmployees(prev => [...prev, employee]);
    };

    const updateEmployee = async (employee: Employee) => {
        // Only updates role for now
        await employeesAPI.updateRole(employee.id, employee.role);
        setEmployees(prev => prev.map(e => e.id === employee.id ? { ...e, role: employee.role } : e));
    };

    const deleteEmployee = async (employeeId: string) => {
        await employeesAPI.delete(employeeId);
        setEmployees(prev => prev.filter(e => e.id !== employeeId));
    };

    // Settings
    const updateStoreSettings = async (partialSettings: any) => {
        // Optimistic update
        const newSettings = { ...storeSettings, ...partialSettings };
        setStoreSettings(newSettings);

        try {
            // Update backend
            // Note: Our API expects the full object or partial updates properly handled by the model logic
            // The controller we wrote does { ...updates } upsert, so partial is fine
            await settingsAPI.update(newSettings);
        } catch (error) {
            console.error('[AppContext] Error updating settings:', error);
            // Revert? For settings, minor sync issues aren't critical crashers, but logging is good.
        }
    };

    // Notifications
    const markAsRead = async (id: string) => {
        try {
            await notificationsAPI.markRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllRead = async () => {
        try {
            await notificationsAPI.markAllRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    const addNotification = async (notification: any) => {
        // For now, if adding on frontend, we don't necessarily persist here unless it's a backend event.
        // But for consistency we'll add to state.
        setNotifications(prev => [{ ...notification, id: notification.id || 'notif-' + Date.now(), read: false }, ...prev]);
    };

    // Helper
    const isItemAvailable = (itemId: string, startDate: string, endDate: string, excludeContractId?: string) => {
        const item = items.find(i => i.id === itemId);
        if (!item) return false;

        // Physical status blocking (applies to all units of this ID)
        if (item.status !== 'Disponível' && item.status !== 'Reservado' && item.status !== 'Alugado') return false;

        const requestedStart = new Date(startDate);
        const requestedEnd = new Date(endDate);
        requestedStart.setHours(0, 0, 0, 0);
        requestedEnd.setHours(0, 0, 0, 0);

        const sanitationBufferDays = 2;
        const bufferTime = sanitationBufferDays * 24 * 60 * 60 * 1000;

        const rentedInPeriod = contracts.reduce((count, c) => {
            if (excludeContractId && c.id === excludeContractId) return count;
            if (c.status === 'Cancelado' || c.status === 'Finalizado') return count;

            const cStart = new Date(c.startDate);
            const cEnd = new Date(c.endDate);
            cStart.setHours(0, 0, 0, 0);
            cEnd.setHours(0, 0, 0, 0);

            // Apply sanitation buffer to existing contract end date
            const cEndWithBuffer = new Date(cEnd.getTime() + bufferTime);

            const overlaps = !(requestedEnd < cStart || requestedStart > cEndWithBuffer);
            if (!overlaps) return count;

            // Count occurrences of this item ID in the contract
            return count + c.items.filter(id => id === itemId).length;
        }, 0);

        const totalQty = item.totalQuantity || 1;
        return rentedInPeriod < totalQty;
    };

    const value: AppContextType = {
        items,
        contracts,
        clients,
        appointments,
        transactions,
        employees,
        addItem,
        updateItemStatus,
        updateItem,
        deleteItem,
        addContract,
        updateContractStatus,
        updateContract,
        deleteContract,
        addClient,
        updateClient,
        deleteClient,
        addAppointment,
        updateAppointment,
        deleteAppointment,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        isItemAvailable,
        currentView,
        navigateTo,
        showWizard,
        openWizard,
        closeWizard,
        user,
        profile,
        signIn,
        signUp,
        signOut,
        isLoading,
        storeSettings,
        updateStoreSettings,
        notifications,
        unreadCount,
        markAsRead,
        markAllRead,
        addNotification,
        selectedContractId,
        setSelectedContractId,
        wizardInitialData
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
}
