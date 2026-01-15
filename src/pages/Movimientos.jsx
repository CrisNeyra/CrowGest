import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowLeftRight, TrendingUp, TrendingDown, Filter } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Header from '../components/layout/Header';
import { useData } from '../context/DataContext';

export default function Movimientos() {
  const { movimientos } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('');

  const filteredMovimientos = movimientos.filter(mov => {
    const matchSearch = mov.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = !filterTipo || mov.tipo === filterTipo;
    return matchSearch && matchTipo;
  }).reverse();

  const getTipoInfo = (tipo) => {
    switch (tipo) {
      case 'venta':
        return { label: 'Venta', color: 'text-emerald-400', bg: 'bg-emerald-500/20', icon: TrendingUp };
      case 'cobro':
        return { label: 'Cobro', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: TrendingDown };
      case 'pago_proveedor':
        return { label: 'Pago Proveedor', color: 'text-rose-400', bg: 'bg-rose-500/20', icon: TrendingUp };
      default:
        return { label: tipo, color: 'text-zinc-400', bg: 'bg-zinc-500/20', icon: ArrowLeftRight };
    }
  };

  const totalIngresos = movimientos
    .filter(m => m.tipo === 'venta' || m.tipo === 'cobro')
    .reduce((total, m) => total + m.monto, 0);

  const totalEgresos = movimientos
    .filter(m => m.tipo === 'pago_proveedor')
    .reduce((total, m) => total + m.monto, 0);

  return (
    <Layout moduleClass="bg-gradient-to-br from-teal-950 via-zinc-900 to-teal-950">
      <Header title="Movimientos" subtitle="Historial de todas las operaciones" />

      <div className="p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Total Ingresos</p>
                <p className="text-2xl font-bold text-emerald-400">${totalIngresos.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/20">
                <TrendingUp size={24} className="text-emerald-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Total Egresos</p>
                <p className="text-2xl font-bold text-rose-400">${totalEgresos.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-rose-500/20">
                <TrendingDown size={24} className="text-rose-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Balance</p>
                <p className={`text-2xl font-bold ${totalIngresos - totalEgresos >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ${(totalIngresos - totalEgresos).toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-indigo-500/20">
                <ArrowLeftRight size={24} className="text-indigo-400" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
            <input
              type="text"
              placeholder="Buscar movimientos..."
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
              <option value="venta">Ventas</option>
              <option value="cobro">Cobros</option>
              <option value="pago_proveedor">Pagos a Proveedores</option>
            </select>
          </div>
        </div>

        {/* Movements List */}
        <div className="card">
          <div className="space-y-3">
            {filteredMovimientos.map((mov, index) => {
              const tipoInfo = getTipoInfo(mov.tipo);
              const TipoIcon = tipoInfo.icon;
              const esIngreso = mov.tipo === 'venta' || mov.tipo === 'cobro';

              return (
                <motion.div
                  key={mov.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${tipoInfo.bg}`}>
                      <TipoIcon size={20} className={tipoInfo.color} />
                    </div>
                    <div>
                      <p className="text-white font-medium">{mov.descripcion}</p>
                      <p className="text-zinc-500 text-sm">
                        {new Date(mov.fecha).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-lg ${esIngreso ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {esIngreso ? '+' : '-'}${mov.monto.toLocaleString()}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded ${tipoInfo.bg} ${tipoInfo.color}`}>
                      {tipoInfo.label}
                    </span>
                  </div>
                </motion.div>
              );
            })}

            {filteredMovimientos.length === 0 && (
              <div className="text-center py-12">
                <ArrowLeftRight size={48} className="mx-auto text-zinc-700 mb-4" />
                <p className="text-zinc-500">No hay movimientos registrados</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
