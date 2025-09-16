import React, { createContext, useContext, ReactNode, useCallback, useState, useEffect } from 'react';
import { 
    Invoice, Client, Vehicle, Expense, InventoryItem, Asset, AssetCategory, Supplier,
    PaymentStatus, ShippingStatus, MasterStatus, Asociado, Certificado, PagoAsociado, 
    ReciboPagoAsociado, Remesa, CompanyInfo, Category, User, Role, Office, ShippingType, 
    PaymentMethod, Permissions, ExpenseCategory
} from '../types';
import { useToast } from '../components/ui/ToastProvider';
import { useSystem } from './SystemContext';
import { useAuth } from './AuthContext';

const API_URL = 'http://localhost:5000/api';

// API Helper
const getAuthToken = () => localStorage.getItem('authToken');

const handleApiResponse = async (response: Response) => {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || 'Ocurrió un error en el servidor');
    }
    if (response.status === 204) return null; // No content
    return response.json();
};

const api = {
    get: (endpoint: string) => fetch(`${API_URL}${endpoint}`, { headers: { 'Authorization': `Bearer ${getAuthToken()}` } }).then(handleApiResponse),
    post: (endpoint: string, body: any) => fetch(`${API_URL}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` }, body: JSON.stringify(body) }).then(handleApiResponse),
    put: (endpoint: string, body: any) => fetch(`${API_URL}${endpoint}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` }, body: JSON.stringify(body) }).then(handleApiResponse),
    delete: (endpoint: string) => fetch(`${API_URL}${endpoint}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getAuthToken()}` } }).then(handleApiResponse),
};


