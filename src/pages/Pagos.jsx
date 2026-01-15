import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, CreditCard, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Header from '../components/layout/Header';
import { useData } from '../context/DataContext';

export default function Pagos() {
  const { pagos, clientes, proveedores, facturas } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('');

  const filteredPagos = pagos.filter(pago => {
    const matchSearch = pago.numero.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = !filterTipo || pago.tipo === filterTipo;
    return matchSearch && matchTipo;
  }).reverse();

  const totalCobrado = pagos
    .filter(p => p.tipo === 'cliente')
    .reduce((total, p) => total + p.monto, 0);
    
  const totalPagado = pagos
    .filter(p => p.tipo === 'proveedor')
    .reduce((total, p) => total + p.monto, 0);

  return (
    <Layout moduleClass="module-pagos">
      <Header title="Pagos" subtitle="Historial de cobros y pagos" />

      <div className="p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border-emerald-500/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Total Cobrado (Clientes)</p>
                <p className="text-3xl font-bold text-emerald-400">${totalCobrado.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-500/20">
                <ArrowDownRight size={32} className="text-emerald-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card bg-gradient-to-r from-rose-500/10 to-rose-600/5 border-rose-500/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Total Pagado (Proveedores)</p>
                <p className="text-3xl font-bold text-rose-400">${totalPagado.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl bg-rose-500/20">
                <ArrowUpRight size={32} className="text-rose-400" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input
                type="text"
                placeholder="Buscar pagos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="select-field pl-10 pr-8"
              >
                <option value="">Todos los tipos</option>
                <option value="cliente">Cobros (Clientes)</option>
                <option value="proveedor">Pagos (Proveedores)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-left p-4">Número</th>
                  <th className="text-left p-4">Tipo</th>
                  <th className="text-left p-4">Destinatario</th>
                  <th className="text-left p-4">Referencia</th>
                  <th className="text-left p-4">Fecha</th>
                  <th className="text-right p-4">Monto</th>
                </tr>
              </thead>
              <tbody>
                {filteredPagos.map((pago, index) => {
                  const esCliente = pago.tipo === 'cliente';
                  const destinatario = esCliente
                    ? clientes.find(c => c.id === pago.clienteId)
                    : proveedores.find(p => p.id === pago.proveedorId);
                  const factura = pago.facturaId ? facturas.find(f => f.id === pago.facturaId) : null;

                  return (
                    <motion.tr
                      key={pago.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="table-row"
                    >
                      <td className="p-4">
                        <span className="text-indigo-400 font-mono">{pago.numero}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {esCliente ? (
                            <>
                              <ArrowDownRight size={16} className="text-emerald-400" />
                              <span className="badge-success">Cobro</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight size={16} className="text-rose-400" />
                              <span className="badge-danger">Pago</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-white">{destinatario?.nombre || 'Eliminado'}</p>
                        <p className="text-zinc-500 text-sm">
                          {esCliente ? 'Cliente' : 'Proveedor'}
                        </p>
                      </td>
                      <td className="p-4 text-zinc-400">
                        {factura ? factura.numero : '-'}
                      </td>
                      <td className="p-4 text-zinc-400">
                        {new Date(pago.fecha).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="p-4 text-right">
                        <span className={`font-bold text-lg ${esCliente ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {esCliente ? '+' : '-'}${pago.monto.toLocaleString()}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredPagos.length === 0 && (
            <div className="text-center py-12">
              <CreditCard size={48} className="mx-auto text-zinc-700 mb-4" />
              <p className="text-zinc-500">No hay pagos registrados</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
