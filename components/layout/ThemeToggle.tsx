

import React, { useState, useEffect } from 'react';
import { SunIcon, MoonIcon } from '../icons/Icons';

const ThemeToggle: React.FC = () => {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.theme === 'dark';
        }
        return false;
    });

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.theme = 'dark';
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.theme = 'light';
        }
    }, [isDarkMode]);

    return (
        <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-white"
        >
            {isDarkMode ? (
                <>
                    <SunIcon className="w-5 h-5" />
                    <span className="ml-2 text-sm">Modo Claro</span>
                </>
            ) : (
                <>
                    <MoonIcon className="w-5 h-5" />
                    <span className="ml-2 text-sm">Modo Oscuro</span>
                </>
            )}
        </button>
    );
};

export default ThemeToggle;