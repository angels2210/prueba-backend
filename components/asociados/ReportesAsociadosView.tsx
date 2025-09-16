import React, { useState, useMemo } from 'react';
import { Asociado, PagoAsociado, ReciboPagoAsociado, CompanyInfo } from '../../types';
import Card, { CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import { ArrowLeftIcon, PrinterIcon } from '../icons/Icons';
import Select from '../ui/Select';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReportesAsociadosViewProps {
    asociados: Asociado[];
    pagos: PagoAsociado[];
    recibos: ReciboPagoAsociado[];
    companyInfo: CompanyInfo;
}

const formatCurrency = (amount: number) => `Bs. ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const EstadoDeCuenta: React.FC<{
    asociado: Asociado,
    pagos: PagoAsociado[],
    recibos: ReciboPagoAsociado[],
    companyInfo: CompanyInfo
}> = ({ asociado, pagos, recibos, companyInfo }) => {

    const transactions = useMemo(() => {
        const debtItems = pagos.map(p => ({
            date: p.fechaVencimiento,
            description: p.concepto,
            debit: p.montoBs,
            credit: 0
        }));
        const paymentItems = recibos.map(r => ({
            date: r.fechaPago,
            description: `Recibo de Pago #${r.comprobanteNumero}`,
            debit: 0,
            credit: r.montoTotalBs
        }));
        
        return [...debtItems, ...paymentItems].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    }, [pagos, recibos]);

    let balance = 0;

    const handlePrint = () => {
        const input = document.getElementById('estado-cuenta-printable');
        if (!input) return;

        html2canvas(input, { scale: 2, useCORS: true }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const imgHeight = canvas.height * pdfWidth / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
            pdf.save(`Estado_Cuenta_${asociado.nombre}.pdf`);
        });
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Estado de Cuenta</CardTitle>
                    <Button onClick={handlePrint}><PrinterIcon className="w-4 h-4 mr-2" /> Imprimir / PDF</Button>
                </div>
            </CardHeader>
            <div id="estado-cuenta-printable" className="p-4 bg-white text-black">
                {/* Header */}
                 <div className="flex justify-between items-start pb-4 border-b-2 border-gray-800">
                    <div className="flex items-center">
                        {companyInfo.logoUrl && (
                            <img src={companyInfo.logoUrl} alt="Logo" className="h-16 w-auto mr-4" />
                        )}
                        <div>
                            <h1 className="text-xl font-bold">{companyInfo.name}</h1>
                            <p className="text-xs">RIF: {companyInfo.rif}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-lg font-bold uppercase">Estado de Cuenta</h2>
                        <p className="text-sm">Fecha de Emisión: {new Date().toLocaleDateString('es-VE')}</p>
                    </div>
                </div>
                {/* Asociado Info */}
                <div className="my-6 p-3 border rounded-md bg-gray-50">
                    <p><strong>Asociado:</strong> {asociado.nombre}</p>
                    <p><strong>Código:</strong> {asociado.codigo}</p>
                    <p><strong>Cédula:</strong> {asociado.cedula}</p>
                </div>
                 {/* Table */}
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-200">
                        <tr>
                            <th className="px-2 py-2 text-left font-semibold text-gray-900 dark:text-gray-900">Fecha</th>
                            <th className="px-2 py-2 text-left font-semibold text-gray-900 dark:text-gray-900">Concepto / Descripción</th>
                            <th className="px-2 py-2 text-right font-semibold text-gray-900 dark:text-gray-900">Debe (Deuda)</th>
                            <th className="px-2 py-2 text-right font-semibold text-gray-900 dark:text-gray-900">Haber (Pago)</th>
                            <th className="px-2 py-2 text-right font-semibold text-gray-900 dark:text-gray-900">Saldo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map((t, index) => {
                            balance += t.debit - t.credit;
                            return (
                                <tr key={index} className="border-b">
                                    <td className="px-2 py-2">{t.date}</td>
                                    <td className="px-2 py-2">{t.description}</td>
                                    <td className="px-2 py-2 text-right font-mono">{t.debit > 0 ? formatCurrency(t.debit) : '-'}</td>
                                    <td className="px-2 py-2 text-right font-mono text-green-600">{t.credit > 0 ? formatCurrency(t.credit) : '-'}</td>
                                    <td className="px-2 py-2 text-right font-mono font-semibold">{formatCurrency(balance)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="font-bold bg-gray-200 border-t-2 border-black">
                        <tr>
                            <td colSpan={4} className="px-2 py-3 text-right text-gray-900 dark:text-gray-900">Saldo Final:</td>
                            <td className="px-2 py-3 text-right text-lg text-gray-900 dark:text-gray-900">{formatCurrency(balance)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </Card>
    )
}


const ReportesAsociadosView: React.FC<ReportesAsociadosViewProps> = (props) => {
    const { asociados, pagos, recibos, companyInfo } = props;
    const [selectedAsociadoId, setSelectedAsociadoId] = useState<string>('');
    
    const selectedAsociado = useMemo(() => {
        if (!selectedAsociadoId) return null;
        return asociados.find(a => a.id === selectedAsociadoId);
    }, [asociados, selectedAsociadoId]);

    const pagosAsociado = useMemo(() => {
        if (!selectedAsociadoId) return [];
        return pagos.filter(p => p.asociadoId === selectedAsociadoId);
    }, [pagos, selectedAsociadoId]);
    
    const recibosAsociado = useMemo(() => {
        if (!selectedAsociadoId) return [];
        return recibos.filter(r => r.asociadoId === selectedAsociadoId);
    }, [recibos, selectedAsociadoId]);

    return (
        <div className="space-y-6">
            <div className="mb-4">
                <Button variant="secondary" onClick={() => window.location.hash = 'asociados'}>
                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                    Volver al Módulo de Asociados
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Generar Reporte de Asociado</CardTitle>
                </CardHeader>
                <div className="max-w-md">
                    <Select
                        label="Seleccione un Asociado"
                        value={selectedAsociadoId}
                        onChange={(e) => setSelectedAsociadoId(e.target.value)}
                    >
                        <option value="">-- Buscar asociado --</option>
                        {asociados.map(a => (
                            <option key={a.id} value={a.id}>{a.nombre} ({a.codigo})</option>
                        ))}
                    </Select>
                </div>
            </Card>
            
            {selectedAsociado && (
                <EstadoDeCuenta 
                    asociado={selectedAsociado}
                    pagos={pagosAsociado}
                    recibos={recibosAsociado}
                    companyInfo={companyInfo}
                />
            )}

        </div>
    );
};

export default ReportesAsociadosView;