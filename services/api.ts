import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth API
export const authAPI = {
    login: async (email: string, password: string) => {
        const { data } = await api.post('/auth/login', { email, password });
        return data;
    },
    register: async (email: string, password: string, full_name: string) => {
        const { data } = await api.post('/auth/register', { email, password, full_name });
        return data;
    },
    getMe: async () => {
        const { data } = await api.get('/auth/me');
        return data;
    }
};

// Items API
export const itemsAPI = {
    getAll: async () => {
        const { data } = await api.get('/items');
        return data;
    },
    getOne: async (id: string) => {
        const { data } = await api.get(`/items/${id}`);
        return data;
    },
    create: async (item: any) => {
        const { data } = await api.post('/items', item);
        return data;
    },
    update: async (id: string, item: any) => {
        const { data } = await api.put(`/items/${id}`, item);
        return data;
    },
    delete: async (id: string) => {
        const { data } = await api.delete(`/items/${id}`);
        return data;
    }
};

// Clients API
export const clientsAPI = {
    getAll: async () => {
        const { data } = await api.get('/clients');
        return data;
    },
    getOne: async (id: string) => {
        const { data } = await api.get(`/clients/${id}`);
        return data;
    },
    create: async (client: any) => {
        const { data } = await api.post('/clients', client);
        return data;
    },
    update: async (id: string, client: any) => {
        const { data } = await api.put(`/clients/${id}`, client);
        return data;
    },
    delete: async (id: string) => {
        const { data } = await api.delete(`/clients/${id}`);
        return data;
    }
};

// Contracts API
export const contractsAPI = {
    getAll: async () => {
        const { data } = await api.get('/contracts');
        return data;
    },
    create: async (contract: any) => {
        const { data } = await api.post('/contracts', contract);
        return data;
    },
    update: async (id: string, contract: any) => {
        const { data } = await api.put(`/contracts/${id}`, contract);
        return data;
    },
    delete: async (id: string) => {
        const { data } = await api.delete(`/contracts/${id}`);
        return data;
    }
};

// Appointments API
export const appointmentsAPI = {
    getAll: async () => {
        const { data } = await api.get('/appointments');
        return data;
    },
    create: async (appointment: any) => {
        const { data } = await api.post('/appointments', appointment);
        return data;
    },
    update: async (id: string, appointment: any) => {
        const { data } = await api.put(`/appointments/${id}`, appointment);
        return data;
    },
    delete: async (id: string) => {
        const { data } = await api.delete(`/appointments/${id}`);
        return data;
    }
};

// Transactions API
export const transactionsAPI = {
    getAll: async () => {
        const { data } = await api.get('/transactions');
        return data;
    }
};

// Employees API
export const employeesAPI = {
    getAll: async () => {
        const { data } = await api.get('/employees');
        return data;
    },
    updateRole: async (id: string, role: string) => {
        const { data } = await api.put(`/employees/${id}/role`, { role });
        return data;
    },
    delete: async (id: string) => {
        const { data } = await api.delete(`/employees/${id}`);
        return data;
    }
};

// Notifications API
export const notificationsAPI = {
    getAll: async () => {
        const { data } = await api.get('/notifications');
        return data;
    }
};

// Settings API
export const settingsAPI = {
    getAll: async () => {
        const { data } = await api.get('/settings');
        return data;
    }
};

export default api;
