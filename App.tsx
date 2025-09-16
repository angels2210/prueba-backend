import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import LoginView from './components/auth/LoginView';
import DashboardView from './components/dashboard/DashboardView';
import InvoicesView from './components/invoices/InvoicesView';
import ReportsView from './components/reports/ReportsView';
import { Page, Report } from './types';
import ShippingGuideView from './components/shipping-guide/ShippingGuideView';
import EditInvoiceView from './components/invoices/EditInvoiceView';
import AsociadosLandingView from './components/asociados/AsociadosLandingView';
import AsociadosGestionView from './components/asociados/AsociadosView';
import EstadisticasAsociadosView from './components/asociados/EstadisticasAsociadosView';
import ConfiguracionView from './components/configuracion/ConfiguracionView';
import CategoryView from './components/categories/CategoryView';
import ReportDetailView from './components/reports/ReportDetailView';
import ClientsView from './components/clients/ClientsView';
import OfficesView from './components/offices/OfficesView';
import ShippingTypesView from './components/shipping-types/ShippingTypesView';
import PaymentMethodsView from './components/payment-methods/PaymentMethodsView';
import { SYSTEM_REPORTS } from './constants';
import LibroContableView from './components/libro-contable/LibroContableView';
import InventarioView from './components/inventario/InventarioView';
import InventarioLandingView from './components/inventario/InventarioLandingView';
import BienesView from './components/inventario/BienesView';
import AuditLogView from './components/auditoria/AuditLogView';
import BienesCategoryView from './components/inventario/BienesCategoryView';
import SuppliersView from './components/proveedores/SuppliersView';
import FlotaView from './components/flota/FlotaView';

import AppProviders from './contexts/AppProviders';
import { useAuth } from './contexts/AuthContext';
import { useData } from './contexts/DataContext';
import { useSystem } from './contexts/SystemContext';
import ReportesAsociadosView from './components/asociados/ReportesAsociadosView';
import RemesasView from './components/remesas/RemesasView';
import FlotaVehiculosPorAsociadoView from './components/flota/FlotaVehiculosPorAsociadoView';
import { PackageIcon } from './components/icons/Icons';

const LoadingSpinner: React.FC = () => (
    <div className="fixed inset-0 bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center z-[200]">
        <PackageIcon className="h-16 w-16 text-primary-600 animate-bounce" />
        <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-300">Cargando Sistema...</p>
    </div>
);

