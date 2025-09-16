import React, { useState, useMemo } from 'react';
import { Asociado, Vehicle, Certificado, PagoAsociado, ReciboPagoAsociado, Permissions, CompanyInfo } from '../../types';
import Card, { CardHeader, CardTitle } from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { SearchIcon, PlusIcon, UserIcon, ArrowLeftIcon } from '../icons/Icons';
import AsociadoDetailView from './AsociadoDetailView';

interface AsociadosGestionViewProps {
    asociados: Asociado[];
    onSaveAsociado: (asociado: Asociado) => void;
    onDeleteAsociado: (asociadoId: string) => void;
    vehicles: Vehicle[];
    onSaveVehicle: (vehicle: Vehicle) => void;
    onDeleteVehicle: (vehicleId: string) => void;
    certificados: Certificado[];
    onSaveCertificado: (certificado: Certificado) => void;
    onDeleteCertificado: (certificadoId: string) => void;
    pagos: PagoAsociado[];
    onSavePago: (pago: PagoAsociado) => void;
    onDeletePago: (pagoId: string) => void;
    recibos: ReciboPagoAsociado[];
    onSaveRecibo: (recibo: ReciboPagoAsociado) => void;
    permissions: Permissions;
    companyInfo: CompanyInfo;
}

const AsociadosGestionView: React.FC<AsociadosGestionViewProps> = (props) => {
    const { asociados, permissions, onSaveAsociado } = props;
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAsociado, setSelectedAsociado] = useState<Asociado | null>(null);

    const filteredAsociados = useMemo(() => {
        if (!searchTerm) return asociados;
        const lowercasedTerm = searchTerm.toLowerCase();
        return asociados.filter(a =>
            a.nombre.toLowerCase().includes(lowercasedTerm) ||
            a.codigo.toLowerCase().includes(lowercasedTerm) ||
            a.cedula.includes(lowercasedTerm)
        );
    }, [asociados, searchTerm]);

    const handleSelectAsociado = (asociado: Asociado) => {
        setSelectedAsociado(asociado);
    };
    
    const handleCreateNew = () => {
        const newAsociado: Asociado = {
            id: '',
            codigo: '',
            nombre: 'Nuevo Asociado',
            cedula: '',
            fechaNacimiento: new Date().toISOString().split('T')[0],
            fechaIngreso: new Date().toISOString().split('T')[0],
            telefono: '',
            direccion: '',
            status: 'Activo',
        };
        setSelectedAsociado(newAsociado);
    };

    const handleBackToList = () => {
        setSelectedAsociado(null);
    };
    
    if (selectedAsociado) {
        return <AsociadoDetailView 
            asociado={selectedAsociado} 
            onBack={handleBackToList}
            onSaveAsociado={onSaveAsociado}
            {...props}
        />
    }

    return (
        <div className="space-y-4">
             <Button variant="secondary" onClick={() => window.location.hash = 'asociados'}>
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Volver al Módulo de Asociados
            </Button>
            <Card>
                <CardHeader>
                    <div className="flex flex-wrap justify-between items-center gap-4">
                        <CardTitle>Búsqueda de Asociados</CardTitle>
                        {permissions['asociados.create'] && (
                             <Button onClick={handleCreateNew}>
                                <PlusIcon className="w-4 h-4 mr-2" /> Nuevo Asociado
                            </Button>
                        )}
                    </div>
                    <div className="mt-4 max-w-lg">
                        <Input 
                            label=""
                            id="search-asociados" 
                            placeholder="Buscar por código, nombre o cédula..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            icon={<SearchIcon className="w-4 h-4 text-gray-400"/>} 
                        />
                    </div>
                </CardHeader>

                <div className="mt-4 space-y-3">
                    {filteredAsociados.length > 0 ? filteredAsociados.map(asociado => (
                         <div key={asociado.id} 
                            className="p-4 border dark:border-gray-700 rounded-lg flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                            onClick={() => handleSelectAsociado(asociado)}
                         >
                            <div className="flex items-center gap-4">
                                <div className="bg-gray-200 dark:bg-gray-700 p-2 rounded-full">
                                    <UserIcon className="w-6 h-6 text-gray-600 dark:text-gray-400"/>
                                </div>
                                <div>
                                    <p className="font-bold text-primary-600 dark:text-primary-400">{asociado.nombre}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Código: {asociado.codigo} - C.I: {asociado.cedula}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${asociado.status === 'Activo' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                                {asociado.status}
                            </span>
                        </div>
                    )) : (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <p>No se encontraron asociados.</p>
                            {searchTerm && <p className="text-sm">Intente con otro término de búsqueda.</p>}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default AsociadosGestionView;
