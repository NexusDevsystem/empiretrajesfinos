import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { useToast } from './ToastContext';

interface PackageItemConfig {
    category: string;
    quantity: number;
}

export interface Package {
    _id: string;
    name: string;
    description?: string;
    price: number;
    items_config: PackageItemConfig[];
    active: boolean;
}

interface PackageContextData {
    packages: Package[];
    loading: boolean;
    refreshPackages: () => Promise<void>;
    addPackage: (pkg: Omit<Package, '_id' | 'active'>) => Promise<void>;
    updatePackage: (id: string, pkg: Partial<Package>) => Promise<void>;
    deletePackage: (id: string) => Promise<void>;
}

const PackageContext = createContext<PackageContextData>({} as PackageContextData);

export function PackageProvider({ children }: { children: ReactNode }) {
    const [packages, setPackages] = useState<Package[]>([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    // Base URL configuration - adjusting to use the same logic as other services
    // Assuming Vite proxy or direct URL. Let's use relative path /api assuming proxy/cors is set up
    // matching the server.ts allowed origins.
    const API_URL = 'http://localhost:5000/api/packages'; // Local dev fallback

    const fetchPackages = async () => {
        try {
            setLoading(true);
            const response = await axios.get(API_URL);
            setPackages(response.data);
        } catch (error) {
            console.error('Error fetching packages:', error);
            // showToast('error', 'Erro ao carregar pacotes'); // Optional: prevent spam on load
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPackages();
    }, []);

    const addPackage = async (pkg: Omit<Package, '_id' | 'active'>) => {
        try {
            const response = await axios.post(API_URL, pkg);
            setPackages(prev => [...prev, response.data]);
            showToast('success', 'Pacote criado com sucesso!');
        } catch (error) {
            console.error('Error adding package:', error);
            showToast('error', 'Erro ao criar pacote.');
            throw error;
        }
    };

    const updatePackage = async (id: string, pkg: Partial<Package>) => {
        try {
            const response = await axios.put(`${API_URL}/${id}`, pkg);
            setPackages(prev => prev.map(p => p._id === id ? response.data : p));
            showToast('success', 'Pacote atualizado!');
        } catch (error) {
            console.error('Error updating package:', error);
            showToast('error', 'Erro ao atualizar pacote.');
            throw error;
        }
    };

    const deletePackage = async (id: string) => {
        try {
            await axios.delete(`${API_URL}/${id}`);
            setPackages(prev => prev.filter(p => p._id !== id));
            showToast('success', 'Pacote removido!');
        } catch (error) {
            console.error('Error deleting package:', error);
            showToast('error', 'Erro ao remover pacote.');
            throw error;
        }
    };

    return (
        <PackageContext.Provider value={{ packages, loading, refreshPackages: fetchPackages, addPackage, updatePackage, deletePackage }}>
            {children}
        </PackageContext.Provider>
    );
}

export const usePackages = () => useContext(PackageContext);
