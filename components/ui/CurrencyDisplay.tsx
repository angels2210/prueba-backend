import React from 'react';

interface CurrencyDisplayProps {
    bcvRate?: number | null; // Permitimos que el valor pueda ser nulo
}

const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({ bcvRate }) => {
    // Si bcvRate es nulo o indefinido, usamos 0 como valor por defecto.
    const rate = bcvRate ?? 0;

    return (
        <div className="hidden sm:flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Dólar (BCV):</span>
            <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                {rate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
            </span>
        </div>
    );
};

export default CurrencyDisplay;