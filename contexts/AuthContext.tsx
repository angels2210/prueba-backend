
import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { User } from '../types';
import apiFetch from '../utils/api';

interface AuthContextType {
    isAuthenticated: boolean;
    currentUser: User | null;
    isAuthLoading: boolean;
    setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
    setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    useEffect(() => {
        const validateSession = async () => {
            const token = localStorage.getItem('authToken');
            if (token) {
                try {
                    // This endpoint should validate the token and return the user object
                    const userProfile = await apiFetch('/auth/profile');
                    if (userProfile) {
                        setCurrentUser(userProfile);
                        setIsAuthenticated(true);
                    } else {
                        throw new Error("Invalid profile data");
                    }
                } catch (error) {
                    console.error("Session validation failed:", error);
                    localStorage.removeItem('authToken');
                    setIsAuthenticated(false);
                    setCurrentUser(null);
                }
            }
            setIsAuthLoading(false);
        };

        validateSession();
    }, []);

    return (
        <AuthContext.Provider value={{ isAuthenticated, isAuthLoading, currentUser, setIsAuthenticated, setCurrentUser }}>
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
