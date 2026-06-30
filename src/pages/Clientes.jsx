import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Edit, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import PageShell from '../components/ui/PageShell';
import FilterBar from '../components/ui/FilterBar';
import DataTable from '../components/ui/DataTable';
import { useData } from '../context/DataContext';

export default function Clientes() {
  const { clientes, addCliente, updateCliente, deleteCliente } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: ''
  });

  const filteredClientes = clientes.filter(cliente =>
    cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCliente) {
        await updateCliente(editingCliente.id, formData);
        toast.success('Cliente actualizado correctamente');
      } else {
        await addCliente(formData);
        toast.success('Cliente creado correctamente');
      }
      setShowModal(false);
      setEditingCliente(null);
      setFormData({ nombre: '', email: '', telefono: '', direccion: '' });
    } catch (error) {
      console.error(error);
      toast.error('Hubo un error al guardar el cliente');
    }
  };

  const handleEdit = (cliente) => {
    setEditingCliente(cliente);
    setFormData({
      nombre: cliente.nombre,
      email: cliente.email,
      telefono: cliente.telefono,
      direccion: cliente.direccion
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('¿Estás seguro de eliminar este cliente?')) {
      try {
        await deleteCliente(id);
        toast.success('Cliente eliminado');
      } catch (error) {
        console.error(error);
        toast.error('Hubo un error al eliminar el cliente');
      }
    }
  };

  const columns = [
    {
      key: 'nombre',
      header: 'Cliente',
      render: (c) => (
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-cg-primary/15 text-xs font-bold text-cg-primaryDark dark:bg-indigo-500/20 dark:text-indigo-300">
            {c.nombre?.charAt(0).toUpperCase()}
          </span>
          <span className="font-medium">{c.nombre}</span>
        </div>
      ),
    },
    { key: 'email', header: 'Email', render: (c) => c.email || '-' },
    { key: 'telefono', header: 'Teléfono', render: (c) => c.telefono || '-' },
    { key: 'direccion', header: 'Dirección', render: (c) => c.direccion || '-' },
    {
      key: 'saldo',
      header: 'Saldo',
      align: 'right',
      render: (c) => (
        <span
          className={`font-semibold ${
            c.saldo > 0
              ? 'text-amber-600 dark:text-amber-400'
              : c.saldo < 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-cg-muted'
          }`}
        >
          ${Math.abs(c.saldo || 0).toLocaleString()}
          {c.saldo > 0 ? ' (debe)' : c.saldo < 0 ? ' (a favor)' : ''}
        </span>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'center',
      render: (c) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => handleEdit(c)}
            className="rounded-md p-1.5 text-cg-muted transition hover:bg-cg-primary/10 hover:text-cg-primaryDark dark:hover:bg-slate-700"
            title="Editar"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleDelete(c.id)}
            className="rounded-md p-1.5 text-cg-muted transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            title="Eliminar"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageShell title="Clientes">
      <FilterBar onNew={() => setShowModal(true)} newLabel="Nuevo">
        <FilterBar.Group label="Buscar por" className="sm:max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cg-muted" size={18} />
            <input
              type="text"
              placeholder="Nombre o email del cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </FilterBar.Group>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={filteredClientes}
        emptyMessage="No se encontraron clientes"
      />

      <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="modal-overlay"
              onClick={() => setShowModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="modal-content max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-pastel-ink dark:text-slate-100">
                    {editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 rounded-lg text-pastel-muted hover:bg-pastel-mist hover:text-pastel-ink transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="label">Nombre</label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Teléfono</label>
                    <input
                      type="text"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Dirección</label>
                    <input
                      type="text"
                      value={formData.direccion}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                      Cancelar
                    </button>
                    <button type="submit" className="btn-primary flex-1">
                      {editingCliente ? 'Guardar' : 'Crear'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
    </PageShell>
  );
}
