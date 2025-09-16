import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { useToast } from '../components/ui/ToastProvider';
import { useSystem } from './SystemContext';

const API_URL = 'http://localhost:5000/api';

interface AuthContextType {
    isAuthenticated: boolean;
    currentUser: User | null;
    token: string | null;
    handleLogin: (username: string, password: string, rememberMe: boolean) => Promise<void>;
    handleLogout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const { addToast } = useToast();
    const { logAction } = useSystem();

    const handleLogout = useCallback(() => {
        if (currentUser) {
            logAction(currentUser, 'CIERRE_SESION', `El usuario '${currentUser.name}' cerró sesión.`);
        }
        localStorage.removeItem('authToken');
        setToken(null);
        setCurrentUser(null);
        setIsAuthenticated(false);
        window.location.hash = '';
        addToast({ type: 'info', title: 'Sesión Cerrada', message: 'Ha cerrado sesión exitosamente.' });
    }, [currentUser, logAction, addToast]);

    // This effect runs only once on mount to check for an existing token
    useEffect(() => {
        const validateTokenOnLoad = async () => {
            const existingToken = localStorage.getItem('authToken');
            if (existingToken) {
                try {
                    const response = await fetch(`${API_URL}/auth/me`, {
                        headers: { 'Authorization': `Bearer ${existingToken}` }
                    });

                    if (response.ok) {
                        const user = await response.json();
                        setCurrentUser(user);
                        setToken(existingToken);
                        setIsAuthenticated(true);
                    } else {
                        localStorage.removeItem('authToken');
                    }
                } catch (error) {
                    console.error("Token validation failed on load:", error);
                    localStorage.removeItem('authToken');
                }
            }
            setLoading(false);
        };
        validateTokenOnLoad();
    }, []); // Empty dependency array ensures this runs only once on mount.

    const handleLogin = async (username: string, password: string, rememberMe: boolean) => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Usuario o contraseña incorrectos');
            }

            const { token: newToken, user } = await response.json();

            localStorage.setItem('authToken', newToken);
            if (rememberMe) {
                localStorage.setItem('rememberedUser', user.username);
            } else {
                localStorage.removeItem('rememberedUser');
            }
            
            setToken(newToken);
            setCurrentUser(user);
            setIsAuthenticated(true);
            
            logAction(user, 'INICIO_SESION', `El usuario '${user.name}' inició sesión.`);
            addToast({ type: 'success', title: '¡Bienvenido!', message: `Ha iniciado sesión como ${user.name}.` });
            window.location.hash = 'dashboard';

        } catch (error: any) {
            addToast({ type: 'error', title: 'Error de Autenticación', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, currentUser, token, handleLogin, handleLogout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
