import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Download,
  FileText,
  Package,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Layout from '../components/layout/Layout';
import Header from '../components/layout/Header';
import { useData } from '../context/DataContext';
import {
  buildKardexMovimientos,
  formatCurrency,
  getKardexProducto,
  getReposicionSugerida,
  getStockStats,
} from '../utils/kardex';

const TABS = [
  { id: 'kardex', label: 'Kardex' },
  { id: 'reposicion', label: 'Reposición sugerida' },
  { id: 'valorizacion', label: 'Valorización' },
];

function formatDate(value) {
  return new Date(value).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function StockKardex() {
  const {
    productos,
    ventas,
    remitos,
    ordenesCompra,
    movimientos,
    ajustarStockManual,
  } = useData();
  const [tab, setTab] = useState('kardex');
  const [productoId, setProductoId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAjusteModal, setShowAjusteModal] = useState(false);
  const [ajusteForm, setAjusteForm] = useState({ productoId: '', cantidad: '', motivo: '' });

  const stats = useMemo(() => getStockStats(productos), [productos]);

  const movimientosKardex = useMemo(
    () => buildKardexMovimientos({ productos, ventas, remitos, ordenesCompra, movimientos }),
    [productos, ventas, remitos, ordenesCompra, movimientos]
  );

  const kardexFiltrado = useMemo(
    () =>
      getKardexProducto(movimientosKardex, productoId).filter((mov) =>
        mov.concepto.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [movimientosKardex, productoId, searchTerm]
  );

  const reposicion = useMemo(() => getReposicionSugerida(productos), [productos]);

  const productosFiltrados = productos.filter((producto) =>
    producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    producto.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const productoNombre = (id) =>
    productos.find((producto) => producto.id === id)?.nombre || 'Producto eliminado';

  const exportKardexExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      kardexFiltrado.map((mov) => ({
        Fecha: formatDate(mov.fecha),
        Producto: productoNombre(mov.productoId),
        Tipo: mov.tipo,
        Concepto: mov.concepto,
        Entrada: mov.entrada,
        Salida: mov.salida,
        Saldo: mov.saldo,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kardex');
    XLSX.writeFile(wb, 'kardex_stock.xlsx');
    toast.success('Excel exportado');
  };

  const exportKardexPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text('Kardex de Stock', 14, 15);
    doc.autoTable({
      head: [['Fecha', 'Producto', 'Tipo', 'Concepto', 'Entrada', 'Salida', 'Saldo']],
      body: kardexFiltrado.map((mov) => [
        formatDate(mov.fecha),
        productoNombre(mov.productoId),
        mov.tipo,
        mov.concepto,
        mov.entrada,
        mov.salida,
        mov.saldo,
      ]),
      startY: 24,
      styles: { fontSize: 8 },
    });
    doc.save('kardex_stock.pdf');
    toast.success('PDF exportado');
  };

  const openAjuste = (id = '') => {
    setAjusteForm({ productoId: id || productoId || '', cantidad: '', motivo: '' });
    setShowAjusteModal(true);
  };

  const handleAjuste = async (event) => {
    event.preventDefault();
    try {
      await ajustarStockManual({
        productoId: ajusteForm.productoId,
        cantidad: Number(ajusteForm.cantidad),
        motivo: ajusteForm.motivo.trim(),
      });
      toast.success('Ajuste de stock registrado');
      setShowAjusteModal(false);
      setAjusteForm({ productoId: '', cantidad: '', motivo: '' });
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo ajustar el stock');
    }
  };

  return (
    <Layout>
      <Header
        title="Stock Avanzado"
        subtitle="Kardex, valorización, reposición sugerida y ajustes manuales"
      />

      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Productos" value={stats.productos.toLocaleString('es-AR')} tone="neutral" icon={Package} />
          <KpiCard title="Valorizado costo" value={formatCurrency(stats.valorizadoCosto)} tone="neutral" icon={TrendingUp} />
          <KpiCard title="Stock bajo" value={stats.stockBajo.toLocaleString('es-AR')} tone="warning" icon={AlertTriangle} />
          <KpiCard title="Sin stock" value={stats.sinStock.toLocaleString('es-AR')} tone="negative" icon={TrendingDown} />
        </div>

        <div className="flex flex-wrap gap-2 border-b border-edge-light pb-2 dark:border-slate-800">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === item.id
                  ? 'bg-sky-600 text-white dark:bg-indigo-600'
                  : 'text-pastel-muted hover:bg-white/60 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <section className="card">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
            <div className="relative lg:col-span-2">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-pastel-muted"
                size={18}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar..."
                className="input-field pl-10"
              />
            </div>
            <select
              value={productoId}
              onChange={(e) => setProductoId(e.target.value)}
              className="select-field"
            >
              <option value="">Todos los productos</option>
              {productos.map((producto) => (
                <option key={producto.id} value={producto.id}>
                  {producto.codigo ? `${producto.codigo} - ` : ''}{producto.nombre}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => openAjuste()} className="btn-primary">
              <Plus size={18} />
              Ajuste manual
            </button>
          </div>
        </section>

        {tab === 'kardex' && (
          <section className="card overflow-hidden p-0">
            <div className="flex flex-col justify-between gap-3 border-b border-edge-light p-4 sm:flex-row sm:items-center dark:border-slate-800">
              <div>
                <h3 className="font-semibold text-pastel-ink dark:text-slate-100">Kardex</h3>
                <p className="text-sm text-pastel-muted">Entradas, salidas y saldo acumulado</p>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={exportKardexPDF} disabled={!kardexFiltrado.length} className="btn-secondary">
                  <FileText size={18} className="text-red-500" /> PDF
                </button>
                <button type="button" onClick={exportKardexExcel} disabled={!kardexFiltrado.length} className="btn-secondary">
                  <Download size={18} className="text-emerald-500" /> Excel
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="p-4 text-left">Fecha</th>
                    <th className="p-4 text-left">Producto</th>
                    <th className="p-4 text-left">Concepto</th>
                    <th className="p-4 text-right">Entrada</th>
                    <th className="p-4 text-right">Salida</th>
                    <th className="p-4 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {kardexFiltrado.map((mov) => (
                    <tr key={mov.id} className="table-row">
                      <td className="p-4 text-pastel-muted">{formatDate(mov.fecha)}</td>
                      <td className="p-4">{productoNombre(mov.productoId)}</td>
                      <td className="p-4 text-pastel-muted">{mov.concepto}</td>
                      <td className="p-4 text-right text-emerald-600">{mov.entrada || '-'}</td>
                      <td className="p-4 text-right text-rose-600">{mov.salida || '-'}</td>
                      <td className="p-4 text-right font-bold">{mov.saldo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!kardexFiltrado.length && (
              <div className="py-12 text-center text-pastel-muted">Sin movimientos para mostrar</div>
            )}
          </section>
        )}

        {tab === 'reposicion' && (
          <section className="card overflow-hidden p-0">
            <div className="border-b border-edge-light p-4 dark:border-slate-800">
              <h3 className="font-semibold text-pastel-ink dark:text-slate-100">
                Reposición sugerida
              </h3>
              <p className="text-sm text-pastel-muted">Productos en o por debajo del stock mínimo</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="p-4 text-left">Producto</th>
                    <th className="p-4 text-right">Stock</th>
                    <th className="p-4 text-right">Mínimo</th>
                    <th className="p-4 text-right">Sugerido</th>
                    <th className="p-4 text-right">Valor compra</th>
                  </tr>
                </thead>
                <tbody>
                  {reposicion.map((producto) => (
                    <tr key={producto.id} className="table-row">
                      <td className="p-4">
                        <p className="font-medium">{producto.nombre}</p>
                        <p className="text-xs text-pastel-muted">{producto.codigo}</p>
                      </td>
                      <td className="p-4 text-right">{producto.stock || 0}</td>
                      <td className="p-4 text-right">{producto.stockMinimo || 0}</td>
                      <td className="p-4 text-right font-bold text-amber-600">{producto.sugerido}</td>
                      <td className="p-4 text-right">{formatCurrency(producto.valorReposicion)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!reposicion.length && (
              <div className="py-12 text-center text-pastel-muted">No hay productos para reponer</div>
            )}
          </section>
        )}

        {tab === 'valorizacion' && (
          <section className="card overflow-hidden p-0">
            <div className="border-b border-edge-light p-4 dark:border-slate-800">
              <h3 className="font-semibold text-pastel-ink dark:text-slate-100">Valorización</h3>
              <p className="text-sm text-pastel-muted">Stock actual valorizado a costo y venta</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="p-4 text-left">Producto</th>
                    <th className="p-4 text-right">Stock</th>
                    <th className="p-4 text-right">Costo</th>
                    <th className="p-4 text-right">Precio</th>
                    <th className="p-4 text-right">Valor costo</th>
                    <th className="p-4 text-right">Valor venta</th>
                    <th className="p-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {productosFiltrados.map((producto) => (
                    <tr key={producto.id} className="table-row">
                      <td className="p-4">
                        <p className="font-medium">{producto.nombre}</p>
                        <p className="text-xs text-pastel-muted">{producto.codigo}</p>
                      </td>
                      <td className="p-4 text-right">{producto.stock || 0}</td>
                      <td className="p-4 text-right">{formatCurrency(producto.costo)}</td>
                      <td className="p-4 text-right">{formatCurrency(producto.precio)}</td>
                      <td className="p-4 text-right font-medium">
                        {formatCurrency((producto.stock || 0) * (producto.costo || 0))}
                      </td>
                      <td className="p-4 text-right font-medium">
                        {formatCurrency((producto.stock || 0) * (producto.precio || 0))}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => openAjuste(producto.id)}
                          className="btn-secondary py-1.5 text-xs"
                        >
                          Ajustar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      <AnimatePresence>
        {showAjusteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowAjusteModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-content max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-bold text-pastel-ink dark:text-slate-100">
                  Ajuste manual de stock
                </h2>
                <button
                  type="button"
                  onClick={() => setShowAjusteModal(false)}
                  className="rounded-lg p-2 text-pastel-muted hover:bg-pastel-mist"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAjuste} className="space-y-4">
                <div>
                  <label className="label">Producto</label>
                  <select
                    value={ajusteForm.productoId}
                    onChange={(e) => setAjusteForm({ ...ajusteForm, productoId: e.target.value })}
                    className="select-field"
                    required
                  >
                    <option value="">Seleccionar producto</option>
                    {productos.map((producto) => (
                      <option key={producto.id} value={producto.id}>
                        {producto.nombre} (stock {producto.stock || 0})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Cantidad (+ entrada / - salida)</label>
                  <input
                    type="number"
                    value={ajusteForm.cantidad}
                    onChange={(e) => setAjusteForm({ ...ajusteForm, cantidad: e.target.value })}
                    className="input-field"
                    step="1"
                    required
                  />
                </div>
                <div>
                  <label className="label">Motivo</label>
                  <textarea
                    value={ajusteForm.motivo}
                    onChange={(e) => setAjusteForm({ ...ajusteForm, motivo: e.target.value })}
                    className="input-field resize-none"
                    rows={3}
                    required
                  />
                </div>
                <button type="submit" className="btn-primary w-full">
                  Registrar ajuste
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}

function KpiCard({ title, value, tone, icon: Icon }) {
  const color =
    tone === 'negative'
      ? 'text-rose-600 dark:text-rose-400'
      : tone === 'warning'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-pastel-ink dark:text-slate-100';

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-pastel-muted dark:text-slate-400">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <div className="rounded-xl bg-sky-100 p-3 text-sky-700 dark:bg-indigo-500/20 dark:text-indigo-300">
          <Icon size={24} />
        </div>
      </div>
    </motion.div>
  );
}
