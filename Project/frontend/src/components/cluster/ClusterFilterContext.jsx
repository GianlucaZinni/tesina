// ~/Project/frontend/src/components/cluster/ClusterFilterContext.jsx
import { createContext, useContext, useState, useMemo, useCallback } from 'react';

// Contexto global para filtros de clúster
const ClusterFilterContext = createContext();

export function ClusterFilterProvider({ children }) {
    const [filters, setFilters] = useState({});
    const [refreshToken, setRefreshToken] = useState(Date.now());

    // Actualiza una clave de filtro con un array de valores permitidos
    const updateFilter = useCallback((key, values) => {
        setFilters(prev => ({
            ...prev,
            [key]: values
        }));
        setRefreshToken(Date.now());
    }, []);

    // Limpia todos los filtros
    const clearFilters = useCallback(() => {
        setFilters({});
        setRefreshToken(Date.now());
    }, []);

    const value = useMemo(() => ({
        filters,
        updateFilter,
        clearFilters,
        refreshToken
    }), [filters, updateFilter, clearFilters, refreshToken]);

    return (
        <ClusterFilterContext.Provider value={value}>
            {children}
        </ClusterFilterContext.Provider>
    );
}

// Hook para consumir el contexto desde cualquier parte del sistema
export function useClusterFilters() {
    const context = useContext(ClusterFilterContext);
    if (!context) {
        throw new Error('useClusterFilters must be used within a ClusterFilterProvider');
    }
    return context;
}
