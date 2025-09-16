import React, { ReactNode } from 'react';
import ToastProvider from '../components/ui/ToastProvider';
import { AuthProvider } from './AuthContext';
import { DataProvider } from './DataContext';
import { SystemProvider } from './SystemContext';

const AppProviders: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <ToastProvider>
            <SystemProvider>
                <AuthProvider>
                    <DataProvider>
                        {children}
                    </DataProvider>
                </AuthProvider>
            </SystemProvider>
        </ToastProvider>
    );
};

export default AppProviders;
