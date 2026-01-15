import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, X, Filter } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Header from '../components/layout/Header';
import { useData } from '../context/DataContext';

export default function Productos() {
  const { productos, addProducto, updateProducto, deleteProducto } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProducto, setEditingProducto] = useState(null);
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    precio: '',
    costo: '',
    stock: '',
    stockMinimo: '',
    categoria: ''
  });

  const categorias = [...new Set(productos.map(p => p.categoria))];

  const filteredProductos = productos.filter(producto => {
    const matchSearch = producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        producto.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategoria = !filterCategoria || producto.categoria === filterCategoria;
    return matchSearch && matchCategoria;
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const productoData = {
      ...formData,
      precio: parseFloat(formData.precio),
      costo: parseFloat(formData.costo),
      stock: parseInt(formData.stock),
      stockMinimo: parseInt(formData.stockMinimo)
    };

    if (editingProducto) {
      updateProducto(editingProducto.id, productoData);
    } else {
      addProducto(productoData);
    }
    setShowModal(false);
    setEditingProducto(null);
    setFormData({
      codigo: '',
      nombre: '',
      descripcion: '',
      precio: '',
      costo: '',
      stock: '',
      stockMinimo: '',
      categoria: ''
    });
  };

  const handleEdit = (producto) => {
    setEditingProducto(producto);
    setFormData({
      codigo: producto.codigo,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      precio: producto.precio.toString(),
      costo: producto.costo.toString(),
      stock: producto.stock.toString(),
      stockMinimo: producto.stockMinimo.toString(),
      categoria: producto.categoria
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      deleteProducto(id);
    }
  };

  return (
    <Layout moduleClass="module-productos">
      <Header title="Productos" subtitle="Gestión de inventario y stock" />

      <div className="p-6">
        {/* Actions Bar */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between mb-6">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <select
                value={filterCategoria}
                onChange={(e) => setFilterCategoria(e.target.value)}
                className="select-field pl-10 pr-8 min-w-[180px]"
              >
                <option value="">Todas las categorías</option>
                {categorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
          >
            <Plus size={20} />
            Nuevo Producto
          </button>
        </div>

        {/* Products Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-left p-4">Código</th>
                  <th className="text-left p-4">Producto</th>
                  <th className="text-left p-4">Categoría</th>
                  <th className="text-right p-4">Costo</th>
                  <th className="text-right p-4">Precio</th>
                  <th className="text-right p-4">Stock</th>
                  <th className="text-center p-4">Estado</th>
                  <th className="text-center p-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProductos.map((producto, index) => (
                  <motion.tr
                    key={producto.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="table-row"
                  >
                    <td className="p-4">
                      <span className="text-zinc-400 font-mono text-sm">{producto.codigo}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          <Package size={18} className="text-purple-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{producto.nombre}</p>
                          <p className="text-zinc-500 text-sm">{producto.descripcion}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="badge bg-zinc-700 text-zinc-300">{producto.categoria}</span>
                    </td>
                    <td className="p-4 text-right text-zinc-400">
                      ${producto.costo.toLocaleString()}
                    </td>
                    <td className="p-4 text-right text-white font-medium">
                      ${producto.precio.toLocaleString()}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {producto.stock <= producto.stockMinimo && (
                          <AlertTriangle size={16} className="text-amber-400" />
                        )}
                        <span className={producto.stock <= producto.stockMinimo ? 'text-amber-400' : 'text-white'}>
                          {producto.stock}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`badge ${
                        producto.stock === 0 ? 'badge-danger' :
                        producto.stock <= producto.stockMinimo ? 'badge-warning' : 'badge-success'
                      }`}>
                        {producto.stock === 0 ? 'Sin stock' :
                         producto.stock <= producto.stockMinimo ? 'Stock bajo' : 'Disponible'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEdit(producto)}
                          className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(producto.id)}
                          className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredProductos.length === 0 && (
            <div className="text-center py-12">
              <p className="text-zinc-500">No se encontraron productos</p>
            </div>
          )}
        </div>

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
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">
                    {editingProducto ? 'Editar Producto' : 'Nuevo Producto'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Código</label>
                      <input
                        type="text"
                        value={formData.codigo}
                        onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Categoría</label>
                      <input
                        type="text"
                        value={formData.categoria}
                        onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                        className="input-field"
                        list="categorias"
                        required
                      />
                      <datalist id="categorias">
                        {categorias.map(cat => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
                    </div>
                  </div>
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
                    <label className="label">Descripción</label>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      className="input-field resize-none"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Costo</label>
                      <input
                        type="number"
                        value={formData.costo}
                        onChange={(e) => setFormData({ ...formData, costo: e.target.value })}
                        className="input-field"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Precio de Venta</label>
                      <input
                        type="number"
                        value={formData.precio}
                        onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                        className="input-field"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Stock Actual</label>
                      <input
                        type="number"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        className="input-field"
                        min="0"
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Stock Mínimo</label>
                      <input
                        type="number"
                        value={formData.stockMinimo}
                        onChange={(e) => setFormData({ ...formData, stockMinimo: e.target.value })}
                        className="input-field"
                        min="0"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="btn-secondary flex-1"
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="btn-primary flex-1">
                      {editingProducto ? 'Guardar' : 'Crear'}
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
