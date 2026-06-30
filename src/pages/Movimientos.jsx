import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowLeftRight, TrendingUp, TrendingDown, Filter, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import Layout from '../components/layout/Layout';
import Header from '../components/layout/Header';
import { useData } from '../context/DataContext';
import { loadExportTools } from '../utils/exportTools';

const TIPO_STYLES = {
  venta: {
    label: 'Venta',
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-500/20',
    icon: TrendingUp,
  },
  cobro: {
    label: 'Cobro',
    text: 'text-sky-700 dark:text-sky-400',
    bg: 'bg-sky-100 dark:bg-sky-500/20',
    icon: TrendingDown,
  },
  pago_proveedor: {
    label: 'Pago Proveedor',
    text: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-100 dark:bg-rose-500/20',
    icon: TrendingUp,
  },
  recepcion_compra: {
    label: 'Recepción compra',
    text: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-100 dark:bg-violet-500/20',
    icon: TrendingDown,
  },
  anulacion_remito_compra: {
    label: 'Anulación remito compra',
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-500/20',
    icon: TrendingUp,
  },
  comprobante_proveedor: {
    label: 'Comprobante proveedor',
    text: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-100 dark:bg-violet-500/20',
    icon: TrendingDown,
  },
  nota_credito_proveedor: {
    label: 'Nota crédito proveedor',
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-500/20',
    icon: TrendingUp,
  },
  anulacion_comprobante_proveedor: {
    label: 'Anulación comprobante proveedor',
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-500/20',
    icon: TrendingUp,
  },
  anulacion_cobro: {
    label: 'Anulación cobro',
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-500/20',
    icon: TrendingUp,
  },
  anulacion_pago_proveedor: {
    label: 'Anulación pago proveedor',
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-500/20',
    icon: TrendingDown,
  },
};

const defaultStyle = {
  label: 'Otro',
  text: 'text-pastel-muted dark:text-slate-400',
  bg: 'bg-pastel-mist dark:bg-slate-800',
  icon: ArrowLeftRight,
};

