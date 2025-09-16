import React, { createContext, useContext, useEffect, useCallback, ReactNode, useState } from 'react';
// import usePersistentState from '../hooks/usePersistentState';
import { AuditLog, User, AppError } from '../types';

interface SystemContextType {
    auditLog: AuditLog[];
    appErrors: AppError[];
    logAction: (user: User, actionType: string, details: string, targetId?: string) => void;
    setAppErrors: React.Dispatch<React.SetStateAction<AppError[]>>;
}

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export const SystemProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // FIX: The usePersistentState hook is obsolete. Replaced with React.useState.
    const [auditLog, setAuditLog] = useState<AuditLog[]>([]);
    const [appErrors, setAppErrors] = useState<AppError[]>([]);

    const logAction = useCallback((user: User, actionType: string, details: string, targetId?: string) => {
        if (!user) return;
        const newLogEntry: AuditLog = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: user.id,
            userName: user.name,
            action: actionType,
            details: details,
            targetId: targetId
        };
        setAuditLog(prev => [newLogEntry, ...prev]);
    }, [setAuditLog]);

    useEffect(() => {
        const handleError = (message: Event | string, source?: string, lineno?: number, colno?: number, error?: Error) => {
            const newError: AppError = {
                id: `err-${Date.now()}`,
                message: typeof message === 'string' ? message : (message as ErrorEvent).message,
                source: source || 'unknown',
                lineno: lineno || 0,
                colno: colno || 0,
                error: error ? error.stack || error.toString() : 'N/A',
                timestamp: new Date().toISOString(),
            };
            setAppErrors(prev => [newError, ...prev.slice(0, 99)]);
        };
        window.onerror = handleError;
        return () => { window.onerror = null; };
    }, [setAppErrors]);

    return (
        <SystemContext.Provider value={{ auditLog, appErrors, logAction, setAppErrors }}>
            {children}
        </SystemContext.Provider>
    );
};

export const useSystem = (): SystemContextType => {
    const context = useContext(SystemContext);
    if (!context) {
        throw new Error('useSystem must be used within a SystemProvider');
    }
    return context;
};