type DataContextType = {
    loading: boolean;
    // From ConfigContext
    companyInfo: CompanyInfo;
    categories: Category[];
    users: User[];
    roles: Role[];
    offices: Office[];
    shippingTypes: ShippingType[];
    paymentMethods: PaymentMethod[];
    expenseCategories: ExpenseCategory[];
    userPermissions: Permissions;
    handleCompanyInfoSave: (info: CompanyInfo) => Promise<void>;
    handleSaveUser: (user: User) => Promise<void>;
    onDeleteUser: (userId: string) => Promise<void>;
    handleSaveRole: (role: Role) => Promise<void>;
    onDeleteRole: (roleId: string) => Promise<void>;
    onUpdateRolePermissions: (roleId: string, permissions: Permissions) => Promise<void>;
    handleSaveCategory: (category: Category) => Promise<void>;
    onDeleteCategory: (categoryId: string) => Promise<void>;
    handleSaveOffice: (office: Office) => Promise<void>;
    onDeleteOffice: (officeId: string) => Promise<void>;
    handleSaveShippingType: (shippingType: ShippingType) => Promise<void>;
    onDeleteShippingType: (shippingTypeId: string) => Promise<void>;
    handleSavePaymentMethod: (paymentMethod: PaymentMethod) => Promise<void>;
    onDeletePaymentMethod: (paymentMethodId: string) => Promise<void>;
    handleSaveExpenseCategory: (category: ExpenseCategory) => Promise<void>;
    onDeleteExpenseCategory: (categoryId: string) => Promise<void>;

    // From DataContext
    invoices: Invoice[];
    clients: Client[];
    suppliers: Supplier[];
    vehicles: Vehicle[];
    expenses: Expense[];
    inventory: InventoryItem[];
    assets: Asset[];
    assetCategories: AssetCategory[];
    asociados: Asociado[];
    certificados: Certificado[];
    pagosAsociados: PagoAsociado[];
    recibosPagoAsociados: ReciboPagoAsociado[];
    remesas: Remesa[];
    setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
    setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
    handleSaveClient: (client: Client) => Promise<Client | undefined>;
    handleDeleteClient: (clientId: string) => Promise<void>;
    handleSaveSupplier: (supplier: Supplier) => Promise<Supplier | undefined>;
    handleDeleteSupplier: (supplierId: string) => Promise<void>;
    handleSaveInvoice: (invoice: Omit<Invoice, 'status' | 'paymentStatus' | 'shippingStatus'>) => Promise<void>;
    handleUpdateInvoice: (updatedInvoice: Invoice) => Promise<void>;
    handleUpdateInvoiceStatuses: (invoiceId: string, newStatuses: { paymentStatus?: PaymentStatus, shippingStatus?: ShippingStatus, status?: MasterStatus }) => Promise<void>;
    handleDeleteInvoice: (invoiceId: string) => Promise<void>;
    handleSaveVehicle: (vehicle: Vehicle) => Promise<void>;
    handleDeleteVehicle: (vehicleId: string) => Promise<void>;
    handleAssignToVehicle: (invoiceIds: string[], vehicleId: string) => Promise<void>;
    handleUnassignInvoice: (invoiceId: string) => Promise<void>;
    handleDispatchVehicle: (vehicleId: string) => Promise<void>;
    onUndoDispatch: (vehicleId: string) => Promise<void>;
    handleFinalizeTrip: (vehicleId: string) => Promise<void>;
    handleSaveExpense: (expense: Expense) => Promise<void>;
    handleDeleteExpense: (expenseId: string) => Promise<void>;
    handleSaveAsset: (asset: Asset) => Promise<void>;
    handleDeleteAsset: (assetId: string) => Promise<void>;
    handleSaveAssetCategory: (category: AssetCategory) => Promise<void>;
    handleDeleteAssetCategory: (categoryId: string) => Promise<void>;
    handleSaveAsociado: (asociado: Asociado) => Promise<void>;
    handleDeleteAsociado: (asociadoId: string) => Promise<void>;
    handleSaveCertificado: (certificado: Certificado) => Promise<void>;
    handleDeleteCertificado: (certificadoId: string) => Promise<void>;
    handleSavePagoAsociado: (pago: PagoAsociado) => Promise<void>;
    handleDeletePagoAsociado: (pagoId: string) => Promise<void>;
    handleSaveRecibo: (recibo: ReciboPagoAsociado) => Promise<void>;
    handleCreateRemesa: (data: { asociadoId: string, vehicleId: string, invoiceIds: string[], date: string }) => Promise<Remesa | undefined>;
    handleDeleteRemesa: (remesaId: string) => Promise<void>;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

const DUMMY_COMPANY_INFO: CompanyInfo = { name: 'Cargando...', rif: '', address: '', phone: '' };

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { addToast } = useToast();
    const { logAction } = useSystem();
    const { isAuthenticated, currentUser } = useAuth();
    const [loading, setLoading] = useState(true);

    // State declarations
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(DUMMY_COMPANY_INFO);
    const [categories, setCategories] = useState<Category[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [offices, setOffices] = useState<Office[]>([]);
    const [shippingTypes, setShippingTypes] = useState<ShippingType[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
    const [userPermissions, setUserPermissions] = useState<Permissions>({});

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [assetCategories, setAssetCategories] = useState<AssetCategory[]>([]);
    const [asociados, setAsociados] = useState<Asociado[]>([]);
    const [certificados, setCertificados] = useState<Certificado[]>([]);
    const [pagosAsociados, setPagosAsociados] = useState<PagoAsociado[]>([]);
    const [recibosPagoAsociados, setRecibosPagoAsociados] = useState<ReciboPagoAsociado[]>([]);
    const [remesas, setRemesas] = useState<Remesa[]>([]);

    const fetchData = useCallback(async (isAuth: boolean) => {
        setLoading(true);
        try {
            // Public endpoint
            const companyInfoData = await api.get('/company-info');
            setCompanyInfo(companyInfoData);

            if (isAuth) {
                const allData = await api.get('/settings/all-data');
                
                setCategories(allData.categories || []);
                setUsers(allData.users || []);
                setRoles(allData.roles || []);
                setOffices(allData.offices || []);
                setShippingTypes(allData.shippingTypes || []);
                setPaymentMethods(allData.paymentMethods || []);
                setExpenseCategories(allData.expenseCategories || []);
                setInvoices(allData.invoices || []);
                setClients(allData.clients || []);
                setSuppliers(allData.suppliers || []);
                setVehicles(allData.vehicles || []);
                setExpenses(allData.expenses || []);
                setInventory(allData.inventory || []);
                setAssets(allData.assets || []);
                setAssetCategories(allData.assetCategories || []);
                setAsociados(allData.asociados || []);
                setCertificados(allData.certificados || []);
                setPagosAsociados(allData.pagosAsociados || []);
                setRecibosPagoAsociados(allData.recibosPagoAsociados || []);
                setRemesas(allData.remesas || []);
            }
        } catch (error: any) {
            addToast({ type: 'error', title: 'Error de Carga', message: `No se pudieron cargar los datos del servidor: ${error.message}` });
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchData(isAuthenticated);
    }, [isAuthenticated, fetchData]);

     useEffect(() => {
        if (currentUser && roles.length > 0) {
            const userRole = roles.find(r => r.id === currentUser.roleId);
            setUserPermissions(userRole?.permissions || {});
        } else {
            setUserPermissions({});
        }
    }, [currentUser, roles]);

    const createCrudHandlers = <T extends { id: string, name?: string }>(
        endpoint: string,
        state: T[],
        setState: React.Dispatch<React.SetStateAction<T[]>>,
        entityName: string,
        entityNamePlural: string
    ) => {
        const handleSave = async (item: T) => {
            const isUpdating = !!item.id;
            try {
                const savedItem = isUpdating ? await api.put(`${endpoint}/${item.id}`, item) : await api.post(endpoint, item);
                setState(prev => isUpdating ? prev.map(i => i.id === item.id ? savedItem : i) : [savedItem, ...prev]);
                addToast({ type: 'success', title: `${entityName} Guardado`, message: `${entityName} '${item.name || item.id}' ha sido ${isUpdating ? 'actualizado' : 'creado'}.` });
                return savedItem;
            } catch (error: any) {
                addToast({ type: 'error', title: `Error al Guardar ${entityName}`, message: error.message });
            }
        };
        const handleDelete = async (itemId: string) => {
            try {
                await api.delete(`${endpoint}/${itemId}`);
                setState(prev => prev.filter(i => i.id !== itemId));
                addToast({ type: 'success', title: `${entityName} Eliminado`, message: `${entityName} ha sido eliminado.` });
            } catch (error: any) {
                addToast({ type: 'error', title: `Error al Eliminar ${entityName}`, message: error.message });
            }
        };
        return { handleSave, handleDelete };
    };
    
    // --- API Handlers ---
    const handleCompanyInfoSave = async (info: CompanyInfo) => {
        try {
            const updatedInfo = await api.put('/company-info', info);
            setCompanyInfo(updatedInfo);
            addToast({ type: 'success', title: 'Configuración Guardada', message: 'La información de la empresa ha sido actualizada.' });
        } catch (error: any) {
            addToast({ type: 'error', title: 'Error al Guardar', message: error.message });
        }
    };

    const { handleSave: handleSaveCategory, handleDelete: onDeleteCategory } = createCrudHandlers('/categories', categories, setCategories, 'Categoría', 'Categorías');
    const { handleSave: handleSaveUser, handleDelete: onDeleteUser } = createCrudHandlers('/users', users, setUsers, 'Usuario', 'Usuarios');
    const { handleSave: handleSaveRole, handleDelete: onDeleteRole } = createCrudHandlers('/roles', roles, setRoles, 'Rol', 'Roles');
    const onUpdateRolePermissions = async (roleId: string, permissions: Permissions) => {
         try {
            const updatedRole = await api.put(`/roles/${roleId}/permissions`, { permissions });
            setRoles(prev => prev.map(r => r.id === roleId ? updatedRole : r));
            addToast({ type: 'success', title: 'Permisos Actualizados', message: 'Los permisos del rol han sido actualizados.' });
        } catch (error: any) {
            addToast({ type: 'error', title: 'Error al Actualizar Permisos', message: error.message });
        }
    };
    const { handleSave: handleSaveOffice, handleDelete: onDeleteOffice } = createCrudHandlers('/offices', offices, setOffices, 'Oficina', 'Oficinas');
    const { handleSave: handleSaveShippingType, handleDelete: onDeleteShippingType } = createCrudHandlers('/shipping-types', shippingTypes, setShippingTypes, 'Tipo de Envío', 'Tipos de Envío');
    const { handleSave: handleSavePaymentMethod, handleDelete: onDeletePaymentMethod } = createCrudHandlers('/payment-methods', paymentMethods, setPaymentMethods, 'Forma de Pago', 'Formas de Pago');
    const { handleSave: handleSaveExpenseCategory, handleDelete: onDeleteExpenseCategory } = createCrudHandlers('/expense-categories', expenseCategories, setExpenseCategories, 'Categoría de Gasto', 'Categorías de Gastos');

    const { handleSave: handleSaveClient, handleDelete: handleDeleteClient } = createCrudHandlers('/clients', clients, setClients, 'Cliente', 'Clientes');
    const { handleSave: handleSaveSupplier, handleDelete: handleDeleteSupplier } = createCrudHandlers('/suppliers', suppliers, setSuppliers, 'Proveedor', 'Proveedores');
    const { handleSave: handleSaveVehicle, handleDelete: handleDeleteVehicle } = createCrudHandlers('/vehicles', vehicles, setVehicles, 'Vehículo', 'Vehículos');
    const { handleSave: handleSaveExpense, handleDelete: handleDeleteExpense } = createCrudHandlers('/expenses', expenses, setExpenses, 'Gasto', 'Gastos');
    const { handleSave: handleSaveAsset, handleDelete: handleDeleteAsset } = createCrudHandlers('/assets', assets, setAssets, 'Bien', 'Bienes');
    const { handleSave: handleSaveAssetCategory, handleDelete: handleDeleteAssetCategory } = createCrudHandlers('/asset-categories', assetCategories, setAssetCategories, 'Categoría de Bien', 'Categorías de Bienes');
    const { handleSave: handleSaveAsociado, handleDelete: handleDeleteAsociado } = createCrudHandlers('/asociados', asociados, setAsociados, 'Asociado', 'Asociados');
    const { handleSave: handleSaveCertificado, handleDelete: handleDeleteCertificado } = createCrudHandlers('/certificados', certificados, setCertificados, 'Certificado', 'Certificados');
    const { handleSave: handleSavePagoAsociado, handleDelete: handleDeletePagoAsociado } = createCrudHandlers('/pagos-asociados', pagosAsociados, setPagosAsociados, 'Pago', 'Pagos');
    const { handleSave: handleSaveRecibo, handleDelete: _ } = createCrudHandlers('/recibos-pago-asociados', recibosPagoAsociados, setRecibosPagoAsociados, 'Recibo', 'Recibos');
    const { handleSave: handleCreateRemesa, handleDelete: handleDeleteRemesa } = createCrudHandlers('/remesas', remesas, setRemesas, 'Remesa', 'Remesas');
    
    // More complex handlers
    const handleSaveInvoice = async (invoice: any) => {
        try {
            await api.post('/invoices', invoice);
            addToast({ type: 'success', title: 'Factura Guardada', message: `La factura ha sido creada con éxito.` });
            fetchData(true); // Refetch all data
            window.location.hash = 'invoices';
        } catch (error: any) {
             addToast({ type: 'error', title: 'Error al Guardar Factura', message: error.message });
        }
    };
    const handleUpdateInvoice = async (invoice: Invoice) => {
        try {
            await api.put(`/invoices/${invoice.id}`, invoice);
            addToast({ type: 'success', title: 'Factura Actualizada', message: `La factura ${invoice.invoiceNumber} se actualizó.` });
            fetchData(true);
            window.location.hash = 'invoices';
        } catch (error: any) {
            addToast({ type: 'error', title: 'Error al Actualizar Factura', message: error.message });
        }
    };
    const handleUpdateInvoiceStatuses = async (invoiceId: string, newStatuses: any) => {
         try {
            await api.put(`/invoices/${invoiceId}/status`, newStatuses);
            addToast({ type: 'info', title: 'Estado Actualizado', message: `La factura ha sido actualizada.` });
            fetchData(true);
        } catch (error: any) {
            addToast({ type: 'error', title: 'Error al Actualizar Estado', message: error.message });
        }
    };
    const handleDeleteInvoice = async (invoiceId: string) => {
        try {
            await api.delete(`/invoices/${invoiceId}`);
            addToast({ type: 'success', title: 'Factura Eliminada', message: 'Factura eliminada permanentemente.' });
            fetchData(true);
        } catch (error: any) {
            addToast({ type: 'error', title: 'Error al Eliminar', message: error.message });
        }
    };

    const handleAssignToVehicle = async (invoiceIds: string[], vehicleId: string) => {
        try {
            await api.post('/vehicles/assign', { invoiceIds, vehicleId });
            addToast({ type: 'info', title: 'Envíos Asignados', message: `${invoiceIds.length} factura(s) asignadas.` });
            fetchData(true);
        } catch(e: any) { addToast({ type: 'error', title: 'Error de Asignación', message: e.message }); }
    };
    const handleUnassignInvoice = async (invoiceId: string) => {
         try {
            await api.post('/vehicles/unassign', { invoiceId });
            addToast({ type: 'info', title: 'Envío Desasignado', message: `La factura ha sido removida del vehículo.` });
            fetchData(true);
        } catch(e: any) { addToast({ type: 'error', title: 'Error', message: e.message }); }
    };
    const handleDispatchVehicle = async (vehicleId: string) => {
         try {
            await api.post('/vehicles/dispatch', { vehicleId });
            addToast({ type: 'success', title: 'Vehículo Despachado', message: 'Se ha generado una remesa y el vehículo está en ruta.' });
            fetchData(true);
        } catch(e: any) { addToast({ type: 'error', title: 'Error al Despachar', message: e.message }); }
    };
    const onUndoDispatch = async (vehicleId: string) => {
         try {
            await api.post('/vehicles/undo-dispatch', { vehicleId });
            addToast({ type: 'info', title: 'Despacho Revertido', message: 'El vehículo y sus envíos volvieron a estado pendiente.' });
            fetchData(true);
        } catch(e: any) { addToast({ type: 'error', title: 'Error', message: e.message }); }
    };
    const handleFinalizeTrip = async (vehicleId: string) => {
         try {
            await api.post('/vehicles/finalize-trip', { vehicleId });
            addToast({ type: 'success', title: 'Viaje Finalizado', message: 'El vehículo está disponible y los envíos marcados como "Entregados".' });
            fetchData(true);
        } catch(e: any) { addToast({ type: 'error', title: 'Error', message: e.message }); }
    };

    const value: DataContextType = {
        loading,
        companyInfo, categories, users, roles, offices, shippingTypes, paymentMethods, expenseCategories, userPermissions,
        invoices, clients, suppliers, vehicles, expenses, inventory, assets, assetCategories, asociados, certificados,
        pagosAsociados, recibosPagoAsociados, remesas,
        setInvoices, setExpenses,
        handleCompanyInfoSave, handleSaveUser, onDeleteUser, handleSaveRole, onDeleteRole, onUpdateRolePermissions,
        handleSaveCategory, onDeleteCategory, handleSaveOffice, onDeleteOffice, handleSaveShippingType, onDeleteShippingType,
        handleSavePaymentMethod, onDeletePaymentMethod, handleSaveExpenseCategory, onDeleteExpenseCategory,
        handleSaveClient, handleDeleteClient, handleSaveSupplier, handleDeleteSupplier, handleSaveInvoice, 
        handleUpdateInvoice, handleUpdateInvoiceStatuses, handleDeleteInvoice, handleSaveVehicle, 
        handleDeleteVehicle, handleAssignToVehicle, handleUnassignInvoice, handleDispatchVehicle, 
        onUndoDispatch, handleFinalizeTrip, handleSaveExpense, handleDeleteExpense, handleSaveAsset, 
        handleDeleteAsset, handleSaveAssetCategory, handleDeleteAssetCategory,
        handleSaveAsociado, handleDeleteAsociado, handleSaveCertificado, handleDeleteCertificado,
        handleSavePagoAsociado, handleDeletePagoAsociado, handleSaveRecibo,
        handleCreateRemesa: handleCreateRemesa as any, // Cast because the base handler has a different signature
        handleDeleteRemesa
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = (): DataContextType => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};