const AppContent: React.FC = () => {
    const { isAuthenticated, currentUser, handleLogin, handleLogout, loading: authLoading } = useAuth();
    const { auditLog } = useSystem();
    const data = useData();

    const [currentPage, setCurrentPage] = useState<Page>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
    const [viewingReport, setViewingReport] = useState<Report | null>(null);
    const [inventoryFilter, setInventoryFilter] = useState<string | null>(null);
    const [invoiceFilter, setInvoiceFilter] = useState<{ type: string, value: string } | null>(null);
    const [selectedAsociadoId, setSelectedAsociadoId] = useState<string | null>(null);

    // Filter invoices based on user's office for data segregation
    const filteredInvoices = useMemo(() => {
        if (!currentUser) return [];
        if (currentUser.roleId === 'role-admin' || currentUser.roleId === 'role-tech' || !currentUser.officeId) {
            return data.invoices;
        }
        return data.invoices.filter(invoice => invoice.guide.originOfficeId === currentUser.officeId);
    }, [data.invoices, currentUser]);

    // Filter expenses based on user's office for data segregation
    const filteredExpenses = useMemo(() => {
        if (!currentUser) return [];
        if (currentUser.roleId === 'role-admin' || currentUser.roleId === 'role-tech' || !currentUser.officeId) {
            return data.expenses;
        }
        return data.expenses.filter(expense => expense.officeId === currentUser.officeId);
    }, [data.expenses, currentUser]);

    useEffect(() => {
        if (!isAuthenticated) return;

        const handleHashChange = () => {
            const hash = window.location.hash.replace('#', '');
            const [page, param, subParam, ...filterValueParts] = hash.split('/');
            const filterValue = filterValueParts.join('/');
            
            const validPages: Page[] = ['dashboard', 'shipping-guide', 'invoices', 'asociados', 'reports', 'configuracion', 'categories', 'edit-invoice', 'report-detail', 'clientes', 'proveedores', 'offices', 'shipping-types', 'payment-methods', 'libro-contable', 'inventario', 'auditoria', 'inventario-bienes', 'inventario-envios', 'bienes-categorias', 'asociados-gestion', 'asociados-estadisticas', 'asociados-reportes', 'remesas', 'flota', 'flota-vehiculos'];
            
            setEditingInvoiceId(null);
            setViewingReport(null);
            setInventoryFilter(null);
            setInvoiceFilter(null);
            setSelectedAsociadoId(null);

            if (page === 'flota-vehiculos' && param) {
                setSelectedAsociadoId(param);
                setCurrentPage('flota-vehiculos');
            } else if (page === 'asociados' && param === 'gestion') {
                 setCurrentPage('asociados-gestion');
            } else if (page === 'asociados' && param === 'estadisticas') {
                setCurrentPage('asociados-estadisticas');
            } else if (page === 'asociados' && param === 'reportes') {
                setCurrentPage('asociados-reportes');
            } else if (page === 'invoices' && param === 'filter' && subParam && filterValue) {
                setInvoiceFilter({ type: subParam, value: decodeURIComponent(filterValue) });
                setCurrentPage('invoices');
            } else if (page === 'inventario-envios' && param) {
                setInventoryFilter(param);
                setCurrentPage('inventario-envios');
            } else if (validPages.includes(page as Page)) {
                 if(page === 'edit-invoice' && param) {
                    setEditingInvoiceId(param);
                }
                 if(page === 'report-detail' && param) {
                    setViewingReport(SYSTEM_REPORTS.find(r => r.id === param) || null);
                }
                setCurrentPage(page as Page);
            } else {
                setCurrentPage('dashboard');
                window.location.hash = 'dashboard';
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        handleHashChange();

        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [isAuthenticated]);
    
    if (authLoading || (isAuthenticated && data.loading)) {
        return <LoadingSpinner />;
    }

    if (!isAuthenticated || !currentUser) {
        return <LoginView onLogin={handleLogin} companyInfo={data.companyInfo} />;
    }

    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard': return <DashboardView invoices={filteredInvoices} vehicles={data.vehicles} companyInfo={data.companyInfo} offices={data.offices} />;
            case 'shipping-guide': return <ShippingGuideView onSaveInvoice={data.handleSaveInvoice} categories={data.categories} clients={data.clients} offices={data.offices} shippingTypes={data.shippingTypes} paymentMethods={data.paymentMethods} companyInfo={data.companyInfo} currentUser={currentUser} />;
            case 'edit-invoice':
                const invoiceToEdit = data.invoices.find(inv => inv.id === editingInvoiceId);
                return invoiceToEdit ? <EditInvoiceView invoice={invoiceToEdit} onSaveInvoice={data.handleUpdateInvoice} categories={data.categories} clients={data.clients} offices={data.offices} shippingTypes={data.shippingTypes} paymentMethods={data.paymentMethods} companyInfo={data.companyInfo} currentUser={currentUser} /> : <div>Factura no encontrada</div>;
            case 'invoices': return <InvoicesView invoices={filteredInvoices} clients={data.clients} categories={data.categories} userPermissions={data.userPermissions} onUpdateStatuses={data.handleUpdateInvoiceStatuses} onDeleteInvoice={data.handleDeleteInvoice} companyInfo={data.companyInfo} initialFilter={invoiceFilter} />;
            case 'remesas': return <RemesasView 
                remesas={data.remesas}
                asociados={data.asociados}
                vehicles={data.vehicles}
                invoices={data.invoices}
                offices={data.offices}
                clients={data.clients}
                categories={data.categories}
                onAssignToVehicle={data.handleAssignToVehicle}
                onUnassignInvoice={data.handleUnassignInvoice}
                onDispatchVehicle={data.handleDispatchVehicle}
                onDeleteRemesa={data.handleDeleteRemesa}
                permissions={data.userPermissions}
                companyInfo={data.companyInfo}
            />;
            case 'flota': return <FlotaView 
                asociados={data.asociados} 
                vehicles={data.vehicles} 
            />;
            case 'flota-vehiculos': {
                const selectedAsociado = data.asociados.find(a => a.id === selectedAsociadoId);
                return selectedAsociado ? <FlotaVehiculosPorAsociadoView
                    asociado={selectedAsociado}
                    vehicles={data.vehicles}
                    invoices={data.invoices}
                    offices={data.offices}
                    clients={data.clients}
                    onAssignToVehicle={data.handleAssignToVehicle}
                    onUnassignInvoice={data.handleUnassignInvoice}
                    onSaveVehicle={data.handleSaveVehicle}
                    onDeleteVehicle={data.handleDeleteVehicle}
                    onDispatchVehicle={data.handleDispatchVehicle}
                    onFinalizeTrip={data.handleFinalizeTrip}
                    onUndoDispatch={data.onUndoDispatch}
                    permissions={data.userPermissions}
                    companyInfo={data.companyInfo}
                /> : <div>Asociado no encontrado. <a href="#flota" className="text-primary-600 hover:underline">Volver a la lista</a>.</div>;
            }
            case 'asociados': return <AsociadosLandingView permissions={data.userPermissions} />;
            case 'asociados-gestion': return <AsociadosGestionView 
                asociados={data.asociados} onSaveAsociado={data.handleSaveAsociado} onDeleteAsociado={data.handleDeleteAsociado}
                vehicles={data.vehicles} onSaveVehicle={data.handleSaveVehicle} onDeleteVehicle={data.handleDeleteVehicle}
                certificados={data.certificados} onSaveCertificado={data.handleSaveCertificado} onDeleteCertificado={data.handleDeleteCertificado}
                pagos={data.pagosAsociados} onSavePago={data.handleSavePagoAsociado} onDeletePago={data.handleDeletePagoAsociado}
                recibos={data.recibosPagoAsociados} onSaveRecibo={data.handleSaveRecibo}
                permissions={data.userPermissions} companyInfo={data.companyInfo}
             />;
            case 'asociados-estadisticas': return <EstadisticasAsociadosView asociados={data.asociados} pagos={data.pagosAsociados} />;
            case 'asociados-reportes': return <ReportesAsociadosView asociados={data.asociados} pagos={data.pagosAsociados} recibos={data.recibosPagoAsociados} companyInfo={data.companyInfo} />;
            case 'reports': return <ReportsView reports={SYSTEM_REPORTS} />;
            case 'report-detail': 
                return viewingReport ? <ReportDetailView report={viewingReport} invoices={data.invoices} clients={data.clients} expenses={data.expenses} offices={data.offices} companyInfo={data.companyInfo} paymentMethods={data.paymentMethods} vehicles={data.vehicles} categories={data.categories} asociados={data.asociados} /> : <div>Reporte no encontrado</div>;
            case 'categories': return <CategoryView categories={data.categories} onSave={data.handleSaveCategory} onDelete={data.onDeleteCategory} permissions={data.userPermissions} />;
            case 'clientes': return <ClientsView clients={data.clients} onSave={data.handleSaveClient} onDelete={data.handleDeleteClient} permissions={data.userPermissions} />;
            case 'proveedores': return <SuppliersView suppliers={data.suppliers} onSave={data.handleSaveSupplier} onDelete={data.handleDeleteSupplier} permissions={data.userPermissions} />;
            case 'offices': return <OfficesView offices={data.offices} onSave={data.handleSaveOffice} onDelete={data.onDeleteOffice} permissions={data.userPermissions} />;
            case 'shipping-types': return <ShippingTypesView shippingTypes={data.shippingTypes} onSave={data.handleSaveShippingType} onDelete={data.onDeleteShippingType} permissions={data.userPermissions} />;
            case 'payment-methods': return <PaymentMethodsView paymentMethods={data.paymentMethods} onSave={data.handleSavePaymentMethod} onDelete={data.onDeletePaymentMethod} permissions={data.userPermissions} />;
            case 'libro-contable': return <LibroContableView invoices={filteredInvoices} expenses={filteredExpenses} expenseCategories={data.expenseCategories} onSaveExpense={data.handleSaveExpense} onDeleteExpense={data.handleDeleteExpense} onSaveExpenseCategory={data.handleSaveExpenseCategory} onDeleteExpenseCategory={data.onDeleteExpenseCategory} permissions={data.userPermissions} offices={data.offices} currentUser={currentUser} paymentMethods={data.paymentMethods} companyInfo={data.companyInfo} suppliers={data.suppliers} />;
            case 'inventario': return <InventarioLandingView permissions={data.userPermissions} />;
            case 'inventario-envios': return <InventarioView items={data.inventory} permissions={data.userPermissions} filter={inventoryFilter} />;
            case 'inventario-bienes': return <BienesView assets={data.assets} onSave={data.handleSaveAsset} onDelete={data.handleDeleteAsset} permissions={data.userPermissions} offices={data.offices} assetCategories={data.assetCategories} />;
            case 'bienes-categorias': return <BienesCategoryView categories={data.assetCategories} onSave={data.handleSaveAssetCategory} onDelete={data.handleDeleteAssetCategory} permissions={data.userPermissions} />;
            case 'auditoria': return <AuditLogView auditLog={auditLog} users={data.users} />;
            case 'configuracion': return (
                <ConfiguracionView
                    companyInfo={data.companyInfo} onCompanyInfoSave={data.handleCompanyInfoSave}
                    users={data.users} roles={data.roles} offices={data.offices} 
                    onSaveUser={data.handleSaveUser} onDeleteUser={data.onDeleteUser} 
                    permissions={data.userPermissions}
                    currentUser={currentUser}
                    onSaveRole={data.handleSaveRole}
                    onDeleteRole={data.onDeleteRole}
                    onUpdateRolePermissions={data.onUpdateRolePermissions}
                />
            );
            default:
                return <DashboardView invoices={filteredInvoices} vehicles={data.vehicles} companyInfo={data.companyInfo} offices={data.offices} />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            <Sidebar currentPage={currentPage} onLogout={handleLogout} permissions={data.userPermissions} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} companyInfo={data.companyInfo} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header 
                    currentPage={currentPage} 
                    onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
                    companyInfo={data.companyInfo} 
                    currentUser={currentUser}
                />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-800">
                    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                        {renderPage()}
                    </div>
                </main>
            </div>
        </div>
    );
};

const App: React.FC = () => (
    <AppProviders>
        <AppContent />
    </AppProviders>
);

export default App;