export default function Movimientos() {
  const { movimientos, subscribeOnDemand } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('');

  useEffect(() => {
    const unsub = subscribeOnDemand('movimientos', { max: 500 });
    return () => unsub && unsub();
  }, [subscribeOnDemand]);

  const filteredMovimientos = movimientos.filter(mov => {
    const matchSearch = mov.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = !filterTipo || mov.tipo === filterTipo;
    return matchSearch && matchTipo;
  }).reverse();

  const getTipoInfo = (tipo) => TIPO_STYLES[tipo] || { ...defaultStyle, label: tipo };

  const totalIngresos = movimientos
    .filter(m => m.tipo === 'venta' || m.tipo === 'cobro')
    .reduce((total, m) => total + m.monto, 0);

  const totalEgresos = movimientos
    .filter(m => m.tipo === 'pago_proveedor')
    .reduce((total, m) => total + m.monto, 0);

  const exportToPDF = async () => {
    const { jsPDF } = await loadExportTools();
    const doc = new jsPDF();
    doc.text('Reporte de Movimientos - Gest Crow', 14, 15);
    const tableData = filteredMovimientos.map(mov => {
      const esIngreso = mov.tipo === 'venta' || mov.tipo === 'cobro';
      return [
        new Date(mov.fecha).toLocaleDateString(),
        mov.descripcion,
        getTipoInfo(mov.tipo).label,
        `${esIngreso ? '+' : '-'}$${mov.monto.toLocaleString()}`
      ];
    });
    doc.autoTable({
      head: [['Fecha', 'Descripción', 'Tipo', 'Monto']],
      body: tableData,
      startY: 25,
    });
    doc.save('movimientos_crowgest.pdf');
    toast.success('PDF exportado correctamente');
  };

  const exportToExcel = async () => {
    const { XLSX } = await loadExportTools();
    const dataToExport = filteredMovimientos.map(mov => {
      const esIngreso = mov.tipo === 'venta' || mov.tipo === 'cobro';
      return {
        Fecha: new Date(mov.fecha).toLocaleDateString(),
        Descripción: mov.descripcion,
        Tipo: getTipoInfo(mov.tipo).label,
        Monto: (esIngreso ? 1 : -1) * mov.monto
      };
    });
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Movimientos");
    XLSX.writeFile(wb, "movimientos_crowgest.xlsx");
    toast.success('Excel exportado correctamente');
  };

  return (
    <Layout>
      <Header title="Movimientos" subtitle="Historial de todas las operaciones" />

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-pastel-muted dark:text-slate-400">Total Ingresos</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  ${totalIngresos.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-500/20">
                <TrendingUp size={24} className="text-emerald-600 dark:text-emerald-400" />
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
                <p className="text-sm text-pastel-muted dark:text-slate-400">Total Egresos</p>
                <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                  ${totalEgresos.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-500/20">
                <TrendingDown size={24} className="text-rose-600 dark:text-rose-400" />
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
                <p className="text-sm text-pastel-muted dark:text-slate-400">Balance</p>
                <p className={`text-2xl font-bold ${
                  totalIngresos - totalEgresos >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}>
                  ${(totalIngresos - totalEgresos).toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-sky-100 dark:bg-indigo-500/20">
                <ArrowLeftRight size={24} className="text-sky-700 dark:text-indigo-400" />
              </div>
            </div>
          </motion.div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pastel-muted dark:text-slate-500" size={20} />
              <input
                type="text"
                placeholder="Buscar movimientos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-pastel-muted dark:text-slate-500" size={20} />
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="select-field pl-10 pr-8"
              >
                <option value="">Todos los tipos</option>
                <option value="venta">Ventas</option>
                <option value="cobro">Cobros</option>
                <option value="pago_proveedor">Pagos a Proveedores</option>
                <option value="recepcion_compra">Recepciones de compra</option>
                <option value="anulacion_remito_compra">Anulaciones remito compra</option>
                <option value="comprobante_proveedor">Comprobantes proveedor</option>
                <option value="nota_credito_proveedor">Notas crédito proveedor</option>
                <option value="anulacion_comprobante_proveedor">Anulaciones comprobante proveedor</option>
                <option value="anulacion_cobro">Anulaciones de cobros</option>
                <option value="anulacion_pago_proveedor">Anulaciones de pagos proveedor</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={exportToPDF} className="btn-secondary">
              <FileText size={18} className="text-red-500" /> PDF
            </button>
            <button onClick={exportToExcel} className="btn-secondary">
              <Download size={18} className="text-emerald-500" /> Excel
            </button>
          </div>
        </div>

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
                  className="flex items-center justify-between p-4 rounded-xl bg-pastel-mist/60 hover:bg-pastel-mist transition-colors dark:bg-slate-800/50 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${tipoInfo.bg}`}>
                      <TipoIcon size={20} className={tipoInfo.text} />
                    </div>
                    <div>
                      <p className="font-medium text-pastel-ink dark:text-slate-100">{mov.descripcion}</p>
                      <p className="text-sm text-pastel-muted dark:text-slate-400">
                        {new Date(mov.fecha).toLocaleDateString('es-ES', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-lg ${
                      esIngreso
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {esIngreso ? '+' : '-'}${mov.monto.toLocaleString()}
                    </p>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${tipoInfo.bg} ${tipoInfo.text}`}>
                      {tipoInfo.label}
                    </span>
                  </div>
                </motion.div>
              );
            })}

            {filteredMovimientos.length === 0 && (
              <div className="text-center py-12">
                <ArrowLeftRight size={48} className="mx-auto text-pastel-muted/40 mb-4 dark:text-slate-700" />
                <p className="text-pastel-muted dark:text-slate-500">No hay movimientos registrados</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
