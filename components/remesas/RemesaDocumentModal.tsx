import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Remesa, Invoice, Vehicle, Office, Client, CompanyInfo, Asociado, Category } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { DownloadIcon, XIcon } from '../icons/Icons';
import { calculateFinancialDetails } from '../../utils/financials';

interface RemesaDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    remesa: Remesa;
    invoices: Invoice[];
    asociados: Asociado[];
    vehicles: Vehicle[];
    clients: Client[];
    companyInfo: CompanyInfo;
    offices: Office[];
    categories: Category[];
}

const formatCurrency = (amount: number) => amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const RemesaDocumentModal: React.FC<RemesaDocumentModalProps> = ({
    isOpen, onClose, remesa, invoices, asociados, vehicles, clients, companyInfo, offices, categories
}) => {
    if (!isOpen) return null;

    const asociado = asociados.find(a => a.id === remesa.asociadoId);
    const vehicle = vehicles.find(v => v.id === remesa.vehicleId);
    const remesaInvoices = invoices.filter(inv => remesa.invoiceIds.includes(inv.id));

    const getOfficeName = (officeId: string) => offices.find(o => o.id === officeId)?.name || officeId;
    const getCategoryName = (categoryId: string) => categories.find(c => c.id === categoryId)?.name || 'N/A';
    
    // Group invoices by destination
    const groupedInvoices = remesaInvoices.reduce((acc, inv) => {
        const officeName = getOfficeName(inv.guide.destinationOfficeId);
        if (!acc[officeName]) {
            acc[officeName] = [];
        }
        acc[officeName].push(inv);
        return acc;
    }, {} as Record<string, Invoice[]>);
    
    const tableTotals = remesaInvoices.reduce((acc, inv) => {
        const financials = calculateFinancialDetails(inv.guide, companyInfo);
        acc.flete += financials.freight;
        acc.seguro += financials.insuranceCost;
        return acc;
    }, { flete: 0, seguro: 0 });

    const initialSummary = {
        piezas: 0, flete: 0, seguro: 0, ipostel: 0, manejo: 0,
    };

    const { pagadoTotals, destinoTotals } = remesaInvoices.reduce((acc, inv) => {
        const financials = calculateFinancialDetails(inv.guide, companyInfo);
        const totalPackages = inv.guide.merchandise.reduce((sum, m) => sum + m.quantity, 0);
        const target = inv.guide.paymentType === 'flete-pagado' ? acc.pagadoTotals : acc.destinoTotals;
        
        target.piezas += totalPackages;
        target.flete += financials.freight;
        target.seguro += financials.insuranceCost;
        target.ipostel += financials.ipostel;
        target.manejo += financials.handling;
        
        return acc;
    }, { pagadoTotals: {...initialSummary}, destinoTotals: {...initialSummary} });

    const totalFleteGeneral = pagadoTotals.flete + destinoTotals.flete;

    // Based on image logic interpretation
    const pagadoFavorCooperat = pagadoTotals.flete * 0.25;
    const pagadoFavorAsociado = pagadoTotals.flete * 0.75 - pagadoTotals.seguro - pagadoTotals.ipostel - pagadoTotals.manejo;
    const destinoFavorCooperat = destinoTotals.flete * 0.25;
    const destinoFavorAsociado = destinoTotals.flete * 0.75;
    
    // Final Summary Calculations
    const totalRetenerCooperativa = destinoFavorCooperat + destinoTotals.seguro + destinoTotals.ipostel + destinoTotals.manejo;
    const totalSocioPagados = pagadoFavorAsociado;
    const subTotalNeto = totalSocioPagados - totalRetenerCooperativa;
    const cuentaPorCobrar = subTotalNeto; // Assuming regalias, prestamos are 0 for now
    const referenciaDolares = companyInfo.bcvRate ? cuentaPorCobrar / companyInfo.bcvRate : 0;


    const handleDownloadPdf = () => {
        const input = document.getElementById('remesa-to-print');
        if (!input) return;

        html2canvas(input, { scale: 2.5, useCORS: true }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = pdfWidth / canvasWidth;
            const finalImgHeight = canvasHeight * ratio;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, finalImgHeight);
            pdf.save(`remesa_${remesa.remesaNumber}.pdf`);
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Remesa de Carga - ${remesa.remesaNumber}`} size="4xl">
            <div id="remesa-to-print" className="bg-white text-black p-4 text-[9px] font-sans">
                {/* Header */}
                <div className="grid grid-cols-2">
                    <div>
                        <p className="font-bold text-[10px]">Asociación Cooperativa Mixta</p>
                        <p className="font-bold text-[10px]">FRATERNIDAD DEL TRANSPORTE, R.L.</p>
                        <p>RIF: {companyInfo.rif}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-[12px]">REMESA DE ASOCIADO</p>
                        <p><strong>LIQUIDACION #:</strong> {remesa.remesaNumber}</p>
                        <p><strong>Emision:</strong> {remesa.date}</p>
                        <p><strong>Hora:</strong> {new Date().toLocaleTimeString('es-VE')}</p>
                        <p><strong>Página:</strong> 1</p>
                    </div>
                </div>
                <div className="mt-2 text-[10px]">
                    <p><strong>SUCURSAL:</strong> 0001-CARACAS</p>
                    <p><strong>CONTROL:</strong> {`0029-GOMEZMOTAEUCLIDESRAFAEL`}</p>
                    <p><strong>CHOFER:</strong> {asociado?.nombre}, Vehiculo: {vehicle?.modelo}, Color: {vehicle?.color}, Placa: {vehicle?.placa}</p>
                </div>
                
                {/* Invoices Table */}
                <div className="mt-2">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-y border-black font-bold text-black">
                                <th className="p-1 text-left">FACTURA</th>
                                <th className="p-1 text-left">TP</th>
                                <th className="p-1 text-center">PZA</th>
                                <th className="p-1 text-left">EMISION</th>
                                <th className="p-1 text-left">ENCOMIENDA</th>
                                <th className="p-1 text-right">FLETE</th>
                                <th className="p-1 text-right">SEGURO</th>
                                <th className="p-1 text-right">ENVIO</th>
                                <th className="p-1 text-left">RECIBE</th>
                                <th className="p-1 text-left">ENTREGA</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(groupedInvoices).map(([officeName, invoicesInGroup]) => {
                                const groupTotals = invoicesInGroup.reduce((acc, inv) => {
                                    const financials = calculateFinancialDetails(inv.guide, companyInfo);
                                    acc.flete += financials.freight;
                                    acc.seguro += financials.insuranceCost;
                                    return acc;
                                }, { flete: 0, seguro: 0 });

                                return (
                                    <React.Fragment key={officeName}>
                                        <tr><td colSpan={10} className="font-bold pt-2 text-black">{officeName} (25%)</td></tr>
                                        {invoicesInGroup.map(inv => {
                                            const financials = calculateFinancialDetails(inv.guide, companyInfo);
                                            const totalPackages = inv.guide.merchandise.reduce((acc, m) => acc + m.quantity, 0);
                                            const receiver = clients.find(c => c.id === inv.guide.receiver.id || (c.idNumber && c.idNumber === inv.guide.receiver.idNumber)) || inv.guide.receiver;
                                            const encomienda = inv.guide.merchandise.map(m => getCategoryName(m.categoryId)).join(', ');
                                            const paymentType = inv.guide.paymentType === 'flete-pagado' ? '01' : '02';

                                            return (
                                                <tr key={inv.id} className="text-black">
                                                    <td className="p-1">{inv.invoiceNumber.replace('F-','')}</td>
                                                    <td className="p-1">{paymentType}</td>
                                                    <td className="p-1 text-center">{totalPackages}</td>
                                                    <td className="p-1">{new Date(inv.date).toLocaleDateString('es-VE')}</td>
                                                    <td className="p-1">{encomienda}</td>
                                                    <td className="p-1 text-right">{formatCurrency(financials.freight)}</td>
                                                    <td className="p-1 text-right">{formatCurrency(financials.insuranceCost)}</td>
                                                    <td className="p-1 text-right">{formatCurrency(financials.freight + financials.insuranceCost)}</td>
                                                    <td className="p-1">{receiver?.name}</td>
                                                    <td className="p-1">REPARTO</td>
                                                </tr>
                                            );
                                        })}
                                        <tr className="border-t border-dotted border-black text-black">
                                            <td className="p-1 font-bold" colSpan={5}>SUB TOTALES -&gt;</td>
                                            <td className="p-1 text-right font-bold">{formatCurrency(groupTotals.flete)}</td>
                                            <td className="p-1 text-right font-bold">{formatCurrency(groupTotals.seguro)}</td>
                                            <td className="p-1 text-right font-bold">{formatCurrency(groupTotals.flete + groupTotals.seguro)}</td>
                                            <td colSpan={2}></td>
                                        </tr>
                                    </React.Fragment>
                                );
                            })}
                             <tr className="border-t-2 border-black text-black">
                                <td className="p-1 font-bold" colSpan={5}>TOTALES -&gt;</td>
                                <td className="p-1 text-right font-bold">{formatCurrency(tableTotals.flete)}</td>
                                <td className="p-1 text-right font-bold">{formatCurrency(tableTotals.seguro)}</td>
                                <td className="p-1 text-right font-bold">{formatCurrency(tableTotals.flete + tableTotals.seguro)}</td>
                                <td colSpan={2}></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Financial Summary */}
                <div className="mt-2 space-y-2">
                    <table className="w-full">
                        <thead className="border-y border-black">
                            <tr className="text-black">
                                <th className="p-1 text-left"></th>
                                <th className="p-1 text-right">Flete</th>
                                <th className="p-1 text-right">Viajes</th>
                                <th className="p-1 text-right">Sobres</th>
                                <th className="p-1 text-right">Seguro</th>
                                <th className="p-1 text-right">Ipostel</th>
                                <th className="p-1 text-right">Manejo</th>
                                <th className="p-1 text-right">I.V.A.</th>
                                <th className="p-1 text-right">Favor de Cooperat.</th>
                                <th className="p-1 text-right">Favor de Asociado</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="text-black">
                                <td className="p-1 text-left font-bold">Pagado</td>
                                <td className="p-1 text-right">{formatCurrency(pagadoTotals.flete)}</td>
                                <td className="p-1 text-right">0.00</td>
                                <td className="p-1 text-right">0.00</td>
                                <td className="p-1 text-right">{formatCurrency(pagadoTotals.seguro)}</td>
                                <td className="p-1 text-right">{formatCurrency(pagadoTotals.ipostel)}</td>
                                <td className="p-1 text-right">{formatCurrency(pagadoTotals.manejo)}</td>
                                <td className="p-1 text-right">0.00</td>
                                <td className="p-1 text-right">{formatCurrency(pagadoFavorCooperat)}</td>
                                <td className="p-1 text-right">{formatCurrency(pagadoFavorAsociado)}</td>
                            </tr>
                            <tr className="text-black">
                                <td className="p-1 text-left font-bold">Destino</td>
                                <td className="p-1 text-right">{formatCurrency(destinoTotals.flete)}</td>
                                <td className="p-1 text-right">0.00</td>
                                <td className="p-1 text-right">0.00</td>
                                <td className="p-1 text-right">{formatCurrency(destinoTotals.seguro)}</td>
                                <td className="p-1 text-right">{formatCurrency(destinoTotals.ipostel)}</td>
                                <td className="p-1 text-right">{formatCurrency(destinoTotals.manejo)}</td>
                                <td className="p-1 text-right">0.00</td>
                                <td className="p-1 text-right">{formatCurrency(destinoFavorCooperat)}</td>
                                <td className="p-1 text-right">{formatCurrency(destinoFavorAsociado)}</td>
                            </tr>
                            <tr className="border-t border-black font-bold text-black">
                                <td className="p-1 text-left">Total Bs.</td>
                                <td className="p-1 text-right">{formatCurrency(totalFleteGeneral)}</td>
                                <td className="p-1 text-right">0.00</td>
                                <td className="p-1 text-right">0.00</td>
                                <td className="p-1 text-right">{formatCurrency(pagadoTotals.seguro + destinoTotals.seguro)}</td>
                                <td className="p-1 text-right">{formatCurrency(pagadoTotals.ipostel + destinoTotals.ipostel)}</td>
                                <td className="p-1 text-right">{formatCurrency(pagadoTotals.manejo + destinoTotals.manejo)}</td>
                                <td className="p-1 text-right">0.00</td>
                                <td className="p-1 text-right">{formatCurrency(pagadoFavorCooperat + destinoFavorCooperat)}</td>
                                <td className="p-1 text-right">{formatCurrency(pagadoFavorAsociado + destinoFavorAsociado)}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="grid grid-cols-2 gap-4 mt-2">
                        {/* Left Side */}
                        <div className="grid grid-cols-2 gap-x-2">
                            <div>
                                <p className="font-bold">Destino</p>
                                <p>Coop.</p>
                                <p>Seguro</p>
                                <p>Ipostel</p>
                                <p>Manejo</p>
                                <p>I.V.A.</p>
                            </div>
                            <div className="text-right">
                                <p>{formatCurrency(destinoFavorCooperat)}</p>
                                <p>{formatCurrency(destinoTotals.seguro)}</p>
                                <p>{formatCurrency(destinoTotals.ipostel)}</p>
                                <p>{formatCurrency(destinoTotals.manejo)}</p>
                                <p>0.00</p>
                            </div>
                        </div>
                        {/* Right Side */}
                        <div className="space-y-1">
                            <div className="flex justify-between border-b border-black"><p>SUB-TOTAL</p><p>{formatCurrency(totalRetenerCooperativa)}</p></div>
                            <div className="flex justify-between"><p>TOTAL SOCIO (PAGADOS)</p><p>{formatCurrency(totalSocioPagados)}</p></div>
                            <div className="flex justify-between border-b-2 border-black"><p>SUB TOTAL</p><p>{formatCurrency(subTotalNeto)}</p></div>
                            <div className="flex justify-between"><p>Regalias</p><p>0.00</p></div>
                            <div className="flex justify-between"><p>Prestamos</p><p>0.00</p></div>
                            <div className="flex justify-between"><p>Creditos</p><p>0.00</p></div>
                            <div className="flex justify-between border-b-2 border-black"><p>SUB TOTAL</p><p>{formatCurrency(cuentaPorCobrar)}</p></div>
                            <div className="mt-2 font-bold flex justify-between"><p>Cuenta por cobrar al asociado:</p><p>{formatCurrency(cuentaPorCobrar)}</p></div>
                            <div className="flex justify-between"><p>Referencia $:</p><p>{formatCurrency(referenciaDolares)}</p></div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="grid grid-cols-2 mt-4">
                    <div>
                        <p className="font-bold">OBSERVACIONES:</p>
                        <p>Tp:01=Pagado 02=Cobro a destino 03=Credito</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-12 text-center">
                        <div><p className="border-t border-black pt-1">Oficinista</p></div>
                        <div><p className="border-t border-black pt-1">Conductor</p></div>
                    </div>
                </div>

            </div>
             <div className="flex justify-end space-x-3 p-4 border-t dark:border-gray-700 no-print">
                <Button type="button" variant="secondary" onClick={onClose}>
                    <XIcon className="w-4 h-4 mr-2" />Cerrar
                </Button>
                <Button type="button" onClick={handleDownloadPdf}>
                    <DownloadIcon className="w-4 h-4 mr-2" />Descargar PDF
                </Button>
            </div>
        </Modal>
    );
};

export default RemesaDocumentModal;