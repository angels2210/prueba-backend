import React, { useMemo } from 'react';
import jsPDF from 'jspdf';
import { Invoice, CompanyInfo, Client, Category } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { XIcon, PackageIcon, DownloadIcon, PrinterIcon } from '../icons/Icons';
import { calculateFinancialDetails } from '../../utils/financials';

interface InvoiceDetailViewProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: Invoice;
    companyInfo: CompanyInfo;
    clients: Client[];
    categories: Category[];
    printOnOpen?: boolean;
    onPrintComplete?: () => void;
}

const InvoiceDetailView: React.FC<InvoiceDetailViewProps> = ({ isOpen, onClose, invoice, companyInfo, clients, categories, printOnOpen = false, onPrintComplete = () => {} }) => {
    if (!isOpen) return null;

    const sender = clients.find(c => c.id === invoice.guide.sender.id) || invoice.guide.sender;
    const receiver = clients.find(c => c.id === invoice.guide.receiver.id) || invoice.guide.receiver;

    const financials = useMemo(() => calculateFinancialDetails(invoice.guide, companyInfo), [invoice, companyInfo]);
    const showPerItemTaxes = invoice.guide.merchandise.length > 3;

    const perItemFinancials = useMemo(() => {
        const itemDetails: { [key: number]: { iva: number; ipostel: number } } = {};
        if (!showPerItemTaxes) return itemDetails;
    
        const totalFreightBeforeDiscount = invoice.guide.merchandise.reduce((acc, item) => {
            const realWeight = Number(item.weight) || 0;
            const volumetricWeight = (Number(item.length) * Number(item.width) * Number(item.height)) / 5000;
            const chargeableWeight = Math.max(realWeight, volumetricWeight) * (Number(item.quantity) || 1);
            return acc + (chargeableWeight * (companyInfo.costPerKg || 0));
        }, 0);
    
        const freightForIpostel = invoice.guide.merchandise.reduce((acc, item) => {
            const realWeightPerUnit = Number(item.weight) || 0;
            const volWeightPerUnit = (Number(item.length) * Number(item.width) * Number(item.height)) / 5000;
            const chargeableWeightPerUnit = Math.max(realWeightPerUnit, volWeightPerUnit);
    
            if (chargeableWeightPerUnit > 0 && chargeableWeightPerUnit <= 30.99) {
                const itemFreight = (chargeableWeightPerUnit * (Number(item.quantity) || 1)) * (companyInfo.costPerKg || 0);
                return acc + itemFreight;
            }
            return acc;
        }, 0);
    
        if (totalFreightBeforeDiscount > 0) {
            invoice.guide.merchandise.forEach((item, index) => {
                const realWeightPerUnit = Number(item.weight) || 0;
                const volWeightPerUnit = (Number(item.length) * Number(item.width) * Number(item.height)) / 5000;
                const chargeableWeightPerUnit = Math.max(realWeightPerUnit, volWeightPerUnit);
                const totalChargeableWeight = chargeableWeightPerUnit * (Number(item.quantity) || 1);
                const itemFreight = totalChargeableWeight * (companyInfo.costPerKg || 0);
    
                const itemFreightProportion = itemFreight / totalFreightBeforeDiscount;
                const itemIVA = financials.iva * itemFreightProportion;
    
                let itemIPOSTEL = 0;
                if (chargeableWeightPerUnit > 0 && chargeableWeightPerUnit <= 30.99 && freightForIpostel > 0) {
                    const ipostelFreightContribution = itemFreight;
                    const itemIpostelProportion = ipostelFreightContribution / freightForIpostel;
                    itemIPOSTEL = financials.ipostel * itemIpostelProportion;
                }
    
                itemDetails[index] = { iva: itemIVA, ipostel: itemIPOSTEL };
            });
        }
        return itemDetails;
    }, [invoice.guide.merchandise, showPerItemTaxes, companyInfo, financials]);

    const formatCurrency = (amount: number) => `Bs. ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const handlePrint = () => {
       const printableElement = document.getElementById('invoice-to-print-display-only');
       if (!printableElement) return;

       const iframe = document.createElement('iframe');
       iframe.style.position = 'fixed';
       iframe.style.width = '0';
       iframe.style.height = '0';
       iframe.style.border = '0';
       iframe.style.left = '-9999px';
       document.body.appendChild(iframe);

       const doc = iframe.contentWindow?.document;
       if (doc) {
           doc.open();
           doc.write('<html><head><title>Factura</title>');
           const tailwindScript = document.querySelector('script[src="https://cdn.tailwindcss.com"]');
           if (tailwindScript) doc.write(tailwindScript.outerHTML);
           const tailwindConfig = Array.from(document.querySelectorAll('script:not([src])')).find(s => s.innerHTML.includes('tailwind.config'));
           if (tailwindConfig) doc.write(tailwindConfig.outerHTML);
           doc.write('<style>@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none !important; } }</style>');
           doc.write('</head><body class="bg-white">');
           doc.write(printableElement.innerHTML);
           doc.write('</body></html>');
           doc.close();

           iframe.onload = () => {
               iframe.contentWindow?.focus();
               iframe.contentWindow?.print();
               setTimeout(() => {
                   document.body.removeChild(iframe);
               }, 500);
           };
       }
   };

    React.useEffect(() => {
        if (isOpen && printOnOpen) {
            setTimeout(() => {
                handlePrint();
                if (onPrintComplete) onPrintComplete();
            }, 500);
        }
    }, [isOpen, printOnOpen]);

    const handleDownloadPdf = () => {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 15;
        let y = margin;

        // --- Fonts and Colors ---
        const primaryColor = '#2563eb'; // blue-600
        const textColor = '#1f2937'; // gray-800
        
        pdf.setFont('helvetica');

        // --- Header ---
        const logoWidth = 35;
        const companyInfoX = margin + logoWidth + 5; // Start text 5mm after logo

        try {
            if (companyInfo.logoUrl && companyInfo.logoUrl.startsWith('data:image')) {
                if (!companyInfo.logoUrl.includes('svg+xml')) {
                     pdf.addImage(companyInfo.logoUrl, 'PNG', margin, y, logoWidth, 25);
                }
            }
        } catch(e) { console.error("Error adding logo image to PDF", e) }

        pdf.setFontSize(14);
        pdf.setTextColor(primaryColor);
        pdf.setFont('helvetica', 'bold');
        pdf.text(companyInfo.name, companyInfoX, y + 5);

        pdf.setFontSize(9);
        pdf.setTextColor(textColor);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`RIF: ${companyInfo.rif}`, companyInfoX, y + 10);
        pdf.text(`Habilitación Postal: ${companyInfo.postalLicense || 'N/A'}`, companyInfoX, y + 15);
        const addressMaxWidth = pageWidth - companyInfoX - (margin + 60); // Reserve 60mm on the right for 'FACTURA' block
        const addressLines = pdf.splitTextToSize(companyInfo.address, addressMaxWidth);
        pdf.text(addressLines, companyInfoX, y + 20);
        pdf.text(`Telf: ${companyInfo.phone}`, companyInfoX, y + 20 + (addressLines.length * 4));

        pdf.setFontSize(26);
        pdf.setFont('helvetica', 'bold');
        pdf.text('FACTURA', pageWidth - margin, y + 5, { align: 'right' });

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Nº:`, pageWidth - margin - 25, y + 12);
        pdf.setTextColor('#dc2626'); // red-600
        pdf.setFont('helvetica', 'bold');
        pdf.text(invoice.invoiceNumber, pageWidth - margin, y + 12, { align: 'right' });

        pdf.setTextColor(textColor);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Control: ${invoice.controlNumber}`, pageWidth - margin, y + 17, { align: 'right' });
        pdf.text(`Fecha: ${invoice.date}`, pageWidth - margin, y + 22, { align: 'right' });

        y += 35;
        pdf.setDrawColor(primaryColor);
        pdf.setLineWidth(0.5);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 10;

        // --- Sender/Receiver ---
        const boxWidth = (pageWidth - (margin * 2) - 10) / 2;
        const boxHeight = 40;
        pdf.setFillColor('#f9fafb');
        pdf.setDrawColor('#e5e7eb');
        pdf.roundedRect(margin, y, boxWidth, boxHeight, 3, 3, 'FD');
        pdf.roundedRect(margin + boxWidth + 10, y, boxWidth, boxHeight, 3, 3, 'FD');

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(textColor);
        pdf.text('Remitente', margin + 5, y + 7);
        pdf.line(margin + 5, y + 8, margin + 25, y + 8);

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text(sender.name || '', margin + 5, y + 14, { maxWidth: boxWidth - 10 });
        pdf.text(`CI/RIF: ${sender.idNumber || ''}`, margin + 5, y + 20);
        pdf.text(`Telf: ${sender.phone || ''}`, margin + 5, y + 25);
        pdf.text(`Email: ${sender.email || ''}`, margin + 5, y + 30);
        const senderAddrLines = pdf.splitTextToSize(sender.address || '', boxWidth - 10);
        pdf.text(senderAddrLines, margin + 5, y + 35);

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Destinatario', margin + boxWidth + 15, y + 7);
        pdf.line(margin + boxWidth + 15, y + 8, margin + boxWidth + 40, y + 8);
        
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text(receiver.name || '', margin + boxWidth + 15, y + 14, { maxWidth: boxWidth - 10 });
        pdf.text(`CI/RIF: ${receiver.idNumber || ''}`, margin + boxWidth + 15, y + 20);
        pdf.text(`Telf: ${receiver.phone || ''}`, margin + boxWidth + 15, y + 25);
        pdf.text(`Email: ${receiver.email || ''}`, margin + boxWidth + 15, y + 30);
        const receiverAddrLines = pdf.splitTextToSize(receiver.address || '', boxWidth - 10);
        pdf.text(receiverAddrLines, margin + boxWidth + 15, y + 35);
        
        y += boxHeight + 10;

        // --- Shipping Conditions ---
        pdf.setDrawColor('#e5e7eb');
        pdf.setLineWidth(0.2);
        pdf.line(margin, y - 5, pageWidth - margin, y - 5);
        pdf.line(margin, y + 5, pageWidth - margin, y + 5);
        
        pdf.setFontSize(8);
        const condColWidth = (pageWidth - margin * 2) / 4;
        pdf.text(`Condición Pago: ${invoice.guide.paymentType === 'flete-pagado' ? 'Flete Pagado' : 'Flete a Destino'}`, margin, y);
        pdf.text(`Moneda Pago: ${invoice.guide.paymentCurrency}`, margin + condColWidth, y);
        pdf.text(`Tiene Seguro: ${invoice.guide.hasInsurance ? 'Sí' : 'No'}`, margin + condColWidth * 2, y);
        if (invoice.guide.hasInsurance) {
            pdf.text(`Valor Declarado: ${formatCurrency(invoice.guide.declaredValue)}`, margin + condColWidth * 3, y);
        }
        y += 10;
        
        // --- Items Table ---
        const tableHeaders = showPerItemTaxes
            ? ['Descripción', 'Cant', 'P.Fact.(kg)', 'Flete', 'IVA', 'IPOSTEL']
            : ['Descripción', 'Cantidad', 'Peso Real (kg/u)', 'Peso Vol. (kg/u)', 'Peso Facturado (kg)', 'Monto Flete'];
        
        const colWidths = showPerItemTaxes
            ? [70, 15, 20, 25, 25, 25]
            : [55, 20, 26, 26, 26, 27];
        const tableX = margin;
        
        const drawTableHeader = (currentY: number) => {
            const headerRowHeight = 12; // Increased height for wrapped text
            pdf.setFillColor(primaryColor);
            pdf.setTextColor('#ffffff');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(8);
            let currentX = tableX;
            pdf.rect(tableX, currentY, colWidths.reduce((a, b) => a + b), headerRowHeight, 'F');
            for (let i = 0; i < tableHeaders.length; i++) {
                const align = i > 1 ? 'right' : i === 1 ? 'center' : 'left';
                let textX = align === 'right' ? currentX + colWidths[i] - 2 : align === 'center' ? currentX + colWidths[i] / 2 : currentX + 2;
                const textLines = pdf.splitTextToSize(tableHeaders[i], colWidths[i] - 4);
                pdf.text(textLines, textX, currentY + headerRowHeight / 2, { align, baseline: 'middle' });
                currentX += colWidths[i];
            }
            return currentY + headerRowHeight;
        };

        y = drawTableHeader(y);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(textColor);
        pdf.setFontSize(8);
        pdf.setDrawColor('#cccccc');
        pdf.setLineWidth(0.2);

        invoice.guide.merchandise.forEach((item, index) => {
            const categoryName = categories.find(c => c.id === item.categoryId)?.name || 'N/A';
            const descriptionLines = pdf.splitTextToSize(`${item.description}\nCategoría: ${categoryName}`, colWidths[0] - 4);
            const rowHeight = Math.max(12, descriptionLines.length * 4 + 4);

            if (y + rowHeight > pageHeight - margin - 50) { // Check for page break
                pdf.addPage();
                y = margin;
                y = drawTableHeader(y);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(textColor);
                pdf.setFontSize(8);
                pdf.setDrawColor('#cccccc');
                pdf.setLineWidth(0.2);
            }
            
            const realWeightPerUnit = Number(item.weight) || 0;
            const volWeightPerUnit = (Number(item.length) * Number(item.width) * Number(item.height)) / 5000;
            const chargeableWeightPerUnit = Math.max(realWeightPerUnit, volWeightPerUnit);
            const totalChargeableWeight = chargeableWeightPerUnit * (Number(item.quantity) || 1);
            const itemFreight = totalChargeableWeight * (companyInfo.costPerKg || 0);
            
            let currentX = tableX;
            const textY = y + 5;
            
            // Draw borders
            pdf.line(currentX, y, currentX, y + rowHeight); // Left border
            for (let w of colWidths) { currentX += w; pdf.line(currentX, y, currentX, y + rowHeight); } // Vertical lines
            pdf.line(tableX, y + rowHeight, currentX, y + rowHeight); // Bottom line
            
            currentX = tableX;
            
            // Draw content
            if (showPerItemTaxes) {
                const itemTaxes = perItemFinancials[index] || { iva: 0, ipostel: 0 };
                pdf.text(descriptionLines, currentX + 2, textY);
                currentX += colWidths[0];
                pdf.text(item.quantity.toString(), currentX + colWidths[1] / 2, textY, { align: 'center' });
                currentX += colWidths[1];
                pdf.text(totalChargeableWeight.toFixed(2), currentX + colWidths[2] - 2, textY, { align: 'right' });
                currentX += colWidths[2];
                pdf.text(itemFreight.toLocaleString('es-VE', { minimumFractionDigits: 2 }), currentX + colWidths[3] - 2, textY, { align: 'right' });
                currentX += colWidths[3];
                pdf.text(itemTaxes.iva.toLocaleString('es-VE', { minimumFractionDigits: 2 }), currentX + colWidths[4] - 2, textY, { align: 'right' });
                currentX += colWidths[4];
                pdf.text(itemTaxes.ipostel.toLocaleString('es-VE', { minimumFractionDigits: 2 }), currentX + colWidths[5] - 2, textY, { align: 'right' });
            } else {
                pdf.text(descriptionLines, currentX + 2, textY);
                currentX += colWidths[0];
                pdf.text(item.quantity.toString(), currentX + colWidths[1]/2, textY, {align: 'center'});
                currentX += colWidths[1];
                pdf.text(realWeightPerUnit.toFixed(2), currentX + colWidths[2] - 2, textY, {align: 'right'});
                currentX += colWidths[2];
                pdf.text(volWeightPerUnit.toFixed(2), currentX + colWidths[3] - 2, textY, {align: 'right'});
                currentX += colWidths[3];
                pdf.text(totalChargeableWeight.toFixed(2), currentX + colWidths[4] - 2, textY, {align: 'right'});
                currentX += colWidths[4];
                pdf.text(itemFreight.toLocaleString('es-VE', { minimumFractionDigits: 2 }), currentX + colWidths[5] - 2, textY, {align: 'right'});
            }
            
            y += rowHeight;
        });

        // --- Totals Section ---
        if (y + 70 > pageHeight - margin) {
            pdf.addPage();
            y = margin;
        }

        let totalsY = y + 5;
        const totalsX = pageWidth - margin - 80;
        const valueX = pageWidth - margin;

        const addTotalRow = (label: string, value: string, isBold = false) => {
            pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
            pdf.setFontSize(isBold ? 10 : 9);
            pdf.text(label, totalsX, totalsY, { align: 'left' });
            pdf.text(value, valueX, totalsY, { align: 'right' });
            totalsY += 6;
        }

        addTotalRow('Monto del Flete:', formatCurrency(financials.freight));
        addTotalRow('Manejo de Mercancía:', formatCurrency(financials.handling));
        addTotalRow('Monto de Seguro:', formatCurrency(financials.insuranceCost));
        if (financials.discount > 0) {
            pdf.setTextColor('#dc2626');
            addTotalRow('Descuento:', `-${formatCurrency(financials.discount)}`);
            pdf.setTextColor(textColor);
        }

        totalsY += 2;
        pdf.setDrawColor(textColor);
        pdf.setLineWidth(0.3);
        pdf.line(totalsX, totalsY - 4, valueX, totalsY - 4);
        
        addTotalRow('Base Imponible:', formatCurrency(financials.subtotal), true);
        addTotalRow('IVA (16%):', formatCurrency(financials.iva));
        if (financials.ipostel > 0) addTotalRow('Aporte Ipostel:', formatCurrency(financials.ipostel));
        if (financials.igtf > 0) addTotalRow('IGTF (3%):', formatCurrency(financials.igtf));

        totalsY += 2;
        pdf.setFillColor(primaryColor);
        pdf.rect(totalsX, totalsY - 4, valueX - totalsX, 15, 'F');
        pdf.setTextColor('#ffffff');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.text('TOTAL A PAGAR:', totalsX + 5, totalsY + 3);
        pdf.setFontSize(14);
        pdf.text(formatCurrency(financials.total), valueX - 5, totalsY + 3, { align: 'right' });

        pdf.save(`factura-${invoice.invoiceNumber}.pdf`);
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Detalle de Factura: ${invoice.invoiceNumber}`} size="4xl">
            <div id="invoice-to-print-display-only" className="bg-white text-black">
                <div className="p-4 md:p-8">
                    {/* Header */}
                    <div className="flex justify-between items-start pb-4 border-b-2 border-primary-500">
                        <div className="flex items-center">
                             <div className="p-2 bg-gray-100 rounded-lg mr-4 border">
                                {companyInfo.logoUrl ? (
                                    <img src={companyInfo.logoUrl} alt="Company Logo" className="h-16 w-auto" />
                                ) : (
                                    <PackageIcon className="h-12 w-12 text-primary-500" />
                                )}
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-primary-700">{companyInfo.name}</h1>
                                <p className="text-xs">RIF: {companyInfo.rif}</p>
                                <p className="text-xs">Habilitación Postal: {companyInfo.postalLicense || 'N/A'}</p>
                                <p className="text-xs">{companyInfo.address}</p>
                                <p className="text-xs">Telf: {companyInfo.phone}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h2 className="text-4xl font-extrabold uppercase text-primary-700">FACTURA</h2>
                            <p className="mt-1"><strong>Nº:</strong> <span className="text-red-600 font-bold">{invoice.invoiceNumber}</span></p>
                            <p className="text-sm"><strong>Control:</strong> {invoice.controlNumber}</p>
                            <p className="text-sm"><strong>Fecha:</strong> {invoice.date}</p>
                        </div>
                    </div>

                    {/* Sender/Receiver Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                        <div className="bg-gray-50 p-4 rounded-lg border">
                            <h3 className="font-semibold border-b pb-1 mb-2">Remitente</h3>
                            <p className="font-bold text-lg">{sender.name}</p>
                            <p className="text-sm"><strong>CI/RIF:</strong> {sender.idNumber}</p>
                            <p className="text-sm"><strong>Telf:</strong> {sender.phone}</p>
                            <p className="text-sm"><strong>Email:</strong> {sender.email || 'N/A'}</p>
                            <p className="text-sm">{sender.address}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border">
                            <h3 className="font-semibold border-b pb-1 mb-2">Destinatario</h3>
                            <p className="font-bold text-lg">{receiver.name}</p>
                            <p className="text-sm"><strong>CI/RIF:</strong> {receiver.idNumber}</p>
                             <p className="text-sm"><strong>Telf:</strong> {receiver.phone}</p>
                            <p className="text-sm"><strong>Email:</strong> {receiver.email || 'N/A'}</p>
                            <p className="text-sm">{receiver.address}</p>
                        </div>
                    </div>
                     {/* Shipping Conditions */}
                     <div className="mt-6 border-t border-b py-2 text-xs grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div><strong>Condición Pago:</strong> {invoice.guide.paymentType === 'flete-pagado' ? 'Flete Pagado' : 'Flete a Destino'}</div>
                        <div><strong>Moneda Pago:</strong> {invoice.guide.paymentCurrency}</div>
                        <div><strong>Tiene Seguro:</strong> {invoice.guide.hasInsurance ? 'Sí' : 'No'}</div>
                        {invoice.guide.hasInsurance && <div><strong>Valor Declarado:</strong> {formatCurrency(invoice.guide.declaredValue)}</div>}
                    </div>
                    
                    {/* Items Table */}
                    <div className="mt-8 overflow-x-auto">
                        <table className="min-w-full text-xs">
                             <thead className="bg-primary-500 text-white">
                                <tr>
                                    {showPerItemTaxes ? (
                                        <>
                                            <th className="px-2 py-2 text-left font-semibold uppercase tracking-wider">Descripción</th>
                                            <th className="px-2 py-2 text-center font-semibold uppercase tracking-wider">Cant</th>
                                            <th className="px-2 py-2 text-right font-semibold uppercase tracking-wider">P.Fact.(kg)</th>
                                            <th className="px-2 py-2 text-right font-semibold uppercase tracking-wider">Flete</th>
                                            <th className="px-2 py-2 text-right font-semibold uppercase tracking-wider">IVA</th>
                                            <th className="px-2 py-2 text-right font-semibold uppercase tracking-wider">IPOSTEL</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="px-2 py-2 text-left font-semibold uppercase tracking-wider">Descripción</th>
                                            <th className="px-2 py-2 text-center font-semibold uppercase tracking-wider">Cantidad</th>
                                            <th className="px-2 py-2 text-right font-semibold uppercase tracking-wider">Peso Real (kg/u)</th>
                                            <th className="px-2 py-2 text-right font-semibold uppercase tracking-wider">Peso Vol. (kg/u)</th>
                                            <th className="px-2 py-2 text-right font-semibold uppercase tracking-wider" title="El mayor valor entre Peso Real y Peso Volumétrico, multiplicado por la cantidad.">Peso Facturado (kg)</th>
                                            <th className="px-2 py-2 text-right font-semibold uppercase tracking-wider">Monto Flete</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {invoice.guide.merchandise.map((item, index) => {
                                    const realWeightPerUnit = Number(item.weight) || 0;
                                    const volWeightPerUnit = (Number(item.length) * Number(item.width) * Number(item.height)) / 5000;
                                    const chargeableWeightPerUnit = Math.max(realWeightPerUnit, volWeightPerUnit);
                                    const totalChargeableWeight = chargeableWeightPerUnit * (Number(item.quantity) || 1);
                                    const itemFreight = totalChargeableWeight * (companyInfo.costPerKg || 0);
                                    const categoryName = categories.find(c => c.id === item.categoryId)?.name || 'N/A';
                                    const itemTaxes = perItemFinancials[index] || { iva: 0, ipostel: 0 };

                                    return (
                                        <tr key={index} className="hover:bg-gray-50 text-black">
                                            <td className="px-2 py-2 align-top whitespace-normal">
                                                <div className="font-semibold">{item.description}</div>
                                                <div>Categoría: {categoryName}</div>
                                            </td>
                                            <td className="px-2 py-2 text-center align-top">{item.quantity}</td>
                                            
                                            {showPerItemTaxes ? (
                                                <>
                                                    <td className="px-2 py-2 text-right align-top font-bold">{totalChargeableWeight.toFixed(2)}</td>
                                                    <td className="px-2 py-2 text-right align-top font-medium">{formatCurrency(itemFreight)}</td>
                                                    <td className="px-2 py-2 text-right align-top">{formatCurrency(itemTaxes.iva)}</td>
                                                    <td className="px-2 py-2 text-right align-top">{formatCurrency(itemTaxes.ipostel)}</td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-2 py-2 text-right align-top">{realWeightPerUnit.toFixed(2)}</td>
                                                    <td className="px-2 py-2 text-right align-top">{volWeightPerUnit.toFixed(2)}</td>
                                                    <td className="px-2 py-2 text-right align-top font-bold">{totalChargeableWeight.toFixed(2)}</td>
                                                    <td className="px-2 py-2 text-right align-top font-medium">{formatCurrency(itemFreight)}</td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end mt-6">
                        <div className="w-full max-w-sm space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span>Monto del Flete:</span>
                                <span className="font-medium">{formatCurrency(financials.freight)}</span>
                            </div>
                             <div className="flex justify-between">
                                <span>Manejo de Mercancía:</span>
                                <span className="font-medium">{formatCurrency(financials.handling)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Monto de Seguro:</span>
                                <span className="font-medium">{formatCurrency(financials.insuranceCost)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-base border-t-2 border-gray-300 pt-2 mt-2">
                                <span className="">Base Imponible:</span>
                                <span className="">{formatCurrency(financials.subtotal)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>IVA (16%):</span>
                                <span className="font-medium">{formatCurrency(financials.iva)}</span>
                            </div>
                             {financials.ipostel > 0 &&
                                <div className="flex justify-between">
                                    <span>Aporte Ipostel:</span>
                                    <span className="font-medium">{formatCurrency(financials.ipostel)}</span>
                                </div>
                             }
                             {financials.igtf > 0 &&
                                <div className="flex justify-between">
                                    <span>IGTF (3%):</span>
                                    <span className="font-medium">{formatCurrency(financials.igtf)}</span>
                                </div>
                             }
                            <div className="flex justify-between items-center bg-primary-600 text-white p-4 rounded-lg mt-4">
                                <span className="text-lg font-bold">TOTAL A PAGAR:</span>
                                <span className="text-2xl font-extrabold">{formatCurrency(financials.total)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex justify-end space-x-3 p-4 border-t dark:border-gray-700 no-print">
                <Button type="button" variant="secondary" onClick={onClose}>
                    <XIcon className="w-4 h-4 mr-2" />Cerrar
                </Button>
                <Button type="button" variant="secondary" onClick={handlePrint}>
                    <PrinterIcon className="w-4 h-4 mr-2" />Imprimir
                </Button>
                <Button type="button" onClick={handleDownloadPdf}>
                    <DownloadIcon className="w-4 h-4 mr-2" />Descargar PDF
                </Button>
            </div>
        </Modal>
    );
};

export default InvoiceDetailView;