export type ItemStatus = 'Disponível' | 'Reservado' | 'Alugado' | 'Devolução' | 'No Atelier' | 'Na Lavanderia' | 'Quarentena';

export interface Item {
    id: string;
    name: string;
    type: string;
    size: string;
    status: ItemStatus;
    statusColor: string; // 'primary' | 'red' | 'orange' | 'cyan' | 'purple'
    img: string;
    loc: string; // Location code or status text
    code?: string; // Product Code
    color?: string;
    note?: string; // e.g. "24 Out - 28 Out"
    price: number; // Rental price in BRL
    salePrice?: number; // Sale price in BRL

    // Campos de quantidade para sistema de estoque
    totalQuantity?: number;
    availableQuantity?: number;
    rentedUnits?: number;
}

export interface Client {
    id: string;
    name: string;
    type?: string; // @deprecated - Moving to Contract.eventType
    phone: string;
    email: string;
    img?: string;
    initials?: string;
    // New fields from registration form
    cpf?: string;
    rg?: string;
    address?: string; // END
    number?: string;
    neighborhood?: string; // BAIRRO
    city?: string; // CIDADE
    state?: string; // ESTADO
    zip?: string; // CEP
    birthDate?: string; // DNASC

    // Measurements
    measurements?: {
        height?: string; // Altura
        weight?: string; // Peso
        shoeSize?: string; // Sapato
        shirtSize?: string; // Camisa
        pantsSize?: string; // Calça
        jacketSize?: string; // Paletó
        chest?: string; // Tórax
        waist?: string; // Cintura
        hips?: string; // Quadril
        shoulder?: string; // Ombro
        sleeve?: string; // Manga
        inseam?: string; // Entrepernas
        neck?: string; // Pescoço
    };
}

export type ContractStatus = 'Agendado' | 'Ativo' | 'Finalizado' | 'Cancelado' | 'Aguardando Assinatura' | 'Rascunho';

export interface Transaction {
    id: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    date: string; // ISO Date String
    dueDate?: string; // Optional due date for payables
    status?: 'pago' | 'pendente'; // New field for payables
    contractId?: string; // Optional link to a contract
}
export type EventType = string;

export interface Contract {
    id: string; // e.g. #CN-2023-849
    contractType: 'Aluguel' | 'Venda';
    clientId: string;
    clientName?: string;
    items: string[]; // List of Rental Item IDs
    saleItems?: string[]; // List of Sold Item IDs
    startDate: string; // ISO Date or formatted string
    startTime?: string; // HH:mm
    endDate: string;
    endTime?: string; // HH:mm
    totalValue: number;
    status: ContractStatus;
    statusColor: string;
    eventType: EventType;
    eventDate: string; // The specific day of the event
    terms?: string;

    // Debutante Specifics
    debutanteDetails?: {
        name: string;
        birthDate: string;
        theme: string; // TEMA
        preferredColor: string; // COR PREFERIDA
        instagram: string;
        preferredMusic: string; // MÚSICA PREFERIDA
        eventLocation: string; // LOCAL DO EVENTO
    };
    packageDetails?: {
        reception?: boolean; // (1) Traje Recepção
        waltz?: boolean; // (2) Traje Valsa
        party?: boolean; // (3) Traje Balada
        accessories?: boolean; // (4) Acessórios
        family?: boolean; // (5) Traje Família
        firstRental?: boolean; // Confecção Primeiro Aluguel
        original_price?: number;
        slots?: any;
    };
    packageId?: string;
    packageName?: string;

    // Generic/Normal Specifics
    eventLocation?: string;
    contact?: string;
    guestRole?: 'Anfitrião' | 'Convidado';
    isFirstRental?: boolean;

    // Financials
    paidAmount?: number;
    paymentMethod?: string;
    balance?: number;

    // Signatures (Base64)
    lesseeSignature?: string;
    attendantSignature?: string;
    isPhysicallySigned?: boolean;
    number?: number;

    // Technical Details
    fittingDate?: string;
    fittingTime?: string;
    measurements?: any; // Stores Client.measurements snapshot
    observations?: string;
}

export type AppointmentType = 'Primeira Visita' | 'Prova de Traje' | 'Retirada' | 'Devolução' | 'Ajustes Finais' | 'Outro';

export interface Appointment {
    id: string;
    clientId?: string;
    clientName?: string;
    contractId?: string; // Optional, can be a pre-sale visit
    date: string; // YYYY-MM-DD
    time: string; // HH:mm
    type: AppointmentType;
    notes?: string;
    status: 'Agendado' | 'Concluído' | 'Cancelado';
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    type: ToastType;
    title?: string;
    message: string;
    duration?: number;
}

export interface Employee {
    id: string;
    name: string;
    role: string;
    email: string;
    phone: string;
    pixKey?: string;
    salary?: number;
    commissionRate?: number; // Percentage 0-100
    admissionDate: string;
    status: 'Ativo' | 'Férias' | 'Afastado' | 'Desligado';
    avatar?: string;
    notes?: string;
}

export interface Receipt {
    id: string; // Mongo ID
    number: number;
    value: number;
    clientName: string;
    clientDoc?: string;
    clientId?: string;
    date: string;
    concept: string;
    paymentMethod: string;
    contractId?: string;
    created_at?: string;
}
