import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit, Trash2, Mail, Phone, MapPin, X } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Header from '../components/layout/Header';
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingCliente) {
      updateCliente(editingCliente.id, formData);
    } else {
      addCliente(formData);
    }
    setShowModal(false);
    setEditingCliente(null);
    setFormData({ nombre: '', email: '', telefono: '', direccion: '' });
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

  const handleDelete = (id) => {
    if (confirm('¿Estás seguro de eliminar este cliente?')) {
      deleteCliente(id);
    }
  };

  return (
    <Layout moduleClass="module-clientes">
      <Header title="Clientes" subtitle="Gestión de clientes del negocio" />

      <div className="p-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
            <input
              type="text"
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-success"
          >
            <Plus size={20} />
            Nuevo Cliente
          </button>
        </div>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClientes.map((cliente, index) => (
            <motion.div
              key={cliente.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card-hover"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {cliente.nombre.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{cliente.nombre}</h3>
                    <p className="text-zinc-500 text-sm">
                      Cliente desde {new Date(cliente.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(cliente)}
                    className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(cliente.id)}
                    className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Mail size={16} />
                  <span className="text-sm">{cliente.email}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                  <Phone size={16} />
                  <span className="text-sm">{cliente.telefono}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                  <MapPin size={16} />
                  <span className="text-sm">{cliente.direccion}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-zinc-800">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 text-sm">Saldo</span>
                  <span className={`font-semibold ${
                    cliente.saldo > 0 ? 'text-amber-400' :
                    cliente.saldo < 0 ? 'text-emerald-400' : 'text-zinc-400'
                  }`}>
                    ${Math.abs(cliente.saldo).toLocaleString()}
                    {cliente.saldo > 0 ? ' (debe)' : cliente.saldo < 0 ? ' (a favor)' : ''}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredClientes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-zinc-500">No se encontraron clientes</p>
          </div>
        )}

        {/* Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">
                    {editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
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
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="btn-secondary flex-1"
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="btn-success flex-1">
                      {editingCliente ? 'Guardar' : 'Crear'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
