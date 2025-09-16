import React, { useState, useEffect } from 'react';
import { Client } from '../../types';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { ShieldCheckIcon } from '../icons/Icons';

interface ClientFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (client: Client) => void;
    client: Client | null;
}

const ClientFormModal: React.FC<ClientFormModalProps> = ({ isOpen, onClose, onSave, client }) => {
    const [formData, setFormData] = useState<Partial<Client>>({});

    useEffect(() => {
        if (isOpen) {
            setFormData(client || { name: '', idNumber: '', clientType: 'persona', phone: '', address: '', email: '' });
        }
    }, [client, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as Client);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={client ? 'Editar Cliente' : 'Nuevo Cliente'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Select
                    label="Tipo de Cliente"
                    name="clientType"
                    value={formData.clientType || 'persona'}
                    onChange={handleChange}
                >
                    <option value="persona">Persona Natural</option>
                    <option value="empresa">Empresa (Persona Jurídica)</option>
                </Select>
                <Input name="idNumber" label={formData.clientType === 'empresa' ? 'RIF' : 'Cédula de Identidad'} value={formData.idNumber || ''} onChange={handleChange} required />
                <Input name="name" label={formData.clientType === 'empresa' ? 'Razón Social' : 'Nombre Completo'} value={formData.name || ''} onChange={handleChange} required />
                <Input name="phone" label="Teléfono de Contacto" value={formData.phone || ''} onChange={handleChange} required />
                <Input name="email" label="Correo Electrónico (Opcional)" type="email" value={formData.email || ''} onChange={handleChange} />
                <Input name="address" label="Dirección Fiscal" value={formData.address || ''} onChange={handleChange} required />

                <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
                    <Button type="submit">Guardar</Button>
                </div>
            </form>
        </Modal>
    );
};

export default ClientFormModal;