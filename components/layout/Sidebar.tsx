

import React, { useEffect, useRef } from 'react';
import { NAV_ITEMS } from '../../constants';
import { Page, Permissions, CompanyInfo } from '../../types';
import { PackageIcon, LogOutIcon } from '../icons/Icons';
import ThemeToggle from './ThemeToggle';

interface SidebarProps {
    currentPage: Page;
    onLogout: () => void;
    permissions: Permissions;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isOpen: boolean) => void;
    companyInfo: CompanyInfo;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onLogout, permissions, isSidebarOpen, setIsSidebarOpen, companyInfo }) => {
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Close sidebar on link click on mobile
    const handleNavClick = (page: Page) => {
        window.location.hash = page;
        if (window.innerWidth < 1024) { // lg breakpoint
            setIsSidebarOpen(false);
        }
    };

    // Close sidebar on outside click on mobile
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
                if (isSidebarOpen && window.innerWidth < 1024) {
                    setIsSidebarOpen(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isSidebarOpen, setIsSidebarOpen]);


    const visibleNavItems = NAV_ITEMS.filter(item => {
       const key = item.permissionKey;
       return permissions[key];
    });

    return (
        <>
            {/* Backdrop for mobile */}
            <div 
                className={`fixed inset-0 bg-black/50 z-30 lg:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsSidebarOpen(false)}
                aria-hidden="true"
            ></div>

            <div
                ref={sidebarRef}
                className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 z-40 flex flex-col transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex items-center justify-center h-20 border-b border-gray-200 dark:border-gray-700 shrink-0 px-4">
                    <PackageIcon className="h-8 w-8 text-primary-600" />
                    <span className="ml-2 text-xl font-bold text-gray-800 dark:text-white truncate">{companyInfo.name || 'Facturación'}</span>
                </div>
                <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
                    {visibleNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentPage === item.id || (currentPage === 'configuracion' && item.id.startsWith('configuracion'));
                        return (
                            <a
                                key={item.id}
                                href={`#${item.id}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleNavClick(item.id);
                                }}
                                className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                                    isActive
                                        ? 'bg-primary-500 text-white shadow-lg'
                                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                }`}
                            >
                                <Icon className="w-5 h-5 mr-3" />
                                {item.label}
                            </a>
                        );
                    })}
                </nav>
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2 shrink-0">
                     <ThemeToggle />
                     <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 focus:outline-none transition-colors"
                    >
                        <LogOutIcon className="w-5 h-5" />
                        <span className="ml-2 text-sm">Cerrar Sesión</span>
                    </button>
                </div>
            </div>
        </>
    );
};

export default Sidebar;