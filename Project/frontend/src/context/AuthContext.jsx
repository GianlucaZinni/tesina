// ~/Project/frontend/src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { login as loginService, logout as logoutService, getSession } from '@/api/services/authService';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // indica si se está validando la sesión

    useEffect(() => {
        const checkSession = async () => {
            try {
                const session = await getSession();
                if (session.authenticated) {
                    setUser(session.user);
                } else {
                    setUser(null);
                }
            } catch (error) {
                console.log("🔴 No autenticado:", error.message);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
    
        checkSession();
    }, []);

    const login = async (credentials) => {
        const data = await loginService(credentials);
        if (data.status === 'ok') {
            setUser(data.user);
            if (data.access_token) {
                localStorage.setItem('token', data.access_token);
            }
        }
        return data;
    };

    const logout = async () => {
        await logoutService();
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
            {children}
        </AuthContext.Provider>
    );
}
