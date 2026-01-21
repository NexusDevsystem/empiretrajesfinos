import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Item, Contract, Client, ContractStatus, Appointment, Transaction, Employee } from '../types';
import { authAPI, itemsAPI, clientsAPI, contractsAPI, appointmentsAPI, transactionsAPI, employeesAPI } from '../services/api';

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
    deleteTransaction: (transactionId: string) => Promise<void>;

    addEmployee: (employee: Employee) => Promise<void>;
    updateEmployee: (employee: Employee) => Promise<void>;
    deleteEmployee: (employeeId: string) => Promise<void>;

    isItemAvailable: (itemId: string, startDate: string, endDate: string, excludeContractId?: string) => boolean;

    currentView: string;
    navigateTo: (view: string) => void;
    showWizard: boolean;
    openWizard: () => void;
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
    addNotification: (notification: any) => Promise<void>;
    selectedContractId: string | null;
    setSelectedContractId: (id: string | null) => void;
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
    status: db.status,
    statusColor: db.status_color || 'primary',
    img: db.image_url || '',
    loc: db.location || '',
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
    status: item.status,
    status_color: item.statusColor,
    image_url: item.img,

    // Campos de quantidade
    total_quantity: item.totalQuantity,
    available_quantity: item.availableQuantity,
    rented_units: item.rentedUnits,
    location: item.loc,
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
    measurements: db.measurements,
    img: ''
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
    measurements: client.measurements
});

export function AppProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<Item[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [currentView, setCurrentView] = useState('dashboard');
    const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
    const [showWizard, setShowWizard] = useState(false);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [profile, setProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [storeSettings, setStoreSettings] = useState<any>({
        store_name: 'Empire Trajes Finos',
        store_cnpj: '52.377.689/0001-71',
        store_address: 'Av. Transmangueirão, Belém - PA',
        store_phone: '(91) 98428-7746',
        store_email: 'empiretrajesfinos@gmail.com',
        store_instagram: '@empiretrajesfinos'
    });
    const [notifications, setNotifications] = useState<any[]>([]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const openWizard = () => setShowWizard(true);
    const closeWizard = () => setShowWizard(false);
    const navigateTo = (view: string) => setCurrentView(view);

    // Load data on mount
    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const userData = await authAPI.getMe();
                    setUser(userData);
                    setProfile(userData);
                    await loadData();
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

    const loadData = async () => {
        try {
            const [itemsData, clientsData, employeesData, contractsData, appointmentsData] = await Promise.all([
                itemsAPI.getAll(),
                clientsAPI.getAll(),
                employeesAPI.getAll(),
                contractsAPI.getAll(),
                appointmentsAPI.getAll()
            ]);

            setItems(itemsData.map(mapItemFromDB));
            setClients(clientsData.map(mapClientFromDB));
            setContracts(contractsData);
            setAppointments(appointmentsData);

            // Map employees
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
            console.error('Error loading data:', error);
        } finally {
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

            await loadData();
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
        await loadData();
    };

    const signOut = async () => {
        localStorage.removeItem('token');
        setUser(null);
        setProfile(null);
        setItems([]);
        setClients([]);
        setContracts([]);
    };

    // Items
    const addItem = async (item: Item) => {
        const dbItem = mapItemToDB(item);
        const saved = await itemsAPI.create(dbItem);
        setItems(prev => [...prev, mapItemFromDB(saved)]);
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
        try {
            const dbClient = mapClientToDB(client);
            const saved = await clientsAPI.create(dbClient);
            const mapped = mapClientFromDB(saved);
            setClients(prev => [...prev, mapped]);
            return mapped;
        } catch (error) {
            console.error('[AppContext] Error adding client:', error);
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
        try {
            const saved = await contractsAPI.create(contract);
            setContracts(prev => [...prev, saved]);
            return saved;
        } catch (error) {
            console.error('[AppContext] Error adding contract:', error);
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
        const saved = await appointmentsAPI.create(appointment);
        setAppointments(prev => [...prev, saved]);
    };

    const updateAppointment = async (appointment: Appointment) => {
        const saved = await appointmentsAPI.update(appointment.id, appointment);
        setAppointments(prev => prev.map(a => a.id === appointment.id ? saved : a));
    };

    const deleteAppointment = async (appointmentId: string) => {
        await appointmentsAPI.delete(appointmentId);
        setAppointments(prev => prev.filter(a => a.id !== appointmentId));
    };

    // Transactions (placeholder)
    const addTransaction = async (transaction: Transaction) => {
        setTransactions(prev => [...prev, transaction]);
    };

    const deleteTransaction = async (transactionId: string) => {
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
    const updateStoreSettings = async (settings: any) => {
        setStoreSettings(settings);
    };

    // Notifications
    const markAsRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const addNotification = async (notification: any) => {
        setNotifications(prev => [{ ...notification, id: 'notif-' + Date.now(), read: false }, ...prev]);
    };

    // Helper
    const isItemAvailable = (itemId: string, startDate: string, endDate: string, excludeContractId?: string) => {
        const item = items.find(i => i.id === itemId);
        if (!item) return false;

        // Physical status blocking (applies to all units of this ID)
        if (item.status !== 'Disponível' && item.status !== 'Reservado' && item.status !== 'Alugado') return false;

        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        const rentedInPeriod = contracts.reduce((count, c) => {
            if (excludeContractId && c.id === excludeContractId) return count;
            if (c.status === 'Cancelado' || c.status === 'Finalizado') return count;

            const cStart = new Date(c.startDate);
            const cEnd = new Date(c.endDate);
            cStart.setHours(0, 0, 0, 0);
            cEnd.setHours(0, 0, 0, 0);

            const overlaps = !(end < cStart || start > cEnd);
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
        addNotification,
        selectedContractId,
        setSelectedContractId
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
