import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit, Trash2, Mail, Phone, MapPin, X, DollarSign } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Header from '../components/layout/Header';
import { useData } from '../context/DataContext';

export default function Proveedores() {
  const { proveedores, addProveedor, updateProveedor, deleteProveedor, addPago } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState(null);
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [pagoMonto, setPagoMonto] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    contacto: '',
    email: '',
    telefono: '',
    direccion: ''
  });

  const filteredProveedores = proveedores.filter(proveedor =>
    proveedor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proveedor.contacto.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDeuda = proveedores.reduce((total, p) => total + p.saldoPendiente, 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingProveedor) {
      updateProveedor(editingProveedor.id, formData);
    } else {
      addProveedor(formData);
    }
    setShowModal(false);
    setEditingProveedor(null);
    setFormData({ nombre: '', contacto: '', email: '', telefono: '', direccion: '' });
  };

  const handleEdit = (proveedor) => {
    setEditingProveedor(proveedor);
    setFormData({
      nombre: proveedor.nombre,
      contacto: proveedor.contacto,
      email: proveedor.email,
      telefono: proveedor.telefono,
      direccion: proveedor.direccion
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (confirm('¿Estás seguro de eliminar este proveedor?')) {
      deleteProveedor(id);
    }
  };

  const handlePago = () => {
    if (!selectedProveedor || !pagoMonto) return;
    
    const monto = parseFloat(pagoMonto);
    if (monto <= 0) return;

    addPago({
      tipo: 'proveedor',
      proveedorId: selectedProveedor.id,
      monto: monto,
      metodoPago: 'transferencia'
    });

    setShowPagoModal(false);
    setSelectedProveedor(null);
    setPagoMonto('');
  };

  return (
    <Layout moduleClass="module-proveedores">
      <Header title="Proveedores" subtitle="Gestión de proveedores y deudas" />

      <div className="p-6">
        {/* Summary Card */}
        <div className="card mb-6 bg-gradient-to-r from-rose-500/10 to-rose-600/5 border-rose-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm">Deuda Total a Proveedores</p>
              <p className="text-3xl font-bold text-rose-400">${totalDeuda.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-xl bg-rose-500/20">
              <DollarSign size={32} className="text-rose-400" />
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
            <input
              type="text"
              placeholder="Buscar proveedores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-danger"
          >
            <Plus size={20} />
            Nuevo Proveedor
          </button>
        </div>

        {/* Providers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProveedores.map((proveedor, index) => (
            <motion.div
              key={proveedor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card-hover"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {proveedor.nombre.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{proveedor.nombre}</h3>
                    <p className="text-zinc-500 text-sm">Contacto: {proveedor.contacto}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(proveedor)}
                    className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(proveedor.id)}
                    className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Mail size={16} />
                  <span className="text-sm">{proveedor.email}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                  <Phone size={16} />
                  <span className="text-sm">{proveedor.telefono}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                  <MapPin size={16} />
                  <span className="text-sm">{proveedor.direccion}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-zinc-800">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-zinc-500 text-sm">Saldo Pendiente</span>
                  <span className={`font-bold text-lg ${
                    proveedor.saldoPendiente > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    ${proveedor.saldoPendiente.toLocaleString()}
                  </span>
                </div>
                {proveedor.saldoPendiente > 0 && (
                  <button
                    onClick={() => {
                      setSelectedProveedor(proveedor);
                      setPagoMonto('');
                      setShowPagoModal(true);
                    }}
                    className="btn-secondary w-full justify-center text-sm"
                  >
                    <DollarSign size={16} />
                    Registrar Pago
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {filteredProveedores.length === 0 && (
          <div className="text-center py-12">
            <p className="text-zinc-500">No se encontraron proveedores</p>
          </div>
        )}

        {/* Modal Nuevo/Editar Proveedor */}
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
                    {editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
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
                    <label className="label">Nombre de la Empresa</label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Persona de Contacto</label>
                    <input
                      type="text"
                      value={formData.contacto}
                      onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
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
                    <button type="submit" className="btn-danger flex-1">
                      {editingProveedor ? 'Guardar' : 'Crear'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Registrar Pago */}
        <AnimatePresence>
          {showPagoModal && selectedProveedor && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowPagoModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Pago a Proveedor</h2>
                  <button
                    onClick={() => setShowPagoModal(false)}
                    className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-zinc-800 rounded-lg p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Proveedor:</span>
                        <span className="text-white">{selectedProveedor.nombre}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-zinc-700">
                        <span className="text-zinc-400 font-medium">Deuda Actual:</span>
                        <span className="text-rose-400 font-bold">${selectedProveedor.saldoPendiente.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="label">Monto a Pagar</label>
                    <input
                      type="number"
                      value={pagoMonto}
                      onChange={(e) => setPagoMonto(e.target.value)}
                      className="input-field"
                      min="0.01"
                      step="0.01"
                      placeholder="Ingrese el monto"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowPagoModal(false)}
                      className="btn-secondary flex-1"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handlePago}
                      disabled={!pagoMonto || parseFloat(pagoMonto) <= 0}
                      className="btn-success flex-1 disabled:opacity-50"
                    >
                      Confirmar Pago
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
