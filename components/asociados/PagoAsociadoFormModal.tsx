import React, { useState, useEffect } from 'react';
import { PagoAsociado } from '../../types';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

interface PagoAsociadoFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (pago: PagoAsociado) => void;
    pago: PagoAsociado | null;
    asociadoId: string;
}

const PagoAsociadoFormModal: React.FC<PagoAsociadoFormModalProps> = ({ isOpen, onClose, onSave, pago, asociadoId }) => {
    const [formData, setFormData] = useState<Partial<PagoAsociado>>({});

    useEffect(() => {
        if (isOpen) {
            setFormData(pago || {
                asociadoId,
                concepto: '',
                cuotas: '',
                montoBs: 0,
                fechaVencimiento: new Date().toISOString().split('T')[0],
                status: 'Pendiente'
            });
        }
    }, [pago, isOpen, asociadoId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as PagoAsociado);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={pago ? 'Editar Deuda/Concepto' : 'Nueva Deuda/Concepto'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input name="concepto" label="Descripción del Concepto" value={formData.concepto || ''} onChange={handleChange} required />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input name="cuotas" label="Cuotas" placeholder="Ej: 41-45 o 10" value={formData.cuotas || ''} onChange={handleChange} />
                    <Input name="montoBs" label="Importe (Bs.)" type="number" step="0.01" value={formData.montoBs || ''} onChange={handleChange} required />
                </div>
                <Input name="fechaVencimiento" label="Fecha de Vencimiento" type="date" value={formData.fechaVencimiento || ''} onChange={handleChange} />
                
                <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
                    <Button type="submit">Guardar</Button>
                </div>
            </form>
        </Modal>
    );
};

export default PagoAsociadoFormModal;