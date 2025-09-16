
import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { CompanyInfo, User, Role, Office, Category, ShippingType, PaymentMethod, Permissions, ExpenseCategory } from '../types';
import { useToast } from '../components/ui/ToastProvider';
import { useSystem } from './SystemContext';
import { useAuth } from './AuthContext';
import apiFetch from '../utils/api';

type ConfigContextType = {
    companyInfo: CompanyInfo;
    categories: Category[];
    users: User[];
    roles: Role[];
    offices: Office[];
    shippingTypes: ShippingType[];
    paymentMethods: PaymentMethod[];
    expenseCategories: ExpenseCategory[];
    userPermissions: Permissions;
    isLoading: boolean;
    handleLogin: (username: string, password: string, rememberMe: boolean) => Promise<void>;
    handleLogout: () => void;
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
};

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { addToast } = useToast();
    const { logAction } = useSystem();
    const { isAuthenticated, currentUser, setIsAuthenticated, setCurrentUser } = useAuth();

    const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({ name: 'Cargando...', rif: '', address: '', phone: '' });
    const [categories, setCategories] = useState<Category[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [offices, setOffices] = useState<Office[]>([]);
    const [shippingTypes, setShippingTypes] = useState<ShippingType[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
    const [userPermissions, setUserPermissions] = useState<Permissions>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchConfigData = async () => {
            if (isAuthenticated && currentUser) {
                try {
                    setIsLoading(true);
                    const [
                        usersData, rolesData, categoriesData, 
                        officesData, shippingTypesData, paymentMethodsData, expenseCategoriesData
                    ] = await Promise.all([
                        apiFetch('/users'),
                        apiFetch('/roles'),
                        apiFetch('/categories'),
                        apiFetch('/offices'),
                        apiFetch('/shipping-types'),
                        apiFetch('/payment-methods'),
                        apiFetch('/expense-categories')
                    ]);
                    setUsers(usersData);
                    setRoles(rolesData);
                    setCategories(categoriesData);
                    setOffices(officesData);
                    setShippingTypes(shippingTypesData);
                    setPaymentMethods(paymentMethodsData);
                    setExpenseCategories(expenseCategoriesData);
                } catch (error: any) {
                    addToast({ type: 'error', title: 'Error de Carga', message: `No se pudo cargar la configuración del sistema: ${error.message}` });
                } finally {
                    setIsLoading(false);
                }
            } else if (!isAuthenticated) {
                // Fetch public company info for login screen
                 try {
                     const companyData = await apiFetch('/company-info');
                     setCompanyInfo(companyData);
                 } catch (error) {
                    console.error("Could not fetch public company info", error);
                 }
                 setIsLoading(false);
            }
        };
        fetchConfigData();
    }, [isAuthenticated, currentUser, addToast]);

     useEffect(() => {
        if (isAuthenticated) {
            apiFetch('/company-info').then(setCompanyInfo);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (currentUser && roles.length > 0) {
            const userRole = roles.find(r => r.id === currentUser.roleId);
            if (userRole) setUserPermissions(userRole.permissions);
        } else {
            setUserPermissions({});
        }
    }, [currentUser, roles]);

    useEffect(() => {
        document.title = companyInfo.name || 'Facturación';
    }, [companyInfo]);

    const handleLogin = async (username: string, password: string, rememberMe: boolean) => {
        try {
            const { token, user } = await apiFetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password }),
            });
            if (token && user) {
                localStorage.setItem('authToken', token);
                if (rememberMe) localStorage.setItem('rememberedUser', user.username);
                else localStorage.removeItem('rememberedUser');
                setCurrentUser(user);
                setIsAuthenticated(true);
                window.location.hash = 'dashboard';
                addToast({ type: 'success', title: '¡Bienvenido!', message: `Ha iniciado sesión como ${user.name}.` });
                logAction(user, 'INICIO_SESION', `El usuario '${user.name}' inició sesión.`);
            } else { throw new Error('Respuesta de autenticación inválida'); }
        } catch (error: any) {
            addToast({ type: 'error', title: 'Error de Autenticación', message: error.message || 'Usuario o contraseña incorrectos.' });
            localStorage.removeItem('authToken');
        }
    };

    const handleLogout = () => {
        if (currentUser) logAction(currentUser, 'CIERRE_SESION', `El usuario '${currentUser.name}' cerró sesión.`);
        localStorage.removeItem('authToken');
        setIsAuthenticated(false);
        setCurrentUser(null);
        window.location.hash = '';
        addToast({ type: 'info', title: 'Sesión Cerrada', message: 'Ha cerrado sesión exitosamente.' });
    };

    const handleCompanyInfoSave = async (info: CompanyInfo) => {
        try {
            const updatedInfo = await apiFetch('/company-info', { method: 'PUT', body: JSON.stringify(info) });
            setCompanyInfo(updatedInfo);
            addToast({ type: 'success', title: 'Configuración Guardada', message: 'La información de la empresa ha sido actualizada.' });
        } catch (error: any) {
            addToast({ type: 'error', title: 'Error al Guardar', message: error.message });
        }
    };

    const handleSaveUser = async (user: User) => {
        if (!currentUser) return;
        try {
            const isUpdating = !!user.id;
            const endpoint = isUpdating ? `/users/${user.id}` : '/users';
            const method = isUpdating ? 'PUT' : 'POST';

            const userToSend = { ...user };
            if (!isUpdating) {
                delete (userToSend as Partial<User>).id;
            }
            if (isUpdating && userToSend.password === '') {
                delete userToSend.password;
            }

            const savedUser = await apiFetch(endpoint, { method, body: JSON.stringify(userToSend) });

            if (isUpdating) {
                setUsers(users.map(u => u.id === savedUser.id ? savedUser : u));
                if (currentUser.id === savedUser.id) {
                    setCurrentUser(savedUser);
                }
            } else {
                setUsers([...users, savedUser]);
            }
            logAction(currentUser, isUpdating ? 'ACTUALIZAR_USUARIO' : 'CREAR_USUARIO', `Guardó al usuario ${savedUser.name}.`, savedUser.id);
            addToast({ type: 'success', title: 'Usuario Guardado', message: `El usuario ${savedUser.name} ha sido guardado.` });
        } catch (error: any) {
            addToast({ type: 'error', title: 'Error al Guardar Usuario', message: error.message });
        }
    };

    const onDeleteUser = async (userId: string) => {
        if (!currentUser) return;
        try {
            const userName = users.find(u => u.id === userId)?.name;
            await apiFetch(`/users/${userId}`, { method: 'DELETE' });
            setUsers(users.filter(u => u.id !== userId));
            logAction(currentUser, 'ELIMINAR_USUARIO', `Eliminó al usuario ${userName}.`, userId);
            addToast({ type: 'success', title: 'Usuario Eliminado', message: 'El usuario ha sido eliminado.' });
        } catch (error: any) {
            addToast({ type: 'error', title: 'Error al Eliminar', message: error.message });
        }
    };
    
    const handleGenericSave = async <T extends { id?: string; name: string }>(item: T, endpoint: string, stateSetter: React.Dispatch<React.SetStateAction<T[]>>, itemType: string) => {
        const isUpdating = !!item.id;
        const url = isUpdating ? `${endpoint}/${item.id}` : endpoint;
        const method = isUpdating ? 'PUT' : 'POST';

        const bodyToSend = { ...item };
        if (!isUpdating) {
            delete (bodyToSend as Partial<T>).id;
        }

        try {
            const savedItem = await apiFetch(url, { method, body: JSON.stringify(bodyToSend) });
            stateSetter(prev => isUpdating ? prev.map(i => (i as any).id === savedItem.id ? savedItem : i) : [...prev, savedItem]);
            addToast({ type: 'success', title: `${itemType} Guardado`, message: `'${item.name}' se ha guardado.` });
        } catch (error: any) { addToast({ type: 'error', title: `Error al Guardar ${itemType}`, message: error.message }); }
    };
    
    const handleGenericDelete = async (id: string, endpoint: string, stateSetter: React.Dispatch<React.SetStateAction<any[]>>, itemType: string) => {
        try {
            await apiFetch(`${endpoint}/${id}`, { method: 'DELETE' });
            stateSetter(prev => prev.filter(item => item.id !== id));
            addToast({ type: 'success', title: `${itemType} Eliminado`, message: `El elemento ha sido eliminado.` });
        } catch (error: any) { addToast({ type: 'error', title: `Error al Eliminar ${itemType}`, message: error.message }); }
    };

    const handleSaveRole = async (role: Role) => { await handleGenericSave(role, '/roles', setRoles, 'Rol'); };
    const onDeleteRole = async (roleId: string) => { await handleGenericDelete(roleId, '/roles', setRoles, 'Rol'); };
    const onUpdateRolePermissions = async (roleId: string, permissions: Permissions) => {
        try {
            const updatedRole = await apiFetch(`/roles/${roleId}/permissions`, { method: 'PUT', body: JSON.stringify({ permissions }) });
            setRoles(roles.map(r => r.id === roleId ? updatedRole : r));
            addToast({ type: 'success', title: 'Permisos Actualizados', message: 'Los permisos del rol han sido actualizados.' });
        } catch (error: any) { addToast({ type: 'error', title: `Error al Guardar Permisos`, message: error.message }); }
    };

    const handleSaveCategory = async (category: Category) => { await handleGenericSave(category, '/categories', setCategories, 'Categoría'); };
    const onDeleteCategory = async (id: string) => { await handleGenericDelete(id, '/categories', setCategories, 'Categoría'); };
    const handleSaveOffice = async (office: Office) => { await handleGenericSave(office, '/offices', setOffices, 'Oficina'); };
    const onDeleteOffice = async (id: string) => { await handleGenericDelete(id, '/offices', setOffices, 'Oficina'); };
    const handleSaveShippingType = async (st: ShippingType) => { await handleGenericSave(st, '/shipping-types', setShippingTypes, 'Tipo de Envío'); };
    const onDeleteShippingType = async (id: string) => { await handleGenericDelete(id, '/shipping-types', setShippingTypes, 'Tipo de Envío'); };
    const handleSavePaymentMethod = async (pm: PaymentMethod) => { await handleGenericSave(pm, '/payment-methods', setPaymentMethods, 'Forma de Pago'); };
    const onDeletePaymentMethod = async (id: string) => { await handleGenericDelete(id, '/payment-methods', setPaymentMethods, 'Forma de Pago'); };
    const handleSaveExpenseCategory = async (cat: ExpenseCategory) => { await handleGenericSave(cat, '/expense-categories', setExpenseCategories, 'Categoría de Gasto'); };
    const onDeleteExpenseCategory = async (id: string) => { await handleGenericDelete(id, '/expense-categories', setExpenseCategories, 'Categoría de Gasto'); };

    const value: ConfigContextType = {
        companyInfo, categories, users, roles, offices, shippingTypes, paymentMethods, 
        expenseCategories, userPermissions, isLoading, handleLogin, handleLogout, handleCompanyInfoSave, 
        handleSaveUser, onDeleteUser, handleSaveRole, onDeleteRole, onUpdateRolePermissions, 
        handleSaveCategory, onDeleteCategory, handleSaveOffice, onDeleteOffice, 
        handleSaveShippingType, onDeleteShippingType, handleSavePaymentMethod, 
        onDeletePaymentMethod, handleSaveExpenseCategory, onDeleteExpenseCategory
    };

    return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
};

export const useConfig = (): ConfigContextType => {
    const context = useContext(ConfigContext);
    if (!context) throw new Error('useConfig must be used within a ConfigProvider');
    return context;
};
