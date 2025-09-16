
import React, { useState, useEffect, useMemo } from 'react';
import { User, Role, Office } from '../../types';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Select from '../ui/Select';

interface UserFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (user: User) => void;
    user: User | null;
    roles: Role[];
    offices: Office[];
    currentUser: User;
}

const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, onClose, onSave, user, roles, offices, currentUser }) => {
    const [formData, setFormData] = useState<Partial<User>>({});

    const availableRoles = useMemo(() => {
        const techRole = roles.find(r => r.name === 'Soporte Técnico');
        if (currentUser.username === 'admin' && techRole) {
            return roles.filter(r => r.id !== techRole.id);
        }
        return roles;
    }, [roles, currentUser]);


    useEffect(() => {
        if (isOpen) {
            setFormData(user || { name: '', username: '', password: '', email: '', roleId: availableRoles[0]?.id, officeId: '' });
        }
    }, [user, isOpen, availableRoles]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as User);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={user ? 'Editar Usuario' : 'Nuevo Usuario'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input name="name" label="Nombre Completo" value={formData.name || ''} onChange={handleChange} required />
                <Input name="username" label="Usuario (para iniciar sesión)" value={formData.username || ''} onChange={handleChange} required autoComplete="username"/>
                <Input name="email" label="Correo Electrónico (Opcional)" type="email" value={formData.email || ''} onChange={handleChange} />
                <Input 
                    name="password" 
                    label="Contraseña" 
                    type="password" 
                    autoComplete="new-password"
                    value={formData.password || ''} 
                    onChange={handleChange} 
                    required={!user} // Required only for new users
                    placeholder={user ? 'Dejar en blanco para no cambiar' : ''}
                />
                <Select name="roleId" label="Rol" value={formData.roleId || ''} onChange={handleChange} required>
                    {availableRoles.map(role => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                </Select>
                <Select name="officeId" label="Oficina Asignada (Opcional)" value={formData.officeId || ''} onChange={handleChange}>
                    <option value="">Ninguna (Acceso Global)</option>
                    {offices.map(office => (
                        <option key={office.id} value={office.id}>{office.name}</option>
                    ))}
                </Select>
                <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
                    <Button type="submit">Guardar</Button>
                </div>
            </form>
        </Modal>
    );
};

export default UserFormModal;
