
import React, { useState, useEffect, useCallback } from 'react';
import { ShippingGuide, Client, Merchandise, Financials, Category, Invoice, Office, ShippingType, PaymentMethod, CompanyInfo, User } from '../../types';
import Card, { CardHeader, CardTitle } from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Select from '../ui/Select';
import FinancialSummary from '../shipping-guide/FinancialSummary';
import { PlusCircleIcon, TrashIcon, SaveIcon, XCircleIcon, ShieldCheckIcon } from '../icons/Icons';
import ClientSearchInput from './ClientSearchInput';
import { calculateFinancialDetails } from '../../utils/financials';


const initialClientState: Partial<Client> = { id: '', idNumber: '', name: '', phone: '', address: '', clientType: 'persona', email: '' };
const initialMerchandise: Merchandise = { quantity: 1, weight: 0, length: 0, width: 0, height: 0, description: '', categoryId: '' };
const initialFinancials: Financials = { freight: 0, insuranceCost: 0, handling: 0, discount: 0, subtotal: 0, ipostel: 0, iva: 0, igtf: 0, total: 0 };

interface InvoiceFormProps {
    onSave: (invoice: Invoice | Omit<Invoice, 'status' | 'paymentStatus' | 'shippingStatus'>) => void;
    invoice?: Invoice | null;
    companyInfo: CompanyInfo;
    categories: Category[];
    clients: Client[];
    offices: Office[];
    shippingTypes: ShippingType[];
    paymentMethods: PaymentMethod[];
    currentUser: User;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ onSave, invoice = null, companyInfo, categories, clients, offices, shippingTypes, paymentMethods, currentUser }) => {
    
    const isOperator = currentUser.roleId !== 'role-admin' && currentUser.roleId !== 'role-tech';
    
    const getInitialGuideState = useCallback((): ShippingGuide => {
        if (invoice) return invoice.guide;

        const userOfficeId = isOperator && currentUser.officeId ? currentUser.officeId : offices[0]?.id || '';
        
        const today = new Date();
        const localDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        return {
            guideNumber: `G-${Date.now()}`,
            date: localDateString,
            originOfficeId: userOfficeId,
            destinationOfficeId: offices.find(o => o.id !== userOfficeId)?.id || offices[1]?.id || '',
            sender: initialClientState,
            receiver: initialClientState,
            merchandise: [{ ...initialMerchandise, categoryId: categories[0]?.id || '' }],
            shippingTypeId: shippingTypes[0]?.id || '',
            paymentMethodId: paymentMethods[0]?.id || '',
            hasInsurance: false,
            declaredValue: 0,
            insurancePercentage: 2,
            paymentType: 'flete-pagado',
            paymentCurrency: 'VES',
            hasDiscount: false,
            discountPercentage: 0,
        }
    }, [invoice, currentUser, offices, categories, shippingTypes, paymentMethods, isOperator]);

    const [guide, setGuide] = useState<ShippingGuide>(getInitialGuideState());
    const [financials, setFinancials] = useState<Financials>(initialFinancials);

    useEffect(() => {
        if (!invoice) {
            setGuide(g => ({
                ...g,
                originOfficeId: g.originOfficeId || (isOperator && currentUser.officeId ? currentUser.officeId : offices[0]?.id || ''),
                destinationOfficeId: g.destinationOfficeId || offices[1]?.id || '',
                shippingTypeId: g.shippingTypeId || shippingTypes[0]?.id || '',
                paymentMethodId: g.paymentMethodId || paymentMethods[0]?.id || '',
                merchandise: g.merchandise.map(m => ({...m, categoryId: m.categoryId || categories[0]?.id || ''}))
            }));
        }
    }, [offices, shippingTypes, paymentMethods, categories, invoice, isOperator, currentUser]);

    useEffect(() => {
        const newFinancials = calculateFinancialDetails(guide, companyInfo);
        setFinancials(newFinancials);
    }, [guide, companyInfo]);
    
    useEffect(() => {
        const totalWeight = guide.merchandise.reduce((acc, item) => {
            const realWeight = Number(item.weight) || 0;
            const volumetricWeight = (Number(item.length) * Number(item.width) * Number(item.height)) / 5000;
            return acc + Math.max(realWeight, volumetricWeight) * (Number(item.quantity) || 1);
        }, 0);
        const freight = totalWeight * (companyInfo.costPerKg || 0);

        if (guide.declaredValue !== freight) {
            setGuide(g => ({...g, declaredValue: freight}));
        }
    }, [guide.merchandise, companyInfo.costPerKg]);


    const handleClientChange = (party: 'sender' | 'receiver', field: keyof Client, value: string) => {
        setGuide(prev => {
            const updatedParty = { ...prev[party], [field]: value };

            if(field === 'idNumber') {
                if (value.toUpperCase().startsWith('J-')) {
                    updatedParty.clientType = 'empresa';
                } else {
                    updatedParty.clientType = 'persona';
                }
            }
           
            return {
                ...prev,
                [party]: updatedParty
            };
        });
    };

    const handleSelectClient = (party: 'sender' | 'receiver', client: Client) => {
        setGuide(prev => ({
            ...prev,
            [party]: client,
        }));
    };
    
    const handleMerchandiseChange = (index: number, field: keyof Merchandise, value: string | number) => {
        const newMerchandise = guide.merchandise.map((item, i) => {
            if (i === index) {
                const updatedItem = { ...item };
                const numericFields: (keyof Merchandise)[] = ['quantity', 'weight', 'length', 'width', 'height'];
                if (numericFields.includes(field as keyof Merchandise)) {
                    (updatedItem as any)[field] = parseFloat(value as string) || 0;
                } else {
                    (updatedItem as any)[field] = value;
                }
                return updatedItem;
            }
            return item;
        });
        setGuide(prev => ({ ...prev, merchandise: newMerchandise }));
    };

    const addMerchandiseItem = () => {
        setGuide(prev => ({
            ...prev,
            merchandise: [...prev.merchandise, { ...initialMerchandise, categoryId: categories[0]?.id || '' }]
        }));
    };
    
    const removeMerchandiseItem = (index: number) => {
        if (guide.merchandise.length > 1) {
            const newMerchandise = guide.merchandise.filter((_, i) => i !== index);
            setGuide(prev => ({ ...prev, merchandise: newMerchandise }));
        }
    };
    
    const handleSave = () => {
        if (invoice) { // EDIT MODE
            const updatedInvoice: Invoice = {
                // Preserve all original data first
                ...invoice,
                // Overwrite with data from the form state
                date: guide.date,
                clientName: guide.sender.name || 'N/A',
                clientIdNumber: guide.sender.idNumber || 'N/A',
                totalAmount: financials.total,
                guide: guide,
            };
            onSave(updatedInvoice);
        } else { // CREATE MODE
            const newInvoice: Omit<Invoice, 'status' | 'paymentStatus' | 'shippingStatus'> = {
                id: `INV-${Date.now()}`,
                invoiceNumber: `F-${String(Date.now()).slice(-6)}`,
                controlNumber: `C-${String(Date.now()).slice(-8)}`,
                date: guide.date,
                clientName: guide.sender.name || 'N/A',
                clientIdNumber: guide.sender.idNumber || 'N/A',
                totalAmount: financials.total,
                guide: guide,
            };
            onSave(newInvoice);
        }
    };
    
    const resetForm = () => {
        setGuide(getInitialGuideState());
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">N° Guía: {guide.guideNumber}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Fecha: {new Date(guide.date + 'T00:00:00').toLocaleDateString('es-VE', {timeZone: 'UTC'})}</p>
                </div>
                <div className="flex flex-wrap space-x-2">
                    <Button variant="secondary" onClick={resetForm}><XCircleIcon className="w-4 h-4 mr-2" />Limpiar</Button>
                    <Button onClick={handleSave}><SaveIcon className="w-4 h-4 mr-2" />{invoice ? 'Actualizar Factura' : 'Guardar Factura'}</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Remitente</CardTitle></CardHeader>
                        <div className="space-y-4">
                             <ClientSearchInput
                                clients={clients}
                                onClientSelect={(client) => handleSelectClient('sender', client)}
                                party='sender'
                                guide={guide}
                                onClientChange={handleClientChange}
                            />
                            <Input label="Nombre" value={guide.sender.name || ''} onChange={e => handleClientChange('sender', 'name', e.target.value)} />
                            <Input label="Teléfono" value={guide.sender.phone || ''} onChange={e => handleClientChange('sender', 'phone', e.target.value)} />
                            <Input label="Correo Electrónico" type="email" value={guide.sender.email || ''} onChange={e => handleClientChange('sender', 'email', e.target.value)} />
                            <Input label="Dirección" value={guide.sender.address || ''} onChange={e => handleClientChange('sender', 'address', e.target.value)} />
                        </div>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Destinatario</CardTitle></CardHeader>
                        <div className="space-y-4">
                            <ClientSearchInput
                                clients={clients}
                                onClientSelect={(client) => handleSelectClient('receiver', client)}
                                party='receiver'
                                guide={guide}
                                onClientChange={handleClientChange}
                            />
                            <Input label="Nombre" value={guide.receiver.name || ''} onChange={e => handleClientChange('receiver', 'name', e.target.value)} />
                            <Input label="Teléfono" value={guide.receiver.phone || ''} onChange={e => handleClientChange('receiver', 'phone', e.target.value)} />
                            <Input label="Correo Electrónico" type="email" value={guide.receiver.email || ''} onChange={e => handleClientChange('receiver', 'email', e.target.value)} />
                            <Input label="Dirección" value={guide.receiver.address || ''} onChange={e => handleClientChange('receiver', 'address', e.target.value)} />
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Detalles de Mercancía</CardTitle></CardHeader>
                        {guide.merchandise.map((item, index) => {
                            const volWeight = (Number(item.length) * Number(item.width) * Number(item.height)) / 5000;
                            return (
                                <div key={index} className="space-y-4 p-4 mb-4 border dark:border-gray-700 rounded-lg relative">
                                    {guide.merchandise.length > 1 && (
                                        <button onClick={() => removeMerchandiseItem(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700">
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Input label="Cantidad" type="number" value={item.quantity} onChange={e => handleMerchandiseChange(index, 'quantity', e.target.value)} />
                                        <Input label="Peso (Kg)" type="number" value={item.weight} onChange={e => handleMerchandiseChange(index, 'weight', e.target.value)} />
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Dimensiones (cm)</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <Input label="Largo" type="number" value={item.length} onChange={e => handleMerchandiseChange(index, 'length', e.target.value)} />
                                        <Input label="Ancho" type="number" value={item.width} onChange={e => handleMerchandiseChange(index, 'width', e.target.value)} />
                                        <Input label="Alto" type="number" value={item.height} onChange={e => handleMerchandiseChange(index, 'height', e.target.value)} />
                                    </div>
                                     <p className="text-xs text-gray-400 dark:text-gray-500 text-right">Peso Volumétrico: {volWeight.toFixed(2)} kg</p>
                                    <Input label="Descripción" value={item.description} onChange={e => handleMerchandiseChange(index, 'description', e.target.value)} />
                                    <Select label="Categoría" value={item.categoryId} onChange={e => handleMerchandiseChange(index, 'categoryId', e.target.value)}>
                                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                    </Select>
                                </div>
                            )
                        })}
                        <Button variant="secondary" onClick={addMerchandiseItem} className="w-full mt-2">
                           <PlusCircleIcon className="w-5 h-5 mr-2" /> Añadir Otro Paquete
                        </Button>
                    </Card>
                </div>

                <div className="space-y-6">
                    <div className="sticky top-6">
                         <Card>
                            <CardHeader><CardTitle>Condiciones del Envío</CardTitle></CardHeader>
                            <div className="space-y-4">
                                <Select label="Oficina de Origen" value={guide.originOfficeId} onChange={e => setGuide(g => ({...g, originOfficeId: e.target.value}))} disabled={isOperator && !!currentUser.officeId}>
                                    {offices.map(office => <option key={office.id} value={office.id}>{office.name}</option>)}
                                </Select>
                                <Select label="Oficina de Destino" value={guide.destinationOfficeId} onChange={e => setGuide(g => ({...g, destinationOfficeId: e.target.value}))}>
                                    {offices.map(office => <option key={office.id} value={office.id}>{office.name}</option>)}
                                </Select>
                                <Select label="Tipo de Envío" value={guide.shippingTypeId} onChange={e => setGuide(g => ({...g, shippingTypeId: e.target.value as any}))}>
                                    {shippingTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                                </Select>
                                <Select label="Forma de Pago" value={guide.paymentMethodId} onChange={e => setGuide(g => ({...g, paymentMethodId: e.target.value as any}))}>
                                    {paymentMethods.map(pm => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
                                </Select>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Select label="Condición" value={guide.paymentType} onChange={e => setGuide(g => ({...g, paymentType: e.target.value as any}))}>
                                        <option value="flete-pagado">Flete Pagado</option>
                                        <option value="flete-destino">Flete a Destino</option>
                                    </Select>
                                    <Select label="Moneda" value={guide.paymentCurrency} onChange={e => setGuide(g => ({...g, paymentCurrency: e.target.value as any}))}>
                                        <option value="VES">Bolívares (VES)</option>
                                        <option value="USD">Dólares (USD)</option>
                                    </Select>
                                </div>
                                <div className="space-y-2 pt-2 border-t dark:border-gray-700">
                                    <div className="flex items-center">
                                        <input id="insurance" type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" checked={guide.hasInsurance} onChange={e => setGuide(g => ({...g, hasInsurance: e.target.checked}))} />
                                        <label htmlFor="insurance" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Asegurar envío</label>
                                    </div>
                                    {guide.hasInsurance && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <Input label="Valor Declarado" type="number" value={guide.declaredValue} disabled readOnly />
                                            <Input label="Seguro (%)" type="number" value={guide.insurancePercentage} onChange={e => setGuide(g => ({...g, insurancePercentage: Number(e.target.value)}))} />
                                        </div>
                                    )}
                                </div>
                                 <div className="pt-2 border-t dark:border-gray-700">
                                    <div className="flex items-center">
                                        <input
                                            id="discount"
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                            checked={guide.hasDiscount}
                                            onChange={e => setGuide(g => ({ ...g, hasDiscount: e.target.checked }))}
                                        />
                                        <label htmlFor="discount" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Aplicar Descuento</label>
                                    </div>
                                    {guide.hasDiscount && (
                                        <div className="mt-2">
                                            <Input
                                                label="Porcentaje de Descuento (%)"
                                                type="number"
                                                name="discountPercentage"
                                                value={guide.discountPercentage}
                                                onChange={e => setGuide(g => ({ ...g, discountPercentage: Number(e.target.value) }))}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                        <FinancialSummary financials={financials} guide={guide} bcvRate={companyInfo.bcvRate} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceForm;